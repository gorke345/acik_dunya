export type BiomeId =
  | 'meadow'
  | 'dark_forest'
  | 'plains'
  | 'mountain'
  | 'lake'
  | 'harbor'
  | 'ocean'
  | 'pirate_island'
  | 'wizard_island'
  | 'floating_town'
  | 'whirlpool'
  | 'underwater_city'
  | 'horror_forest'
  | 'north_pole';

export interface BiomeMeta {
  id: BiomeId;
  name: string;
  subtitle: string;
  accentColor: string;
  discoveryXp: number;
  discoveryGold: number;
}

export interface WorldLandmark {
  id: string;
  name: string;
  biome: BiomeId;
  x: number;
  z: number;
  radius: number;
  kind:
    | 'watchtower'
    | 'campfire'
    | 'town_forge'
    | 'town_stable'
    | 'town_tavern'
    | 'summit'
    | 'duel_ring'
    | 'pier'
    | 'forest_tree'
    | 'dark_forest'
    | 'viking_ship'
    | 'harbor'
    | 'pirate_island'
    | 'wizard_island'
    | 'floating_town'
    | 'whirlpool'
    | 'underwater_city'
    | 'horror_forest'
    | 'north_pole'
    | 'yeti_arena';
}

// Vast Ocean Archipelago World:
// Main Island + 5 Expanded Biome Islands + Deep-Sea Atlantis + 4x Massive North Pole Continent
export const MAIN_ISLAND_RADIUS = 232;
export const WORLD_PLAYABLE_RADIUS = 1480;
export const WORLD_EXTENT = 1900;
export const WATER_LEVEL = -1.65;

// Organized Central Starter Town (Başlangıç Kasabası) on Main Island
export const SAFE_ZONE_CENTER = { x: 0, z: 0 };
export const SAFE_ZONE_RADIUS = 38;
export const TOWN_FORGE_POS = { x: 18, z: -12 };
export const TOWN_STABLE_POS = { x: -18, z: -12 };
export const TOWN_TAVERN_POS = { x: 18, z: 12 };

// Main Island Landmarks
export const DARK_FOREST_POS = { x: -88, z: -66 };
export const DARK_FOREST_RADIUS = 52;
export const FOREST_TREE_POS = { x: -60, z: -50 };
export const MOUNTAIN_CRYSTAL_POS = { x: 0, z: -162 };
export const DESERT_ARENA_POS = { x: 126, z: 10 };
export const VIKING_SHIP_POS = { x: -136, z: 24 };
export const PIER_START_X = -68;
export const PIER_END_X = -132.4;
export const PIER_Z = 24;
export const PIER_HALF_WIDTH = 4.4;
export const PIER_DECK_Y = WATER_LEVEL + 1.18;
export const VIKING_DECK_Y = WATER_LEVEL + 1.25;

// South Coast Ocean Harbor on Main Island (Liman & Denizci & 2 Gemiler)
export const HARBOR_POS = { x: 0, z: 218 };
export const HARBOR_SAILOR_POS = { x: 0, z: 220 };
export const HARBOR_DECK_Y = WATER_LEVEL + 1.45;
export const HARBOR_SHIP_SPAWN_POS = { x: 0, z: 280 };

// 5 Expanded Ocean Biome Islands + Relocated Atlantis Dome + 4x Giant North Pole Continent
export const PIRATE_ISLAND_POS = { x: 640, z: 460 };
export const PIRATE_ISLAND_RADIUS = 165;
export const PIRATE_RELIC_POS = { x: 648, z: 442 };

export const WIZARD_ISLAND_POS = { x: -650, z: 470 };
export const WIZARD_ISLAND_RADIUS = 162;
export const WIZARD_RELIC_POS = { x: -650, z: 458 };

export const FLOATING_TOWN_POS = { x: 0, z: 620 };
export const FLOATING_TOWN_RADIUS = 108;
export const FLOATING_TOWN_DECK_Y = WATER_LEVEL + 1.45;

export const WHIRLPOOL_POS = { x: -560, z: -240 };
export const WHIRLPOOL_RADIUS = 52;
export const WHIRLPOOL_PULL_RADIUS = 64;
export const WHIRLPOOL_TELEPORT_RADIUS = 18;

// Underwater City Atlantis in the far Northwest Deep Ocean (clear of the huge North Pole!)
export const UNDERWATER_CITY_POS = { x: -960, z: -760 };
export const UNDERWATER_CITY_RADIUS = 138;
export const UNDERWATER_RELIC_POS = { x: -960, z: -786 };
export const UNDERWATER_EXIT_POS = { x: -960, z: -676 };

export const HORROR_FOREST_POS = { x: 680, z: -360 };
export const HORROR_FOREST_RADIUS = 172;
export const HORROR_RELIC_POS = { x: 684, z: -380 };

// Massive 4x Scale Kuzey Kutbu (North Pole Glacial Continent) & Lv.1000 Giant Yeti Arena
export const NORTH_POLE_POS = { x: 0, z: -860 };
export const NORTH_POLE_RADIUS = 260;
export const NORTH_POLE_DOCK_POS = { x: 0, z: -608 };
export const YETI_BOSS_POS = { x: 0, z: -925 };

export const BIOME_META: Record<BiomeId, BiomeMeta> = {
  meadow: {
    id: 'meadow',
    name: 'Başlangıç Kasabası & Yayla',
    subtitle: 'Düzenli Meydan, Demirci, Ahır & Yemekhane',
    accentColor: '#5cb85c',
    discoveryXp: 80,
    discoveryGold: 60,
  },
  dark_forest: {
    id: 'dark_forest',
    name: 'Kara Orman',
    subtitle: 'Dev Ağaçlar & 50 Sv. Okçu Elfler',
    accentColor: '#298a5b',
    discoveryXp: 160,
    discoveryGold: 120,
  },
  plains: {
    id: 'plains',
    name: 'Altın Çöl & Ova',
    subtitle: '5 Dalgalı Çöl Arenası & Bozkır',
    accentColor: '#e0a94f',
    discoveryXp: 150,
    discoveryGold: 110,
  },
  mountain: {
    id: 'mountain',
    name: 'Bozdağ Zirvesi',
    subtitle: 'Kristal Dağ & Karlı Doruk',
    accentColor: '#9ab2c7',
    discoveryXp: 210,
    discoveryGold: 150,
  },
  lake: {
    id: 'lake',
    name: 'Gümüş Göl & Viking Koy',
    subtitle: 'Viking Gemisi & Büyük Köprü',
    accentColor: '#4fa8d6',
    discoveryXp: 180,
    discoveryGold: 130,
  },
  harbor: {
    id: 'harbor',
    name: 'Ana Ada Limanı',
    subtitle: 'Denizci Tersanesi & Okyanus İskelesi',
    accentColor: '#4db8d9',
    discoveryXp: 140,
    discoveryGold: 100,
  },
  ocean: {
    id: 'ocean',
    name: 'Açık Okyanus',
    subtitle: 'Ticaret Gemileri & Korsan Suları',
    accentColor: '#2579b8',
    discoveryXp: 120,
    discoveryGold: 90,
  },
  pirate_island: {
    id: 'pirate_island',
    name: 'Korsan Adası',
    subtitle: 'Geniş Kafatası Koyu & Bombacı Silahı',
    accentColor: '#e67e22',
    discoveryXp: 450,
    discoveryGold: 350,
  },
  wizard_island: {
    id: 'wizard_island',
    name: 'Büyücü Adası',
    subtitle: 'Geniş Ametist Kule & Yıldız Büyü Asası',
    accentColor: '#a855f7',
    discoveryXp: 520,
    discoveryGold: 420,
  },
  floating_town: {
    id: 'floating_town',
    name: 'Küçük Yüzen Kasaba',
    subtitle: 'Deniz Üstü Ticaret Kasabası & Konvoy Limanı',
    accentColor: '#38bdf8',
    discoveryXp: 350,
    discoveryGold: 280,
  },
  whirlpool: {
    id: 'whirlpool',
    name: 'Dev Okyanus Girdabı',
    subtitle: 'İçine Girince Sualtı Şehrine Yutar',
    accentColor: '#0ea5e9',
    discoveryXp: 300,
    discoveryGold: 250,
  },
  underwater_city: {
    id: 'underwater_city',
    name: 'Sualtı Şehri Atlantis',
    subtitle: "Derin Deniz Kubbesi & Poseidon'un Mızrağı",
    accentColor: '#06b6d4',
    discoveryXp: 850,
    discoveryGold: 750,
  },
  horror_forest: {
    id: 'horror_forest',
    name: 'Sisli Korku Ormanı',
    subtitle: '800+ Sv. Kabus Yaratıkları & Gölge Hançerleri',
    accentColor: '#9f1239',
    discoveryXp: 1200,
    discoveryGold: 1000,
  },
  north_pole: {
    id: 'north_pole',
    name: 'Kuzey Kutbu Buzul Kıtası',
    subtitle: '4x Dev Buzul Kıta & 1000 Sv. Devasa Yeti Boss',
    accentColor: '#7dd3fc',
    discoveryXp: 1500,
    discoveryGold: 1200,
  },
};

export const WORLD_LANDMARKS: WorldLandmark[] = [
  {
    id: 'starter-town-plaza',
    name: 'Başlangıç Kasabası Meydanı',
    biome: 'meadow',
    x: SAFE_ZONE_CENTER.x,
    z: SAFE_ZONE_CENTER.z,
    radius: SAFE_ZONE_RADIUS,
    kind: 'campfire',
  },
  {
    id: 'town-forge',
    name: 'Kasaba Demircisi',
    biome: 'meadow',
    x: TOWN_FORGE_POS.x,
    z: TOWN_FORGE_POS.z,
    radius: 7,
    kind: 'town_forge',
  },
  {
    id: 'town-stable',
    name: 'Kasaba Ahırı (400 Altın At)',
    biome: 'meadow',
    x: TOWN_STABLE_POS.x,
    z: TOWN_STABLE_POS.z,
    radius: 7,
    kind: 'town_stable',
  },
  {
    id: 'town-tavern',
    name: 'Kasaba Yemekhanesi (10 Güçlendirici Yemek)',
    biome: 'meadow',
    x: TOWN_TAVERN_POS.x,
    z: TOWN_TAVERN_POS.z,
    radius: 7,
    kind: 'town_tavern',
  },
  {
    id: 'highland-watchtower',
    name: 'Kuzey Gözetleme Kulesi',
    biome: 'meadow',
    x: 0,
    z: -32,
    radius: 6,
    kind: 'watchtower',
  },
  {
    id: 'dark-forest-heart',
    name: 'Kara Orman (50 Sv. Elfler)',
    biome: 'dark_forest',
    x: DARK_FOREST_POS.x,
    z: DARK_FOREST_POS.z,
    radius: DARK_FOREST_RADIUS,
    kind: 'dark_forest',
  },
  {
    id: 'sacred-forest-tree',
    name: 'Kadim Orman Ağacı',
    biome: 'dark_forest',
    x: FOREST_TREE_POS.x,
    z: FOREST_TREE_POS.z,
    radius: 10,
    kind: 'forest_tree',
  },
  {
    id: 'golden-duel-ring',
    name: 'Altın Çöl Arenası (5 Dalga)',
    biome: 'plains',
    x: DESERT_ARENA_POS.x,
    z: DESERT_ARENA_POS.z,
    radius: 18,
    kind: 'duel_ring',
  },
  {
    id: 'bozdag-summit',
    name: 'Bozdağ Zirve Kristali',
    biome: 'mountain',
    x: MOUNTAIN_CRYSTAL_POS.x,
    z: MOUNTAIN_CRYSTAL_POS.z,
    radius: 13,
    kind: 'summit',
  },
  {
    id: 'silver-lake-pier',
    name: 'Gümüş Göl Büyük Köprüsü',
    biome: 'lake',
    x: -82,
    z: PIER_Z,
    radius: 12,
    kind: 'pier',
  },
  {
    id: 'viking-longship',
    name: 'Viking Gemisi',
    biome: 'lake',
    x: VIKING_SHIP_POS.x,
    z: VIKING_SHIP_POS.z,
    radius: 13,
    kind: 'viking_ship',
  },
  {
    id: 'main-island-harbor',
    name: 'Ana Ada Limanı (Denizci & Gemiler)',
    biome: 'harbor',
    x: HARBOR_POS.x,
    z: HARBOR_POS.z,
    radius: 28,
    kind: 'harbor',
  },
  {
    id: 'pirate-island',
    name: 'Korsan Adası (Bombacı Silahı)',
    biome: 'pirate_island',
    x: PIRATE_ISLAND_POS.x,
    z: PIRATE_ISLAND_POS.z,
    radius: PIRATE_ISLAND_RADIUS,
    kind: 'pirate_island',
  },
  {
    id: 'wizard-island',
    name: 'Büyücü Adası (Büyü Asası)',
    biome: 'wizard_island',
    x: WIZARD_ISLAND_POS.x,
    z: WIZARD_ISLAND_POS.z,
    radius: WIZARD_ISLAND_RADIUS,
    kind: 'wizard_island',
  },
  {
    id: 'floating-town',
    name: 'Küçük Yüzen Kasaba',
    biome: 'floating_town',
    x: FLOATING_TOWN_POS.x,
    z: FLOATING_TOWN_POS.z,
    radius: FLOATING_TOWN_RADIUS,
    kind: 'floating_town',
  },
  {
    id: 'ocean-whirlpool',
    name: 'Dev Girdap (Sualtı Geçidi)',
    biome: 'whirlpool',
    x: WHIRLPOOL_POS.x,
    z: WHIRLPOOL_POS.z,
    radius: WHIRLPOOL_RADIUS,
    kind: 'whirlpool',
  },
  {
    id: 'underwater-city',
    name: "Sualtı Şehri Atlantis (Poseidon'un Mızrağı)",
    biome: 'underwater_city',
    x: UNDERWATER_CITY_POS.x,
    z: UNDERWATER_CITY_POS.z,
    radius: UNDERWATER_CITY_RADIUS,
    kind: 'underwater_city',
  },
  {
    id: 'horror-forest-island',
    name: 'Sisli Korku Ormanı (800+ Sv.)',
    biome: 'horror_forest',
    x: HORROR_FOREST_POS.x,
    z: HORROR_FOREST_POS.z,
    radius: HORROR_FOREST_RADIUS,
    kind: 'horror_forest',
  },
  {
    id: 'north-pole-continent',
    name: 'Kuzey Kutbu Buzul Kıtası (4x Dev Bölge)',
    biome: 'north_pole',
    x: NORTH_POLE_POS.x,
    z: NORTH_POLE_POS.z,
    radius: NORTH_POLE_RADIUS,
    kind: 'north_pole',
  },
  {
    id: 'yeti-boss-arena',
    name: '1000 Sv. Devasa Yeti Arenası (Yeti Rünü)',
    biome: 'north_pole',
    x: YETI_BOSS_POS.x,
    z: YETI_BOSS_POS.z,
    radius: 36,
    kind: 'yeti_arena',
  },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function gaussian(dx: number, dz: number, radius: number): number {
  const d2 = dx * dx + dz * dz;
  return Math.exp(-d2 / (2 * radius * radius));
}

function ridgedNoise(x: number, z: number, freq: number): number {
  const v = Math.sin(x * freq + Math.cos(z * freq * 0.72) * 0.85) * Math.cos(z * freq - Math.sin(x * freq * 0.65) * 0.65);
  return 1 - Math.abs(v);
}

/**
 * Deterministic multi-island ocean archipelago height function with richer landforms:
 *  - Main Island (r <= 232): Organized Starter Town plateau, sculpted Bozdağ terraced alpine peaks,
 *    Kara Orman wooded hills, Silver Lake glacial basin, Golden Desert dunes & Arena, South Harbor bay
 *  - 5 Larger & Wider Ocean Biome Islands (Pirate, Wizard, Floating Town, Atlantis, Horror Forest)
 *  - Massive 4x Kuzey Kutbu (North Pole) glacial continent with jagged ice peaks, glacial valley,
 *    southern landing ice shelf, and a grand amphitheater for the Lv.1000 Giant Yeti Boss!
 */
export function groundHeightAt(x: number, z: number): number {
  const rMain = Math.hypot(x, z);
  const seabed = -10.8;

  // --- MAIN ISLAND HEIGHT ---
  const angMain = Math.atan2(z, x);
  const coastNoise =
    Math.sin(angMain * 5 + 0.6) * 11 +
    Math.cos(angMain * 9 - 0.3) * 5.5 +
    Math.sin(angMain * 14 + 1.2) * 2.5;
  const effectiveMainRadius = MAIN_ISLAND_RADIUS + coastNoise;

  if (rMain < effectiveMainRadius + 50) {
    // Rich multi-octave rolling highland relief
    const n1 = Math.sin(x * 0.025) * Math.cos(z * 0.025) * 2.3;
    const n2 = Math.sin(x * 0.062 + 1.3) * Math.sin(z * 0.058 - 0.7) * 0.95;
    const n3 = Math.cos((x + z) * 0.019) * 1.25;
    const n4 = ridgedNoise(x, z, 0.042) * 0.9;
    let h = 1.45 + n1 + n2 + n3 + n4;

    // 1. Bozdağ Mountain Range in the North (sculpted terraced alpine peaks & crags)
    const northFactor = smoothstep(-58, -128, z);
    const centralSummit = gaussian(x - MOUNTAIN_CRYSTAL_POS.x, z - MOUNTAIN_CRYSTAL_POS.z, 48) * 24.5;
    const westPeak = gaussian(x + 90, z + 168, 38) * 27.0;
    const eastPeak = gaussian(x - 96, z + 156, 38) * 25.5;
    const ridgeCrags = ridgedNoise(x, z, 0.072) * 5.2 * northFactor;
    const alpineRaw = northFactor * 5.4 + centralSummit + westPeak + eastPeak + ridgeCrags;
    // Subtle natural rock terracing on steep mountain slopes
    const alpineTerrace = alpineRaw + Math.sin(alpineRaw * 0.78) * 0.42 * northFactor;
    h += alpineTerrace;

    // Winding scenic mountain pass trail leading cleanly up to Bozdağ Crystal
    const summitTrailDist = Math.abs(x - Math.sin(z * 0.045) * 14);
    const trailZone = smoothstep(-52, -74, z) * (1 - smoothstep(-150, -170, z));
    const trailMask = (1 - smoothstep(6.5, 21, summitTrailDist)) * trailZone;
    if (trailMask > 0) {
      const targetSlope = 1.5 + smoothstep(-52, -162, z) * 22.0;
      h = h * (1 - trailMask * 0.68) + targetSlope * (trailMask * 0.68);
    }

    const summitFlat = gaussian(x - MOUNTAIN_CRYSTAL_POS.x, z - MOUNTAIN_CRYSTAL_POS.z, 14.5);
    h = h * (1 - summitFlat * 0.82) + 24.4 * (summitFlat * 0.82);

    // 2. Northwest Kara Orman wooded knolls
    const darkForestMask = gaussian(x - DARK_FOREST_POS.x, z - DARK_FOREST_POS.z, 48);
    const forestRoll = 2.75 + Math.sin(x * 0.055) * Math.cos(z * 0.055) * 1.65 + ridgedNoise(x, z, 0.06) * 0.8;
    h = h * (1 - darkForestMask * 0.58) + forestRoll * (darkForestMask * 0.58);

    const treeFlat = gaussian(x - FOREST_TREE_POS.x, z - FOREST_TREE_POS.z, 10.5);
    h = h * (1 - treeFlat * 0.74) + 2.35 * (treeFlat * 0.74);

    // 3. Western Silver Lake & Carved Valley Basin
    const lakeBasin =
      gaussian(x + 140, z - 24, 40) * 7.2 +
      gaussian(x + 120, z + 8, 29) * 4.6 +
      gaussian(x + 126, z - 46, 25) * 3.8;
    h -= lakeBasin;

    // 4. Eastern Altın Çöl & Sculpted Sand Dunes
    const plainsMask = smoothstep(42, 88, x) * (1 - smoothstep(-64, -108, z));
    const duneWaves =
      Math.sin(x * 0.048 + z * 0.022) * 1.35 +
      Math.cos(z * 0.054 - x * 0.018) * 0.85;
    const plainsTarget = 1.85 + duneWaves;
    h = h * (1 - plainsMask * 0.75) + plainsTarget * (plainsMask * 0.75);

    const arenaFlat = gaussian(x - DESERT_ARENA_POS.x, z - DESERT_ARENA_POS.z, 21);
    h = h * (1 - arenaFlat * 0.9) + 1.7 * (arenaFlat * 0.9);

    // 5. Organized Central Starter Town flat terraced plateau (wide & clean!)
    const townFlat = gaussian(x - SAFE_ZONE_CENTER.x, z - SAFE_ZONE_CENTER.z, 38);
    const townCore = 1 - smoothstep(26, 40, rMain);
    const townBlend = Math.max(townFlat * 0.92, townCore * 0.98);
    h = h * (1 - townBlend) + 1.25 * townBlend;

    // 6. South Coast Harbor Bay Approach
    const harborFlat = gaussian(x - HARBOR_POS.x, z - (HARBOR_POS.z - 22), 28);
    h = h * (1 - harborFlat * 0.78) + 0.65 * (harborFlat * 0.78);

    // Smooth sandy beach -> cliff -> seabed transition
    const coastFalloff = smoothstep(effectiveMainRadius - 38, effectiveMainRadius + 18, rMain);
    h = h * (1 - coastFalloff) + seabed * coastFalloff;
    return h;
  }

  let oceanH = seabed;

  // --- ISLAND 1: EXPANDED KORSAN ADASI (640, 460, r=165) ---
  const dPirate = Math.hypot(x - PIRATE_ISLAND_POS.x, z - PIRATE_ISLAND_POS.z);
  if (dPirate < PIRATE_ISLAND_RADIUS + 46) {
    const ang = Math.atan2(z - PIRATE_ISLAND_POS.z, x - PIRATE_ISLAND_POS.x);
    const effR = PIRATE_ISLAND_RADIUS + Math.sin(ang * 4) * 14 + Math.cos(ang * 7) * 7;
    const islandMask = 1 - smoothstep(effR - 36, effR + 16, dPirate);
    const volcanoPeak = gaussian(x - (PIRATE_ISLAND_POS.x + 48), z - (PIRATE_ISLAND_POS.z + 42), 46) * 20.5;
    const westRidge = gaussian(x - (PIRATE_ISLAND_POS.x - 42), z - (PIRATE_ISLAND_POS.z + 52), 38) * 11.5;
    const fortFlat = gaussian(x - PIRATE_RELIC_POS.x, z - PIRATE_RELIC_POS.z, 28);
    let ph = 1.85 + Math.sin(x * 0.04) * Math.cos(z * 0.04) * 1.8 + ridgedNoise(x, z, 0.05) * 1.4 + volcanoPeak + westRidge;
    ph = ph * (1 - fortFlat * 0.84) + 2.6 * (fortFlat * 0.84);
    // Natural sandy cove opening on Northwest side facing Main Island
    const coveDip = gaussian(x - (PIRATE_ISLAND_POS.x - 102), z - (PIRATE_ISLAND_POS.z - 62), 38) * 5.2;
    ph -= coveDip;
    oceanH = Math.max(oceanH, seabed * (1 - islandMask) + ph * islandMask);
  }

  // --- ISLAND 2: EXPANDED BÜYÜCÜ ADASI (-650, 470, r=162) ---
  const dWizard = Math.hypot(x - WIZARD_ISLAND_POS.x, z - WIZARD_ISLAND_POS.z);
  if (dWizard < WIZARD_ISLAND_RADIUS + 46) {
    const ang = Math.atan2(z - WIZARD_ISLAND_POS.z, x - WIZARD_ISLAND_POS.x);
    const effR = WIZARD_ISLAND_RADIUS + Math.sin(ang * 5 + 1.1) * 13 + Math.cos(ang * 8) * 5;
    const islandMask = 1 - smoothstep(effR - 36, effR + 16, dWizard);
    const terrace = gaussian(x - WIZARD_ISLAND_POS.x, z - WIZARD_ISLAND_POS.z, 76) * 8.5;
    const spireHills =
      gaussian(x - (WIZARD_ISLAND_POS.x - 54), z - (WIZARD_ISLAND_POS.z + 44), 34) * 12.5 +
      gaussian(x - (WIZARD_ISLAND_POS.x + 58), z - (WIZARD_ISLAND_POS.z - 46), 34) * 11.0;
    const sanctumFlat = gaussian(x - WIZARD_RELIC_POS.x, z - WIZARD_RELIC_POS.z, 30);
    let wh = 2.0 + terrace + spireHills + Math.sin(x * 0.055) * Math.cos(z * 0.055) * 1.4;
    wh = wh * (1 - sanctumFlat * 0.86) + 7.2 * (sanctumFlat * 0.86);
    oceanH = Math.max(oceanH, seabed * (1 - islandMask) + wh * islandMask);
  }

  // --- ISLAND 3: EXPANDED KÜÇÜK YÜZEN KASABA (0, 620, r=108) ---
  const dFloat = Math.hypot(x - FLOATING_TOWN_POS.x, z - FLOATING_TOWN_POS.z);
  if (dFloat < FLOATING_TOWN_RADIUS + 42) {
    const shoalMask = 1 - smoothstep(FLOATING_TOWN_RADIUS - 24, FLOATING_TOWN_RADIUS + 26, dFloat);
    const shoalH = WATER_LEVEL - 1.0 + gaussian(x - FLOATING_TOWN_POS.x, z - FLOATING_TOWN_POS.z, 40) * 1.75;
    oceanH = Math.max(oceanH, seabed * (1 - shoalMask) + shoalH * shoalMask);
  }

  // --- ISLAND 4: EXPANDED SUALTI ŞEHRİ ATLANTİS (-960, -760, r=138) ---
  const dUnder = Math.hypot(x - UNDERWATER_CITY_POS.x, z - UNDERWATER_CITY_POS.z);
  if (dUnder < UNDERWATER_CITY_RADIUS + 48) {
    const cityMask = 1 - smoothstep(UNDERWATER_CITY_RADIUS - 22, UNDERWATER_CITY_RADIUS + 22, dUnder);
    const plazaFlat = gaussian(x - UNDERWATER_CITY_POS.x, z - UNDERWATER_CITY_POS.z, 84);
    const outerRim = Math.sin(dUnder * 0.08) * 1.1;
    const uh = (1.8 + outerRim + Math.sin(x * 0.035) * Math.cos(z * 0.035) * 0.9) * (1 - plazaFlat * 0.82) + 1.5 * (plazaFlat * 0.82);
    oceanH = Math.max(oceanH, seabed * (1 - cityMask) + uh * cityMask);
  }

  // --- ISLAND 5: EXPANDED SİSLİ KORKU ORMANI (680, -360, r=172) ---
  const dHorror = Math.hypot(x - HORROR_FOREST_POS.x, z - HORROR_FOREST_POS.z);
  if (dHorror < HORROR_FOREST_RADIUS + 48) {
    const ang = Math.atan2(z - HORROR_FOREST_POS.z, x - HORROR_FOREST_POS.x);
    const effR = HORROR_FOREST_RADIUS + Math.sin(ang * 6 - 0.5) * 15 + Math.cos(ang * 9) * 6;
    const islandMask = 1 - smoothstep(effR - 38, effR + 18, dHorror);
    const ridge =
      ridgedNoise(x, z, 0.044) * 6.8 +
      gaussian(x - (HORROR_FOREST_POS.x + 56), z - (HORROR_FOREST_POS.z - 48), 48) * 14.0 +
      gaussian(x - (HORROR_FOREST_POS.x - 54), z - (HORROR_FOREST_POS.z + 50), 42) * 11.2;
    const shrineFlat = gaussian(x - HORROR_RELIC_POS.x, z - HORROR_RELIC_POS.z, 30);
    let hh = 2.2 + ridge;
    hh = hh * (1 - shrineFlat * 0.84) + 3.4 * (shrineFlat * 0.84);
    oceanH = Math.max(oceanH, seabed * (1 - islandMask) + hh * islandMask);
  }

  // --- CONTINENT 6: 4x MASSIVE KUZEY KUTBU (NORTH POLE, 0, -860, r=260) ---
  const dPole = Math.hypot(x - NORTH_POLE_POS.x, z - NORTH_POLE_POS.z);
  if (dPole < NORTH_POLE_RADIUS + 64) {
    const ang = Math.atan2(z - NORTH_POLE_POS.z, x - NORTH_POLE_POS.x);
    const effR =
      NORTH_POLE_RADIUS +
      Math.sin(ang * 5 + 0.4) * 22 +
      Math.cos(ang * 8 - 0.8) * 11 +
      Math.sin(ang * 13) * 5;
    const poleMask = 1 - smoothstep(effR - 46, effR + 24, dPole);

    // Dramatic glacial mountain ring surrounding a central frozen tundra & Yeti Amphitheater
    const ringFactor = smoothstep(88, 175, dPole) * (1 - smoothstep(205, 255, dPole));
    const northGlacierWall =
      gaussian(x - 135, z - (NORTH_POLE_POS.z - 85), 68) * 32.0 +
      gaussian(x + 135, z - (NORTH_POLE_POS.z - 85), 68) * 34.0 +
      gaussian(x, z - (NORTH_POLE_POS.z - 168), 72) * 38.0 +
      gaussian(x - 150, z - (NORTH_POLE_POS.z + 55), 58) * 20.0 +
      gaussian(x + 150, z - (NORTH_POLE_POS.z + 55), 58) * 21.0;

    const glacialCrags = ridgedNoise(x, z, 0.036) * 8.5 * (0.35 + ringFactor * 0.9);
    const snowDrifts = Math.sin(x * 0.028) * Math.cos(z * 0.028) * 2.4 + Math.cos((x - z) * 0.05) * 1.1;

    let nh = 2.6 + snowDrifts + glacialCrags + northGlacierWall;

    // Wide glacial valley corridor from the South Landing Dock (z = -608) straight to the Giant Yeti Arena (z = -925)
    const valleyDist = Math.abs(x - Math.sin((z + 760) * 0.02) * 18);
    const valleyZ = smoothstep(-595, -645, z) * (1 - smoothstep(-940, -1010, z));
    const valleyMask = (1 - smoothstep(22, 58, valleyDist)) * valleyZ;
    if (valleyMask > 0) {
      const corridorH = 2.2 + smoothstep(-610, -925, z) * 5.2;
      nh = nh * (1 - valleyMask * 0.8) + corridorH * (valleyMask * 0.8);
    }

    // Flat glacial arena for the Lv.1000 Giant Yeti Boss at (0, -925)
    const yetiArenaFlat = gaussian(x - YETI_BOSS_POS.x, z - YETI_BOSS_POS.z, 46);
    nh = nh * (1 - yetiArenaFlat * 0.92) + 6.4 * (yetiArenaFlat * 0.92);

    // Gentle southern landing beach at (0, -615) so ships and Balıkadam arrive smoothly
    const dockBeach = gaussian(x - NORTH_POLE_DOCK_POS.x, z - (NORTH_POLE_DOCK_POS.z - 16), 44);
    nh = nh * (1 - dockBeach * 0.85) + 1.0 * (dockBeach * 0.85);

    oceanH = Math.max(oceanH, seabed * (1 - poleMask) + nh * poleMask);
  }

  return oceanH;
}

export function getTerrainNormalAt(x: number, z: number): { nx: number; ny: number; nz: number } {
  const eps = 0.75;
  const hL = groundHeightAt(x - eps, z);
  const hR = groundHeightAt(x + eps, z);
  const hD = groundHeightAt(x, z - eps);
  const hU = groundHeightAt(x, z + eps);
  const dx = (hR - hL) / (2 * eps);
  const dz = (hU - hD) / (2 * eps);
  const invLen = 1 / Math.hypot(dx, 1, dz);
  return { nx: -dx * invLen, ny: invLen, nz: -dz * invLen };
}

export function getBiomeAt(x: number, z: number): BiomeId {
  if (isInsideSafeZone(x, z)) {
    return 'meadow';
  }
  if (Math.hypot(x - NORTH_POLE_POS.x, z - NORTH_POLE_POS.z) <= NORTH_POLE_RADIUS + 34) {
    return 'north_pole';
  }
  if (Math.hypot(x - UNDERWATER_CITY_POS.x, z - UNDERWATER_CITY_POS.z) <= UNDERWATER_CITY_RADIUS + 26) {
    return 'underwater_city';
  }
  if (Math.hypot(x - PIRATE_ISLAND_POS.x, z - PIRATE_ISLAND_POS.z) <= PIRATE_ISLAND_RADIUS + 30) {
    return 'pirate_island';
  }
  if (Math.hypot(x - WIZARD_ISLAND_POS.x, z - WIZARD_ISLAND_POS.z) <= WIZARD_ISLAND_RADIUS + 30) {
    return 'wizard_island';
  }
  if (Math.hypot(x - FLOATING_TOWN_POS.x, z - FLOATING_TOWN_POS.z) <= FLOATING_TOWN_RADIUS + 26) {
    return 'floating_town';
  }
  if (Math.hypot(x - HORROR_FOREST_POS.x, z - HORROR_FOREST_POS.z) <= HORROR_FOREST_RADIUS + 30) {
    return 'horror_forest';
  }
  if (Math.hypot(x - WHIRLPOOL_POS.x, z - WHIRLPOOL_POS.z) <= WHIRLPOOL_PULL_RADIUS + 16) {
    return 'whirlpool';
  }
  if (Math.hypot(x - HARBOR_POS.x, z - HARBOR_POS.z) <= 40) {
    return 'harbor';
  }

  const rMain = Math.hypot(x, z);
  if (rMain > MAIN_ISLAND_RADIUS + 14) {
    return 'ocean';
  }

  const h = groundHeightAt(x, z);
  if (h < WATER_LEVEL - 0.6 && rMain > 175) {
    return 'ocean';
  }
  if (z < -98 || h >= 9.6) {
    return 'mountain';
  }
  if (Math.hypot(x - DARK_FOREST_POS.x, z - DARK_FOREST_POS.z) <= DARK_FOREST_RADIUS + 4) {
    return 'dark_forest';
  }
  if (x < -76 && (h < WATER_LEVEL + 2.1 || Math.hypot(x + 136, z - 24) < 60)) {
    return 'lake';
  }
  if (x > 52 && z > -78) {
    return 'plains';
  }
  return 'meadow';
}

export function isInsideSafeZone(x: number, z: number): boolean {
  const dx = x - SAFE_ZONE_CENTER.x;
  const dz = z - SAFE_ZONE_CENTER.z;
  return dx * dx + dz * dz <= SAFE_ZONE_RADIUS * SAFE_ZONE_RADIUS;
}

export function isInsideDarkForest(x: number, z: number): boolean {
  const dx = x - DARK_FOREST_POS.x;
  const dz = z - DARK_FOREST_POS.z;
  return dx * dx + dz * dz <= DARK_FOREST_RADIUS * DARK_FOREST_RADIUS;
}

export function isInsideHorrorForest(x: number, z: number): boolean {
  const dx = x - HORROR_FOREST_POS.x;
  const dz = z - HORROR_FOREST_POS.z;
  return dx * dx + dz * dz <= (HORROR_FOREST_RADIUS + 22) * (HORROR_FOREST_RADIUS + 22);
}

export function isInsideUnderwaterCity(x: number, z: number): boolean {
  const dx = x - UNDERWATER_CITY_POS.x;
  const dz = z - UNDERWATER_CITY_POS.z;
  return dx * dx + dz * dz <= (UNDERWATER_CITY_RADIUS + 14) * (UNDERWATER_CITY_RADIUS + 14);
}

export function isInsideNorthPole(x: number, z: number): boolean {
  const dx = x - NORTH_POLE_POS.x;
  const dz = z - NORTH_POLE_POS.z;
  return dx * dx + dz * dz <= (NORTH_POLE_RADIUS + 28) * (NORTH_POLE_RADIUS + 28);
}

export function isSwimmableWater(x: number, z: number): boolean {
  return groundHeightAt(x, z) < WATER_LEVEL - 0.15;
}

export function isOpenOcean(x: number, z: number): boolean {
  return getBiomeAt(x, z) === 'ocean';
}

export function walkableHeightAt(x: number, z: number): { y: number; onStructure: boolean } {
  const terrainY = groundHeightAt(x, z);

  // 1. Enlarged Silver Lake Grand Wooden Bridge
  if (
    x >= PIER_END_X - 0.6 &&
    x <= PIER_START_X + 3.5 &&
    Math.abs(z - PIER_Z) <= PIER_HALF_WIDTH
  ) {
    const shoreY = Math.max(WATER_LEVEL + 0.5, groundHeightAt(PIER_START_X + 3.5, PIER_Z));
    let deckY: number;
    if (x > PIER_START_X - 5) {
      const rampT = Math.max(0, Math.min(1, (PIER_START_X + 3.5 - x) / 8.5));
      deckY = shoreY + rampT * (PIER_DECK_Y - shoreY);
    } else {
      const spanT = Math.max(0, Math.min(1, (PIER_START_X - 5 - x) / (PIER_START_X - 5 - PIER_END_X)));
      deckY = PIER_DECK_Y + spanT * (VIKING_DECK_Y - PIER_DECK_Y);
    }
    if (deckY >= terrainY - 0.25) {
      return { y: deckY, onStructure: true };
    }
  }

  // 2. Viking Longship Deck footprint
  const dz = z - VIKING_SHIP_POS.z;
  const dx = x - VIKING_SHIP_POS.x;
  if (Math.abs(dz) <= 10.4) {
    const taper = Math.max(0.35, 1 - Math.pow(dz / 11.4, 2));
    const halfWidth = 4.65 * taper;
    if (Math.abs(dx) <= halfWidth) {
      return { y: VIKING_DECK_Y, onStructure: true };
    }
  }

  // 3. Bozdağ Summit Crystal stepped stone altar
  const summitDist = Math.hypot(x - MOUNTAIN_CRYSTAL_POS.x, z - MOUNTAIN_CRYSTAL_POS.z);
  if (summitDist <= 8.0) {
    const summitBaseY = groundHeightAt(MOUNTAIN_CRYSTAL_POS.x, MOUNTAIN_CRYSTAL_POS.z);
    const daisTopY = summitDist <= 5.2 ? summitBaseY + 0.96 : summitBaseY + 0.36;
    if (daisTopY > terrainY) {
      return { y: daisTopY, onStructure: true };
    }
  }

  // 4. Main Island South Ocean Harbor Quay & Twin Ship Piers
  if (Math.abs(x - HARBOR_POS.x) <= 26 && z >= 196 && z <= 232) {
    if (HARBOR_DECK_Y >= terrainY - 0.25) {
      return { y: HARBOR_DECK_Y, onStructure: true };
    }
  }
  if (
    (Math.abs(x - (HARBOR_POS.x - 15)) <= 4.8 || Math.abs(x - (HARBOR_POS.x + 15)) <= 4.8) &&
    z >= 228 &&
    z <= 258
  ) {
    return { y: HARBOR_DECK_Y, onStructure: true };
  }

  // 5. Expanded Küçük Yüzen Kasaba (Floating Town) wooden boardwalk plaza & north dock
  const dfx = x - FLOATING_TOWN_POS.x;
  const dfz = z - FLOATING_TOWN_POS.z;
  if (Math.hypot(dfx, dfz) <= 74) {
    return { y: Math.max(terrainY, FLOATING_TOWN_DECK_Y), onStructure: true };
  }
  if (Math.abs(dfx) <= 9.5 && dfz >= -104 && dfz <= -66) {
    return { y: FLOATING_TOWN_DECK_Y, onStructure: true };
  }

  // 6. North Pole Southern Ice Pier Landing
  if (
    Math.abs(x - NORTH_POLE_DOCK_POS.x) <= 10 &&
    z >= NORTH_POLE_DOCK_POS.z - 22 &&
    z <= NORTH_POLE_DOCK_POS.z + 24
  ) {
    const pierY = WATER_LEVEL + 1.4;
    if (pierY >= terrainY - 0.25) {
      return { y: pierY, onStructure: true };
    }
  }

  return { y: terrainY, onStructure: false };
}

export function clampToPlayableWorld(x: number, z: number): { x: number; z: number; clamped: boolean } {
  const dist = Math.hypot(x, z);
  if (dist <= WORLD_PLAYABLE_RADIUS) {
    return { x, z, clamped: false };
  }
  const scale = WORLD_PLAYABLE_RADIUS / dist;
  return { x: x * scale, z: z * scale, clamped: true };
}

export function getNearestLandmark(x: number, z: number): { landmark: WorldLandmark; distance: number } {
  let best = WORLD_LANDMARKS[0];
  let bestDist = Infinity;
  for (const lm of WORLD_LANDMARKS) {
    const d = Math.hypot(x - lm.x, z - lm.z);
    if (d < bestDist) {
      bestDist = d;
      best = lm;
    }
  }
  return { landmark: best, distance: bestDist };
}
