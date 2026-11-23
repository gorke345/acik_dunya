import React, { useEffect, useState } from 'react';
import { HudSnapshot } from '../game/gameEngine';
import { PlayerProfileData, xpRequiredForLevel } from '../game/combatRules';
import { BIOME_META, WORLD_PLAYABLE_RADIUS, SAFE_ZONE_CENTER } from '../game/worldMath';

export interface CombatToast {
  id: number;
  text: string;
  tone: 'hit' | 'danger' | 'reward' | 'info';
}

interface GameHudProps {
  hud: HudSnapshot;
  profile: PlayerProfileData;
  isGuest: boolean;
  roomCode: string;
  onlineCount: number;
  pvpEnabled: boolean;
  partyCode: string;
  muted: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  toasts: CombatToast[];
  onOpenUpgrade: () => void;
  onOpenFriends: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onAttackLight: () => void;
  onAttackHeavy: () => void;
  onDash: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  profile,
  isGuest,
  roomCode,
  onlineCount,
  pvpEnabled,
  partyCode,
  muted,
  saveStatus,
  toasts,
  onOpenUpgrade,
  onOpenFriends,
  onToggleMute,
  onPause,
  onAttackLight,
  onAttackHeavy,
  onDash,
}) => {
  // Trailing delayed HP damage ghost bar
  const [ghostHp, setGhostHp] = useState(hud.hp);
  useEffect(() => {
    if (hud.hp < ghostHp) {
      const t = window.setTimeout(() => setGhostHp(hud.hp), 380);
      return () => window.clearTimeout(t);
    }
    setGhostHp(hud.hp);
  }, [hud.hp, ghostHp]);

  const hpPct = hud.maxHp > 0 ? Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100)) : 0;
  const ghostPct = hud.maxHp > 0 ? Math.max(0, Math.min(100, (ghostHp / hud.maxHp) * 100)) : 0;
  const stamPct = hud.maxStamina > 0 ? Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100)) : 0;
  const xpNeeded = xpRequiredForLevel(profile.level);
  const xpPct = Math.min(100, Math.round((profile.xp / xpNeeded) * 100));
  const biomeMeta = BIOME_META[hud.biome];

  // Minimap coordinate transform (-WORLD_PLAYABLE_RADIUS..+WORLD_PLAYABLE_RADIUS -> 8..104)
  const mapToSvg = (wx: number, wz: number) => {
    const scale = 46 / WORLD_PLAYABLE_RADIUS;
    return {
      mx: 56 + wx * scale,
      my: 56 + wz * scale,
    };
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3.5 md:p-5">
      {/* Critical low-HP subtle peripheral vignette */}
      {hpPct < 28 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 90px rgba(196, 36, 36, 0.52)',
          }}
        />
      )}

      {/* TOP PERIMETER BAR */}
      <div className="flex items-start justify-between gap-3 w-full">
        {/* Top-Left: Warrior Vitality & Progression Plaque */}
        <div className="bg-[#101921]/88 border border-[#d6b166]/40 px-3.5 py-2.5 min-w-[235px] max-w-[270px] shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-[#c9963b] text-[#0f171e] font-display font-extrabold text-sm flex items-center justify-center shrink-0 tabular-nums">
                {profile.level}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-bold text-[#f7f0df] truncate leading-tight">
                  {profile.displayName}
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#b6c2cd]">
                  {isGuest
                    ? 'Misafir Oturumu'
                    : saveStatus === 'saving'
                    ? 'Kaydediliyor...'
                    : 'Bulut Kaydı Aktif'}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center justify-end gap-1 text-sm font-bold text-[#f2c863] tabular-nums">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden="true">
                  <circle cx="12" cy="12" r="9.5" fill="#e8b648" stroke="#2c1d07" strokeWidth="2" />
                  <circle cx="12" cy="12" r="5" fill="#fae091" />
                </svg>
                {Math.round(profile.gold)}
              </div>
              <div className="text-[10px] font-bold text-[#e58572] tabular-nums">
                {profile.pvpKills} Zafer
              </div>
            </div>
          </div>

          {/* Health Bar with Delayed Trailing Damage Ghost */}
          <div className="mb-1.5">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-0.5">
              <span className="text-[#c5cfda]">CAN</span>
              <span className="text-[#f7f0df] tabular-nums">
                {hud.hp} / {hud.maxHp}
              </span>
            </div>
            <div className="relative h-3 bg-[#090f14] border border-white/15 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#f0b454] transition-[width] duration-300"
                style={{ width: `${ghostPct}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-[#c93f3b] transition-[width] duration-100"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Stamina Bar */}
          <div className="mb-1.5">
            <div className="relative h-2 bg-[#090f14] border border-white/10 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#48a870] transition-[width] duration-75"
                style={{ width: `${stamPct}%` }}
              />
            </div>
          </div>

          {/* XP Strip */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#9db0c2]">TP</span>
            <div className="flex-1 h-1.5 bg-[#090f14] overflow-hidden">
              <div className="h-full bg-[#6cb8eb]" style={{ width: `${xpPct}%` }} />
            </div>
            <span className="text-[10px] text-[#c7d4df] tabular-nums">
              {profile.xp}/{xpNeeded}
            </span>
          </div>
        </div>

        {/* Top-Center: Current Landform / Biome & PvP Zone Banner */}
        <div className="hidden sm:flex flex-col items-center text-center mt-0.5">
          <div className="bg-[#101921]/85 border-y border-[#d6b166]/45 px-5 py-1.5 shadow-md">
            <div className="font-display text-sm md:text-base font-bold tracking-wider text-[#f8f0dc]">
              {biomeMeta.name}
            </div>
            <div className="flex items-center justify-center gap-2 text-[10px] font-semibold tracking-wider uppercase mt-0.5">
              <span
                style={{
                  color: hud.inSafeZone
                    ? '#6ce093'
                    : pvpEnabled
                    ? '#f28a5c'
                    : '#7ac5f0',
                }}
              >
                {hud.inSafeZone
                  ? 'Güvenli Kamp Bölgesi'
                  : pvpEnabled
                  ? 'Açık PvP Bölgesi'
                  : 'Barışçıl Keşif'}
              </span>
              {partyCode && (
                <span className="text-[#72d6ff]">· Grup: {partyCode}</span>
              )}
            </div>
          </div>
        </div>

        {/* Top-Right: Navigable Landform Minimap + Square Action Buttons */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenUpgrade();
              }}
              aria-label="Gelişim ve Yükseltme (U)"
              title="Gelişim [U]"
              className="h-9 px-2.5 bg-[#101921]/90 hover:bg-[#1c2c38] border border-[#d6b166]/45 text-[#f2dca4] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M14.5 4.5l5 5-9.5 9.5H5v-5L14.5 4.5z" />
              </svg>
              <span className="hidden md:inline">Gelişim</span>
              <span className="text-[10px] text-[#c7b68e]">[U]</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenFriends();
              }}
              aria-label="Arkadaşlar ve Oda (F)"
              title="Arkadaşlar & Oda [F]"
              className="h-9 px-2.5 bg-[#101921]/90 hover:bg-[#1c2c38] border border-[#d6b166]/45 text-[#d7e8f5] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="8" r="3.5" />
                <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
                <circle cx="17.5" cy="9.5" r="2.5" />
                <path d="M16 14.2c2.4.4 4.5 2 4.5 4.8" />
              </svg>
              <span className="tabular-nums">{onlineCount}</span>
              <span className="hidden md:inline text-[10px] text-[#9eb4c7]">{roomCode}</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Sesi Aç (M)' : 'Sesi Kapat (M)'}
              title="Ses [M]"
              className="w-9 h-9 bg-[#101921]/90 hover:bg-[#1c2c38] border border-[#d6b166]/45 text-[#e6dec9] flex items-center justify-center cursor-pointer"
            >
              {muted ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M11 5L6 9H2v6h4l5 4V5z" />
                  <path d="M15.5 8.5a5 5 0 010 7" />
                  <path d="M19 5a9.5 9.5 0 010 14" />
                </svg>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              aria-label="Duraklat (P)"
              title="Duraklat [P]"
              className="w-9 h-9 bg-[#101921]/90 hover:bg-[#1c2c38] border border-[#d6b166]/45 text-[#e6dec9] flex items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            </button>
          </div>

          {/* Real Navigable Biome Minimap */}
          <div className="bg-[#0e171f]/90 border border-[#d6b166]/45 p-1 shadow-lg">
            <svg viewBox="0 0 112 112" className="w-[104px] h-[104px] md:w-[118px] md:h-[118px] block" aria-label="Bölge Haritası">
              <defs>
                <clipPath id="minimap-clip">
                  <circle cx="56" cy="56" r="50" />
                </clipPath>
              </defs>
              <circle cx="56" cy="56" r="50" fill="#4f8347" stroke="#c9a559" strokeWidth="1.5" />
              <g clipPath="url(#minimap-clip)">
                {/* Northern Bozdağ Mountain Range */}
                <path d="M6,42 Q32,14 56,28 Q84,12 106,42 L106,6 L6,6 Z" fill="#7c8791" />
                <path d="M26,24 L40,10 L56,22 L72,10 L86,24 Z" fill="#dce6ef" opacity="0.85" />
                {/* Eastern Altın Ova Plains */}
                <path d="M68,42 L106,36 L106,96 L64,96 Z" fill="#bf9c4d" opacity="0.9" />
                {/* Western Gümüş Göl Lake */}
                <ellipse cx="30" cy="60" rx="18" ry="15" fill="#3a8cb8" />
                {/* Safe Sanctuary Plaza Ring */}
                <circle
                  cx={mapToSvg(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z).mx}
                  cy={mapToSvg(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z).my}
                  r="7"
                  fill="rgba(91, 227, 140, 0.25)"
                  stroke="#5be38c"
                  strokeWidth="1"
                />
                {/* Actors (Enemies, Rivals, Friends) */}
                {hud.actors
                  .filter((a) => a.kind !== 'self')
                  .map((a) => {
                    const pos = mapToSvg(a.x, a.z);
                    const fill =
                      a.kind === 'friend'
                        ? '#5cd6ff'
                        : a.kind === 'rival'
                        ? '#f5b841'
                        : '#eb5546';
                    return (
                      <circle
                        key={a.id}
                        cx={pos.mx}
                        cy={pos.my}
                        r={a.kind === 'enemy' ? 2.6 : 3.2}
                        fill={fill}
                        stroke="#0b1116"
                        strokeWidth="0.9"
                      />
                    );
                  })}
                {/* Local Player Marker */}
                {(() => {
                  const selfPos = mapToSvg(hud.playerX, hud.playerZ);
                  const deg = (-hud.playerYaw * 180) / Math.PI + 180;
                  return (
                    <g transform={`translate(${selfPos.mx}, ${selfPos.my}) rotate(${deg})`}>
                      <polygon points="0,-5 3.6,4 0,2 -3.6,4" fill="#ffffff" stroke="#0d141b" strokeWidth="1" />
                    </g>
                  );
                })()}
              </g>
              {/* Cardinal North Letter */}
              <text x="56" y="13" textAnchor="middle" fill="#f5e6bf" fontSize="8" fontWeight="700">
                K
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* BOTTOM PERIMETER: Combat Toasts (left) + Compact Ability Bar (center) */}
      <div className="flex items-end justify-between gap-4 w-full">
        {/* Bottom-Left: Minimal Event Feed */}
        <div className="flex flex-col gap-1 max-w-[260px]">
          {toasts.slice(-3).map((t) => (
            <div
              key={t.id}
              className="px-2.5 py-1 bg-[#0e161d]/85 border-l-2 text-xs font-semibold"
              style={{
                borderColor:
                  t.tone === 'danger'
                    ? '#eb5546'
                    : t.tone === 'reward'
                    ? '#f0c456'
                    : t.tone === 'hit'
                    ? '#f59c42'
                    : '#6bc4f0',
                color: '#f5efe1',
              }}
            >
              {t.text}
            </div>
          ))}
        </div>

        {/* Bottom-Center: Compact Combat Skill Slots & Campfire Context Cue */}
        <div className="flex flex-col items-center gap-2 mx-auto">
          {hud.nearCampfire && (
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenUpgrade();
              }}
              className="pointer-events-auto px-3.5 py-1.5 bg-[#172620]/92 border border-[#6be093]/60 text-[#d8f7e1] text-xs font-bold tracking-wide shadow-md cursor-pointer"
            >
              [E] Kamp Ateşi — Gelişim &amp; İyileşme
            </button>
          )}

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Light Slash */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onAttackLight();
              }}
              aria-label="Hızlı Kılıç Saldırısı (J)"
              className="relative w-14 h-14 bg-[#101921]/90 hover:bg-[#1a2834] border border-[#d6b166]/55 flex flex-col items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#f5e3b0]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M19 5L9 15" />
                <path d="M14 5h5v5" />
                <path d="M5 19l4-4" />
                <path d="M7 13l4 4" />
              </svg>
              <span className="text-[9px] font-bold uppercase text-[#d8cba9] mt-0.5">Kılıç</span>
              <span className="absolute top-0.5 left-1 text-[9px] font-bold text-[#e3b55a]">J</span>
              {hud.lightCooldown > 0.05 && (
                <div className="absolute inset-0 bg-[#080d12]/75 flex items-center justify-center text-xs font-bold text-[#f2d079] tabular-nums">
                  {hud.lightCooldown.toFixed(1)}
                </div>
              )}
            </button>

            {/* Heavy Cleave */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onAttackHeavy();
              }}
              aria-label="Ağır Yarış Saldırısı (K)"
              className="relative w-14 h-14 bg-[#101921]/90 hover:bg-[#1a2834] border border-[#e39644]/60 flex flex-col items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#ffbe6b]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="7" strokeDasharray="4 2" />
                <path d="M12 4v16M4 12h16" />
              </svg>
              <span className="text-[9px] font-bold uppercase text-[#f0cfa4] mt-0.5">Yarış</span>
              <span className="absolute top-0.5 left-1 text-[9px] font-bold text-[#f0a54a]">K</span>
              {hud.heavyCooldown > 0.05 && (
                <div className="absolute inset-0 bg-[#080d12]/75 flex items-center justify-center text-xs font-bold text-[#ffbe6b] tabular-nums">
                  {hud.heavyCooldown.toFixed(1)}
                </div>
              )}
            </button>

            {/* Dodge Dash */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onDash();
              }}
              aria-label="Hızlı Kaçış (Shift)"
              className="relative w-14 h-14 bg-[#101921]/90 hover:bg-[#1a2834] border border-[#65b5e0]/55 flex flex-col items-center justify-center cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#8ed4fa]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 12h13" />
                <path d="M13 6l6 6-6 6" />
                <path d="M3 8h6M3 16h6" opacity="0.6" />
              </svg>
              <span className="text-[9px] font-bold uppercase text-[#bce1f5] mt-0.5">Kaçış</span>
              <span className="absolute top-0.5 left-1 text-[8px] font-bold text-[#8ed4fa]">SHF</span>
              {hud.dashCooldown > 0.05 && (
                <div className="absolute inset-0 bg-[#080d12]/75 flex items-center justify-center text-xs font-bold text-[#8ed4fa] tabular-nums">
                  {hud.dashCooldown.toFixed(1)}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Bottom-Right spacer to keep ability bar centered */}
        <div className="hidden md:block w-[160px]" />
      </div>
    </div>
  );
};
