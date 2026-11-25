import type { PlayerClassId } from './combatRules';

export const DESERT_ARENA_TOTAL_WAVES = 5;
export const DESERT_ARENA_BASE_ENEMY_COUNT = 5;
export const DESERT_ARENA_BASE_LEVEL = 50;
export const DESERT_ARENA_ORC_BOSS_LEVEL = 500;

export const BANDIT_AMBUSH_INTERVAL_SEC = 300; // 5 minutes
export const BANDIT_AMBUSH_CHANCE = 0.05; // 5%
export const BANDIT_LEVEL = 250;
export const BANDIT_ARCHER_COUNT = 2;
export const BANDIT_MELEE_COUNT = 3;

export const DARK_FOREST_ELF_COUNT = 6;
export const DARK_FOREST_ELF_LEVEL = 50;

export const HORSE_PRICE = 400;
export const HORSE_SPEED_MULT = 1.72;
export const HORSE_MOUNT_RADIUS = 6.2;

// Horror Forest (Sisli Korku Ormanı) minimum monster level
export const HORROR_FOREST_MIN_LEVEL = 800;

// North Pole Giant Yeti Boss & Yeti Rune (5x multiplier!)
export const YETI_BOSS_LEVEL = 1000;
export const YETI_RUNE_STAT_MULTIPLIER = 5;

// Bow Draw / Charge & Mouse2 Zoom scaling
export const BOW_MAX_CHARGE_SEC = 1.35;

export function getBowChargeMultiplier(charge01: number): number {
  const c = Math.max(0, Math.min(1, charge01));
  // Smooth power curve: quick release = 0.85x, full draw = 2.85x damage!
  return Number((0.85 + Math.pow(c, 1.35) * 2.0).toFixed(2));
}

export function getBowArrowSpeed(charge01: number): number {
  const c = Math.max(0, Math.min(1, charge01));
  return Number((46 + c * 52).toFixed(1));
}

// Trade / Escort Convoy Boats between Main Island Harbor & Floating Town
// Ship destruction gold fixed at 1000 Altın + weakened enemy ship cannons & cannoneers
export const CONVOY_BOAT_COUNT = 2;
export const CONVOY_MAX_TIER = 10;
export const CONVOY_BASE_GOLD = 1000;
export const CONVOY_GOLD_STEP = 0;
export const CONVOY_CREW_STEP = 5;

export const ENEMY_CANNON_COOLDOWN_SEC = 4.6;
export const ENEMY_CANNON_HULL_MULT = 0.42;
export const ENEMY_CANNON_SPEED = 40;

export interface ConvoyTierConfig {
  tier: number;
  nameTr: string;
  goldReward: number;
  xpReward: number;
  hullHp: number;
  shipScale: number;
  crewCount: number;
  crewLevel: number;
  hasNavyCaptain: boolean;
  captainLevel: number;
  cannoneerCount: number;
  cannoneerLevel: number;
  cannonDamage: number;
}

/**
 * Escalating Convoy Vessel configuration (Tiers 1..10):
 *  - Every destroyed ship drops 1000 Altın
 *  - Weakened cannoneers & ship cannon attacks for fair naval duels
 *  - Tier 10 (Final): Navy Dreadnought with 1 Navy Captain + 5 Cannoneers
 */
export function getConvoyTierConfig(tier: number): ConvoyTierConfig {
  const clamped = Math.max(1, Math.min(CONVOY_MAX_TIER, Math.floor(tier)));
  const goldReward = CONVOY_BASE_GOLD + (clamped - 1) * CONVOY_GOLD_STEP;
  const xpReward = 140 + (clamped - 1) * 140;
  const hullHp = 520 + (clamped - 1) * 850;
  const shipScale = Number((1.0 + (clamped - 1) * 0.14).toFixed(2));
  const isFinal = clamped === CONVOY_MAX_TIER;
  const crewCount = (clamped - 1) * CONVOY_CREW_STEP;
  const crewLevel = 40 + (clamped - 1) * 45;
  const cannoneerCount = isFinal ? 5 : clamped >= 5 ? Math.min(3, Math.floor((clamped - 3) / 2)) : 0;

  return {
    tier: clamped,
    nameTr:
      clamped === 1
        ? 'Yüzen Kasaba Teknesi'
        : isFinal
        ? '10. Sv. Donanma Amiral Gemisi'
        : `${clamped}. Sv. Yüzen Kasaba Kalyonu`,
    goldReward,
    xpReward,
    hullHp,
    shipScale,
    crewCount,
    crewLevel,
    hasNavyCaptain: isFinal,
    captainLevel: isFinal ? 600 : 0,
    cannoneerCount,
    cannoneerLevel: isFinal ? 200 : 100,
    // Significantly weakened enemy cannon attacks (was 80..165 -> now 26..58)
    cannonDamage: isFinal ? 58 : 24 + clamped * 3,
  };
}

// Ocean Pirate Ambush Event (low chance while sailing in open ocean)
export const PIRATE_AMBUSH_INTERVAL_SEC = 55;
export const PIRATE_AMBUSH_CHANCE = 0.08;

export interface PirateCrewSpec {
  swordsmenCount: number;
  swordsmenLevel: number;
  firstMatesCount: number;
  firstMatesLevel: number;
  captainCount: number;
  captainLevel: number;
  cannoneersCount: number;
  cannoneersLevel: number;
  archersCount: number;
  archersLevel: number;
  totalCrew: number;
  shipHullHp: number;
  shipGoldReward: number;
  cannoneerDamage: number;
}

export function getPirateShipCrewSpec(): PirateCrewSpec {
  return {
    swordsmenCount: 20,
    swordsmenLevel: 150,
    firstMatesCount: 2,
    firstMatesLevel: 500,
    captainCount: 1,
    captainLevel: 1000,
    cannoneersCount: 2,
    cannoneersLevel: 100,
    archersCount: 4,
    archersLevel: 100,
    totalCrew: 29,
    shipHullHp: 12000,
    shipGoldReward: 1000,
    cannoneerDamage: 48,
  };
}

// Class-specific unique Escape / Dash abilities (Shift) for all 8 classes
export type ClassEscapeStyle =
  | 'shield_ram'
  | 'wind_vault'
  | 'flame_lunge'
  | 'cannon_launch'
  | 'arcane_blink'
  | 'shadow_vanish'
  | 'tidal_surf'
  | 'frost_leap';

export interface ClassEscapeSpec {
  id: string;
  style: ClassEscapeStyle;
  nameTr: string;
  shortDescTr: string;
  durationSec: number;
  cooldownSec: number;
  staminaCost: number;
  horizontalSpeed: number;
  verticalBoost: number;
  teleportDist: number;
  instantTeleportDist?: number;
  landingDamageMult?: number;
  landingAoeRadius?: number;
  colorHex: string;
  accentColor: string;
}

export type ClassEscapeConfig = ClassEscapeSpec;

export const CLASS_ESCAPE_CONFIG: Record<PlayerClassId, ClassEscapeSpec> = {
  guardian: {
    id: 'crystal_shield_charge',
    style: 'shield_ram',
    nameTr: 'Kristal Kalkan Hücumu',
    shortDescTr: 'Mavi kristal kalkanla ileri atılır, düşmanları iter.',
    durationSec: 0.48,
    cooldownSec: 2.2,
    staminaCost: 22,
    horizontalSpeed: 26,
    verticalBoost: 2.5,
    teleportDist: 0,
    landingDamageMult: 0.75,
    landingAoeRadius: 4.5,
    colorHex: '#63b3ff',
    accentColor: '#63b3ff',
  },
  archer: {
    id: 'wind_vault',
    style: 'wind_vault',
    nameTr: 'Rüzgar Taklası',
    shortDescTr: 'Hava akımıyla yükseğe sıçrayıp çevik takla atar.',
    durationSec: 0.46,
    cooldownSec: 1.7,
    staminaCost: 18,
    horizontalSpeed: 28,
    verticalBoost: 9.2,
    teleportDist: 0,
    colorHex: '#6ee09d',
    accentColor: '#6ee09d',
  },
  lancer: {
    id: 'flame_spear_rush',
    style: 'flame_lunge',
    nameTr: 'Alevli Mızrak Atılışı',
    shortDescTr: 'Alev iziyle hızla ileri saplanıp yolu yarar.',
    durationSec: 0.44,
    cooldownSec: 1.9,
    staminaCost: 22,
    horizontalSpeed: 33,
    verticalBoost: 3.0,
    teleportDist: 0,
    landingDamageMult: 0.9,
    landingAoeRadius: 4.0,
    colorHex: '#ff7b70',
    accentColor: '#ff7b70',
  },
  bomber: {
    id: 'cannon_launch',
    style: 'cannon_launch',
    nameTr: 'Top Fırlatışı',
    shortDescTr: 'Dev bir topun içine girip gökyüzünden çok uzağa fırlar!',
    durationSec: 1.15,
    cooldownSec: 3.0,
    staminaCost: 26,
    horizontalSpeed: 46,
    verticalBoost: 19.5,
    teleportDist: 0,
    landingDamageMult: 1.25,
    landingAoeRadius: 7.5,
    colorHex: '#fb923c',
    accentColor: '#fb923c',
  },
  mage: {
    id: 'star_blink',
    style: 'arcane_blink',
    nameTr: 'Yıldız Işınlanması',
    shortDescTr: 'Ametist geçitten anında ileri ışınlanır.',
    durationSec: 0.28,
    cooldownSec: 2.0,
    staminaCost: 22,
    horizontalSpeed: 10,
    verticalBoost: 2.0,
    teleportDist: 23,
    instantTeleportDist: 23,
    landingDamageMult: 0.65,
    landingAoeRadius: 4.8,
    colorHex: '#c084fc',
    accentColor: '#c084fc',
  },
  assassin: {
    id: 'shadow_vanish',
    style: 'shadow_vanish',
    nameTr: 'Gölge Kayboluşu',
    shortDescTr: 'Duman olup görünmez biçimde çok hızlı ileri süzülür.',
    durationSec: 0.42,
    cooldownSec: 1.55,
    staminaCost: 18,
    horizontalSpeed: 39,
    verticalBoost: 3.2,
    teleportDist: 0,
    colorHex: '#2dd4bf',
    accentColor: '#2dd4bf',
  },
  fishman: {
    id: 'tidal_wave_surf',
    style: 'tidal_surf',
    nameTr: 'Gelgit Dalgası Sörfü',
    shortDescTr: 'Ayaklarının altında dev dalga çıkarıp karada ve denizde sörf yapar!',
    durationSec: 0.64,
    cooldownSec: 1.9,
    staminaCost: 20,
    horizontalSpeed: 33,
    verticalBoost: 4.0,
    teleportDist: 0,
    landingDamageMult: 0.8,
    landingAoeRadius: 5.2,
    colorHex: '#38bdf8',
    accentColor: '#38bdf8',
  },
  yeti: {
    id: 'glacial_avalanche_leap',
    style: 'frost_leap',
    nameTr: 'Buzul Çığ Sıçrayışı',
    shortDescTr: 'Devasa bir sıçrayışla buz çığı indirir ve düşmanları dondurur.',
    durationSec: 0.72,
    cooldownSec: 2.3,
    staminaCost: 24,
    horizontalSpeed: 30,
    verticalBoost: 14.5,
    teleportDist: 0,
    landingDamageMult: 1.15,
    landingAoeRadius: 6.8,
    colorHex: '#7dd3fc',
    accentColor: '#7dd3fc',
  },
};

export interface DesertArenaWaveConfig {
  wave: number;
  regularCount: number;
  regularLevel: number;
  hasOrcBoss: boolean;
  orcBossLevel: number;
  totalEnemies: number;
}

export function getDesertArenaWaveConfig(wave: number): DesertArenaWaveConfig {
  const clamped = Math.max(1, Math.min(DESERT_ARENA_TOTAL_WAVES, Math.floor(wave)));
  const regularCount = DESERT_ARENA_BASE_ENEMY_COUNT + (clamped - 1);
  const regularLevel = DESERT_ARENA_BASE_LEVEL * clamped;
  const hasOrcBoss = clamped === DESERT_ARENA_TOTAL_WAVES;
  return {
    wave: clamped,
    regularCount,
    regularLevel,
    hasOrcBoss,
    orcBossLevel: hasOrcBoss ? DESERT_ARENA_ORC_BOSS_LEVEL : 0,
    totalEnemies: regularCount + (hasOrcBoss ? 1 : 0),
  };
}

export interface BanditAmbushTickResult {
  nextElapsedSec: number;
  checked: boolean;
  triggered: boolean;
}

export function evaluateBanditAmbushTick(
  elapsedSec: number,
  dt: number,
  inTown: boolean,
  rng: () => number = Math.random
): BanditAmbushTickResult {
  if (inTown) {
    return { nextElapsedSec: Math.max(0, elapsedSec), checked: false, triggered: false };
  }
  const safeDt = Math.max(0, dt);
  const updated = Math.max(0, elapsedSec) + safeDt;
  if (updated < BANDIT_AMBUSH_INTERVAL_SEC) {
    return { nextElapsedSec: updated, checked: false, triggered: false };
  }
  const remainder = updated % BANDIT_AMBUSH_INTERVAL_SEC;
  const triggered = rng() < BANDIT_AMBUSH_CHANCE;
  return {
    nextElapsedSec: remainder,
    checked: true,
    triggered,
  };
}

export function evaluatePirateAmbushTick(
  elapsedSec: number,
  dt: number,
  inOpenOcean: boolean,
  rng: () => number = Math.random
): BanditAmbushTickResult {
  if (!inOpenOcean) {
    return { nextElapsedSec: Math.max(0, elapsedSec), checked: false, triggered: false };
  }
  const safeDt = Math.max(0, dt);
  const updated = Math.max(0, elapsedSec) + safeDt;
  if (updated < PIRATE_AMBUSH_INTERVAL_SEC) {
    return { nextElapsedSec: updated, checked: false, triggered: false };
  }
  const remainder = updated % PIRATE_AMBUSH_INTERVAL_SEC;
  const triggered = rng() < PIRATE_AMBUSH_CHANCE;
  return {
    nextElapsedSec: remainder,
    checked: true,
    triggered,
  };
}
