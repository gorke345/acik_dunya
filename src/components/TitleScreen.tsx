import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { TUNIC_PRESETS, PlayerProfileData } from '../game/combatRules';

interface TitleScreenProps {
  authUser: User | null;
  authLoading: boolean;
  savedProfile: PlayerProfileData | null;
  authError: string | null;
  initialRoom: string;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  onStartAsUser: (displayName: string, tunicColor: string, roomCode: string) => void;
  onStartAsGuest: (displayName: string, tunicColor: string, roomCode: string) => void;
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
  const [selectedColor, setSelectedColor] = useState<string>(
    savedProfile?.tunicColor || TUNIC_PRESETS[0].hex
  );
  const [roomCode, setRoomCode] = useState(initialRoom || 'ANA-DUNYA');
  const [signingIn, setSigningIn] = useState(false);

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
      onStartAsUser(effectiveUserName, savedProfile?.tunicColor || selectedColor, cleanRoom);
    } else {
      onStartAsGuest(guestName.trim() || 'Gezgin-42', selectedColor, cleanRoom);
    }
  };

  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-5 md:p-10"
      aria-label="Ana Ekran"
    >
      {/* Subtle top-left atmospheric vignette purely for text readability without blur */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-6 w-full max-w-6xl mx-auto mt-1 md:mt-4">
        {/* Left: Bespoke SVG Highland Emblem & Display Title Lockup over open sky */}
        <div className="pointer-events-none max-w-xl">
          <svg
            viewBox="0 0 540 124"
            className="w-[310px] sm:w-[440px] md:w-[510px] h-auto drop-shadow-[0_6px_18px_rgba(8,14,20,0.8)]"
            role="img"
            aria-label="Yayla ve Zirve"
          >
            {/* Mountain crest & crossed blades emblem */}
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
              {/* Crossed blade accent */}
              <line x1="16" y1="74" x2="72" y2="20" stroke="#f0d084" strokeWidth="3" strokeLinecap="round" />
              <line x1="72" y1="74" x2="16" y2="20" stroke="#f0d084" strokeWidth="3" strokeLinecap="round" />
              <circle cx="44" cy="47" r="6" fill="#c93e3e" stroke="#f5d98e" strokeWidth="2" />
            </g>
            {/* Serif Display Title */}
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
            <line x1="106" y1="76" x2="508" y2="76" stroke="#e3b659" strokeWidth="1.5" opacity="0.85" />
            <text
              x="106"
              y="98"
              fill="#f2e4c2"
              stroke="#0c141c"
              strokeWidth="3.8"
              paintOrder="stroke fill"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="13.5"
              letterSpacing="2.2"
            >
              AÇIK DÜNYA PVP · DAĞ · OVA · ÇAYIR
            </text>
          </svg>
        </div>

        {/* Right: Focused World-Matched Entry Panel (Kullanıcı Girişi vs Misafir Girişi) */}
        <section
          className="pointer-events-auto w-full max-w-[372px] bg-[#101921]/92 border border-[#d6b166]/45 shadow-[0_18px_48px_rgba(5,10,15,0.65)] p-5"
          aria-label="Giriş Seçenekleri"
        >
          {/* Entry Mode Selector Tabs */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#0a1117] p-1 border border-[#d6b166]/25 mb-4" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'user'}
              onClick={() => setMode('user')}
              className={`py-2 px-3 text-xs font-bold tracking-wide transition-colors cursor-pointer ${
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
              className={`py-2 px-3 text-xs font-bold tracking-wide transition-colors cursor-pointer ${
                mode === 'guest'
                  ? 'bg-[#c9963b] text-[#0e151c]'
                  : 'text-[#c9bfa9] hover:text-[#f5eedc]'
              }`}
            >
              Misafir Girişi
            </button>
          </div>

          {mode === 'user' ? (
            <div className="space-y-3.5">
              {authLoading ? (
                <div className="py-6 text-center text-sm text-[#d4cbb8]">
                  Hesap kontrol ediliyor...
                </div>
              ) : authUser && savedProfile ? (
                <>
                  <div className="bg-[#16242f] border border-[#5cb85c]/45 p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#7be098]">
                        Bulut Kaydı Aktif
                      </span>
                      <button
                        type="button"
                        onClick={onGoogleLogout}
                        className="text-[11px] text-[#c7bda8] hover:text-[#f5eedc] underline cursor-pointer"
                      >
                        Çıkış Yap
                      </button>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-base font-bold text-[#f7f0df]">
                        {savedProfile.displayName}
                      </span>
                      <span className="text-xs font-bold text-[#e5be67] tabular-nums">
                        Seviye {savedProfile.level}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2 border-t border-white/10 text-center">
                      <div>
                        <div className="text-[10px] uppercase text-[#a8b5c2]">Altın</div>
                        <div className="text-sm font-bold text-[#f0c766] tabular-nums">
                          {savedProfile.gold}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-[#a8b5c2]">PvP Zaferi</div>
                        <div className="text-sm font-bold text-[#f2846c] tabular-nums">
                          {savedProfile.pvpKills}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-[#a8b5c2]">Bölge</div>
                        <div className="text-sm font-bold text-[#7ad696] tabular-nums">
                          {savedProfile.discoveredBiomes.length}/4
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="user-display-name" className="block text-[11px] font-semibold uppercase tracking-wider text-[#b7c2cc] mb-1">
                      Savaşçı Adı
                    </label>
                    <input
                      id="user-display-name"
                      type="text"
                      maxLength={24}
                      value={userNameOverride || savedProfile.displayName}
                      onChange={(e) => setUserNameOverride(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0b1218] border border-[#d6b166]/35 text-sm text-[#f7f0df] focus:outline-none focus:border-[#e6be6a]"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-3 py-1">
                  <p className="text-xs leading-relaxed text-[#d4cbb8]">
                    Google hesabınla giriş yaparak seviyeni, altınını, silah geliştirmelerini ve keşfettiğin bölgeleri kalıcı olarak sakla.
                  </p>
                  {authError && (
                    <div className="text-xs text-[#ff8e85] bg-[#361616] border border-[#ff6b60]/40 px-3 py-2">
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
            <div className="space-y-3">
              <div>
                <label htmlFor="guest-name-input" className="block text-[11px] font-semibold uppercase tracking-wider text-[#b7c2cc] mb-1">
                  Misafir Savaşçı Adı
                </label>
                <input
                  id="guest-name-input"
                  type="text"
                  maxLength={24}
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Adını yaz..."
                  className="w-full px-3 py-2 bg-[#0b1218] border border-[#d6b166]/35 text-sm text-[#f7f0df] focus:outline-none focus:border-[#e6be6a]"
                />
              </div>
              <p className="text-[11px] text-[#b9b2a1]">
                Misafir girişinde ilerleme sadece bu oturum için geçerlidir; kayıt saklamak için Kullanıcı Girişi kullan.
              </p>
            </div>
          )}

          {/* Shared Warrior Cloak Color & Room Code for Friends */}
          {(mode === 'guest' || (mode === 'user' && authUser)) && (
            <div className="mt-3.5 pt-3.5 border-t border-white/10 space-y-3">
              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#b7c2cc] mb-1.5">
                  Pelerin Rengi
                </span>
                <div className="flex items-center gap-2">
                  {TUNIC_PRESETS.map((preset) => {
                    const active = selectedColor === preset.hex;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedColor(preset.hex)}
                        aria-label={`Pelerin rengi: ${preset.name}`}
                        title={preset.name}
                        className={`w-7 h-7 border-2 cursor-pointer transition-transform ${
                          active ? 'border-[#f5dfa1] scale-110' : 'border-white/25'
                        }`}
                        style={{ backgroundColor: preset.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="world-room-code" className="block text-[11px] font-semibold uppercase tracking-wider text-[#b7c2cc] mb-1">
                  Arkadaş Oda Kodu
                </label>
                <input
                  id="world-room-code"
                  type="text"
                  maxLength={16}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ANA-DUNYA"
                  className="w-full px-3 py-1.5 bg-[#0b1218] border border-[#d6b166]/30 text-xs font-mono tracking-wider text-[#f3e5c3] focus:outline-none focus:border-[#e6be6a]"
                />
              </div>

              <button
                type="button"
                data-start="true"
                onClick={handlePrimaryStart}
                className="w-full py-3 px-5 bg-[#c9963b] hover:bg-[#dca747] active:bg-[#b5842e] text-[#0f171e] font-display font-bold text-base tracking-wider uppercase shadow-lg transition-colors cursor-pointer"
              >
                {mode === 'user' ? 'Kayıtlı Dünyaya Gir' : 'Misafir Olarak Başla'}
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Safe Margin: Single flat, borderless control-hint line */}
      <div className="w-full text-center pointer-events-none pb-1">
        <p className="text-xs font-medium tracking-wide text-[#f2ead8] hud-text-stroke">
          WASD Hareket · Sol/Sağ Tık veya J/K Saldırı · Shift Kaçış · Boşluk Zıpla · U Gelişim · F Arkadaşlar · Esc Duraklat
        </p>
      </div>
    </div>
  );
};
