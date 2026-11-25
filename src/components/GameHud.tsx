import React, { useEffect, useState } from 'react';
import { HudSnapshot } from '../game/gameEngine';
import {
  CLASS_DEFINITIONS,
  DESERT_ARENA_REQUIRED_KILLS,
  PlayerProfileData,
  getDerivedStats,
  xpRequiredForLevel,
} from '../game/combatRules';
import {
  BIOME_META,
  WORLD_PLAYABLE_RADIUS,
  MAIN_ISLAND_RADIUS,
  SAFE_ZONE_CENTER,
  SAFE_ZONE_RADIUS,
  DARK_FOREST_POS,
  DARK_FOREST_RADIUS,
  MOUNTAIN_CRYSTAL_POS,
  FOREST_TREE_POS,
  DESERT_ARENA_POS,
  VIKING_SHIP_POS,
  HARBOR_POS,
  PIRATE_ISLAND_POS,
  PIRATE_ISLAND_RADIUS,
  WIZARD_ISLAND_POS,
  WIZARD_ISLAND_RADIUS,
  FLOATING_TOWN_POS,
  FLOATING_TOWN_RADIUS,
  WHIRLPOOL_POS,
  WHIRLPOOL_PULL_RADIUS,
  UNDERWATER_CITY_POS,
  UNDERWATER_CITY_RADIUS,
  HORROR_FOREST_POS,
  HORROR_FOREST_RADIUS,
  NORTH_POLE_POS,
  NORTH_POLE_RADIUS,
  YETI_BOSS_POS,
} from '../game/worldMath';
import { WEATHER_PRESETS } from '../game/weatherSystem';

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
  onOpenInventory: () => void;
  onOpenFriends: () => void;
  onCycleWeather: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onInteract: () => void;
  onAttackLight: () => void;
  onAttackHeavy: () => void;
  onDash: () => void;
  onToggleMount: () => void;
  onSummonHorse: () => void;
  onToggleBoardShip: () => void;
  onToggleCameraMode: () => void;
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
  onOpenInventory,
  onOpenFriends,
  onCycleWeather,
  onToggleMute,
  onPause,
  onInteract,
  onAttackLight,
  onAttackHeavy,
  onDash,
  onToggleMount,
  onSummonHorse,
  onToggleBoardShip,
  onToggleCameraMode,
}) => {
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
  const weatherPreset = WEATHER_PRESETS[hud.weather];
  const classDef = CLASS_DEFINITIONS[profile.playerClass];
  const derived = getDerivedStats(profile);

  const mapScale = 46 / WORLD_PLAYABLE_RADIUS;
  const mapToSvg = (wx: number, wz: number) => ({
    mx: 56 + wx * mapScale,
    my: 56 + wz * mapScale,
  });

  const safeSvg = mapToSvg(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z);
  const darkForestSvg = mapToSvg(DARK_FOREST_POS.x, DARK_FOREST_POS.z);
  const crystalSvg = mapToSvg(MOUNTAIN_CRYSTAL_POS.x, MOUNTAIN_CRYSTAL_POS.z);
  const treeSvg = mapToSvg(FOREST_TREE_POS.x, FOREST_TREE_POS.z);
  const arenaSvg = mapToSvg(DESERT_ARENA_POS.x, DESERT_ARENA_POS.z);
  const shipSvg = mapToSvg(VIKING_SHIP_POS.x, VIKING_SHIP_POS.z);
  const harborSvg = mapToSvg(HARBOR_POS.x, HARBOR_POS.z);
  const pirateSvg = mapToSvg(PIRATE_ISLAND_POS.x, PIRATE_ISLAND_POS.z);
  const wizardSvg = mapToSvg(WIZARD_ISLAND_POS.x, WIZARD_ISLAND_POS.z);
  const floatingSvg = mapToSvg(FLOATING_TOWN_POS.x, FLOATING_TOWN_POS.z);
  const whirlpoolSvg = mapToSvg(WHIRLPOOL_POS.x, WHIRLPOOL_POS.z);
  const underwaterSvg = mapToSvg(UNDERWATER_CITY_POS.x, UNDERWATER_CITY_POS.z);
  const horrorSvg = mapToSvg(HORROR_FOREST_POS.x, HORROR_FOREST_POS.z);
  const northPoleSvg = mapToSvg(NORTH_POLE_POS.x, NORTH_POLE_POS.z);
  const yetiBossSvg = mapToSvg(YETI_BOSS_POS.x, YETI_BOSS_POS.z);

  const lightLabel = hud.isSailing
    ? 'Top'
    : derived.activeWeaponKind === 'mace'
    ? 'Gürz'
    : derived.activeWeaponKind === 'bow'
    ? 'Ok Çek'
    : derived.activeWeaponKind === 'spear'
    ? 'Mızrak'
    : derived.activeWeaponKind === 'trident'
    ? 'Üçlü'
    : derived.activeWeaponKind === 'yeti_claws'
    ? 'Pençe'
    : derived.activeWeaponKind === 'bomb'
    ? 'Bomba'
    : derived.activeWeaponKind === 'staff'
    ? 'Büyü'
    : derived.activeWeaponKind === 'daggers'
    ? 'Hançer'
    : 'Kılıç';

  const heavyLabel = hud.isSailing
    ? 'Salvo'
    : derived.activeWeaponKind === 'mace'
    ? 'Sars'
    : derived.activeWeaponKind === 'bow'
    ? 'Yaylım'
    : derived.activeWeaponKind === 'spear'
    ? 'Hamle'
    : derived.activeWeaponKind === 'trident'
    ? 'Gelgit'
    : derived.activeWeaponKind === 'yeti_claws'
    ? 'Buzul'
    : derived.activeWeaponKind === 'bomb'
    ? '3lü Bomba'
    : derived.activeWeaponKind === 'staff'
    ? 'Yıldız'
    : derived.activeWeaponKind === 'daggers'
    ? 'Suikast'
    : 'Yarış';

  const questLine =
    profile.playerClass === 'yeti'
      ? profile.yetiRuneUnlocked
        ? 'Rünik Yeti Rünü Aktif (5x Güç)'
        : `${classDef.questTitleTr} · ${classDef.questLocationTr}`
      : profile.classWeaponUnlocked
      ? `${derived.activeWeaponNameTr} kuşanıldı`
      : `${classDef.questTitleTr} · ${classDef.questLocationTr}`;

  const interactStyle =
    hud.nearbyInteractable?.kind === 'mountain_crystal' ||
    hud.nearbyInteractable?.kind === 'harbor_sailor' ||
    hud.nearbyInteractable?.kind === 'underwater_exit' ||
    hud.nearbyInteractable?.kind === 'underwater_relic'
      ? 'bg-[#102638]/94 border-[#63c3ff]/75 text-[#d9f2ff]'
      : hud.nearbyInteractable?.kind === 'desert_arena' ||
        hud.nearbyInteractable?.kind === 'pirate_relic'
      ? 'bg-[#331618]/94 border-[#ff7b70]/75 text-[#ffe1dc]'
      : hud.nearbyInteractable?.kind === 'wizard_relic' ||
        hud.nearbyInteractable?.kind === 'horror_relic'
      ? 'bg-[#261438]/94 border-[#c084fc]/75 text-[#f3e4ff]'
      : hud.nearbyInteractable?.kind === 'town_forge' ||
        hud.nearbyInteractable?.kind === 'town_stable' ||
        hud.nearbyInteractable?.kind === 'town_tavern'
      ? 'bg-[#2a2114]/94 border-[#e5be67]/75 text-[#f7e7c1]'
      : 'bg-[#152820]/94 border-[#6ee09d]/75 text-[#d8f7e1]';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3.5 md:p-5">
      {hpPct < 28 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 90px rgba(196, 36, 36, 0.52)',
          }}
        />
      )}

      {/* First-Person or Bow Mouse2 Zoom Crosshair Reticle + Bow Draw Charge Bar */}
      {(hud.cameraMode === 'first_person' || hud.bowZooming || hud.bowCharge > 0.01) && (
        <div
          data-testid={hud.bowZooming || hud.bowCharge > 0.01 ? 'bow-aim-reticle' : 'fp-crosshair'}
          className="fixed inset-0 pointer-events-none flex flex-col items-center justify-center"
        >
          <svg
            viewBox="0 0 64 64"
            className={`${hud.bowZooming ? 'w-14 h-14' : 'w-8 h-8'} transition-all duration-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]`}
            aria-hidden="true"
          >
            {hud.bowZooming && (
              <circle
                cx="32"
                cy="32"
                r={Math.max(12, 26 - hud.bowCharge * 12)}
                fill="none"
                stroke={hud.bowCharge >= 0.9 ? '#facc15' : '#86efac'}
                strokeWidth="1.6"
                strokeDasharray="6 4"
              />
            )}
            <line
              x1="32"
              y1={10 + hud.bowCharge * 6}
              x2="32"
              y2="25"
              stroke="#f7ebd0"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="32"
              y1="39"
              x2="32"
              y2={54 - hud.bowCharge * 6}
              stroke="#f7ebd0"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1={10 + hud.bowCharge * 6}
              y1="32"
              x2="25"
              y2="32"
              stroke="#f7ebd0"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="39"
              y1="32"
              x2={54 - hud.bowCharge * 6}
              y2="32"
              stroke="#f7ebd0"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle
              cx="32"
              cy="32"
              r="2.2"
              fill={hud.bowCharge >= 0.9 ? '#facc15' : '#6ee7b7'}
            />
          </svg>

          {(hud.bowCharge > 0.01 || hud.bowZooming) && (
            <div className="mt-2 flex flex-col items-center gap-0.5">
              <div className="w-28 h-2 bg-[#091218]/90 border border-[#d6b166]/65 overflow-hidden">
                <div
                  className="h-full transition-[width] duration-75"
                  style={{
                    width: `${Math.round(hud.bowCharge * 100)}%`,
                    backgroundColor:
                      hud.bowCharge >= 0.9
                        ? '#facc15'
                        : hud.bowCharge >= 0.5
                        ? '#4ade80'
                        : '#38bdf8',
                  }}
                />
              </div>
              <div className="text-[10px] font-extrabold tracking-wider uppercase text-[#f8f0dc] hud-text-stroke tabular-nums">
                {hud.bowCharge >= 0.9
                  ? 'TAM GÜÇ!'
                  : hud.bowCharge > 0.01
                  ? `GERİLİM %${Math.round(hud.bowCharge * 100)}`
                  : 'NİŞAN YAKINLAŞTIRMA'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOP PERIMETER BAR */}
      <div className="flex items-start justify-between gap-3 w-full">
        {/* Top-Left: Warrior Vitality & Class Weapon Quest Plaque */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-[#101921]/88 border border-[#d6b166]/40 px-3.5 py-2.5 min-w-[190px] sm:min-w-[244px] max-w-[276px] shadow-lg">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-8 h-8 text-white font-display font-extrabold text-sm flex items-center justify-center shrink-0 tabular-nums border border-white/30"
                  style={{ backgroundColor: classDef.colorHex }}
                >
                  {profile.level}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#f7f0df] truncate leading-tight">
                    {profile.displayName}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider truncate">
                    <span style={{ color: classDef.accentHex }}>{classDef.nameTr}</span>
                    <span className="text-[#95a8b8]">
                      {' '}
                      ·{' '}
                      {isGuest
                        ? 'Misafir'
                        : saveStatus === 'saving'
                        ? 'Kaydediliyor...'
                        : 'Bulut'}
                    </span>
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

            {/* Health Bar */}
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

          {/* Class Signature Weapon Quest / Active Weapon Strip */}
          <div
            className="bg-[#0e171f]/88 border border-white/15 border-l-4 px-3 py-1.5 max-w-[276px] shadow-md"
            style={{
              borderLeftColor:
                profile.playerClass === 'yeti' && profile.yetiRuneUnlocked
                  ? '#38bdf8'
                  : classDef.colorHex,
            }}
            data-testid="class-quest-strip"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-extrabold uppercase tracking-wider"
                style={{
                  color:
                    profile.playerClass === 'yeti' && profile.yetiRuneUnlocked
                      ? '#67e8f9'
                      : profile.classWeaponUnlocked
                      ? '#7be6a0'
                      : classDef.accentHex,
                }}
              >
                {profile.playerClass === 'yeti' && profile.yetiRuneUnlocked
                  ? 'RÜNİK YETİ · 5x GÜÇ'
                  : profile.classWeaponUnlocked
                  ? `Aktif: ${derived.activeWeaponNameTr}`
                  : `Görev: ${classDef.weaponNameTr}`}
              </span>
              {(profile.classWeaponUnlocked ||
                (profile.playerClass === 'yeti' && profile.yetiRuneUnlocked)) && (
                <span className="text-[9px] font-bold uppercase text-[#7be6a0]">
                  {profile.playerClass === 'yeti' && profile.yetiRuneUnlocked ? '5x RÜN' : 'AÇILDI'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#d9e1e8] leading-snug mt-0.5">{questLine}</div>
          </div>

          {/* Fishman Ocean Swimming Badge */}
          {hud.isSwimming && (
            <div
              data-testid="swimming-badge"
              className="bg-[#0b2a3c]/92 border border-[#38bdf8]/75 px-3 py-1 max-w-[276px] text-[10px] font-extrabold uppercase tracking-wider text-[#7de6ff]"
            >
              Balıkadam · Denizde Yüzüyor (+%38 Hız)
            </div>
          )}

          {/* Active Timed Food Buffs Strip */}
          {hud.activeBuffs.length > 0 && (
            <div
              data-testid="active-food-buffs"
              className="flex flex-wrap gap-1 max-w-[276px]"
            >
              {hud.activeBuffs.map((b) => (
                <div
                  key={b.foodId}
                  className="px-2 py-0.5 bg-[#0d1814]/90 border text-[10px] font-bold text-[#f3f0e4] tabular-nums"
                  style={{ borderColor: b.accentColor }}
                >
                  {b.nameTr} · {Math.ceil(b.remainingSec)}s
                </div>
              ))}
            </div>
          )}

          {/* Sailing Ship Hull HP Bar */}
          {hud.isSailing && hud.activeShipName && (
            <div
              data-testid="ship-hud-panel"
              className="bg-[#0d1d29]/92 border border-[#5cc8ff]/70 px-3 py-1.5 max-w-[276px] shadow-md"
            >
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider mb-1">
                <span className="text-[#87d9ff] truncate">{hud.activeShipName}</span>
                <span className="text-[#e8f6ff] tabular-nums">
                  {hud.shipHp} / {hud.shipMaxHp}
                </span>
              </div>
              <div className="h-2 bg-[#071018] border border-white/15 overflow-hidden">
                <div
                  className="h-full bg-[#38bdf8] transition-[width] duration-150"
                  style={{
                    width: `${hud.shipMaxHp > 0 ? Math.max(0, Math.min(100, (hud.shipHp / hud.shipMaxHp) * 100)) : 0}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Center: Current Landform / Biome & Dynamic World Event Banners */}
        <div className="hidden sm:flex flex-col items-center text-center gap-1.5 mt-0.5">
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
                  ? 'Başlangıç Kasabası · Güvenli'
                  : pvpEnabled
                  ? 'Açık PvP Bölgesi'
                  : 'Barışçıl Keşif'}
              </span>
              <span
                style={{
                  color:
                    hud.weather === 'rainy'
                      ? '#8ec7f0'
                      : hud.weather === 'foggy'
                      ? '#cfdbe3'
                      : '#f2d079',
                }}
              >
                · {weatherPreset.labelTr}
              </span>
              {partyCode && (
                <span className="text-[#72d6ff]">· Grup: {partyCode}</span>
              )}
            </div>
          </div>

          {/* Active Desert Arena 5-Wave Banner */}
          {hud.arenaWave > 0 && (
            <div
              data-testid="arena-wave-banner"
              className="bg-[#341614]/94 border border-[#f2a84b]/80 px-4 py-1.5 shadow-lg"
            >
              <div className="text-xs font-extrabold tracking-wider uppercase text-[#ffd98f] tabular-nums">
                Çöl Arenası · Dalga {hud.arenaWave}/{hud.arenaWaveTotal} · Kalan: {hud.arenaRemaining}
              </div>
              {hud.arenaWave === hud.arenaWaveTotal && (
                <div className="text-[10px] font-bold text-[#ff8e7b] uppercase tracking-wider">
                  Son Dalga: 500 Sv. Çöl Ork Şefi Sahada!
                </div>
              )}
            </div>
          )}

          {/* Active Bandit Ambush World Event Banner */}
          {hud.ambushActive && (
            <div
              data-testid="ambush-banner"
              className="bg-[#3b1014]/94 border border-[#ff5f57]/85 px-4 py-1.5 shadow-lg animate-pulse"
            >
              <div className="text-xs font-extrabold tracking-wider uppercase text-[#ffd4cf] tabular-nums">
                HAYDUT PUSUSU · 250 Sv. Haydutlar · Kalan: {hud.ambushRemaining}
              </div>
            </div>
          )}

          {/* Active Ocean Pirate Ship Ambush Banner */}
          {hud.pirateAmbushActive && (
            <div
              data-testid="pirate-ambush-banner"
              className="bg-[#3b0c12]/95 border border-[#ff4f42]/90 px-4 py-1.5 shadow-lg"
            >
              <div className="text-xs font-extrabold tracking-wider uppercase text-[#ffd7cf] tabular-nums">
                KORSAN GEMİSİ BASKINI · 1000 Sv. Kaptan &amp; Mürettebat · Kalan: {hud.pirateRemaining}
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Navigable Landform Minimap + Square Action Buttons */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 pointer-events-auto flex-nowrap">
            <button
              type="button"
              tabIndex={-1}
              data-testid="inventory-open-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenInventory();
              }}
              aria-label="Envanter (I)"
              title="Envanter: Silah, Zırh & Yemek [I]"
              className="h-9 px-2.5 bg-[#101921]/90 hover:bg-[#1c2c38] border border-[#e3b55a]/65 text-[#fae3ad] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="4" y="7" width="16" height="13" rx="1" />
                <path d="M9 7V5a3 3 0 016 0v2M9 12h6" />
              </svg>
              <span className="hidden md:inline">Envanter</span>
              <span className="text-[10px] text-[#c7b68e]">[I]</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="upgrade-open-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenUpgrade();
              }}
              aria-label="Kasaba Gelişim ve Ahır (U)"
              title="Gelişim & Ahır [U]"
              className="h-9 px-2.5 bg-[#101921]/90 hover:bg-[#1c2c38] border border-[#d6b166]/45 text-[#f2dca4] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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
              aria-label="Arkadaşlar ve Oda (T)"
              title="Arkadaşlar & Oda [T]"
              className="h-9 px-2.5 bg-[#101921]/90 hover:bg-[#1c2c38] border border-[#d6b166]/45 text-[#d7e8f5] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="8" r="3.5" />
                <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
                <circle cx="17.5" cy="9.5" r="2.5" />
                <path d="M16 14.2c2.4.4 4.5 2 4.5 4.8" />
              </svg>
              <span className="tabular-nums">{onlineCount}</span>
              <span className="hidden xl:inline text-[10px] text-[#9eb4c7]">{roomCode}</span>
              <span className="text-[10px] text-[#c7b68e]">[T]</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="camera-toggle-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleCameraMode();
              }}
              aria-label={
                hud.cameraMode === 'first_person'
                  ? 'Üçüncü Şahıs Kameraya Geç (C)'
                  : 'Birinci Şahıs Kameraya Geç (C)'
              }
              title="Kamera Modu [C]"
              className={`h-9 px-2.5 border text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                hud.cameraMode === 'first_person'
                  ? 'bg-[#2a2315]/92 border-[#f2c863] text-[#ffebc0]'
                  : 'bg-[#101921]/90 hover:bg-[#1c2c38] border-[#d6b166]/45 text-[#dce8f2]'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
                <circle cx="12" cy="12" r="2.8" />
              </svg>
              <span className="hidden lg:inline">
                {hud.cameraMode === 'first_person' ? '1. Şahıs' : '3. Şahıs'}
              </span>
              <span className="text-[10px] text-[#c7b68e]">[C]</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              data-testid="weather-toggle-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onCycleWeather();
              }}
              aria-label={`Hava Durumu: ${weatherPreset.labelTr} (V)`}
              title={`Hava Durumu: ${weatherPreset.labelTr} [V]`}
              className="h-9 px-2.5 bg-[#101921]/90 hover:bg-[#1c2c38] border border-[#d6b166]/45 text-[#dce8f2] text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              {hud.weather === 'clear' ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#f5cf6e]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.5" />
                  <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
                </svg>
              ) : hud.weather === 'rainy' ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#8ec7f0]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6.5 15h11a3.5 3.5 0 00.6-6.95A5.5 5.5 0 007.4 6.8 4 4 0 006.5 15z" />
                  <path d="M8.5 18l-1 3M12.5 18l-1 3M16.5 18l-1 3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#cfdbe3]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 9h16M3 13h18M5 17h14" strokeLinecap="round" />
                </svg>
              )}
              <span className="hidden lg:inline">{weatherPreset.labelTr}</span>
              <span className="text-[10px] text-[#c7b68e]">[V]</span>
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

          {/* Ocean Archipelago Minimap (Main Island + 5 Ocean Islands + Ships) */}
          <div className="bg-[#0e171f]/90 border border-[#d6b166]/45 p-1 shadow-lg">
            <svg viewBox="0 0 112 112" className="w-[116px] h-[116px] md:w-[134px] md:h-[134px] block" aria-label="Okyanus ve Adalar Haritası">
              <defs>
                <clipPath id="minimap-clip">
                  <circle cx="56" cy="56" r="50" />
                </clipPath>
              </defs>
              {/* Vast Ocean Background */}
              <circle cx="56" cy="56" r="50" fill="#134d73" stroke="#c9a559" strokeWidth="1.5" />
              <g clipPath="url(#minimap-clip)">
                {/* Main Island */}
                <circle
                  cx="56"
                  cy="56"
                  r={MAIN_ISLAND_RADIUS * mapScale}
                  fill="#4d8247"
                  stroke="#d9c082"
                  strokeWidth="1"
                />
                {/* Northwest Dark Forest on Main Island */}
                <circle
                  cx={darkForestSvg.mx}
                  cy={darkForestSvg.my}
                  r={Math.max(2.6, DARK_FOREST_RADIUS * mapScale)}
                  fill="#1e4d30"
                />
                {/* Main Island Silver Lake */}
                <circle cx={shipSvg.mx} cy={shipSvg.my} r="2.6" fill="#3a8cb8" />
                {/* Starter Town Safe Zone */}
                <circle
                  cx={safeSvg.mx}
                  cy={safeSvg.my}
                  r={Math.max(2.2, SAFE_ZONE_RADIUS * mapScale)}
                  fill="rgba(227, 190, 108, 0.45)"
                  stroke="#f2cf78"
                  strokeWidth="0.8"
                />
                {/* Main Island South Ocean Harbor */}
                <rect
                  x={harborSvg.mx - 2.4}
                  y={harborSvg.my - 1.5}
                  width="4.8"
                  height="3.0"
                  fill="#e3b659"
                  stroke="#111"
                  strokeWidth="0.5"
                />

                {/* Island 1: Pirate Island (SE) */}
                <circle
                  cx={pirateSvg.mx}
                  cy={pirateSvg.my}
                  r={Math.max(4.5, PIRATE_ISLAND_RADIUS * mapScale)}
                  fill="#c28e46"
                  stroke="#ff6b4a"
                  strokeWidth="0.9"
                />
                {/* Island 2: Wizard Island (SW) */}
                <circle
                  cx={wizardSvg.mx}
                  cy={wizardSvg.my}
                  r={Math.max(4.5, WIZARD_ISLAND_RADIUS * mapScale)}
                  fill="#62388c"
                  stroke="#c084fc"
                  strokeWidth="0.9"
                />
                {/* Island 3: Floating Town (South) */}
                <circle
                  cx={floatingSvg.mx}
                  cy={floatingSvg.my}
                  r={Math.max(3.8, FLOATING_TOWN_RADIUS * mapScale)}
                  fill="#a67c46"
                  stroke="#f5d278"
                  strokeWidth="0.9"
                />
                {/* Island 4: Giant Whirlpool (NW) */}
                <circle
                  cx={whirlpoolSvg.mx}
                  cy={whirlpoolSvg.my}
                  r={Math.max(3.8, WHIRLPOOL_PULL_RADIUS * mapScale)}
                  fill="#0b2a45"
                  stroke="#38bdf8"
                  strokeWidth="1.1"
                  strokeDasharray="2 1.5"
                />
                {/* Underwater City Atlantis (Far North) */}
                <circle
                  cx={underwaterSvg.mx}
                  cy={underwaterSvg.my}
                  r={Math.max(4.5, UNDERWATER_CITY_RADIUS * mapScale)}
                  fill="#0d6e82"
                  stroke="#67e8f9"
                  strokeWidth="1"
                />
                {/* Island 5: Misty Horror Forest (NE) */}
                <circle
                  cx={horrorSvg.mx}
                  cy={horrorSvg.my}
                  r={Math.max(4.8, HORROR_FOREST_RADIUS * mapScale)}
                  fill="#292238"
                  stroke="#9c88b8"
                  strokeWidth="0.9"
                />

                {/* Massive 4x Kuzey Kutbu (North Pole) Continent */}
                <circle
                  cx={northPoleSvg.mx}
                  cy={northPoleSvg.my}
                  r={Math.max(8.2, NORTH_POLE_RADIUS * mapScale)}
                  fill="#dbeafe"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                />
                {/* Lv.1000 Yeti Boss Arena Marker */}
                <circle
                  cx={yetiBossSvg.mx}
                  cy={yetiBossSvg.my}
                  r="2.4"
                  fill="#06b6d4"
                  stroke="#ffffff"
                  strokeWidth="0.7"
                />

                {/* Main Island Relic Dots */}
                <circle cx={crystalSvg.mx} cy={crystalSvg.my} r="1.7" fill="#4fb3ff" />
                <circle cx={treeSvg.mx} cy={treeSvg.my} r="1.7" fill="#4be38a" />
                <circle cx={arenaSvg.mx} cy={arenaSvg.my} r="1.9" fill="#ff7266" />

                {/* Actors (Convoy Ships, Pirate Ship, Player Ship, Enemies, Friends, Horse) */}
                {hud.actors
                  .filter((a) => a.kind !== 'self')
                  .map((a) => {
                    const pos = mapToSvg(a.x, a.z);
                    if (a.kind === 'convoy') {
                      return (
                        <rect
                          key={a.id}
                          x={pos.mx - 2.1}
                          y={pos.my - 2.1}
                          width="4.2"
                          height="4.2"
                          fill="#f7cf63"
                          stroke="#111"
                          strokeWidth="0.7"
                        />
                      );
                    }
                    if (a.kind === 'pirate_ship') {
                      return (
                        <polygon
                          key={a.id}
                          points={`${pos.mx},${pos.my - 3.6} ${pos.mx + 3.2},${pos.my + 2.8} ${pos.mx - 3.2},${pos.my + 2.8}`}
                          fill="#ff3b30"
                          stroke="#fff"
                          strokeWidth="0.8"
                        />
                      );
                    }
                    if (a.kind === 'ship') {
                      return (
                        <polygon
                          key={a.id}
                          points={`${pos.mx},${pos.my - 3.2} ${pos.mx + 2.6},${pos.my + 2.4} ${pos.mx - 2.6},${pos.my + 2.4}`}
                          fill="#5cc8ff"
                          stroke="#0b1824"
                          strokeWidth="0.7"
                        />
                      );
                    }
                    if (a.kind === 'horse') {
                      return (
                        <polygon
                          key={a.id}
                          points={`${pos.mx},${pos.my - 2.8} ${pos.mx + 2.4},${pos.my} ${pos.mx},${pos.my + 2.8} ${pos.mx - 2.4},${pos.my}`}
                          fill="#f7d06b"
                          stroke="#1a1206"
                          strokeWidth="0.7"
                        />
                      );
                    }
                    if (a.kind === 'enemy') {
                      return (
                        <circle
                          key={a.id}
                          cx={pos.mx}
                          cy={pos.my}
                          r={1.35}
                          fill="#eb5546"
                        />
                      );
                    }
                    const fill = a.kind === 'friend' ? '#5cd6ff' : '#f5b841';
                    return (
                      <circle
                        key={a.id}
                        cx={pos.mx}
                        cy={pos.my}
                        r={2.5}
                        fill={fill}
                        stroke="#0b1116"
                        strokeWidth="0.75"
                      />
                    );
                  })}

                {/* Local Player Marker */}
                {(() => {
                  const selfPos = mapToSvg(hud.playerX, hud.playerZ);
                  const deg = (-hud.playerYaw * 180) / Math.PI + 180;
                  return (
                    <g transform={`translate(${selfPos.mx}, ${selfPos.my}) rotate(${deg})`}>
                      <polygon points="0,-4.5 3.1,3.5 0,1.6 -3.1,3.5" fill="#ffffff" stroke="#0d141b" strokeWidth="1" />
                    </g>
                  );
                })()}
              </g>
              <text x="56" y="13" textAnchor="middle" fill="#f5e6bf" fontSize="8" fontWeight="700">
                K
              </text>
            </svg>
          </div>
        </div>
      </div>

      {/* BOTTOM PERIMETER: Combat Toasts (left) + Compact Ability & Horse Bar (center) */}
      <div className="flex items-end justify-between gap-4 w-full">
        {/* Bottom-Left: Minimal Event Feed */}
        <div className="flex flex-col gap-1 max-w-[270px]">
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

        {/* Bottom-Center: Compact Combat Skill Slots, Horse Controls & Context Interact Cue */}
        <div className="flex flex-col items-center gap-1.5 mx-auto">
          {hud.nearbyInteractable && (
            <button
              type="button"
              tabIndex={-1}
              data-testid="interact-prompt-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                onInteract();
              }}
              className={`pointer-events-auto px-3.5 py-1.5 border text-xs font-bold tracking-wide shadow-md cursor-pointer ${interactStyle}`}
            >
              {hud.nearbyInteractable.label}
            </button>
          )}

          {hud.isMounted && (
            <div
              data-testid="mounted-lock-banner"
              className="px-3 py-1 bg-[#2b2011]/92 border border-[#e3b55a]/70 text-[10px] font-bold uppercase tracking-wider text-[#f7dca2]"
            >
              At Üstünde · Yetenekler Kapalı · İnmek İçin [F]
            </div>
          )}

          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Primary Weapon Attack */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onAttackLight();
              }}
              aria-label={`Hızlı ${lightLabel} Saldırısı (J)`}
              className={`relative w-14 h-14 bg-[#101921]/90 border border-[#d6b166]/55 flex flex-col items-center justify-center transition-opacity ${
                hud.isMounted ? 'opacity-45 cursor-not-allowed' : 'hover:bg-[#1a2834] cursor-pointer'
              }`}
            >
              {derived.activeWeaponKind === 'bow' ? (
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#7ee8a8]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 19L19 5M14 5h5v5" />
                  <path d="M5 7c4 2 8 6 10 10" />
                </svg>
              ) : derived.activeWeaponKind === 'mace' ? (
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#7ec4ff]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 19l9-9" />
                  <polygon points="15,4 20,9 16,13 11,8" />
                </svg>
              ) : derived.activeWeaponKind === 'spear' ? (
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#ff8b80]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 20L17 7" />
                  <polygon points="15,4 20,4 20,9" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#f5e3b0]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M19 5L9 15" />
                  <path d="M14 5h5v5" />
                  <path d="M5 19l4-4" />
                  <path d="M7 13l4 4" />
                </svg>
              )}
              <span className="text-[9px] font-bold uppercase text-[#d8cba9] mt-0.5">{lightLabel}</span>
              <span className="absolute top-0.5 left-1 text-[9px] font-bold text-[#e3b55a]">J</span>
              {hud.lightCooldown > 0.05 && (
                <div className="absolute inset-0 bg-[#080d12]/75 flex items-center justify-center text-xs font-bold text-[#f2d079] tabular-nums">
                  {hud.lightCooldown.toFixed(1)}
                </div>
              )}
            </button>

            {/* Heavy Special Attack */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onAttackHeavy();
              }}
              aria-label={`Ağır ${heavyLabel} Saldırısı (K)`}
              className={`relative w-14 h-14 bg-[#101921]/90 border border-[#e39644]/60 flex flex-col items-center justify-center transition-opacity ${
                hud.isMounted ? 'opacity-45 cursor-not-allowed' : 'hover:bg-[#1a2834] cursor-pointer'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#ffbe6b]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="7" strokeDasharray="4 2" />
                <path d="M12 4v16M4 12h16" />
              </svg>
              <span className="text-[9px] font-bold uppercase text-[#f0cfa4] mt-0.5">{heavyLabel}</span>
              <span className="absolute top-0.5 left-1 text-[9px] font-bold text-[#f0a54a]">K</span>
              {hud.heavyCooldown > 0.05 && (
                <div className="absolute inset-0 bg-[#080d12]/75 flex items-center justify-center text-xs font-bold text-[#ffbe6b] tabular-nums">
                  {hud.heavyCooldown.toFixed(1)}
                </div>
              )}
            </button>

            {/* Class-Specific Escape Ability [Shift] */}
            {(() => {
              const shortEscapeLabel =
                profile.playerClass === 'guardian'
                  ? 'Kalkan'
                  : profile.playerClass === 'archer'
                  ? 'Rüzgar'
                  : profile.playerClass === 'lancer'
                  ? 'Alev Atıl'
                  : profile.playerClass === 'bomber'
                  ? 'Top Fırlat'
                  : profile.playerClass === 'mage'
                  ? 'Işınlan'
                  : profile.playerClass === 'assassin'
                  ? 'Gölge'
                  : profile.playerClass === 'fishman'
                  ? 'Dalga Sörf'
                  : 'Buzul Çığ';
              return (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="class-escape-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onDash();
                  }}
                  aria-label={`${hud.escapeNameTr} (Shift)`}
                  title={`${hud.escapeNameTr} [Shift]`}
                  className={`relative min-w-[66px] px-1.5 h-14 bg-[#101921]/90 border border-[#65b5e0]/55 flex flex-col items-center justify-center transition-opacity ${
                    hud.isMounted ? 'opacity-45 cursor-not-allowed' : 'hover:bg-[#1a2834] cursor-pointer'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#8ed4fa]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 12h13" />
                    <path d="M13 6l6 6-6 6" />
                    <path d="M3 8h6M3 16h6" opacity="0.6" />
                  </svg>
                  <span className="text-[8.5px] font-bold uppercase text-[#bce1f5] mt-0.5 whitespace-nowrap">
                    {shortEscapeLabel}
                  </span>
                  <span className="absolute top-0.5 left-1 text-[8px] font-bold text-[#8ed4fa]">SHF</span>
                  {hud.dashCooldown > 0.05 && (
                    <div className="absolute inset-0 bg-[#080d12]/75 flex items-center justify-center text-xs font-bold text-[#8ed4fa] tabular-nums">
                      {hud.dashCooldown.toFixed(1)}
                    </div>
                  )}
                </button>
              );
            })()}

            {/* Horse Mount/Dismount [F] & Summon [G] Controls (shown once Horse is purchased) */}
            {hud.hasHorse && (
              <>
                <div className="w-px h-10 bg-[#d6b166]/35 mx-0.5" />
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="horse-mount-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleMount();
                  }}
                  aria-label={hud.isMounted ? 'Attan İn (F)' : 'Ata Bin (F)'}
                  className={`relative w-14 h-14 border flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    hud.isMounted
                      ? 'bg-[#3b2912]/94 border-[#f2c863] text-[#ffebc0]'
                      : 'bg-[#101921]/90 hover:bg-[#1a2834] border-[#d6b166]/55 text-[#f0d89e]'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 16l3-6 4-2 4-4 3 2-1 4 2 3v5M7 16v4M14 14v6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[9px] font-bold uppercase mt-0.5">
                    {hud.isMounted ? 'İn' : 'Ata Bin'}
                  </span>
                  <span className="absolute top-0.5 left-1 text-[9px] font-bold text-[#f2c863]">F</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="horse-summon-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSummonHorse();
                  }}
                  aria-label="Atı Yanına Çağır (G)"
                  className="relative w-14 h-14 bg-[#101921]/90 hover:bg-[#1a2834] border border-[#72c98e]/55 text-[#9ee8b4] flex flex-col items-center justify-center cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 4v10M8 10l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 19h14" strokeLinecap="round" />
                  </svg>
                  <span className="text-[9px] font-bold uppercase mt-0.5">Çağır</span>
                  <span className="absolute top-0.5 left-1 text-[9px] font-bold text-[#8ce8a8]">G</span>
                </button>
              </>
            )}

            {/* Ship Board / Disembark [B] Control (shown once player owns a Ship) */}
            {hud.hasShip && (
              <>
                <div className="w-px h-10 bg-[#5cc8ff]/40 mx-0.5" />
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="ship-board-btn"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleBoardShip();
                  }}
                  aria-label={hud.isSailing ? 'Gemiden İn (B)' : 'Gemiye Bin (B)'}
                  className={`relative w-14 h-14 border flex flex-col items-center justify-center cursor-pointer transition-colors ${
                    hud.isSailing
                      ? 'bg-[#0e324a]/94 border-[#5cc8ff] text-[#d6f4ff]'
                      : 'bg-[#101921]/90 hover:bg-[#1a2834] border-[#5cc8ff]/55 text-[#9ee0ff]'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 16l2 4h14l2-4H3z" />
                    <path d="M12 4v12M12 5l6 6h-6" />
                  </svg>
                  <span className="text-[9px] font-bold uppercase mt-0.5">
                    {hud.isSailing ? 'İn' : 'Gemi'}
                  </span>
                  <span className="absolute top-0.5 left-1 text-[9px] font-bold text-[#7ad6ff]">B</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom-Right: Compact FP look hint or spacer */}
        <div className="hidden md:flex justify-end w-[180px]">
          {hud.cameraMode === 'first_person' && (
            <div className="px-2.5 py-1 bg-[#0e161d]/82 border border-[#d6b166]/35 text-[10px] font-semibold text-[#e6dec9] text-right">
              Fare / Ok Tuşları Bakış · [C] 3. Şahıs
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
