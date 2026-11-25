import { BiomeId, isInsideSafeZone } from './worldMath';
import {
  DESERT_ARENA_TOTAL_WAVES,
  HORSE_PRICE,
  CONVOY_MAX_TIER,
  YETI_RUNE_STAT_MULTIPLIER,
} from './worldEvents';
import {
  ActiveFoodBuff,
  ARMOR_BY_ID,
  computeActiveFoodBuffs,
  FOOD_BY_ID,
  FoodId,
  SHIP_BY_ID,
  ShipId,
  VALID_ARMOR_IDS,
  VALID_FOOD_IDS,
  VALID_SHIP_IDS,
  VALID_WEAPON_IDS,
  WEAPON_BY_ID,
} from './inventoryData';

export type UpgradeType = 'sword' | 'armor' | 'agility';
export type PlayerClassId =
  | 'guardian'
  | 'archer'
  | 'lancer'
  | 'bomber'
  | 'mage'
  | 'assassin'
  | 'fishman'
  | 'yeti';

export type WeaponKind =
  | 'sword'
  | 'mace'
  | 'bow'
  | 'spear'
  | 'bomb'
  | 'staff'
  | 'daggers'
  | 'trident'
  | 'yeti_claws';

export type RelicSourceId =
  | 'mountain_crystal'
  | 'forest_tree'
  | 'desert_arena'
  | 'pirate_island'
  | 'wizard_island'
  | 'horror_forest'
  | 'underwater_city'
  | 'north_pole_yeti';

export interface ClassDefinition {
  id: PlayerClassId;
  nameTr: string;
  colorNameTr: string;
  colorHex: string;
  accentHex: string;
  weaponId: string;
  weaponKind: WeaponKind;
  weaponNameTr: string;
  relicSource: RelicSourceId;
  questTitleTr: string;
  questLocationTr: string;
  summaryTr: string;
  hpMultiplier: number;
  hpFlatBonus: number;
  attackMultiplier: number;
  unlockedAttackBonus: number;
  defenseBonus: number;
  speedBonus: number;
  staminaBonus: number;
  critChance: number;
  meleeReach: number;
  unlockedMeleeReach: number;
  stunLightSec: number;
  stunHeavySec: number;
  rangedWhenUnlocked: boolean;
  aoeRadius?: number;
  lifestealPct?: number;
  canSwimOcean?: boolean;
  startsAsYeti?: boolean;
}

export interface PlayerProfileData {
  uid: string;
  displayName: string;
  tunicColor: string;
  playerClass: PlayerClassId;
  classWeaponUnlocked: boolean;
  yetiRuneUnlocked: boolean;
  desertArenaProgress: number;
  hasHorse: boolean;
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
  ownedWeapons: string[];
  equippedWeaponId: string;
  ownedArmors: string[];
  equippedArmorId: string;
  foodInventory: Partial<Record<FoodId, number>>;
  ownedShips: ShipId[];
  activeShipId: ShipId | '';
  convoyTier: number;
}

export interface DerivedCombatStats {
  maxHp: number;
  attackPower: number;
  defense: number;
  moveSpeed: number;
  maxStamina: number;
  critChance: number;
  meleeReach: number;
  rangedEnabled: boolean;
  stunLightSec: number;
  stunHeavySec: number;
  aoeRadius: number;
  lifestealPct: number;
  cooldownMult: number;
  xpGoldMult: number;
  navalMult: number;
  regenPctPerSec: number;
  activeWeaponKind: WeaponKind;
  activeWeaponNameTr: string;
  activeArmorNameTr: string;
  canSwimOcean: boolean;
  isRunicYeti: boolean;
}

export interface PvpParticipant {
  id: string;
  x: number;
  z: number;
  pvpEnabled: boolean;
  partyCode: string;
}

export const MAX_UPGRADE_TIER = 10;
export const MAX_LEVEL = 1200;
export const DESERT_ARENA_REQUIRED_KILLS = DESERT_ARENA_TOTAL_WAVES;
export { HORSE_PRICE };

export const VALID_BIOMES: readonly BiomeId[] = [
  'meadow',
  'dark_forest',
  'plains',
  'mountain',
  'lake',
  'harbor',
  'ocean',
  'pirate_island',
  'wizard_island',
  'floating_town',
  'whirlpool',
  'underwater_city',
  'horror_forest',
  'north_pole',
];

export const VALID_CLASSES: readonly PlayerClassId[] = [
  'guardian',
  'archer',
  'lancer',
  'bomber',
  'mage',
  'assassin',
  'fishman',
  'yeti',
];

// All 8 Distinct Classes (including Balıkadam & Buz Yetisi!)
export const CLASS_DEFINITIONS: Record<PlayerClassId, ClassDefinition> = {
  guardian: {
    id: 'guardian',
    nameTr: 'Mavi Muhafız',
    colorNameTr: 'Mavi',
    colorHex: '#2b74c7',
    accentHex: '#63b3ff',
    weaponId: 'crystal_mace',
    weaponKind: 'mace',
    weaponNameTr: 'Kristal Gürz',
    relicSource: 'mountain_crystal',
    questTitleTr: 'Dağdaki Kristali Al',
    questLocationTr: 'Bozdağ Zirvesi (Kuzey)',
    summaryTr: 'Dev can & yüksek zırh; Kristal Kalkan Hücumuyla atılır ve Bozdağ kristaliyle sersemleten gürz kuşanır.',
    hpMultiplier: 1.95,
    hpFlatBonus: 120,
    attackMultiplier: 1.15,
    unlockedAttackBonus: 36,
    defenseBonus: 18,
    speedBonus: 0.25,
    staminaBonus: 32,
    critChance: 0.18,
    meleeReach: 3.7,
    unlockedMeleeReach: 4.4,
    stunLightSec: 1.5,
    stunHeavySec: 2.7,
    rangedWhenUnlocked: false,
  },
  archer: {
    id: 'archer',
    nameTr: 'Yeşil Okçu',
    colorNameTr: 'Yeşil',
    colorHex: '#2e9c5e',
    accentHex: '#6ee09d',
    weaponId: 'forest_bow',
    weaponKind: 'bow',
    weaponNameTr: 'Kadim Orman Yayı',
    relicSource: 'forest_tree',
    questTitleTr: 'Ormandaki Ağaca Git',
    questLocationTr: 'Kara Orman — Kadim Ağaç (KB)',
    summaryTr: 'Sağ tıkla yakınlaştır, basılı tutarak oku gerip çok daha güçlü fırlat! Rüzgar Taklasıyla sıçrar.',
    hpMultiplier: 1.25,
    hpFlatBonus: 55,
    attackMultiplier: 1.45,
    unlockedAttackBonus: 48,
    defenseBonus: 8,
    speedBonus: 2.1,
    staminaBonus: 45,
    critChance: 0.32,
    meleeReach: 3.4,
    unlockedMeleeReach: 3.6,
    stunLightSec: 0,
    stunHeavySec: 0,
    rangedWhenUnlocked: true,
  },
  lancer: {
    id: 'lancer',
    nameTr: 'Kızıl Mızrakçı',
    colorNameTr: 'Kırmızı',
    colorHex: '#c93838',
    accentHex: '#ff7b70',
    weaponId: 'desert_spear',
    weaponKind: 'spear',
    weaponNameTr: 'Efsanevi Çöl Mızrağı',
    relicSource: 'desert_arena',
    questTitleTr: 'Çöl Arenası 5 Dalgayı Tamamla',
    questLocationTr: 'Altın Çöl Arenası (Doğu)',
    summaryTr: 'Yıkıcı delici hasar ve Alevli Mızrak Atılışı; Çöl Arenası 5 dalgasını geçip efsanevi mızrağı açar.',
    hpMultiplier: 1.45,
    hpFlatBonus: 75,
    attackMultiplier: 1.72,
    unlockedAttackBonus: 65,
    defenseBonus: 12,
    speedBonus: 1.15,
    staminaBonus: 28,
    critChance: 0.34,
    meleeReach: 4.1,
    unlockedMeleeReach: 6.2,
    stunLightSec: 0,
    stunHeavySec: 0,
    rangedWhenUnlocked: false,
  },
  bomber: {
    id: 'bomber',
    nameTr: 'Korsan Bombacı',
    colorNameTr: 'Turuncu',
    colorHex: '#d96b1f',
    accentHex: '#ffb067',
    weaponId: 'pirate_bomb',
    weaponKind: 'bomb',
    weaponNameTr: 'Korsan Barut Bombası',
    relicSource: 'pirate_island',
    questTitleTr: 'Korsan Adasında Bombayı Bul',
    questLocationTr: 'Korsan Adası (Güneydoğu Okyanus)',
    summaryTr: 'Kaçışta topun içine girip çok uzağa uçar! Barut bombalarıyla geniş alan hasarı verir.',
    hpMultiplier: 1.42,
    hpFlatBonus: 85,
    attackMultiplier: 1.78,
    unlockedAttackBonus: 74,
    defenseBonus: 11,
    speedBonus: 1.0,
    staminaBonus: 36,
    critChance: 0.28,
    meleeReach: 3.5,
    unlockedMeleeReach: 4.0,
    stunLightSec: 0.5,
    stunHeavySec: 1.2,
    rangedWhenUnlocked: true,
    aoeRadius: 6.5,
  },
  mage: {
    id: 'mage',
    nameTr: 'Yıldız Büyücüsü',
    colorNameTr: 'Mor',
    colorHex: '#7c3aed',
    accentHex: '#c4b5fd',
    weaponId: 'arcane_staff',
    weaponKind: 'staff',
    weaponNameTr: 'Yıldız Büyü Asası',
    relicSource: 'wizard_island',
    questTitleTr: 'Büyücü Adasında Asayı Bul',
    questLocationTr: 'Büyücü Adası (Güneybatı Okyanus)',
    summaryTr: 'Yıldız Işınlanmasıyla anında uzaklaşır; efsunlu küreler ve yıldız patlamalarıyla savaşır.',
    hpMultiplier: 1.32,
    hpFlatBonus: 70,
    attackMultiplier: 1.9,
    unlockedAttackBonus: 86,
    defenseBonus: 10,
    speedBonus: 1.45,
    staminaBonus: 52,
    critChance: 0.35,
    meleeReach: 3.5,
    unlockedMeleeReach: 4.2,
    stunLightSec: 0,
    stunHeavySec: 1.0,
    rangedWhenUnlocked: true,
    aoeRadius: 5.4,
  },
  assassin: {
    id: 'assassin',
    nameTr: 'Gölge Suikastçısı',
    colorNameTr: 'Turkuaz',
    colorHex: '#0f766e',
    accentHex: '#5eead4',
    weaponId: 'nightmare_daggers',
    weaponKind: 'daggers',
    weaponNameTr: 'Kabus Çift Hançeri',
    relicSource: 'horror_forest',
    questTitleTr: 'Korku Ormanında Hançerleri Bul',
    questLocationTr: 'Sisli Korku Ormanı (Kuzeydoğu Ada)',
    summaryTr: 'Gölge Kayboluşuyla duman olup süzülür; inanılmaz hız ve yüksek kritikle rakipleri biçer.',
    hpMultiplier: 1.28,
    hpFlatBonus: 65,
    attackMultiplier: 1.85,
    unlockedAttackBonus: 92,
    defenseBonus: 9,
    speedBonus: 2.65,
    staminaBonus: 60,
    critChance: 0.48,
    meleeReach: 3.6,
    unlockedMeleeReach: 4.4,
    stunLightSec: 0,
    stunHeavySec: 0,
    rangedWhenUnlocked: false,
    lifestealPct: 0.08,
  },
  fishman: {
    id: 'fishman',
    nameTr: 'Balıkadam',
    colorNameTr: 'Deniz Mavisi',
    colorHex: '#0284c7',
    accentHex: '#38bdf8',
    weaponId: 'poseidon_trident',
    weaponKind: 'trident',
    weaponNameTr: "Poseidon'un Mızrağı",
    relicSource: 'underwater_city',
    questTitleTr: "Atlantis'ten Poseidon'un Mızrağını Al",
    questLocationTr: 'Sualtı Şehri Atlantis (Girdap)',
    summaryTr: "Denizde yürüyebilir ve yüzebilir! Gelgit Dalgasıyla sörf yapar, Atlantis'te Poseidon'un Mızrağını kuşanır.",
    hpMultiplier: 1.85,
    hpFlatBonus: 140,
    attackMultiplier: 1.75,
    unlockedAttackBonus: 98,
    defenseBonus: 16,
    speedBonus: 1.25,
    staminaBonus: 44,
    critChance: 0.3,
    meleeReach: 4.2,
    unlockedMeleeReach: 6.4,
    stunLightSec: 0.45,
    stunHeavySec: 1.4,
    rangedWhenUnlocked: false,
    lifestealPct: 0.14,
    canSwimOcean: true,
  },
  yeti: {
    id: 'yeti',
    nameTr: 'Buz Yetisi',
    colorNameTr: 'Buz Beyazı',
    colorHex: '#38bdf8',
    accentHex: '#e0f2fe',
    weaponId: 'runic_yeti_claws',
    weaponKind: 'yeti_claws',
    weaponNameTr: 'Rünik Yeti Pençeleri',
    relicSource: 'north_pole_yeti',
    questTitleTr: 'Kuzey Kutbunda 1000 Sv. Dev Yetiyi Yen',
    questLocationTr: 'Kuzey Kutbu Buzul Kıtası (Uzak Kuzey)',
    summaryTr: 'Doğrudan Yeti olarak başlar! Kuzey Kutbundaki 1000 Sv. Dev Yetiyi yenip Yeti Rününü alınca 5 KAT güçlenir ve Rünik Yetiye dönüşür!',
    hpMultiplier: 2.1,
    hpFlatBonus: 180,
    attackMultiplier: 1.68,
    unlockedAttackBonus: 80,
    defenseBonus: 20,
    speedBonus: 0.95,
    staminaBonus: 48,
    critChance: 0.26,
    meleeReach: 4.6,
    unlockedMeleeReach: 5.8,
    stunLightSec: 0.5,
    stunHeavySec: 1.6,
    rangedWhenUnlocked: false,
    aoeRadius: 4.8,
    startsAsYeti: true,
  },
};

export const TUNIC_PRESETS = VALID_CLASSES.map((cid) => ({
  id: cid,
  name: CLASS_DEFINITIONS[cid].nameTr,
  hex: CLASS_DEFINITIONS[cid].colorHex,
}));

export function normalizeClassId(val: unknown): PlayerClassId {
  if (val === 'berserker') return 'fishman';
  if (typeof val === 'string' && VALID_CLASSES.includes(val as PlayerClassId)) {
    return val as PlayerClassId;
  }
  return 'guardian';
}

export function isValidClassId(val: unknown): val is PlayerClassId {
  return typeof val === 'string' && VALID_CLASSES.includes(val as PlayerClassId);
}

export function canWalkOnOcean(playerClass: PlayerClassId): boolean {
  return Boolean(CLASS_DEFINITIONS[normalizeClassId(playerClass)]?.canSwimOcean);
}

export function getClassColor(playerClass: PlayerClassId): string {
  return CLASS_DEFINITIONS[normalizeClassId(playerClass)].colorHex;
}

export function createDefaultProfile(
  uid: string,
  displayName: string,
  tunicColor?: string,
  playerClass: PlayerClassId = 'guardian'
): PlayerProfileData {
  const safeClass = normalizeClassId(playerClass);
  const classHex = CLASS_DEFINITIONS[safeClass].colorHex;
  const cleanName = sanitizeDisplayName(displayName);
  const cleanColor =
    tunicColor && /^#[0-9a-fA-F]{6}$/.test(tunicColor) ? tunicColor : classHex;
  const isYeti = safeClass === 'yeti';
  const starterWeapons = isYeti ? ['starter_sword', 'yeti_claws'] : ['starter_sword'];
  const starterEquipped = isYeti ? 'yeti_claws' : 'starter_sword';

  return {
    uid,
    displayName: cleanName,
    tunicColor: cleanColor,
    playerClass: safeClass,
    classWeaponUnlocked: false,
    yetiRuneUnlocked: false,
    desertArenaProgress: 0,
    hasHorse: false,
    level: 1,
    xp: 0,
    gold: 150,
    swordTier: 1,
    armorTier: 1,
    agilityTier: 1,
    pvpKills: 0,
    deaths: 0,
    discoveredBiomes: ['meadow'],
    lastX: 0,
    lastZ: 18.5,
    ownedWeapons: starterWeapons,
    equippedWeaponId: starterEquipped,
    ownedArmors: ['cloth_tunic'],
    equippedArmorId: 'cloth_tunic',
    foodInventory: { soup: 2 },
    ownedShips: [],
    activeShipId: '',
    convoyTier: 1,
  };
}

export function sanitizeDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (trimmed.length < 2) {
    return 'Gezgin';
  }
  return trimmed;
}

/**
 * Deliberate, slower RPG progression curve so each level feels earned.
 */
export function xpRequiredForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return Math.floor(145 * Math.pow(safeLevel, 1.38));
}

export function getDerivedStats(
  profile: Pick<
    PlayerProfileData,
    | 'level'
    | 'swordTier'
    | 'armorTier'
    | 'agilityTier'
    | 'playerClass'
    | 'classWeaponUnlocked'
  > & {
    equippedWeaponId?: string;
    equippedArmorId?: string;
    yetiRuneUnlocked?: boolean;
  },
  activeBuffs: readonly ActiveFoodBuff[] = []
): DerivedCombatStats {
  const safeClass = normalizeClassId(profile.playerClass);
  const cls = CLASS_DEFINITIONS[safeClass];
  const lvl = Math.max(1, Math.min(MAX_LEVEL, profile.level));
  const food = computeActiveFoodBuffs(activeBuffs);
  const isRunicYeti = safeClass === 'yeti' && Boolean(profile.yetiRuneUnlocked);
  const yetiRuneMult = isRunicYeti ? YETI_RUNE_STAT_MULTIPLIER : 1;

  // Normalize legacy weapon id
  const rawEquipped =
    profile.equippedWeaponId === 'atlantis_greataxe'
      ? 'poseidon_trident'
      : profile.equippedWeaponId;

  const fallbackWeaponId = isRunicYeti
    ? 'runic_yeti_claws'
    : safeClass === 'yeti'
    ? 'yeti_claws'
    : profile.classWeaponUnlocked
    ? cls.weaponId
    : 'starter_sword';

  const weaponDef =
    (rawEquipped && WEAPON_BY_ID[rawEquipped]) ||
    WEAPON_BY_ID[fallbackWeaponId] ||
    WEAPON_BY_ID.starter_sword;

  const armorDef =
    (profile.equippedArmorId && ARMOR_BY_ID[profile.equippedArmorId]) ||
    ARMOR_BY_ID.cloth_tunic;

  const baseHp = 140 + (lvl - 1) * 32 + (profile.armorTier - 1) * 45 + armorDef.hpBonus;
  const maxHp = Math.round((baseHp * cls.hpMultiplier + cls.hpFlatBonus) * food.hpMult * yetiRuneMult);

  const baseAttack =
    24 + (lvl - 1) * 6.8 + (profile.swordTier - 1) * 14 + weaponDef.attackBonus;
  const classSigBonus =
    (profile.classWeaponUnlocked || isRunicYeti) && weaponDef.id === cls.weaponId
      ? cls.unlockedAttackBonus
      : 0;
  const attackPower = Math.max(
    14,
    Math.round((baseAttack * cls.attackMultiplier + classSigBonus) * food.attackMult * yetiRuneMult)
  );

  const defense = Math.max(
    2,
    Math.round(
      (7 + (lvl - 1) * 2.4 + (profile.armorTier - 1) * 6 + cls.defenseBonus + armorDef.defenseBonus) *
        food.defenseMult *
        yetiRuneMult
    )
  );

  const moveSpeed = Number(
    (
      (9.2 + (profile.agilityTier - 1) * 0.45 + cls.speedBonus + armorDef.speedBonus + (isRunicYeti ? 2.4 : 0)) *
      food.speedMult
    ).toFixed(2)
  );
  const maxStamina = Math.round(
    (120 + (profile.agilityTier - 1) * 18 + cls.staminaBonus) * (isRunicYeti ? 1.8 : 1)
  );

  const activeWeaponKind: WeaponKind = weaponDef.weaponKind;
  const activeWeaponNameTr = weaponDef.nameTr;
  const meleeReach =
    (weaponDef.id === cls.weaponId ? cls.unlockedMeleeReach : cls.meleeReach) +
    (weaponDef.id === cls.weaponId ? 0 : weaponDef.reachBonus);

  const rangedEnabled = Boolean(weaponDef.ranged) || (weaponDef.id === cls.weaponId && cls.rangedWhenUnlocked);
  const stunLightSec = weaponDef.stunLightSec ?? (weaponDef.id === cls.weaponId ? cls.stunLightSec : 0);
  const stunHeavySec = weaponDef.stunHeavySec ?? (weaponDef.id === cls.weaponId ? cls.stunHeavySec : 0);
  const aoeRadius = weaponDef.aoeRadius ?? (weaponDef.id === cls.weaponId ? cls.aoeRadius ?? 0 : 0);
  const lifestealPct = Math.min(
    0.55,
    (weaponDef.lifestealPct ?? 0) + (cls.lifestealPct ?? 0) + food.lifestealPct
  );

  return {
    maxHp,
    attackPower,
    defense,
    moveSpeed,
    maxStamina,
    critChance: Math.min(0.95, cls.critChance + weaponDef.critBonus + food.critBonus + (isRunicYeti ? 0.2 : 0)),
    meleeReach,
    rangedEnabled,
    stunLightSec,
    stunHeavySec,
    aoeRadius,
    lifestealPct,
    cooldownMult: food.cooldownMult,
    xpGoldMult: food.xpGoldMult,
    navalMult: food.navalMult,
    regenPctPerSec: food.regenPctPerSec,
    activeWeaponKind,
    activeWeaponNameTr,
    activeArmorNameTr: armorDef.nameTr,
    canSwimOcean: Boolean(cls.canSwimOcean),
    isRunicYeti,
  };
}

/**
 * Slower, steadier XP gain (0.85x raw XP with steeper level curve).
 */
export function awardXpAndGold(
  profile: PlayerProfileData,
  xpGain: number,
  goldGain: number
): { profile: PlayerProfileData; leveledUp: boolean; levelsGained: number } {
  let level = profile.level;
  let xp = profile.xp + Math.max(0, Math.round(xpGain * 0.85));
  const gold = Math.min(50000000, profile.gold + Math.max(0, Math.round(goldGain)));
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
  return Math.round(35 * Math.pow(clamped, 1.45));
}

export function applyUpgrade(
  profile: PlayerProfileData,
  type: UpgradeType,
  inTown = true
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  if (!inTown) {
    return {
      success: false,
      profile,
      reason: "Yükseltmeler yalnızca Başlangıç Kasabası'nda yapılabilir.",
    };
  }
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

export function buyHorse(
  profile: PlayerProfileData,
  inTown = true
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  if (!inTown) {
    return {
      success: false,
      profile,
      reason: "At yalnızca Başlangıç Kasabası Ahırı'ndan satın alınabilir.",
    };
  }
  if (profile.hasHorse) {
    return { success: false, profile, reason: 'Zaten bir atın var! [G] ile yanına çağırabilirsin.' };
  }
  if (profile.gold < HORSE_PRICE) {
    return {
      success: false,
      profile,
      reason: `Yetersiz altın (${HORSE_PRICE} Altın gerekli).`,
    };
  }
  return {
    success: true,
    profile: {
      ...profile,
      gold: profile.gold - HORSE_PRICE,
      hasHorse: true,
    },
  };
}

export function buyFoodItem(
  profile: PlayerProfileData,
  foodId: FoodId,
  inTown = true
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  if (!inTown) {
    return {
      success: false,
      profile,
      reason: "Yemekler yalnızca Başlangıç Kasabası Yemekhanesi'nden satın alınabilir.",
    };
  }
  const def = FOOD_BY_ID[foodId];
  if (!def) {
    return { success: false, profile, reason: 'Geçersiz yemek.' };
  }
  if (profile.gold < def.price) {
    return { success: false, profile, reason: `Yetersiz altın (${def.price} Altın gerekli).` };
  }
  const currentQty = Math.max(0, profile.foodInventory[foodId] || 0);
  if (currentQty >= 99) {
    return { success: false, profile, reason: 'Bu yemekten envanterde en fazla 99 adet taşınabilir.' };
  }
  return {
    success: true,
    profile: {
      ...profile,
      gold: profile.gold - def.price,
      foodInventory: {
        ...profile.foodInventory,
        [foodId]: currentQty + 1,
      },
    },
  };
}

export function consumeFoodItem(
  profile: PlayerProfileData,
  foodId: FoodId
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  const def = FOOD_BY_ID[foodId];
  if (!def) return { success: false, profile, reason: 'Geçersiz yemek.' };
  const qty = profile.foodInventory[foodId] || 0;
  if (qty <= 0) {
    return { success: false, profile, reason: 'Envanterde bu yemekten yok.' };
  }
  const nextFood = { ...profile.foodInventory };
  if (qty <= 1) {
    delete nextFood[foodId];
  } else {
    nextFood[foodId] = qty - 1;
  }
  return {
    success: true,
    profile: {
      ...profile,
      foodInventory: nextFood,
    },
  };
}

export function buyWeaponItem(
  profile: PlayerProfileData,
  weaponId: string
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  const def = WEAPON_BY_ID[weaponId];
  if (!def) return { success: false, profile, reason: 'Geçersiz silah.' };
  if (profile.ownedWeapons.includes(weaponId)) {
    return equipWeaponItem(profile, weaponId);
  }
  if (def.price <= 0) {
    return { success: false, profile, reason: `Bu silah haritada gizli: ${def.sourceTr}` };
  }
  if (profile.gold < def.price) {
    return { success: false, profile, reason: `Yetersiz altın (${def.price} Altın gerekli).` };
  }
  return {
    success: true,
    profile: {
      ...profile,
      gold: profile.gold - def.price,
      ownedWeapons: [...profile.ownedWeapons, weaponId],
      equippedWeaponId: weaponId,
    },
  };
}

export function equipWeaponItem(
  profile: PlayerProfileData,
  weaponId: string
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  if (!WEAPON_BY_ID[weaponId]) return { success: false, profile, reason: 'Geçersiz silah.' };
  if (!profile.ownedWeapons.includes(weaponId)) {
    return { success: false, profile, reason: 'Bu silaha henüz sahip değilsin.' };
  }
  return {
    success: true,
    profile: {
      ...profile,
      equippedWeaponId: weaponId,
    },
  };
}

export function buyArmorItem(
  profile: PlayerProfileData,
  armorId: string
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  const def = ARMOR_BY_ID[armorId];
  if (!def) return { success: false, profile, reason: 'Geçersiz zırh.' };
  if (profile.ownedArmors.includes(armorId)) {
    return equipArmorItem(profile, armorId);
  }
  if (profile.gold < def.price) {
    return { success: false, profile, reason: `Yetersiz altın (${def.price} Altın gerekli).` };
  }
  return {
    success: true,
    profile: {
      ...profile,
      gold: profile.gold - def.price,
      ownedArmors: [...profile.ownedArmors, armorId],
      equippedArmorId: armorId,
    },
  };
}

export function equipArmorItem(
  profile: PlayerProfileData,
  armorId: string
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  if (!ARMOR_BY_ID[armorId]) return { success: false, profile, reason: 'Geçersiz zırh.' };
  if (!profile.ownedArmors.includes(armorId)) {
    return { success: false, profile, reason: 'Bu zırha henüz sahip değilsin.' };
  }
  return {
    success: true,
    profile: {
      ...profile,
      equippedArmorId: armorId,
    },
  };
}

export function buyHarborShip(
  profile: PlayerProfileData,
  shipId: ShipId
): { success: boolean; profile: PlayerProfileData; reason?: string } {
  const def = SHIP_BY_ID[shipId];
  if (!def) return { success: false, profile, reason: 'Geçersiz gemi.' };
  if (profile.ownedShips.includes(shipId)) {
    return {
      success: true,
      profile: {
        ...profile,
        activeShipId: shipId,
      },
    };
  }
  if (profile.gold < def.price) {
    return { success: false, profile, reason: `Yetersiz altın (${def.price} Altın gerekli).` };
  }
  return {
    success: true,
    profile: {
      ...profile,
      gold: profile.gold - def.price,
      ownedShips: [...profile.ownedShips, shipId],
      activeShipId: shipId,
    },
  };
}

const RELIC_TO_WEAPON_AND_CLASS: Record<RelicSourceId, { weaponId: string; classId: PlayerClassId }> = {
  mountain_crystal: { weaponId: 'crystal_mace', classId: 'guardian' },
  forest_tree: { weaponId: 'forest_bow', classId: 'archer' },
  desert_arena: { weaponId: 'desert_spear', classId: 'lancer' },
  pirate_island: { weaponId: 'pirate_bomb', classId: 'bomber' },
  wizard_island: { weaponId: 'arcane_staff', classId: 'mage' },
  horror_forest: { weaponId: 'nightmare_daggers', classId: 'assassin' },
  underwater_city: { weaponId: 'poseidon_trident', classId: 'fishman' },
  north_pole_yeti: { weaponId: 'runic_yeti_claws', classId: 'yeti' },
};

export function unlockYetiRune(profile: PlayerProfileData): {
  newlyUnlocked: boolean;
  profile: PlayerProfileData;
} {
  if (profile.yetiRuneUnlocked) {
    return { newlyUnlocked: false, profile };
  }
  const nextWeapons = profile.ownedWeapons.includes('runic_yeti_claws')
    ? profile.ownedWeapons
    : [...profile.ownedWeapons, 'runic_yeti_claws'];
  const isYeti = normalizeClassId(profile.playerClass) === 'yeti';
  return {
    newlyUnlocked: true,
    profile: {
      ...profile,
      yetiRuneUnlocked: true,
      classWeaponUnlocked: isYeti ? true : profile.classWeaponUnlocked,
      ownedWeapons: nextWeapons,
      equippedWeaponId: isYeti ? 'runic_yeti_claws' : profile.equippedWeaponId,
    },
  };
}

export function tryUnlockClassWeapon(
  profile: PlayerProfileData,
  source: RelicSourceId
): {
  unlocked: boolean;
  alreadyUnlocked: boolean;
  wrongClass: boolean;
  weaponNameTr: string;
  profile: PlayerProfileData;
} {
  const mapping = RELIC_TO_WEAPON_AND_CLASS[source];
  const weaponDef = WEAPON_BY_ID[mapping.weaponId];
  const isOriginalStarterRelic =
    source === 'mountain_crystal' || source === 'forest_tree' || source === 'desert_arena';

  const matchesOwnClass = normalizeClassId(profile.playerClass) === mapping.classId;
  if (isOriginalStarterRelic && !matchesOwnClass) {
    return {
      unlocked: false,
      alreadyUnlocked: false,
      wrongClass: true,
      weaponNameTr: weaponDef.nameTr,
      profile,
    };
  }

  const alreadyHasWeapon = profile.ownedWeapons.includes(mapping.weaponId);
  if (alreadyHasWeapon && (!matchesOwnClass || profile.classWeaponUnlocked)) {
    return {
      unlocked: false,
      alreadyUnlocked: true,
      wrongClass: false,
      weaponNameTr: weaponDef.nameTr,
      profile,
    };
  }

  const nextOwned = alreadyHasWeapon
    ? profile.ownedWeapons
    : [...profile.ownedWeapons, mapping.weaponId];

  return {
    unlocked: true,
    alreadyUnlocked: false,
    wrongClass: false,
    weaponNameTr: weaponDef.nameTr,
    profile: {
      ...profile,
      ownedWeapons: nextOwned,
      equippedWeaponId: mapping.weaponId,
      classWeaponUnlocked: matchesOwnClass ? true : profile.classWeaponUnlocked,
      yetiRuneUnlocked: source === 'north_pole_yeti' ? true : profile.yetiRuneUnlocked,
      desertArenaProgress:
        source === 'desert_arena'
          ? DESERT_ARENA_REQUIRED_KILLS
          : profile.desertArenaProgress,
    },
  };
}

export function recordDesertArenaKill(
  profile: PlayerProfileData
): { profile: PlayerProfileData; arenaJustCompleted: boolean; weaponUnlocked: boolean } {
  const nextProgress = Math.min(DESERT_ARENA_REQUIRED_KILLS, profile.desertArenaProgress + 1);
  const arenaJustCompleted =
    profile.desertArenaProgress < DESERT_ARENA_REQUIRED_KILLS &&
    nextProgress >= DESERT_ARENA_REQUIRED_KILLS;

  let nextProfile: PlayerProfileData = {
    ...profile,
    desertArenaProgress: nextProgress,
  };

  let weaponUnlocked = false;
  if (arenaJustCompleted && profile.playerClass === 'lancer' && !profile.classWeaponUnlocked) {
    const owned = nextProfile.ownedWeapons.includes('desert_spear')
      ? nextProfile.ownedWeapons
      : [...nextProfile.ownedWeapons, 'desert_spear'];
    nextProfile = {
      ...nextProfile,
      classWeaponUnlocked: true,
      ownedWeapons: owned,
      equippedWeaponId: 'desert_spear',
    };
    weaponUnlocked = true;
  }

  return { profile: nextProfile, arenaJustCompleted, weaponUnlocked };
}

export function calculateDamage(
  attackerAttack: number,
  defenderDefense: number,
  skillMultiplier = 1.0,
  isCrit = false
): number {
  const mitigation = 100 / (100 + Math.max(0, defenderDefense) * 1.9);
  const raw = attackerAttack * skillMultiplier * mitigation * (isCrit ? 1.65 : 1.0);
  return Math.max(6, Math.round(raw));
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
  ).slice(0, 16);

  const safeClass = normalizeClassId(profile.playerClass);

  // Migrate legacy atlantis_greataxe -> poseidon_trident
  const rawOwned = (Array.isArray(profile.ownedWeapons) ? profile.ownedWeapons : []).map((w) =>
    w === 'atlantis_greataxe' ? 'poseidon_trident' : w
  );
  if (safeClass === 'yeti' && !rawOwned.includes('yeti_claws')) {
    rawOwned.push('yeti_claws');
  }
  const ownedWeapons = Array.from(
    new Set(['starter_sword', ...rawOwned.filter((w) => VALID_WEAPON_IDS.includes(w))])
  ).slice(0, 18);

  const normalizedEquipped =
    profile.equippedWeaponId === 'atlantis_greataxe'
      ? 'poseidon_trident'
      : profile.equippedWeaponId;
  const equippedWeaponId = ownedWeapons.includes(normalizedEquipped)
    ? normalizedEquipped
    : safeClass === 'yeti'
    ? 'yeti_claws'
    : 'starter_sword';

  const ownedArmors = Array.from(
    new Set([
      'cloth_tunic',
      ...(Array.isArray(profile.ownedArmors) ? profile.ownedArmors : []).filter((a) =>
        VALID_ARMOR_IDS.includes(a)
      ),
    ])
  ).slice(0, 12);

  const equippedArmorId = ownedArmors.includes(profile.equippedArmorId)
    ? profile.equippedArmorId
    : 'cloth_tunic';

  const cleanFood: Partial<Record<FoodId, number>> = {};
  if (profile.foodInventory && typeof profile.foodInventory === 'object') {
    for (const fid of VALID_FOOD_IDS) {
      const rawQty = profile.foodInventory[fid];
      if (typeof rawQty === 'number' && rawQty > 0) {
        cleanFood[fid] = Math.min(99, Math.floor(rawQty));
      }
    }
  }

  const ownedShips = Array.from(
    new Set(
      (Array.isArray(profile.ownedShips) ? profile.ownedShips : []).filter((s): s is ShipId =>
        VALID_SHIP_IDS.includes(s as ShipId)
      )
    )
  ).slice(0, 4);

  const activeShipId: ShipId | '' =
    profile.activeShipId && ownedShips.includes(profile.activeShipId as ShipId)
      ? (profile.activeShipId as ShipId)
      : ownedShips[0] || '';

  return {
    uid: authUid,
    displayName: sanitizeDisplayName(profile.displayName),
    tunicColor: /^#[0-9a-fA-F]{6}$/.test(profile.tunicColor)
      ? profile.tunicColor
      : CLASS_DEFINITIONS[safeClass].colorHex,
    playerClass: safeClass,
    classWeaponUnlocked: Boolean(profile.classWeaponUnlocked),
    yetiRuneUnlocked: Boolean(profile.yetiRuneUnlocked),
    desertArenaProgress: Math.max(
      0,
      Math.min(DESERT_ARENA_REQUIRED_KILLS, Math.round(profile.desertArenaProgress || 0))
    ),
    hasHorse: Boolean(profile.hasHorse),
    level: Math.max(1, Math.min(MAX_LEVEL, Math.round(profile.level))),
    xp: Math.max(0, Math.min(50000000, Math.round(profile.xp))),
    gold: Math.max(0, Math.min(50000000, Math.round(profile.gold))),
    swordTier: Math.max(1, Math.min(MAX_UPGRADE_TIER, Math.round(profile.swordTier))),
    armorTier: Math.max(1, Math.min(MAX_UPGRADE_TIER, Math.round(profile.armorTier))),
    agilityTier: Math.max(1, Math.min(MAX_UPGRADE_TIER, Math.round(profile.agilityTier))),
    pvpKills: Math.max(0, Math.min(1000000, Math.round(profile.pvpKills))),
    deaths: Math.max(0, Math.min(1000000, Math.round(profile.deaths))),
    discoveredBiomes: validBiomes,
    lastX: Math.max(-1900, Math.min(1900, Number(profile.lastX.toFixed(2)))),
    lastZ: Math.max(-1900, Math.min(1900, Number(profile.lastZ.toFixed(2)))),
    ownedWeapons,
    equippedWeaponId,
    ownedArmors,
    equippedArmorId,
    foodInventory: cleanFood,
    ownedShips,
    activeShipId,
    convoyTier: Math.max(1, Math.min(CONVOY_MAX_TIER, Math.round(profile.convoyTier || 1))),
  };
}
