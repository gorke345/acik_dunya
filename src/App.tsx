import { useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  OpenWorldEngine,
  HudSnapshot,
  GameModeState,
  QuestInteractKind,
} from './game/gameEngine';
import {
  CLASS_DEFINITIONS,
  DESERT_ARENA_REQUIRED_KILLS,
  PlayerClassId,
  PlayerProfileData,
  RelicSourceId,
  UpgradeType,
  createDefaultProfile,
  awardXpAndGold,
  applyUpgrade,
  buyHorse,
  buyFoodItem,
  consumeFoodItem,
  buyWeaponItem,
  equipWeaponItem,
  buyArmorItem,
  equipArmorItem,
  buyHarborShip,
  getDerivedStats,
  getClassColor,
  isValidClassId,
  tryUnlockClassWeapon,
  unlockYetiRune,
} from './game/combatRules';
import { FoodId, SHIP_BY_ID, ShipId, WEAPON_BY_ID } from './game/inventoryData';
import {
  BIOME_META,
  BiomeId,
  SAFE_ZONE_CENTER,
  TOWN_TAVERN_POS,
  HARBOR_POS,
  HARBOR_SAILOR_POS,
  DARK_FOREST_POS,
  MOUNTAIN_CRYSTAL_POS,
  FOREST_TREE_POS,
  DESERT_ARENA_POS,
  PIER_START_X,
  PIER_Z,
  PIRATE_ISLAND_POS,
  PIRATE_RELIC_POS,
  WIZARD_ISLAND_POS,
  WIZARD_RELIC_POS,
  FLOATING_TOWN_POS,
  WHIRLPOOL_POS,
  UNDERWATER_CITY_POS,
  HORROR_FOREST_POS,
  YETI_BOSS_POS,
} from './game/worldMath';
import { CONVOY_BASE_GOLD, CONVOY_MAX_TIER, DESERT_ARENA_TOTAL_WAVES } from './game/worldEvents';
import { soundEngine } from './game/soundEngine';
import { WEATHER_PRESETS } from './game/weatherSystem';
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
import { InventoryModal } from './components/InventoryModal';
import { TavernModal } from './components/TavernModal';
import { HarborModal } from './components/HarborModal';
import { FriendsRoomModal } from './components/FriendsRoomModal';
import { StatusModal } from './components/StatusModal';

type GotoLandmark =
  | 'lake'
  | 'mountain'
  | 'forest'
  | 'darkforest'
  | 'desert'
  | 'tavern'
  | 'harbor'
  | 'pirate'
  | 'wizard'
  | 'floating'
  | 'whirlpool'
  | 'underwater'
  | 'horror'
  | 'northpole'
  | 'ocean'
  | null;

function getInitialQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const autostart = params.get('autostart') === '1';
  const rawRoom = params.get('room') || 'ANA-DUNYA';
  const room = rawRoom.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 16) || 'ANA-DUNYA';
  const rawClass = params.get('class');
  const starterClass: PlayerClassId = isValidClassId(rawClass) ? rawClass : 'guardian';
  const rawGoto = params.get('goto');
  const goto: GotoLandmark =
    rawGoto === 'lake' ||
    rawGoto === 'mountain' ||
    rawGoto === 'forest' ||
    rawGoto === 'darkforest' ||
    rawGoto === 'desert' ||
    rawGoto === 'tavern' ||
    rawGoto === 'harbor' ||
    rawGoto === 'pirate' ||
    rawGoto === 'wizard' ||
    rawGoto === 'floating' ||
    rawGoto === 'whirlpool' ||
    rawGoto === 'underwater' ||
    rawGoto === 'horror' ||
    rawGoto === 'northpole' ||
    rawGoto === 'ocean'
      ? rawGoto
      : null;
  const unlock = params.get('unlock') === '1';
  const runic = params.get('runic') === '1';
  const rawWeapon = params.get('weapon');
  const weapon = rawWeapon && WEAPON_BY_ID[rawWeapon] ? rawWeapon : null;
  const rawGold = params.get('gold');
  const gold =
    rawGold !== null && Number.isFinite(Number(rawGold))
      ? Math.max(0, Math.min(5000000, Math.floor(Number(rawGold))))
      : null;
  const horse = params.get('horse') === '1';
  const rawWave = params.get('wave');
  const wave =
    rawWave !== null && Number.isFinite(Number(rawWave))
      ? Math.max(1, Math.min(DESERT_ARENA_TOTAL_WAVES, Math.floor(Number(rawWave))))
      : null;
  const ambush = params.get('ambush') === '1';
  const fp = params.get('fp') === '1';
  const rawShip = params.get('ship');
  const ship: ShipId | null = rawShip === 'sloop' || rawShip === 'galleon' ? rawShip : null;
  const pirate = params.get('pirate') === '1';
  const rawConvoy = params.get('convoy');
  const convoy =
    rawConvoy !== null && Number.isFinite(Number(rawConvoy))
      ? Math.max(1, Math.min(CONVOY_MAX_TIER, Math.floor(Number(rawConvoy))))
      : null;
  return {
    autostart,
    room,
    starterClass,
    goto,
    unlock,
    runic,
    weapon,
    gold,
    horse,
    wave,
    ambush,
    fp,
    ship,
    pirate,
    convoy,
  };
}

const INITIAL_HUD: HudSnapshot = {
  hp: 260,
  maxHp: 260,
  stamina: 140,
  maxStamina: 140,
  biome: 'meadow',
  inSafeZone: true,
  nearCampfire: true,
  nearbyInteractable: null,
  playerX: SAFE_ZONE_CENTER.x,
  playerZ: SAFE_ZONE_CENTER.z + 12,
  playerYaw: Math.PI,
  lightCooldown: 0,
  heavyCooldown: 0,
  dashCooldown: 0,
  weather: 'clear',
  cameraMode: 'third_person',
  hasHorse: false,
  isMounted: false,
  horseDistance: null,
  hasShip: false,
  isSailing: false,
  shipHp: 2200,
  shipMaxHp: 2200,
  activeShipName: null,
  activeBuffs: [],
  arenaWave: 0,
  arenaWaveTotal: DESERT_ARENA_TOTAL_WAVES,
  arenaRemaining: 0,
  ambushActive: false,
  ambushRemaining: 0,
  pirateAmbushActive: false,
  pirateRemaining: 0,
  convoyTier: 1,
  convoyGoldNext: CONVOY_BASE_GOLD,
  bowCharge: 0,
  bowZooming: false,
  isSwimming: false,
  escapeNameTr: 'Kalkan Hücumu',
  escapeCooldownMax: 2.0,
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
    createDefaultProfile(
      `guest_${Math.random().toString(36).slice(2, 8)}`,
      'Gezgin-42',
      undefined,
      initialParams.current.starterClass
    )
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
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [tavernOpen, setTavernOpen] = useState(false);
  const [harborOpen, setHarborOpen] = useState(false);
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
    }, 3800);
  }, []);

  const persistIfUser = useCallback(async (nextProf: PlayerProfileData) => {
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
  }, []);

  // Sync body dataset state for Game Shell & verification
  useEffect(() => {
    document.body.dataset.state = gameState;
    engineRef.current?.setGameState(gameState);
  }, [gameState]);

  useEffect(() => {
    document.body.dataset.weather = hud.weather;
  }, [hud.weather]);

  useEffect(() => {
    document.body.dataset.playerClass = profile.playerClass;
    document.body.dataset.weaponUnlocked = String(profile.classWeaponUnlocked);
    document.body.dataset.yetiRune = String(profile.yetiRuneUnlocked);
    document.body.dataset.hasHorse = String(profile.hasHorse);
  }, [profile.playerClass, profile.classWeaponUnlocked, profile.yetiRuneUnlocked, profile.hasHorse]);

  useEffect(() => {
    document.body.dataset.mounted = String(hud.isMounted);
    document.body.dataset.sailing = String(hud.isSailing);
    document.body.dataset.swimming = String(hud.isSwimming);
    document.body.dataset.bowZoom = String(hud.bowZooming);
    document.body.dataset.biome = hud.biome;
    document.body.dataset.cameraMode = hud.cameraMode;
    document.body.dataset.playerX = String(Math.round(hud.playerX * 10) / 10);
    document.body.dataset.playerZ = String(Math.round(hud.playerZ * 10) / 10);
  }, [
    hud.isMounted,
    hud.isSailing,
    hud.isSwimming,
    hud.bowZooming,
    hud.biome,
    hud.cameraMode,
    hud.playerX,
    hud.playerZ,
  ]);

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
        weaponKind: stats.activeWeaponKind,
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
      setInventoryOpen(false);
      setTavernOpen(false);
      setHarborOpen(false);
      setFriendsOpen(false);
      setKillerName('');

      engineRef.current?.applyProfile(nextProf, true);
      engineRef.current?.setPvpSettings(pvpEnabledRef.current, partyCodeRef.current);
      setGameState('playing');

      mpRef.current?.connect(buildJoinPayload(nextProf, guestMode, targetRoom));
      const classDef = CLASS_DEFINITIONS[nextProf.playerClass];
      pushToast(
        guestMode
          ? `${classDef.nameTr} olarak ${targetRoom} odasına katıldın.`
          : `Hoş geldin ${nextProf.displayName} (${classDef.nameTr})! Bulut kaydın yüklendi.`,
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
            text: `${ev.killerName}, ${ev.victimName} adlı savaşçıyı alt etti!`,
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
      onDesertArenaWaveCleared: (wave, completedAll) => {
        const cur = profileRef.current;
        const nextWaveProg = Math.max(cur.desertArenaProgress, wave);
        let updated: PlayerProfileData = {
          ...cur,
          desertArenaProgress: nextWaveProg,
        };
        let unlockedSpear = false;
        if (completedAll && updated.playerClass === 'lancer' && !updated.classWeaponUnlocked) {
          updated = {
            ...updated,
            classWeaponUnlocked: true,
            ownedWeapons: updated.ownedWeapons.includes('desert_spear')
              ? updated.ownedWeapons
              : [...updated.ownedWeapons, 'desert_spear'],
            equippedWeaponId: 'desert_spear',
          };
          unlockedSpear = true;
        }
        const waveBonusXp = 160 * wave;
        const waveBonusGold = 120 * wave;
        const res = awardXpAndGold(updated, waveBonusXp, waveBonusGold);
        setProfile(res.profile);
        engineRef.current?.applyProfile(res.profile, false);

        if (unlockedSpear) {
          soundEngine.playWeaponUnlock();
          pushToast(
            '5 Dalgalı Çöl Arenası tamamlandı! Efsanevi Çöl Mızrağı kuşandın!',
            'reward'
          );
        } else if (completedAll) {
          soundEngine.playLevelUp();
          pushToast(
            `Çöl Arenası 5/5 dalga tamamlandı! +${waveBonusXp} TP · +${waveBonusGold} Altın`,
            'reward'
          );
        } else {
          soundEngine.playLevelUp();
          pushToast(
            `Çöl Arenası Dalga ${wave}/${DESERT_ARENA_TOTAL_WAVES} geçildi! +${waveBonusGold} Altın`,
            'reward'
          );
        }
        void persistIfUser(res.profile);
      },
      onConvoySunk: (tier, goldReward, xpReward, nextTier) => {
        const cur = profileRef.current;
        const res = awardXpAndGold(
          { ...cur, convoyTier: nextTier, pvpKills: cur.pvpKills + 1 },
          xpReward,
          goldReward
        );
        setProfile(res.profile);
        engineRef.current?.applyProfile(res.profile, false);
        if (res.leveledUp) {
          soundEngine.playLevelUp();
          pushToast(
            `KONVOY BATIRILDI (Sv.${tier})! +${goldReward} Altın & SEVİYE ${res.profile.level}!`,
            'reward'
          );
        }
        void persistIfUser(res.profile);
      },
      onYetiBossDefeated: () => {
        const cur = profileRef.current;
        const runeRes = unlockYetiRune(cur);
        if (runeRes.newlyUnlocked) {
          setProfile(runeRes.profile);
          engineRef.current?.applyProfile(runeRes.profile, false);
          soundEngine.playRunicAwaken();
          pushToast(
            'YETİ RÜNÜ DÜŞTÜ! Buz Yetisi 5x güçlendi ve Rünik forma dönüştü!',
            'reward'
          );
          void persistIfUser(runeRes.profile);
        } else if (cur.playerClass === 'yeti') {
          pushToast('1000 Sv. Devasa Buz Yetisi yeniden alt edildi!', 'reward');
        } else {
          pushToast(
            '1000 Sv. Devasa Buz Yetisi alt edildi! (Yeti Rünü yalnızca Buz Yetisi sınıfında uyanır.)',
            'reward'
          );
        }
      },
      onPlayerDefeated: (killer) => {
        const cur = profileRef.current;
        const updated: PlayerProfileData = { ...cur, deaths: cur.deaths + 1 };
        setProfile(updated);
        setKillerName(killer);
        setUpgradeOpen(false);
        setInventoryOpen(false);
        setTavernOpen(false);
        setHarborOpen(false);
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
          weaponKind: stats.activeWeaponKind,
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
        setFriendsOpen(false);
        setInventoryOpen(false);
        setTavernOpen(false);
        setHarborOpen(false);
        setUpgradeOpen(true);
        engineRef.current?.healFull();
        pushToast('Kasaba ocağı yaralarını iyileştirdi!', 'info');
      },
      onTownStableInteract: () => {
        setFriendsOpen(false);
        setInventoryOpen(false);
        setTavernOpen(false);
        setHarborOpen(false);
        setUpgradeOpen(true);
      },
      onTownTavernInteract: () => {
        setFriendsOpen(false);
        setUpgradeOpen(false);
        setInventoryOpen(false);
        setHarborOpen(false);
        setTavernOpen(true);
      },
      onHarborSailorInteract: () => {
        setFriendsOpen(false);
        setUpgradeOpen(false);
        setInventoryOpen(false);
        setTavernOpen(false);
        setHarborOpen(true);
      },
      onClassQuestInteract: (source: QuestInteractKind) => {
        const cur = profileRef.current;
        const relicMap: Record<QuestInteractKind, RelicSourceId> = {
          mountain_crystal: 'mountain_crystal',
          forest_tree: 'forest_tree',
          desert_arena: 'desert_arena',
          pirate_relic: 'pirate_island',
          wizard_relic: 'wizard_island',
          horror_relic: 'horror_forest',
          underwater_relic: 'underwater_city',
        };
        const mappedRelic = relicMap[source];

        if (source === 'desert_arena' && cur.desertArenaProgress < DESERT_ARENA_REQUIRED_KILLS) {
          const left = DESERT_ARENA_REQUIRED_KILLS - cur.desertArenaProgress;
          pushToast(`Arenayı tamamlamak için ${left} dalga daha geçmelisin!`, 'danger');
          return;
        }

        const unlockRes = tryUnlockClassWeapon(cur, mappedRelic);
        if (unlockRes.wrongClass) {
          const ownerHint =
            source === 'mountain_crystal'
              ? 'Dağdaki Kristal yalnızca Mavi Muhafız sınıfı içindir (Sersemleten Gürz).'
              : source === 'forest_tree'
              ? 'Kadim Orman Ağacı yalnızca Yeşil Okçu sınıfı içindir (Uzak Menzil Ok).'
              : source === 'pirate_relic'
              ? 'Korsan Cephaneliği yalnızca Bombacı sınıfı içindir.'
              : source === 'wizard_relic'
              ? 'Büyücü Kulesi Asası yalnızca Büyücü sınıfı içindir.'
              : source === 'horror_relic'
              ? 'Korku Ormanı Hançerleri yalnızca Gölge Suikastçısı sınıfı içindir.'
              : source === 'underwater_relic'
              ? "Poseidon'un Mızrağı yalnızca Balıkadam sınıfı içindir."
              : 'Çöl Arenası ödülü yalnızca Kızıl Mızrakçı sınıfı içindir.';
          pushToast(ownerHint, 'info');
          return;
        }
        if (unlockRes.alreadyUnlocked) {
          pushToast(`${unlockRes.weaponNameTr} zaten envanterinde!`, 'info');
          return;
        }
        if (unlockRes.unlocked) {
          const rewarded = awardXpAndGold(unlockRes.profile, 220, 180).profile;
          setProfile(rewarded);
          engineRef.current?.applyProfile(rewarded, false);
          soundEngine.playWeaponUnlock();
          pushToast(`${unlockRes.weaponNameTr} bulundu, envantere eklendi ve kuşanıldı!`, 'reward');
          void persistIfUser(rewarded);
        }
      },
      onCombatToast: (text, tone) => pushToast(text, tone),
      onWeatherChanged: (w) => {
        pushToast(`Hava Durumu: ${WEATHER_PRESETS[w].labelTr}`, 'info');
      },
      onCameraModeChanged: (mode) => {
        pushToast(
          mode === 'first_person'
            ? 'Birinci Şahıs Görünümü aktif! Fare veya ok tuşlarıyla bak, [C] ile çık.'
            : 'Üçüncü Şahıs Sabit Kamera aktif.',
          'info'
        );
      },
    });
    engineRef.current = engine;

    // Support verification & deep-link query params
    if (initialParams.current.autostart) {
      const baseProf = createDefaultProfile(
        `guest_${Math.random().toString(36).slice(2, 8)}`,
        'Gezgin-42',
        undefined,
        initialParams.current.starterClass
      );
      const classDef = CLASS_DEFINITIONS[baseProf.playerClass];
      const unlockedWeaponsSet = new Set(baseProf.ownedWeapons);
      if (initialParams.current.unlock) unlockedWeaponsSet.add(classDef.weaponId);
      if (initialParams.current.weapon) unlockedWeaponsSet.add(initialParams.current.weapon);
      if (initialParams.current.runic && baseProf.playerClass === 'yeti') {
        unlockedWeaponsSet.add('runic_yeti_claws');
      }
      const shipParam = initialParams.current.ship;
      const runicActive = initialParams.current.runic && baseProf.playerClass === 'yeti';
      const chosenWeapon =
        initialParams.current.weapon ||
        (runicActive
          ? 'runic_yeti_claws'
          : initialParams.current.unlock
          ? classDef.weaponId
          : baseProf.equippedWeaponId);
      const guestProf: PlayerProfileData = {
        ...baseProf,
        gold: initialParams.current.gold !== null ? initialParams.current.gold : baseProf.gold,
        hasHorse: initialParams.current.horse,
        classWeaponUnlocked: initialParams.current.unlock || runicActive || baseProf.classWeaponUnlocked,
        yetiRuneUnlocked: runicActive,
        ownedWeapons: Array.from(unlockedWeaponsSet),
        equippedWeaponId: chosenWeapon,
        ownedShips: shipParam ? [shipParam] : [],
        activeShipId: shipParam || '',
        desertArenaProgress:
          initialParams.current.unlock && baseProf.playerClass === 'lancer'
            ? DESERT_ARENA_REQUIRED_KILLS
            : 0,
      };
      enterWorld(guestProf, true, initialParams.current.room);

      if (initialParams.current.goto === 'mountain') {
        engine.teleportTo(MOUNTAIN_CRYSTAL_POS.x, MOUNTAIN_CRYSTAL_POS.z + 3.4, Math.PI);
      } else if (initialParams.current.goto === 'forest') {
        engine.teleportTo(FOREST_TREE_POS.x + 2.4, FOREST_TREE_POS.z + 3.2, -0.5);
      } else if (initialParams.current.goto === 'darkforest') {
        engine.teleportTo(DARK_FOREST_POS.x, DARK_FOREST_POS.z + 5, Math.PI);
      } else if (initialParams.current.goto === 'desert') {
        engine.teleportTo(DESERT_ARENA_POS.x, DESERT_ARENA_POS.z + 10.5, Math.PI);
      } else if (initialParams.current.goto === 'lake') {
        engine.teleportTo(PIER_START_X - 8, PIER_Z, -Math.PI * 0.5);
      } else if (initialParams.current.goto === 'tavern') {
        engine.teleportTo(TOWN_TAVERN_POS.x - 1.5, TOWN_TAVERN_POS.z + 4.5, Math.PI);
      } else if (initialParams.current.goto === 'harbor') {
        engine.teleportTo(HARBOR_SAILOR_POS.x, HARBOR_SAILOR_POS.z - 2.5, 0);
      } else if (initialParams.current.goto === 'pirate') {
        engine.teleportTo(PIRATE_RELIC_POS.x, PIRATE_RELIC_POS.z + 5, Math.PI);
      } else if (initialParams.current.goto === 'wizard') {
        engine.teleportTo(WIZARD_RELIC_POS.x, WIZARD_RELIC_POS.z + 5, Math.PI);
      } else if (initialParams.current.goto === 'floating') {
        engine.teleportTo(FLOATING_TOWN_POS.x, FLOATING_TOWN_POS.z + 10, Math.PI);
      } else if (initialParams.current.goto === 'whirlpool') {
        engine.teleportTo(WHIRLPOOL_POS.x, WHIRLPOOL_POS.z + 42, Math.PI);
      } else if (initialParams.current.goto === 'underwater') {
        engine.teleportTo(UNDERWATER_CITY_POS.x, UNDERWATER_CITY_POS.z + 24, Math.PI);
      } else if (initialParams.current.goto === 'horror') {
        engine.teleportTo(HORROR_FOREST_POS.x, HORROR_FOREST_POS.z + 18, Math.PI);
      } else if (initialParams.current.goto === 'northpole') {
        engine.teleportTo(YETI_BOSS_POS.x, YETI_BOSS_POS.z + 30, Math.PI);
      } else if (initialParams.current.goto === 'ocean') {
        engine.teleportTo(HARBOR_POS.x + 20, HARBOR_POS.z + 125, Math.PI);
      }

      if (shipParam) {
        engine.launchFromHarbor(shipParam);
      }
      if (initialParams.current.convoy !== null) {
        engine.setConvoyTierForTest(initialParams.current.convoy);
      }
      if (initialParams.current.pirate) {
        engine.triggerPirateAmbush();
      }
      if (initialParams.current.wave !== null) {
        engine.startDesertArenaWave(initialParams.current.wave);
      }
      if (initialParams.current.ambush) {
        engine.triggerBanditAmbush();
      }
      if (initialParams.current.fp) {
        engine.setCameraMode('first_person');
      }
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

  // Global keyboard shortcuts (Title Enter/Space, Pause Esc/P, Upgrade U, Friends F, Weather V, Mute M)
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
          setInventoryOpen(false);
          setTavernOpen(false);
          setHarborOpen(false);
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (inventoryOpen) {
          setInventoryOpen(false);
        } else if (tavernOpen) {
          setTavernOpen(false);
        } else if (harborOpen) {
          setHarborOpen(false);
        } else if (upgradeOpen) {
          setUpgradeOpen(false);
        } else if (friendsOpen) {
          setFriendsOpen(false);
        } else if (gameStateRef.current === 'playing') {
          setGameState('paused');
        } else if (gameStateRef.current === 'paused') {
          setGameState('playing');
        }
      } else if (e.code === 'KeyI' && gameStateRef.current === 'playing') {
        e.preventDefault();
        setUpgradeOpen(false);
        setFriendsOpen(false);
        setTavernOpen(false);
        setHarborOpen(false);
        setInventoryOpen((v) => !v);
      } else if (e.code === 'KeyU' && gameStateRef.current === 'playing') {
        e.preventDefault();
        setFriendsOpen(false);
        setInventoryOpen(false);
        setTavernOpen(false);
        setHarborOpen(false);
        setUpgradeOpen((v) => !v);
      } else if (e.code === 'KeyT' && gameStateRef.current === 'playing') {
        e.preventDefault();
        setUpgradeOpen(false);
        setInventoryOpen(false);
        setTavernOpen(false);
        setHarborOpen(false);
        setFriendsOpen((v) => !v);
      } else if (e.code === 'KeyV' && gameStateRef.current === 'playing') {
        e.preventDefault();
        engineRef.current?.cycleWeather();
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
  }, [upgradeOpen, inventoryOpen, tavernOpen, harborOpen, friendsOpen]);

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

  const handleStartAsUser = (
    displayName: string,
    playerClass: PlayerClassId,
    targetRoom: string
  ) => {
    if (!authUser || !savedProfile) return;
    const switchedClass = savedProfile.playerClass !== playerClass;
    const updated: PlayerProfileData = {
      ...savedProfile,
      displayName: displayName.trim() || savedProfile.displayName,
      playerClass,
      tunicColor: getClassColor(playerClass),
      classWeaponUnlocked: switchedClass ? false : savedProfile.classWeaponUnlocked,
    };
    enterWorld(updated, false, targetRoom);
    void persistIfUser(updated);
  };

  const handleStartAsGuest = (
    displayName: string,
    playerClass: PlayerClassId,
    targetRoom: string
  ) => {
    const guestProf = createDefaultProfile(
      `guest_${Math.random().toString(36).slice(2, 9)}`,
      displayName,
      getClassColor(playerClass),
      playerClass
    );
    enterWorld(guestProf, true, targetRoom);
  };

  const handleUpgrade = (type: UpgradeType) => {
    const res = applyUpgrade(profile, type, hud.inSafeZone);
    if (!res.success) {
      pushToast(res.reason || 'Yükseltme yapılamadı.', 'danger');
      return;
    }
    setProfile(res.profile);
    engineRef.current?.applyProfile(res.profile, false);
    soundEngine.playUpgradeForge();
    pushToast('Kasaba demircisinde ekipman güçlendirildi!', 'reward');
    void persistIfUser(res.profile);
  };

  const handleBuyHorse = () => {
    const res = buyHorse(profile, hud.inSafeZone);
    if (!res.success) {
      pushToast(res.reason || 'At satın alınamadı.', 'danger');
      return;
    }
    setProfile(res.profile);
    engineRef.current?.applyProfile(res.profile, false);
    soundEngine.playHorseWhinny();
    pushToast('Binek atı satın alındı! [F] ile bin/in, [G] ile yanına çağır.', 'reward');
    void persistIfUser(res.profile);
  };

  const handleBuyWeapon = (weaponId: string) => {
    const res = buyWeaponItem(profile, weaponId);
    if (!res.success) {
      pushToast(res.reason || 'Silah satın alınamadı.', 'danger');
      return;
    }
    setProfile(res.profile);
    engineRef.current?.applyProfile(res.profile, false);
    soundEngine.playUpgradeForge();
    pushToast('Yeni silah satın alındı ve kuşanıldı!', 'reward');
    void persistIfUser(res.profile);
  };

  const handleEquipWeapon = (weaponId: string) => {
    const res = equipWeaponItem(profile, weaponId);
    if (!res.success) {
      pushToast(res.reason || 'Silah kuşanılamadı.', 'danger');
      return;
    }
    setProfile(res.profile);
    engineRef.current?.applyProfile(res.profile, false);
    soundEngine.playSlash(false);
    pushToast('Silah değiştirildi!', 'info');
    void persistIfUser(res.profile);
  };

  const handleBuyArmor = (armorId: string) => {
    const res = buyArmorItem(profile, armorId);
    if (!res.success) {
      pushToast(res.reason || 'Zırh satın alınamadı.', 'danger');
      return;
    }
    setProfile(res.profile);
    engineRef.current?.applyProfile(res.profile, false);
    soundEngine.playUpgradeForge();
    pushToast('Yeni zırh satın alındı ve giyildi!', 'reward');
    void persistIfUser(res.profile);
  };

  const handleEquipArmor = (armorId: string) => {
    const res = equipArmorItem(profile, armorId);
    if (!res.success) {
      pushToast(res.reason || 'Zırh giyilemedi.', 'danger');
      return;
    }
    setProfile(res.profile);
    engineRef.current?.applyProfile(res.profile, false);
    pushToast('Zırh değiştirildi!', 'info');
    void persistIfUser(res.profile);
  };

  const handleBuyFood = (foodId: FoodId, eatImmediately: boolean) => {
    const res = buyFoodItem(profile, foodId, true);
    if (!res.success) {
      pushToast(res.reason || 'Yemek satın alınamadı.', 'danger');
      return;
    }
    if (eatImmediately) {
      const eatRes = consumeFoodItem(res.profile, foodId);
      if (eatRes.success) {
        setProfile(eatRes.profile);
        engineRef.current?.applyProfile(eatRes.profile, false);
        engineRef.current?.activateFoodBuff(foodId);
        void persistIfUser(eatRes.profile);
        return;
      }
    }
    setProfile(res.profile);
    soundEngine.playUpgradeForge();
    pushToast('Yemek çantana eklendi! [I] Envanterden yiyebilirsin.', 'reward');
    void persistIfUser(res.profile);
  };

  const handleEatFood = (foodId: FoodId) => {
    const res = consumeFoodItem(profile, foodId);
    if (!res.success) {
      pushToast(res.reason || 'Bu yemekten envanterde yok.', 'danger');
      return;
    }
    setProfile(res.profile);
    engineRef.current?.applyProfile(res.profile, false);
    engineRef.current?.activateFoodBuff(foodId);
    void persistIfUser(res.profile);
  };

  const handleBuyShip = (shipId: ShipId) => {
    const res = buyHarborShip(profile, shipId);
    if (!res.success) {
      pushToast(res.reason || 'Gemi satın alınamadı.', 'danger');
      return;
    }
    setProfile(res.profile);
    engineRef.current?.applyProfile(res.profile, false);
    soundEngine.playShipBell();
    pushToast(`${SHIP_BY_ID[shipId].nameTr} satın alındı! Denize Açıl diyerek yola çıkabilirsin.`, 'reward');
    void persistIfUser(res.profile);
  };

  const handleSelectShip = (shipId: ShipId) => {
    const res = buyHarborShip(profile, shipId);
    if (res.success) {
      setProfile(res.profile);
      engineRef.current?.applyProfile(res.profile, false);
      pushToast(`${SHIP_BY_ID[shipId].nameTr} aktif gemin seçildi.`, 'info');
      void persistIfUser(res.profile);
    }
  };

  const handleLaunchShip = (shipId: ShipId) => {
    const nextProf: PlayerProfileData =
      profile.activeShipId === shipId ? profile : { ...profile, activeShipId: shipId };
    if (nextProf !== profile) {
      setProfile(nextProf);
      engineRef.current?.applyProfile(nextProf, false);
    }
    setHarborOpen(false);
    engineRef.current?.launchFromHarbor(shipId);
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
        profile.tunicColor,
        profile.playerClass
      );
      const merged: PlayerProfileData = {
        ...existing,
        displayName: profile.displayName,
        playerClass: profile.playerClass,
        tunicColor: getClassColor(profile.playerClass),
        classWeaponUnlocked: existing.classWeaponUnlocked || profile.classWeaponUnlocked,
        desertArenaProgress: Math.max(
          existing.desertArenaProgress,
          profile.desertArenaProgress
        ),
        hasHorse: existing.hasHorse || profile.hasHorse,
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
            setInventoryOpen(false);
            setTavernOpen(false);
            setHarborOpen(false);
            setUpgradeOpen(true);
          }}
          onOpenInventory={() => {
            setFriendsOpen(false);
            setUpgradeOpen(false);
            setTavernOpen(false);
            setHarborOpen(false);
            setInventoryOpen(true);
          }}
          onOpenFriends={() => {
            setUpgradeOpen(false);
            setInventoryOpen(false);
            setTavernOpen(false);
            setHarborOpen(false);
            setFriendsOpen(true);
          }}
          onCycleWeather={() => engineRef.current?.cycleWeather()}
          onToggleMute={() => {
            setMuted((prev) => {
              const next = !prev;
              soundEngine.setMuted(next);
              return next;
            });
          }}
          onPause={() => setGameState('paused')}
          onInteract={() => engineRef.current?.triggerContextInteract()}
          onAttackLight={() => engineRef.current?.triggerLocalAttack(false)}
          onAttackHeavy={() => engineRef.current?.triggerLocalAttack(true)}
          onDash={() => engineRef.current?.triggerDash()}
          onToggleMount={() => engineRef.current?.toggleMountHorse()}
          onSummonHorse={() => engineRef.current?.summonHorse()}
          onToggleBoardShip={() => engineRef.current?.toggleBoardShip()}
          onToggleCameraMode={() => engineRef.current?.toggleCameraMode()}
        />
      )}

      {/* Inventory Modal (Weapons, Armors, 10 Foods) */}
      {gameState === 'playing' && inventoryOpen && (
        <InventoryModal
          profile={profile}
          activeBuffs={hud.activeBuffs}
          onBuyWeapon={handleBuyWeapon}
          onEquipWeapon={handleEquipWeapon}
          onBuyArmor={handleBuyArmor}
          onEquipArmor={handleEquipArmor}
          onEatFood={handleEatFood}
          onClose={() => setInventoryOpen(false)}
        />
      )}

      {/* Town Tavern Dining Hall Modal (10 Unique Buff Foods) */}
      {gameState === 'playing' && tavernOpen && (
        <TavernModal
          profile={profile}
          onBuyFood={handleBuyFood}
          onClose={() => setTavernOpen(false)}
        />
      )}

      {/* Main Island Ocean Harbor Sailor Modal (2 Drivable Ships) */}
      {gameState === 'playing' && harborOpen && (
        <HarborModal
          profile={profile}
          shipHp={hud.shipHp}
          shipMaxHp={hud.shipMaxHp}
          convoyTier={hud.convoyTier}
          convoyGoldNext={hud.convoyGoldNext}
          onBuyShip={handleBuyShip}
          onSelectShip={handleSelectShip}
          onLaunchShip={handleLaunchShip}
          onRepairShip={() => engineRef.current?.repairPlayerShip()}
          onClose={() => setHarborOpen(false)}
        />
      )}

      {/* Upgrade & Discovery Modal */}
      {gameState === 'playing' && upgradeOpen && (
        <UpgradeModal
          profile={profile}
          inTown={hud.inSafeZone}
          nearCampfire={hud.nearCampfire}
          onUpgrade={handleUpgrade}
          onBuyHorse={handleBuyHorse}
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
            setInventoryOpen(false);
            setTavernOpen(false);
            setHarborOpen(false);
            setFriendsOpen(false);
            setGameState('title');
          }}
        />
      )}
    </main>
  );
}
