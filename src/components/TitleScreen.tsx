import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  CLASS_DEFINITIONS,
  VALID_CLASSES,
  PlayerClassId,
  PlayerProfileData,
  getDerivedStats,
} from '../game/combatRules';
import { CLASS_ESCAPE_CONFIG } from '../game/worldEvents';

interface TitleScreenProps {
  authUser: User | null;
  authLoading: boolean;
  savedProfile: PlayerProfileData | null;
  authError: string | null;
  initialRoom: string;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  onStartAsUser: (displayName: string, playerClass: PlayerClassId, roomCode: string) => void;
  onStartAsGuest: (displayName: string, playerClass: PlayerClassId, roomCode: string) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  authUser,
  authLoading,
  savedProfile,
  authError,
  initialRoom,
  onGoogleLogin,
  onGoogleLogout,
  onStartAsUser,
  onStartAsGuest,
}) => {
  const [mode, setMode] = useState<'user' | 'guest'>(authUser ? 'user' : 'guest');
  const [guestName, setGuestName] = useState('Gezgin-42');
  const [userNameOverride, setUserNameOverride] = useState('');
  const [selectedClass, setSelectedClass] = useState<PlayerClassId>(
    savedProfile?.playerClass || 'guardian'
  );
  const [classTouched, setClassTouched] = useState(false);
  const [roomCode, setRoomCode] = useState(initialRoom || 'ANA-DUNYA');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (savedProfile && !classTouched) {
      setSelectedClass(savedProfile.playerClass);
    }
  }, [savedProfile, classTouched]);

  const activeClassDef = CLASS_DEFINITIONS[selectedClass];
  const activeEscape = CLASS_ESCAPE_CONFIG[selectedClass];
  const previewStats = getDerivedStats({
    level: mode === 'user' && savedProfile ? savedProfile.level : 1,
    swordTier: mode === 'user' && savedProfile ? savedProfile.swordTier : 1,
    armorTier: mode === 'user' && savedProfile ? savedProfile.armorTier : 1,
    agilityTier: mode === 'user' && savedProfile ? savedProfile.agilityTier : 1,
    playerClass: selectedClass,
    classWeaponUnlocked: selectedClass === 'yeti',
    yetiRuneUnlocked: false,
  });

  const effectiveUserName =
    userNameOverride.trim() ||
    savedProfile?.displayName ||
    authUser?.displayName ||
    'Yayla Savaşçısı';

  const handleLoginClick = async () => {
    setSigningIn(true);
    try {
      await onGoogleLogin();
      setMode('user');
    } finally {
      setSigningIn(false);
    }
  };

  const handlePrimaryStart = () => {
    const cleanRoom = roomCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') || 'ANA-DUNYA';
    if (mode === 'user' && authUser) {
      onStartAsUser(effectiveUserName, selectedClass, cleanRoom);
    } else {
      onStartAsGuest(guestName.trim() || 'Gezgin-42', selectedClass, cleanRoom);
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-8"
      aria-label="Ana Ekran"
    >
      <div className="flex flex-col md:flex-row items-start justify-between gap-5 w-full max-w-6xl mx-auto mt-0.5 md:mt-2">
        {/* Left: Bespoke SVG Highland Emblem & Display Title Lockup over open sky */}
        <div className="pointer-events-none max-w-xl">
          <svg
            viewBox="0 0 600 124"
            className="w-[320px] sm:w-[450px] md:w-[530px] h-auto drop-shadow-[0_6px_18px_rgba(8,14,20,0.8)]"
            role="img"
            aria-label="Yayla ve Zirve"
          >
            <g transform="translate(8, 12)">
              <polygon
                points="38,8 68,62 8,62"
                fill="#192834"
                stroke="#e3b659"
                strokeWidth="2.5"
              />
              <polygon points="38,14 50,36 38,31 26,36" fill="#edf4fa" />
              <polygon
                points="60,26 82,62 42,62"
                fill="#243a47"
                stroke="#c99944"
                strokeWidth="2"
              />
              <line x1="16" y1="74" x2="72" y2="20" stroke="#f0d084" strokeWidth="3" strokeLinecap="round" />
              <line x1="72" y1="74" x2="16" y2="20" stroke="#f0d084" strokeWidth="3" strokeLinecap="round" />
              <circle cx="44" cy="47" r="6" fill={activeClassDef.colorHex} stroke="#f5d98e" strokeWidth="2" />
            </g>
            <text
              x="104"
              y="62"
              fill="#f8f2e2"
              stroke="#0c141c"
              strokeWidth="5.5"
              paintOrder="stroke fill"
              fontFamily="Cinzel, Georgia, serif"
              fontWeight="800"
              fontSize="40"
              letterSpacing="2"
            >
              YAYLA &amp; ZİRVE
            </text>
            <line x1="106" y1="76" x2="578" y2="76" stroke="#e3b659" strokeWidth="1.5" opacity="0.85" />
            <text
              x="106"
              y="98"
              fill="#f2e4c2"
              stroke="#0c141c"
              strokeWidth="3.6"
              paintOrder="stroke fill"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="12.5"
              letterSpacing="1.6"
            >
              AÇIK OKYANUS · KUZEY KUTBU · 8 SINIF · GEMİ SAVAŞLARI
            </text>
          </svg>
        </div>

        {/* Right: Focused World-Matched Entry Panel with 8 Classes */}
        <section
          className="pointer-events-auto w-full max-w-[552px] bg-[#101921]/94 border border-[#d6b166]/45 shadow-[0_18px_48px_rgba(5,10,15,0.72)] p-3.5"
          aria-label="Sınıf ve Giriş Seçenekleri"
        >
          {/* Step 1: Class Selection (8 Classes in clean 4x2 grid) */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#e5be67]">
                1. Sınıfını Seç (8 Sınıf)
              </span>
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: activeClassDef.accentHex }}
              >
                {activeClassDef.colorNameTr} · {activeClassDef.weaponNameTr}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="radiogroup" aria-label="Sınıflar">
              {VALID_CLASSES.map((cid) => {
                const def = CLASS_DEFINITIONS[cid];
                const isSelected = selectedClass === cid;
                const shortLoc =
                  cid === 'guardian'
                    ? 'Dağ Kristali'
                    : cid === 'archer'
                    ? 'Orman Ağacı'
                    : cid === 'lancer'
                    ? 'Çöl Arenası'
                    : cid === 'bomber'
                    ? 'Korsan Adası'
                    : cid === 'mage'
                    ? 'Büyücü Adası'
                    : cid === 'assassin'
                    ? 'Korku Ormanı'
                    : cid === 'fishman'
                    ? 'Denizde Yüzer'
                    : 'Kuzey Kutbu 5x';
                return (
                  <button
                    key={cid}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    data-class-id={cid}
                    onClick={() => {
                      setSelectedClass(cid);
                      setClassTouched(true);
                    }}
                    className="text-left px-2 py-1.5 transition-all cursor-pointer border-2"
                    style={{
                      backgroundColor: isSelected ? `${def.colorHex}33` : '#0a1218',
                      borderColor: isSelected ? def.accentHex : 'rgba(255,255,255,0.14)',
                    }}
                  >
                    <div
                      className="h-1 w-full mb-1"
                      style={{ backgroundColor: def.colorHex }}
                    />
                    <div className="text-[10.5px] font-extrabold text-[#f7f0df] leading-tight truncate">
                      {def.nameTr}
                    </div>
                    <div className="text-[9px] text-[#aebcc9] mt-0.5 truncate">
                      {shortLoc}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Live Class Stats, Unique Escape & Weapon Quest Summary */}
            <div
              className="mt-2 bg-[#0a1218] border p-2.5"
              style={{ borderColor: `${activeClassDef.colorHex}80` }}
            >
              <p className="text-[11px] leading-snug text-[#d9d2c3] mb-2">
                {activeClassDef.summaryTr}
              </p>
              <div className="grid grid-cols-4 gap-1.5 text-center border-t border-white/10 pt-2">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#95a6b5]">Can</div>
                  <div className="text-xs font-extrabold text-[#f27872] tabular-nums" data-stat="hp">
                    {previewStats.maxHp}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#95a6b5]">Hasar</div>
                  <div className="text-xs font-extrabold text-[#f5c762] tabular-nums" data-stat="atk">
                    {previewStats.attackPower}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#95a6b5]">Savunma</div>
                  <div className="text-xs font-extrabold text-[#7dc4f7] tabular-nums" data-stat="def">
                    {previewStats.defense}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-[#95a6b5]">Hız</div>
                  <div className="text-xs font-extrabold text-[#77e09d] tabular-nums" data-stat="spd">
                    {previewStats.moveSpeed.toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-white/10 space-y-1 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#a8b6c4] font-semibold">Özel Kaçış [Shift]:</span>
                  <span className="font-bold text-[#7ad9ff] truncate">
                    {activeEscape.nameTr} · {activeEscape.shortDescTr}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#a8b6c4] font-semibold">
                    {selectedClass === 'yeti' ? 'Rünik Uyanış:' : 'Silah Görevi:'}
                  </span>
                  <span className="font-bold text-[#f3dca0] truncate">
                    {activeClassDef.questTitleTr} · {activeClassDef.questLocationTr}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2: Entry Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#0a1117] p-1 border border-[#d6b166]/25 mb-3" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'user'}
              onClick={() => setMode('user')}
              className={`py-1.5 px-3 text-xs font-bold tracking-wide transition-colors cursor-pointer ${
                mode === 'user'
                  ? 'bg-[#c9963b] text-[#0e151c]'
                  : 'text-[#c9bfa9] hover:text-[#f5eedc]'
              }`}
            >
              Kullanıcı Girişi
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'guest'}
              onClick={() => setMode('guest')}
              className={`py-1.5 px-3 text-xs font-bold tracking-wide transition-colors cursor-pointer ${
                mode === 'guest'
                  ? 'bg-[#c9963b] text-[#0e151c]'
                  : 'text-[#c9bfa9] hover:text-[#f5eedc]'
              }`}
            >
              Misafir Girişi
            </button>
          </div>

          {mode === 'user' ? (
            <div className="space-y-2.5">
              {authLoading ? (
                <div className="py-4 text-center text-sm text-[#d4cbb8]">
                  Hesap kontrol ediliyor...
                </div>
              ) : authUser && savedProfile ? (
                <div className="bg-[#16242f] border border-[#5cb85c]/45 p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#7be098]">
                      Bulut Kaydı Aktif · Sv {savedProfile.level}
                    </span>
                    <button
                      type="button"
                      onClick={onGoogleLogout}
                      className="text-[11px] text-[#c7bda8] hover:text-[#f5eedc] underline cursor-pointer"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#e8dfc9] tabular-nums">
                    <span className="font-bold">{savedProfile.displayName}</span>
                    <span>
                      Altın: <strong className="text-[#f0c766]">{savedProfile.gold}</strong> · Zafer:{' '}
                      <strong className="text-[#f2846c]">{savedProfile.pvpKills}</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 py-0.5">
                  <p className="text-xs leading-relaxed text-[#d4cbb8]">
                    Google hesabınla giriş yaparak sınıfını, kazandığın silahı, seviyeni ve altınını kalıcı olarak sakla.
                  </p>
                  {authError && (
                    <div className="text-xs text-[#ff8e85] bg-[#361616] border border-[#ff6b60]/40 px-3 py-1.5">
                      {authError}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleLoginClick}
                    disabled={signingIn}
                    className="w-full py-2.5 px-4 bg-[#f5f0e3] hover:bg-white text-[#121a22] font-bold text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5H1.2v3.1C3.2 21.3 7.3 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.2 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V6.7H1.2C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l4-3.1z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.7l4 3.1c.9-2.9 3.6-5 6.8-5z"
                      />
                    </svg>
                    {signingIn ? 'Bağlanıyor...' : 'Google ile Kullanıcı Girişi'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[11px] text-[#b9b2a1] mb-2">
              Misafir oturumu geçicidir; sınıf ve silah ilerlemeni saklamak için Kullanıcı Girişi kullan.
            </p>
          )}

          {/* Name + Friend Room Code + Start Button */}
          {(mode === 'guest' || (mode === 'user' && authUser)) && (
            <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="warrior-name-input"
                    className="block text-[10px] font-semibold uppercase tracking-wider text-[#b7c2cc] mb-1"
                  >
                    Savaşçı Adı
                  </label>
                  <input
                    id="warrior-name-input"
                    type="text"
                    maxLength={24}
                    value={mode === 'user' ? userNameOverride || savedProfile?.displayName || '' : guestName}
                    onChange={(e) =>
                      mode === 'user'
                        ? setUserNameOverride(e.target.value)
                        : setGuestName(e.target.value)
                    }
                    placeholder="Adını yaz..."
                    className="w-full px-2.5 py-1.5 bg-[#0b1218] border border-[#d6b166]/35 text-xs text-[#f7f0df] focus:outline-none focus:border-[#e6be6a]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="world-room-code"
                    className="block text-[10px] font-semibold uppercase tracking-wider text-[#b7c2cc] mb-1"
                  >
                    Arkadaş Oda Kodu
                  </label>
                  <input
                    id="world-room-code"
                    type="text"
                    maxLength={16}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ANA-DUNYA"
                    className="w-full px-2.5 py-1.5 bg-[#0b1218] border border-[#d6b166]/30 text-xs font-mono tracking-wider text-[#f3e5c3] focus:outline-none focus:border-[#e6be6a]"
                  />
                </div>
              </div>

              <button
                type="button"
                data-start="true"
                onClick={handlePrimaryStart}
                className="w-full py-2.5 px-5 text-white font-display font-bold text-sm tracking-wider uppercase shadow-lg transition-opacity hover:opacity-95 cursor-pointer border border-white/25"
                style={{ backgroundColor: activeClassDef.colorHex }}
              >
                {activeClassDef.nameTr} Olarak {mode === 'user' ? 'Dünyaya Gir' : 'Başla'}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Safe Margin: Single flat, borderless control-hint line */}
      <div className="w-full text-center pointer-events-none pb-0.5">
        <p className="text-xs font-medium tracking-wide text-[#f2ead8] hud-text-stroke">
          WASD Hareket · Sol Tık/J Saldırı (Ok Basılı Tut) · Sağ Tık Ok Yakınlaştır · K Ağır · Shift Sınıf Kaçışı · C 1. Şahıs · I Envanter · B Gemi · F At · E Etkileşim
        </p>
      </div>
    </div>
  );
};
