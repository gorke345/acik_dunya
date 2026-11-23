import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  OpenWorldEngine,
  HudSnapshot,
  GameModeState,
} from './game/gameEngine';
import {
  PlayerProfileData,
  UpgradeType,
  createDefaultProfile,
  awardXpAndGold,
  applyUpgrade,
  getDerivedStats,
} from './game/combatRules';
import { BIOME_META, BiomeId, SAFE_ZONE_CENTER } from './game/worldMath';
import { soundEngine } from './game/soundEngine';
import {
  subscribeAuth,
  signInWithGoogle,
  logoutUser,
  loadOrCreatePlayerProfile,
  savePlayerProfile,
} from './services/firebase';
import {
  MultiplayerClient,
  RemotePlayerState,
  ChatMessage,
} from './services/multiplayer';
import { TitleScreen } from './components/TitleScreen';
import { GameHud, CombatToast } from './components/GameHud';
import { UpgradeModal } from './components/UpgradeModal';
import { FriendsRoomModal } from './components/FriendsRoomModal';
import { StatusModal } from './components/StatusModal';

function getInitialQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const autostart = params.get('autostart') === '1';
  const rawRoom = params.get('room') || 'ANA-DUNYA';
  const room = rawRoom.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'ANA-DUNYA';
  return { autostart, room };
}

const INITIAL_HUD: HudSnapshot = {
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  biome: 'meadow',
  inSafeZone: true,
  nearCampfire: true,
  playerX: SAFE_ZONE_CENTER.x,
  playerZ: SAFE_ZONE_CENTER.z + 4,
  playerYaw: Math.PI,
  lightCooldown: 0,
  heavyCooldown: 0,
  dashCooldown: 0,
  actors: [],
};

export default function App() {
  const initialParams = useRef(getInitialQueryParams());
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<OpenWorldEngine | null>(null);
  const mpRef = useRef<MultiplayerClient | null>(null);
  const toastSeqRef = useRef(1);

  // Auth & persistent account state
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [savedProfile, setSavedProfile] = useState<PlayerProfileData | null>(null);

  // Active gameplay state
  const [gameState, setGameState] = useState<GameModeState>('title');
  const [isGuest, setIsGuest] = useState(true);
  const [profile, setProfile] = useState<PlayerProfileData>(() =>
    createDefaultProfile(`guest_${Math.random().toString(36).slice(2, 8)}`, 'Gezgin-42')
  );
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [roomCode, setRoomCode] = useState(initialParams.current.room);
  const [partyCode, setPartyCode] = useState('');
  const [pvpEnabled, setPvpEnabled] = useState(true);
  const [muted, setMuted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [toasts, setToasts] = useState<CombatToast[]>([]);
  const [killerName, setKillerName] = useState('');

  // Overlay modals
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  // Multiplayer room state
  const [mpConnected, setMpConnected] = useState(false);
  const [selfNetId, setSelfNetId] = useState('');
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayerState[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Live refs so WebGL engine & multiplayer callbacks never go stale
  const profileRef = useRef(profile);
  const isGuestRef = useRef(isGuest);
  const authUserRef = useRef(authUser);
  const gameStateRef = useRef(gameState);
  const roomCodeRef = useRef(roomCode);
  const partyCodeRef = useRef(partyCode);
  const pvpEnabledRef = useRef(pvpEnabled);
  const selfNetIdRef = useRef(selfNetId);

  profileRef.current = profile;
  isGuestRef.current = isGuest;
  authUserRef.current = authUser;
  gameStateRef.current = gameState;
  roomCodeRef.current = roomCode;
  partyCodeRef.current = partyCode;
  pvpEnabledRef.current = pvpEnabled;
  selfNetIdRef.current = selfNetId;

  const pushToast = useCallback((text: string, tone: CombatToast['tone']) => {
    const id = toastSeqRef.current++;
    setToasts((prev) => [...prev.slice(-4), { id, text, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const persistIfUser = useCallback(
    async (nextProf: PlayerProfileData) => {
      const user = authUserRef.current;
      if (isGuestRef.current || !user) return;
      const pos = engineRef.current?.getPlayerPosition();
      const withPos: PlayerProfileData = {
        ...nextProf,
        lastX: pos ? pos.x : nextProf.lastX,
        lastZ: pos ? pos.z : nextProf.lastZ,
      };
      setSaveStatus('saving');
      try {
        await savePlayerProfile(user.uid, withPos);
        setSavedProfile(withPos);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Cloud save error:', err);
        setSaveStatus('idle');
      }
    },
    []
  );

  // Sync body dataset state for Game Shell & verification
  useEffect(() => {
    document.body.dataset.state = gameState;
    engineRef.current?.setGameState(gameState);
  }, [gameState]);

  // Subscribe to Firebase Auth state
  useEffect(() => {
    const unsub = subscribeAuth(async (user) => {
      setAuthUser(user);
      setAuthError(null);
      if (user) {
        try {
          const { profile: loaded } = await loadOrCreatePlayerProfile(user);
          setSavedProfile(loaded);
        } catch (err) {
          console.error('Failed loading Firebase profile:', err);
          setAuthError('Kullanıcı kaydı yüklenirken hata oluştu.');
        }
      } else {
        setSavedProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // Build join payload for WebSocket multiplayer
  const buildJoinPayload = useCallback(
    (prof: PlayerProfileData, guestFlag: boolean, room: string) => {
      const stats = getDerivedStats(prof);
      const pos = engineRef.current?.getPlayerPosition() || { x: prof.lastX, z: prof.lastZ };
      return {
        id: prof.uid,
        room,
        displayName: prof.displayName,
        tunicColor: prof.tunicColor,
        isGuest: guestFlag,
        level: prof.level,
        swordTier: prof.swordTier,
        armorTier: prof.armorTier,
        attackPower: stats.attackPower,
        defense: stats.defense,
        x: pos.x,
        y: 1.2,
        z: pos.z,
        yaw: Math.PI,
        hp: stats.maxHp,
        maxHp: stats.maxHp,
        pvpEnabled: pvpEnabledRef.current,
        partyCode: partyCodeRef.current,
        pvpKills: prof.pvpKills,
      };
    },
    []
  );

  // Start playing handler (User or Guest)
  const enterWorld = useCallback(
    (nextProf: PlayerProfileData, guestMode: boolean, targetRoom: string) => {
      (document.activeElement as HTMLElement | null)?.blur?.();
      setIsGuest(guestMode);
      setProfile(nextProf);
      setRoomCode(targetRoom);
      setUpgradeOpen(false);
      setFriendsOpen(false);
      setKillerName('');

      engineRef.current?.applyProfile(nextProf, true);
      engineRef.current?.setPvpSettings(pvpEnabledRef.current, partyCodeRef.current);
      setGameState('playing');

      mpRef.current?.connect(buildJoinPayload(nextProf, guestMode, targetRoom));
      pushToast(
        guestMode
          ? `Misafir olarak ${targetRoom} odasına katıldın.`
          : `Hoş geldin ${nextProf.displayName}! Bulut kaydın yüklendi.`,
        'info'
      );
    },
    [buildJoinPayload, pushToast]
  );

  // Mount Three.js OpenWorldEngine & MultiplayerClient ONCE
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const mp = new MultiplayerClient({
      onConnectionChange: (conn) => setMpConnected(conn),
      onRoomState: (room, selfId, players) => {
        setRoomCode(room);
        setSelfNetId(selfId);
        setRemotePlayers(players);
        engineRef.current?.syncRemotePlayers(players, selfId);
      },
      onPlayerJoined: (player) => {
        setRemotePlayers((prev) => {
          const without = prev.filter((p) => p.id !== player.id);
          return [...without, player];
        });
        if (player.id !== selfNetIdRef.current) {
          engineRef.current?.upsertRemotePlayer(player);
          setChatMessages((prev) => [
            ...prev.slice(-30),
            {
              id: `sys_${Date.now()}_${player.id}`,
              senderId: 'system',
              senderName: 'Sistem',
              tunicColor: '#e3b55a',
              text: `${player.displayName} dünyaya katıldı.`,
              ts: Date.now(),
              system: true,
            },
          ]);
        }
      },
      onPlayerUpdated: (player) => {
        setRemotePlayers((prev) => {
          const idx = prev.findIndex((p) => p.id === player.id);
          if (idx === -1) return [...prev, player];
          const copy = prev.slice();
          copy[idx] = player;
          return copy;
        });
        if (player.id !== selfNetIdRef.current) {
          engineRef.current?.upsertRemotePlayer(player);
        }
      },
      onPlayerLeft: (id) => {
        setRemotePlayers((prev) => prev.filter((p) => p.id !== id));
        engineRef.current?.removeRemotePlayer(id);
      },
      onPlayerAttack: (ev) => {
        if (ev.id !== selfNetIdRef.current) {
          engineRef.current?.triggerRemoteAttackVisual(ev.id, ev.heavy);
        }
      },
      onPvpHit: (ev) => {
        if (ev.targetId === selfNetIdRef.current) {
          engineRef.current?.applyIncomingPvpHit(
            ev.damage,
            ev.knockX,
            ev.knockZ,
            ev.attackerName,
            ev.isHeavy
          );
        } else if (ev.attackerId === selfNetIdRef.current) {
          soundEngine.playHit(ev.isHeavy, ev.isCrit);
          pushToast(
            `${ev.targetName}: -${ev.damage} PvP${ev.isCrit ? ' KRİTİK!' : ''}`,
            'hit'
          );
        }
      },
      onPvpKill: (ev) => {
        setChatMessages((prev) => [
          ...prev.slice(-30),
          {
            id: `kill_${Date.now()}`,
            senderId: 'system',
            senderName: 'PvP',
            tunicColor: '#f07154',
            text: `⚔️ ${ev.killerName}, ${ev.victimName} adlı savaşçıyı alt etti!`,
            ts: Date.now(),
            system: true,
          },
        ]);
        if (ev.killerId === selfNetIdRef.current) {
          const cur = profileRef.current;
          const res = awardXpAndGold(
            { ...cur, pvpKills: cur.pvpKills + 1 },
            ev.rewardXp,
            ev.rewardGold
          );
          setProfile(res.profile);
          engineRef.current?.applyProfile(res.profile, false);
          if (res.leveledUp) {
            soundEngine.playLevelUp();
            pushToast(`SEVİYE ATLADIN! Seviye ${res.profile.level}`, 'reward');
          } else {
            pushToast(`PvP Zaferi! +${ev.rewardXp} TP · +${ev.rewardGold} Altın`, 'reward');
          }
          void persistIfUser(res.profile);
        }
      },
      onChat: (msg) => {
        setChatMessages((prev) => [...prev.slice(-40), msg]);
      },
    });
    mpRef.current = mp;

    const engine = new OpenWorldEngine(mount, profileRef.current, {
      onHudSnapshot: (snap) => setHud(snap),
      onBiomeDiscovered: (biome: BiomeId) => {
        const cur = profileRef.current;
        if (cur.discoveredBiomes.includes(biome)) return;
        const meta = BIOME_META[biome];
        const nextWithBiome: PlayerProfileData = {
          ...cur,
          discoveredBiomes: [...cur.discoveredBiomes, biome],
        };
        const res = awardXpAndGold(nextWithBiome, meta.discoveryXp, meta.discoveryGold);
        setProfile(res.profile);
        engineRef.current?.applyProfile(res.profile, false);
        soundEngine.playLevelUp();
        pushToast(
          `Yeni Bölge Keşfedildi: ${meta.name}! +${meta.discoveryXp} TP · +${meta.discoveryGold} Altın`,
          'reward'
        );
        void persistIfUser(res.profile);
      },
      onEnemyDefeated: (enemyName, xp, gold) => {
        const cur = profileRef.current;
        const res = awardXpAndGold(
          { ...cur, pvpKills: cur.pvpKills + 1 },
          xp,
          gold
        );
        setProfile(res.profile);
        engineRef.current?.applyProfile(res.profile, false);
        if (res.leveledUp) {
          soundEngine.playLevelUp();
          pushToast(`SEVİYE ATLADIN! Seviye ${res.profile.level}`, 'reward');
        } else {
          pushToast(`${enemyName} yenildi! +${xp} TP · +${gold} Altın`, 'reward');
        }
        void persistIfUser(res.profile);
      },
      onPlayerDefeated: (killer) => {
        const cur = profileRef.current;
        const updated: PlayerProfileData = { ...cur, deaths: cur.deaths + 1 };
        setProfile(updated);
        setKillerName(killer);
        setUpgradeOpen(false);
        setFriendsOpen(false);
        setGameState('gameover');
        void persistIfUser(updated);
      },
      onLocalStateBroadcast: (state) => {
        const cur = profileRef.current;
        const stats = getDerivedStats(cur);
        mpRef.current?.sendState({
          ...state,
          displayName: cur.displayName,
          tunicColor: cur.tunicColor,
          level: cur.level,
          swordTier: cur.swordTier,
          armorTier: cur.armorTier,
          attackPower: stats.attackPower,
          defense: stats.defense,
          pvpEnabled: pvpEnabledRef.current,
          partyCode: partyCodeRef.current,
          pvpKills: cur.pvpKills,
        });
      },
      onLocalAttackBroadcast: (heavy) => {
        mpRef.current?.sendAttack(heavy);
      },
      onCampfireInteract: () => {
        setUpgradeOpen(true);
        engineRef.current?.healFull();
        pushToast('Kamp ateşi yaralarını iyileştirdi!', 'info');
      },
      onCombatToast: (text, tone) => pushToast(text, tone),
    });
    engineRef.current = engine;

    // Support ?autostart=1 for instant play / verification
    if (initialParams.current.autostart) {
      const guestProf = createDefaultProfile(
        `guest_${Math.random().toString(36).slice(2, 8)}`,
        'Gezgin-42'
      );
      enterWorld(guestProf, true, initialParams.current.room);
    }

    return () => {
      mp.disconnect();
      engine.destroy();
      engineRef.current = null;
      mpRef.current = null;
    };
  }, [enterWorld, persistIfUser, pushToast]);

  // Periodic cloud auto-save every 25s for authenticated players
  useEffect(() => {
    if (isGuest || !authUser || gameState !== 'playing') return;
    const interval = window.setInterval(() => {
      void persistIfUser(profileRef.current);
    }, 25000);
    return () => window.clearInterval(interval);
  }, [isGuest, authUser, gameState, persistIfUser]);

  // Global keyboard shortcuts (Title Enter/Space, Pause Esc/P, Upgrade U, Friends F, Mute M)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (gameStateRef.current === 'title' && !inInput) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          const btn = document.querySelector<HTMLButtonElement>('[data-start="true"]');
          btn?.click();
        }
        return;
      }

      if (inInput) {
        if (e.code === 'Escape') {
          (e.target as HTMLElement).blur();
          setFriendsOpen(false);
          setUpgradeOpen(false);
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (upgradeOpen) {
          setUpgradeOpen(false);
        } else if (friendsOpen) {
          setFriendsOpen(false);
        } else if (gameStateRef.current === 'playing') {
          setGameState('paused');
        } else if (gameStateRef.current === 'paused') {
          setGameState('playing');
        }
      } else if (e.code === 'KeyU' && gameStateRef.current === 'playing') {
        e.preventDefault();
        setFriendsOpen(false);
        setUpgradeOpen((v) => !v);
      } else if ((e.code === 'KeyF' || e.code === 'KeyT') && gameStateRef.current === 'playing') {
        e.preventDefault();
        setUpgradeOpen(false);
        setFriendsOpen((v) => !v);
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        setMuted((prev) => {
          const next = !prev;
          soundEngine.setMuted(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [upgradeOpen, friendsOpen]);

  // Handlers
  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const user = await signInWithGoogle();
      const { profile: loaded } = await loadOrCreatePlayerProfile(user);
      setSavedProfile(loaded);
    } catch (err) {
      console.error('Google Sign-In error:', err);
      setAuthError('Giriş penceresi kapatıldı veya engellendi. Tekrar deneyin.');
    }
  };

  const handleGoogleLogout = async () => {
    await logoutUser();
    setSavedProfile(null);
  };

  const handleStartAsUser = (displayName: string, tunicColor: string, targetRoom: string) => {
    if (!authUser || !savedProfile) return;
    const updated: PlayerProfileData = {
      ...savedProfile,
      displayName: displayName.trim() || savedProfile.displayName,
      tunicColor,
    };
    enterWorld(updated, false, targetRoom);
    void persistIfUser(updated);
  };

  const handleStartAsGuest = (displayName: string, tunicColor: string, targetRoom: string) => {
    const guestProf = createDefaultProfile(
      `guest_${Math.random().toString(36).slice(2, 9)}`,
      displayName,
      tunicColor
    );
    enterWorld(guestProf, true, targetRoom);
  };

  const handleUpgrade = (type: UpgradeType) => {
    const res = applyUpgrade(profile, type);
    if (!res.success) {
      pushToast(res.reason || 'Yükseltme yapılamadı.', 'danger');
      return;
    }
    setProfile(res.profile);
    engineRef.current?.applyProfile(res.profile, false);
    soundEngine.playUpgradeForge();
    pushToast('Ekipman güçlendirildi!', 'reward');
    void persistIfUser(res.profile);
  };

  const handleSwitchRoom = (newRoomRaw: string) => {
    const clean = newRoomRaw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'ANA-DUNYA';
    setRoomCode(clean);
    mpRef.current?.switchRoom(clean, buildJoinPayload(profile, isGuest, clean));
    pushToast(`${clean} odasına geçildi.`, 'info');
  };

  const handleUpdatePartyCode = (code: string) => {
    const clean = code.trim().toUpperCase().slice(0, 12);
    setPartyCode(clean);
    engineRef.current?.setPvpSettings(pvpEnabled, clean);
    pushToast(clean ? `Grup ittifakı aktif: ${clean}` : 'Grup kodu temizlendi.', 'info');
  };

  const handleTogglePvp = (enabled: boolean) => {
    setPvpEnabled(enabled);
    engineRef.current?.setPvpSettings(enabled, partyCode);
    pushToast(enabled ? 'Açık PvP Modu açıldı!' : 'Barışçıl Keşif Modu aktif.', 'info');
  };

  const handleUpgradeGuestToAccount = async () => {
    try {
      const user = await signInWithGoogle();
      const { profile: existing } = await loadOrCreatePlayerProfile(
        user,
        profile.displayName,
        profile.tunicColor
      );
      // Merge current guest session progress if higher than brand new account
      const merged: PlayerProfileData = {
        ...existing,
        displayName: profile.displayName,
        tunicColor: profile.tunicColor,
        level: Math.max(existing.level, profile.level),
        gold: Math.max(existing.gold, profile.gold),
        swordTier: Math.max(existing.swordTier, profile.swordTier),
        armorTier: Math.max(existing.armorTier, profile.armorTier),
        agilityTier: Math.max(existing.agilityTier, profile.agilityTier),
        pvpKills: Math.max(existing.pvpKills, profile.pvpKills),
        discoveredBiomes: Array.from(
          new Set([...existing.discoveredBiomes, ...profile.discoveredBiomes])
        ) as BiomeId[],
      };
      setIsGuest(false);
      isGuestRef.current = false;
      setProfile(merged);
      engineRef.current?.applyProfile(merged, false);
      await savePlayerProfile(user.uid, merged);
      setSavedProfile(merged);
      setSaveStatus('saved');
      pushToast('Hesabın bağlandı ve ilerlemen buluta kaydedildi!', 'reward');
    } catch {
      pushToast('Google girişi tamamlanamadı.', 'danger');
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0e171f]">
      {/* Isolated WebGL Mount Container — Never re-renders on React HUD state updates */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {/* Title Screen */}
      {gameState === 'title' && (
        <TitleScreen
          authUser={authUser}
          authLoading={authLoading}
          savedProfile={savedProfile}
          authError={authError}
          initialRoom={roomCode}
          onGoogleLogin={handleGoogleLogin}
          onGoogleLogout={handleGoogleLogout}
          onStartAsUser={handleStartAsUser}
          onStartAsGuest={handleStartAsGuest}
        />
      )}

      {/* Playing HUD */}
      {gameState === 'playing' && (
        <GameHud
          hud={hud}
          profile={profile}
          isGuest={isGuest}
          roomCode={roomCode}
          onlineCount={Math.max(1, remotePlayers.length)}
          pvpEnabled={pvpEnabled}
          partyCode={partyCode}
          muted={muted}
          saveStatus={saveStatus}
          toasts={toasts}
          onOpenUpgrade={() => {
            setFriendsOpen(false);
            setUpgradeOpen(true);
          }}
          onOpenFriends={() => {
            setUpgradeOpen(false);
            setFriendsOpen(true);
          }}
          onToggleMute={() => {
            setMuted((prev) => {
              const next = !prev;
              soundEngine.setMuted(next);
              return next;
            });
          }}
          onPause={() => setGameState('paused')}
          onAttackLight={() => engineRef.current?.triggerLocalAttack(false)}
          onAttackHeavy={() => engineRef.current?.triggerLocalAttack(true)}
          onDash={() => engineRef.current?.triggerDash()}
        />
      )}

      {/* Upgrade & Discovery Modal */}
      {gameState === 'playing' && upgradeOpen && (
        <UpgradeModal
          profile={profile}
          nearCampfire={hud.nearCampfire}
          onUpgrade={handleUpgrade}
          onHealAtCampfire={() => {
            engineRef.current?.healFull();
            pushToast('Can ve enerji tamamen yenilendi!', 'info');
          }}
          onClose={() => setUpgradeOpen(false)}
        />
      )}

      {/* Friends, Room & Chat Modal */}
      {gameState === 'playing' && friendsOpen && (
        <FriendsRoomModal
          roomCode={roomCode}
          partyCode={partyCode}
          pvpEnabled={pvpEnabled}
          selfId={selfNetId}
          selfName={profile.displayName}
          selfLevel={profile.level}
          selfKills={profile.pvpKills}
          remotePlayers={remotePlayers}
          messages={chatMessages}
          connected={mpConnected}
          onSwitchRoom={handleSwitchRoom}
          onUpdatePartyCode={handleUpdatePartyCode}
          onTogglePvp={handleTogglePvp}
          onSendChat={(text) => mpRef.current?.sendChat(text)}
          onClose={() => setFriendsOpen(false)}
        />
      )}

      {/* Pause & Defeat Modal */}
      {(gameState === 'paused' || gameState === 'gameover') && (
        <StatusModal
          kind={gameState}
          profile={profile}
          isGuest={isGuest}
          killerName={killerName}
          onResumeOrRespawn={() => {
            if (gameState === 'gameover') {
              engineRef.current?.respawnAtSanctuary();
            }
            setGameState('playing');
          }}
          onOpenUpgrade={() => {
            setGameState('playing');
            setUpgradeOpen(true);
          }}
          onSaveNow={() => {
            void persistIfUser(profile);
            pushToast('Kayıt buluta gönderildi.', 'info');
          }}
          onUpgradeGuestAccount={handleUpgradeGuestToAccount}
          onReturnToTitle={() => {
            void persistIfUser(profile);
            mpRef.current?.disconnect();
            setUpgradeOpen(false);
            setFriendsOpen(false);
            setGameState('title');
          }}
        />
      )}
    </main>
  );
}
