import { BiomeId, isInsideSafeZone } from './worldMath';

export type UpgradeType = 'sword' | 'armor' | 'agility';

export interface PlayerProfileData {
  uid: string;
  displayName: string;
  tunicColor: string;
  level: number;
  xp: number;
  gold: number;
  swordTier: number;
  armorTier: number;
  agilityTier: number;
  pvpKills: number;
  deaths: number;
  discoveredBiomes: BiomeId[];
  lastX: number;
  lastZ: number;
}

export interface DerivedCombatStats {
  maxHp: number;
  attackPower: number;
  defense: number;
  moveSpeed: number;
  maxStamina: number;
}

export interface PvpParticipant {
  id: string;
  x: number;
  z: number;
  pvpEnabled: boolean;
  partyCode: string;
}

export const MAX_UPGRADE_TIER = 10;
export const MAX_LEVEL = 99;
export const VALID_BIOMES: readonly BiomeId[] = ['meadow', 'plains', 'mountain', 'lake'];

export const TUNIC_PRESETS = [
  { id: 'crimson', name: 'Kızıl Sancak', hex: '#c43b3b' },
  { id: 'emerald', name: 'Zümrüt Yayla', hex: '#2f8f5b' },
  { id: 'cobalt', name: 'Gök Mavisi', hex: '#2d6ea8' },
  { id: 'amber', name: 'Altın Bozkır', hex: '#c88b2e' },
  { id: 'violet', name: 'Bozdağ Moru', hex: '#75469e' },
  { id: 'obsidian', name: 'Kara Demir', hex: '#384654' },
] as const;

export function createDefaultProfile(
  uid: string,
  displayName: string,
  tunicColor = '#c43b3b'
): PlayerProfileData {
  const cleanName = sanitizeDisplayName(displayName);
  const cleanColor = /^#[0-9a-fA-F]{6}$/.test(tunicColor) ? tunicColor : '#c43b3b';
  return {
    uid,
    displayName: cleanName,
    tunicColor: cleanColor,
    level: 1,
    xp: 0,
    gold: 50,
    swordTier: 1,
    armorTier: 1,
    agilityTier: 1,
    pvpKills: 0,
    deaths: 0,
    discoveredBiomes: ['meadow'],
    lastX: 0,
    lastZ: 18,
  };
}

export function sanitizeDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (trimmed.length < 2) {
    return 'Gezgin';
  }
  return trimmed;
}

export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return Math.floor(100 * Math.pow(safeLevel, 1.35));
}

export function getDerivedStats(profile: Pick<PlayerProfileData, 'level' | 'swordTier' | 'armorTier' | 'agilityTier'>): DerivedCombatStats {
  const lvl = Math.max(1, profile.level);
  const maxHp = 100 + (lvl - 1) * 14 + (profile.armorTier - 1) * 24;
  const attackPower = 16 + (lvl - 1) * 3 + (profile.swordTier - 1) * 7;
  const defense = 4 + Math.floor((lvl - 1) * 1.2) + (profile.armorTier - 1) * 3;
  const moveSpeed = 8.4 + (profile.agilityTier - 1) * 0.36;
  const maxStamina = 100 + (profile.agilityTier - 1) * 14;
  return { maxHp, attackPower, defense, moveSpeed, maxStamina };
}

export function awardXpAndGold(
  profile: PlayerProfileData,
  xpGain: number,
  goldGain: number
): { profile: PlayerProfileData; leveledUp: boolean; levelsGained: number } {
  let level = profile.level;
  let xp = profile.xp + Math.max(0, Math.round(xpGain));
  const gold = Math.min(10000000, profile.gold + Math.max(0, Math.round(goldGain)));
  let levelsGained = 0;

  while (level < MAX_LEVEL && xp >= xpRequiredForLevel(level)) {
    xp -= xpRequiredForLevel(level);
    level += 1;
    levelsGained += 1;
  }

  return {
    profile: {
      ...profile,
      level,
      xp,
      gold,
    },
    leveledUp: levelsGained > 0,
    levelsGained,
  };
}

export function getUpgradeCost(currentTier: number): number {
  const clamped = Math.max(1, Math.min(MAX_UPGRADE_TIER, Math.floor(currentTier)));
  return Math.round(45 * Math.pow(clamped, 1.55));
}

export function applyUpgrade(
  profile: PlayerProfileData,
  type: UpgradeType
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  const field = type === 'sword' ? 'swordTier' : type === 'armor' ? 'armorTier' : 'agilityTier';
  const currentTier = profile[field];
  if (currentTier >= MAX_UPGRADE_TIER) {
    return { success: false, profile, reason: 'Maksimum seviyeye ulaşıldı.' };
  }
  const cost = getUpgradeCost(currentTier);
  if (profile.gold < cost) {
    return { success: false, profile, reason: `Yetersiz altın (${cost} gerekli).` };
  }
  return {
    success: true,
    profile: {
      ...profile,
      gold: profile.gold - cost,
      [field]: currentTier + 1,
    },
  };
}

export function calculateDamage(
  attackerAttack: number,
  defenderDefense: number,
  skillMultiplier = 1.0,
  isCrit = false
): number {
  const mitigation = 100 / (100 + Math.max(0, defenderDefense) * 2.2);
  const raw = attackerAttack * skillMultiplier * mitigation * (isCrit ? 1.5 : 1.0);
  return Math.max(4, Math.round(raw));
}

export function canDealPvpDamage(
  attacker: PvpParticipant,
  defender: PvpParticipant
): { allowed: boolean; reason?: string } {
  if (attacker.id === defender.id) {
    return { allowed: false, reason: 'self' };
  }
  if (isInsideSafeZone(attacker.x, attacker.z) || isInsideSafeZone(defender.x, defender.z)) {
    return { allowed: false, reason: 'safe_zone' };
  }
  if (!attacker.pvpEnabled || !defender.pvpEnabled) {
    return { allowed: false, reason: 'peaceful_mode' };
  }
  const aParty = attacker.partyCode.trim().toUpperCase();
  const dParty = defender.partyCode.trim().toUpperCase();
  if (aParty.length > 0 && aParty === dParty) {
    return { allowed: false, reason: 'same_party' };
  }
  return { allowed: true };
}

export function sanitizeProfileForFirestore(
  profile: PlayerProfileData,
  authUid: string
): PlayerProfileData {
  const validBiomes = Array.from(
    new Set(profile.discoveredBiomes.filter((b): b is BiomeId => VALID_BIOMES.includes(b)))
  ).slice(0, 10);

  return {
    uid: authUid,
    displayName: sanitizeDisplayName(profile.displayName),
    tunicColor: /^#[0-9a-fA-F]{6}$/.test(profile.tunicColor) ? profile.tunicColor : '#c43b3b',
    level: Math.max(1, Math.min(MAX_LEVEL, Math.round(profile.level))),
    xp: Math.max(0, Math.min(10000000, Math.round(profile.xp))),
    gold: Math.max(0, Math.min(10000000, Math.round(profile.gold))),
    swordTier: Math.max(1, Math.min(MAX_UPGRADE_TIER, Math.round(profile.swordTier))),
    armorTier: Math.max(1, Math.min(MAX_UPGRADE_TIER, Math.round(profile.armorTier))),
    agilityTier: Math.max(1, Math.min(MAX_UPGRADE_TIER, Math.round(profile.agilityTier))),
    pvpKills: Math.max(0, Math.min(1000000, Math.round(profile.pvpKills))),
    deaths: Math.max(0, Math.min(1000000, Math.round(profile.deaths))),
    discoveredBiomes: validBiomes,
    lastX: Math.max(-195, Math.min(195, Number(profile.lastX.toFixed(2)))),
    lastZ: Math.max(-195, Math.min(195, Number(profile.lastZ.toFixed(2)))),
  };
}
