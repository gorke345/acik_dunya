import type { WeaponKind } from './combatRules';

export type FoodId =
  | 'soup'
  | 'venison'
  | 'iron_bread'
  | 'wind_pastry'
  | 'honey_elixir'
  | 'dragon_stew'
  | 'pirate_fish'
  | 'arcane_pie'
  | 'herb_stew'
  | 'royal_feast';

export type FoodBuffKind =
  | 'max_hp'
  | 'attack'
  | 'defense'
  | 'speed'
  | 'xp_gold'
  | 'crit'
  | 'naval'
  | 'cooldown'
  | 'regen'
  | 'all_lifesteal';

export interface FoodItemDef {
  id: FoodId;
  nameTr: string;
  price: number;
  durationSec: number;
  instantHealPct: number;
  buffKind: FoodBuffKind;
  shortEffectTr: string;
  descriptionTr: string;
  colorHex: string;
}

export interface InventoryWeaponDef {
  id: string;
  nameTr: string;
  weaponKind: WeaponKind;
  attackBonus: number;
  critBonus: number;
  reachBonus: number;
  price: number; // 0 = unlocked via world relic / starter
  sourceTr: string;
  colorHex: string;
  ranged?: boolean;
  stunLightSec?: number;
  stunHeavySec?: number;
  aoeRadius?: number;
  lifestealPct?: number;
}

export interface InventoryArmorDef {
  id: string;
  nameTr: string;
  hpBonus: number;
  defenseBonus: number;
  speedBonus: number;
  price: number;
  colorHex: string;
  descriptionTr: string;
}

export type ShipId = 'sloop' | 'galleon';

export interface ShipDef {
  id: ShipId;
  nameTr: string;
  price: number;
  maxHp: number;
  speed: number;
  turnSpeed: number;
  cannonDamage: number;
  cannonCount: number;
  descriptionTr: string;
  hullColorHex: string;
  sailColorHex: string;
}

export interface ActiveFoodBuff {
  foodId: FoodId;
  remainingSec: number;
}

export interface ComputedFoodBonuses {
  hpMult: number;
  attackMult: number;
  defenseMult: number;
  speedMult: number;
  xpGoldMult: number;
  critBonus: number;
  navalMult: number;
  cooldownMult: number;
  regenPctPerSec: number;
  lifestealPct: number;
}

// 10 Unique Tavern Foods — each buffs a completely different aspect of gameplay!
export const FOOD_ITEMS: readonly FoodItemDef[] = [
  {
    id: 'soup',
    nameTr: 'Yayla Çorbası',
    price: 40,
    durationSec: 120,
    instantHealPct: 1.0,
    buffKind: 'max_hp',
    shortEffectTr: '+%40 Can & Tam Şifa',
    descriptionTr: 'Canı tamamen doldurur ve 120 sn boyunca Maks. Canı %40 artırır.',
    colorHex: '#f59e0b',
  },
  {
    id: 'venison',
    nameTr: 'Kızarmış Geyik Eti',
    price: 65,
    durationSec: 120,
    instantHealPct: 0.35,
    buffKind: 'attack',
    shortEffectTr: '+%45 Saldırı Hasarı',
    descriptionTr: '120 sn boyunca tüm silah ve yetenek hasarını %45 güçlendirir.',
    colorHex: '#dc2626',
  },
  {
    id: 'iron_bread',
    nameTr: 'Demirci Ekmeği',
    price: 60,
    durationSec: 120,
    instantHealPct: 0.25,
    buffKind: 'defense',
    shortEffectTr: '+%50 Zırh Savunması',
    descriptionTr: '120 sn boyunca savunma değerini %50 yükselterek ağır darbelere direnç verir.',
    colorHex: '#64748b',
  },
  {
    id: 'wind_pastry',
    nameTr: 'Rüzgar Böreği',
    price: 55,
    durationSec: 120,
    instantHealPct: 0.2,
    buffKind: 'speed',
    shortEffectTr: '+%35 Hareket Hızı',
    descriptionTr: '120 sn boyunca koşu hızını %35 artırır, kaçış ve kovalamada üstünlük sağlar.',
    colorHex: '#10b981',
  },
  {
    id: 'honey_elixir',
    nameTr: 'Altın Bal Şerbeti',
    price: 85,
    durationSec: 150,
    instantHealPct: 0.2,
    buffKind: 'xp_gold',
    shortEffectTr: '2x TP & Altın Kazancı',
    descriptionTr: '150 sn boyunca öldürülen düşmanlardan 2 kat TP ve Altın kazandırır.',
    colorHex: '#eab308',
  },
  {
    id: 'dragon_stew',
    nameTr: 'Ejder Biberi Güveci',
    price: 95,
    durationSec: 120,
    instantHealPct: 0.3,
    buffKind: 'crit',
    shortEffectTr: '+%35 Kritik Şansı',
    descriptionTr: '120 sn boyunca kritik vuruş ihtimalini %35 yükseltir.',
    colorHex: '#f97316',
  },
  {
    id: 'pirate_fish',
    nameTr: 'Korsan Izgara Balık',
    price: 90,
    durationSec: 180,
    instantHealPct: 0.3,
    buffKind: 'naval',
    shortEffectTr: '+%50 Gemi Hızı & Top Hasarı',
    descriptionTr: '180 sn boyunca geminin hızını ve top atış gücünü %50 artırır.',
    colorHex: '#0ea5e9',
  },
  {
    id: 'arcane_pie',
    nameTr: 'Büyücü Mantar Turtası',
    price: 100,
    durationSec: 120,
    instantHealPct: 0.25,
    buffKind: 'cooldown',
    shortEffectTr: '-%40 Yetenek Bekleme',
    descriptionTr: '120 sn boyunca saldırı, yuvarlanma ve özel yetenek bekleme sürelerini %40 kısaltır.',
    colorHex: '#a855f7',
  },
  {
    id: 'herb_stew',
    nameTr: 'Şifa Otlu Yahni',
    price: 75,
    durationSec: 120,
    instantHealPct: 0.4,
    buffKind: 'regen',
    shortEffectTr: 'Sn. +%4 Can Yenileme',
    descriptionTr: '120 sn boyunca savaş sırasında bile her saniye Maks. Canın %4 kadarını yeniler.',
    colorHex: '#22c55e',
  },
  {
    id: 'royal_feast',
    nameTr: 'Kraliyet Ziyafet Tabağı',
    price: 180,
    durationSec: 150,
    instantHealPct: 1.0,
    buffKind: 'all_lifesteal',
    shortEffectTr: '+%25 Tüm Stat & %15 Can Çalma',
    descriptionTr: '150 sn boyunca tüm statları %25 güçlendirir ve vuruşların %15 can çalar.',
    colorHex: '#f43f5e',
  },
];

export const VALID_FOOD_IDS: readonly FoodId[] = FOOD_ITEMS.map((f) => f.id);

export const FOOD_BY_ID: Record<FoodId, FoodItemDef> = Object.fromEntries(
  FOOD_ITEMS.map((f) => [f.id, f])
) as Record<FoodId, FoodItemDef>;

// Inventory Weapons: Purchasable Swords + All 7 Hidden Class/Island Relic Weapons
export const INVENTORY_WEAPONS: readonly InventoryWeaponDef[] = [
  {
    id: 'starter_sword',
    nameTr: 'Başlangıç Kılıcı',
    weaponKind: 'sword',
    attackBonus: 0,
    critBonus: 0,
    reachBonus: 0,
    price: 0,
    sourceTr: 'Başlangıç Ekipmanı',
    colorHex: '#cbd5e1',
  },
  {
    id: 'steel_saber',
    nameTr: 'Korsan Çelik Palası',
    weaponKind: 'sword',
    attackBonus: 28,
    critBonus: 0.06,
    reachBonus: 0.3,
    price: 350,
    sourceTr: 'Envanter / Demirci',
    colorHex: '#94a3b8',
  },
  {
    id: 'golden_claymore',
    nameTr: 'Kraliyet Altın Kılıcı',
    weaponKind: 'sword',
    attackBonus: 75,
    critBonus: 0.1,
    reachBonus: 0.65,
    price: 1600,
    sourceTr: 'Envanter / Demirci',
    colorHex: '#f5c762',
  },
  {
    id: 'abyss_blade',
    nameTr: 'Karanlık Deniz Kılıcı',
    weaponKind: 'sword',
    attackBonus: 175,
    critBonus: 0.16,
    reachBonus: 0.9,
    price: 5500,
    sourceTr: 'Envanter / Demirci',
    colorHex: '#38bdf8',
  },
  {
    id: 'crystal_mace',
    nameTr: 'Kristal Gürz',
    weaponKind: 'mace',
    attackBonus: 55,
    critBonus: 0.08,
    reachBonus: 0.6,
    price: 0,
    sourceTr: 'Bozdağ Zirvesi Kristali',
    colorHex: '#63b3ff',
    stunLightSec: 1.5,
    stunHeavySec: 2.7,
  },
  {
    id: 'forest_bow',
    nameTr: 'Kadim Orman Yayı',
    weaponKind: 'bow',
    attackBonus: 62,
    critBonus: 0.15,
    reachBonus: 0.2,
    price: 0,
    sourceTr: 'Kara Orman Kadim Ağacı',
    colorHex: '#6ee09d',
    ranged: true,
  },
  {
    id: 'desert_spear',
    nameTr: 'Efsanevi Çöl Mızrağı',
    weaponKind: 'spear',
    attackBonus: 95,
    critBonus: 0.16,
    reachBonus: 2.2,
    price: 0,
    sourceTr: 'Altın Çöl Arenası (5 Dalga)',
    colorHex: '#ff7b70',
  },
  {
    id: 'pirate_bomb',
    nameTr: 'Korsan Barut Bombası',
    weaponKind: 'bomb',
    attackBonus: 115,
    critBonus: 0.14,
    reachBonus: 0.4,
    price: 0,
    sourceTr: 'Korsan Adası (Güneydoğu Okyanus)',
    colorHex: '#fb923c',
    ranged: true,
    aoeRadius: 6.5,
  },
  {
    id: 'arcane_staff',
    nameTr: 'Yıldız Büyü Asası',
    weaponKind: 'staff',
    attackBonus: 135,
    critBonus: 0.18,
    reachBonus: 0.5,
    price: 0,
    sourceTr: 'Büyücü Adası (Güneybatı Okyanus)',
    colorHex: '#c084fc',
    ranged: true,
    aoeRadius: 5.2,
  },
  {
    id: 'nightmare_daggers',
    nameTr: 'Kabus Çift Hançeri',
    weaponKind: 'daggers',
    attackBonus: 185,
    critBonus: 0.34,
    reachBonus: 0.35,
    price: 0,
    sourceTr: 'Sisli Korku Ormanı (Kuzeydoğu Ada)',
    colorHex: '#2dd4bf',
    lifestealPct: 0.08,
  },
  {
    id: 'poseidon_trident',
    nameTr: "Poseidon'un Mızrağı",
    weaponKind: 'trident',
    attackBonus: 235,
    critBonus: 0.24,
    reachBonus: 2.1,
    price: 0,
    sourceTr: 'Sualtı Şehri Atlantis (Girdap)',
    colorHex: '#38bdf8',
    lifestealPct: 0.14,
  },
  {
    id: 'yeti_claws',
    nameTr: 'Buzul Yeti Pençeleri',
    weaponKind: 'yeti_claws',
    attackBonus: 42,
    critBonus: 0.12,
    reachBonus: 0.85,
    price: 0,
    sourceTr: 'Buz Yetisi Başlangıç Silahı',
    colorHex: '#bae6fd',
    stunLightSec: 0.45,
    stunHeavySec: 1.25,
  },
  {
    id: 'runic_yeti_claws',
    nameTr: 'Rünik Yeti Pençeleri (5x)',
    weaponKind: 'yeti_claws',
    attackBonus: 190,
    critBonus: 0.28,
    reachBonus: 1.5,
    price: 0,
    sourceTr: 'Kuzey Kutbu 1000 Sv. Dev Yeti Rünü',
    colorHex: '#38bdf8',
    stunLightSec: 0.9,
    stunHeavySec: 2.2,
    aoeRadius: 6.2,
  },
];

export const VALID_WEAPON_IDS: readonly string[] = INVENTORY_WEAPONS.map((w) => w.id);
export const WEAPON_BY_ID: Record<string, InventoryWeaponDef> = Object.fromEntries(
  INVENTORY_WEAPONS.map((w) => [w.id, w])
);

// Inventory Armors
export const INVENTORY_ARMORS: readonly InventoryArmorDef[] = [
  {
    id: 'cloth_tunic',
    nameTr: 'Gezgin Tunik Zırhı',
    hpBonus: 0,
    defenseBonus: 0,
    speedBonus: 0,
    price: 0,
    colorHex: '#94a3b8',
    descriptionTr: 'Hafif başlangıç zırhı.',
  },
  {
    id: 'leather_vest',
    nameTr: 'Avcı Deri Zırhı',
    hpBonus: 140,
    defenseBonus: 10,
    speedBonus: 0.9,
    price: 280,
    colorHex: '#84cc16',
    descriptionTr: 'Çeviklik ve ek hareket hızı kazandırır.',
  },
  {
    id: 'iron_plate',
    nameTr: 'Çelik Plaka Zırh',
    hpBonus: 380,
    defenseBonus: 26,
    speedBonus: 0,
    price: 950,
    colorHex: '#cbd5e1',
    descriptionTr: 'Sağlam demirci çeliği ile yüksek savunma.',
  },
  {
    id: 'pirate_coat',
    nameTr: 'Korsan Kaptan Paltosu',
    hpBonus: 620,
    defenseBonus: 38,
    speedBonus: 1.2,
    price: 2400,
    colorHex: '#f97316',
    descriptionTr: 'Deniz çatışmalarına özel çevik kaptan zırhı.',
  },
  {
    id: 'arcane_robe',
    nameTr: 'Ametist Büyücü Cübbesi',
    hpBonus: 880,
    defenseBonus: 54,
    speedBonus: 1.4,
    price: 4200,
    colorHex: '#a855f7',
    descriptionTr: 'Büyü kalkanı dokulu efsunlu cübbe.',
  },
  {
    id: 'atlantis_plate',
    nameTr: 'Atlantis Mercan Zırhı',
    hpBonus: 1650,
    defenseBonus: 95,
    speedBonus: 0.8,
    price: 8500,
    colorHex: '#06b6d4',
    descriptionTr: 'Derin okyanus basıncına dayanan kadim zırh.',
  },
  {
    id: 'nightmare_aegis',
    nameTr: 'Kabus Gölge Zırhı',
    hpBonus: 3200,
    defenseBonus: 165,
    speedBonus: 1.8,
    price: 16000,
    colorHex: '#f43f5e',
    descriptionTr: '800+ Sv. korku yaratıkları ve Korsan Kaptanına karşı zirve zırh.',
  },
];

export const VALID_ARMOR_IDS: readonly string[] = INVENTORY_ARMORS.map((a) => a.id);
export const ARMOR_BY_ID: Record<string, InventoryArmorDef> = Object.fromEntries(
  INVENTORY_ARMORS.map((a) => [a.id, a])
);

// 2 Purchasable Harbor Ships (from Denizci NPC at Main Island Harbor)
export const HARBOR_SHIPS: readonly ShipDef[] = [
  {
    id: 'sloop',
    nameTr: 'Kıyı Şalupası',
    price: 600,
    maxHp: 2200,
    speed: 28,
    turnSpeed: 1.65,
    cannonDamage: 320,
    cannonCount: 1,
    descriptionTr: 'Hızlı ve çevik keşif gemisi. Adalar arası süratli yolculuk ve ön top atışı sağlar.',
    hullColorHex: '#7d4d2b',
    sailColorHex: '#f5efe0',
  },
  {
    id: 'galleon',
    nameTr: 'Kraliyet Savaş Kalyonu',
    price: 2500,
    maxHp: 6800,
    speed: 35,
    turnSpeed: 1.35,
    cannonDamage: 560,
    cannonCount: 3,
    descriptionTr: '3 direkli dev savaş gemisi! Üçlü top yaylımı, yüksek gövde canı ve korsan kalyonlarına karşı üstün güç.',
    hullColorHex: '#4f2c1b',
    sailColorHex: '#c83430',
  },
];

export const VALID_SHIP_IDS: readonly ShipId[] = ['sloop', 'galleon'];
export const SHIP_BY_ID: Record<ShipId, ShipDef> = Object.fromEntries(
  HARBOR_SHIPS.map((s) => [s.id, s])
) as Record<ShipId, ShipDef>;

export function computeActiveFoodBuffs(activeBuffs: readonly ActiveFoodBuff[]): ComputedFoodBonuses {
  const res: ComputedFoodBonuses = {
    hpMult: 1,
    attackMult: 1,
    defenseMult: 1,
    speedMult: 1,
    xpGoldMult: 1,
    critBonus: 0,
    navalMult: 1,
    cooldownMult: 1,
    regenPctPerSec: 0,
    lifestealPct: 0,
  };
  for (const b of activeBuffs) {
    if (b.remainingSec <= 0) continue;
    const def = FOOD_BY_ID[b.foodId];
    if (!def) continue;
    switch (def.buffKind) {
      case 'max_hp':
        res.hpMult *= 1.4;
        break;
      case 'attack':
        res.attackMult *= 1.45;
        break;
      case 'defense':
        res.defenseMult *= 1.5;
        break;
      case 'speed':
        res.speedMult *= 1.35;
        break;
      case 'xp_gold':
        res.xpGoldMult *= 2.0;
        break;
      case 'crit':
        res.critBonus += 0.35;
        break;
      case 'naval':
        res.navalMult *= 1.5;
        break;
      case 'cooldown':
        res.cooldownMult *= 0.6;
        break;
      case 'regen':
        res.regenPctPerSec += 0.04;
        break;
      case 'all_lifesteal':
        res.hpMult *= 1.25;
        res.attackMult *= 1.25;
        res.defenseMult *= 1.25;
        res.speedMult *= 1.2;
        res.lifestealPct += 0.15;
        break;
    }
  }
  return res;
}
