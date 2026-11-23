export type BiomeId = 'meadow' | 'plains' | 'mountain' | 'lake';

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
  kind: 'watchtower' | 'campfire' | 'summit' | 'duel_ring' | 'pier';
}

export const WORLD_PLAYABLE_RADIUS = 104;
export const WORLD_EXTENT = 160;
export const WATER_LEVEL = -1.65;
export const SAFE_ZONE_CENTER = { x: 0, z: 14 };
export const SAFE_ZONE_RADIUS = 16;

export const BIOME_META: Record<BiomeId, BiomeMeta> = {
  meadow: {
    id: 'meadow',
    name: 'Zümrüt Çayır',
    subtitle: 'Güvenli Kamp & Yeşil Yayla',
    accentColor: '#5cb85c',
    discoveryXp: 40,
    discoveryGold: 25,
  },
  plains: {
    id: 'plains',
    name: 'Altın Ova',
    subtitle: 'Geniş Düello Bozkırı',
    accentColor: '#e0a94f',
    discoveryXp: 70,
    discoveryGold: 45,
  },
  mountain: {
    id: 'mountain',
    name: 'Bozdağ Zirvesi',
    subtitle: 'Kayalık Dağ & Karlı Doruk',
    accentColor: '#9ab2c7',
    discoveryXp: 110,
    discoveryGold: 75,
  },
  lake: {
    id: 'lake',
    name: 'Gümüş Göl & Vadi',
    subtitle: 'Serin Göl Kıyısı & Köprü',
    accentColor: '#4fa8d6',
    discoveryXp: 80,
    discoveryGold: 55,
  },
};

export const WORLD_LANDMARKS: WorldLandmark[] = [
  {
    id: 'sanctuary-campfire',
    name: 'Taş Meydan Kampı',
    biome: 'meadow',
    x: SAFE_ZONE_CENTER.x,
    z: SAFE_ZONE_CENTER.z,
    radius: SAFE_ZONE_RADIUS,
    kind: 'campfire',
  },
  {
    id: 'highland-watchtower',
    name: 'Yayla Gözetleme Kulesi',
    biome: 'meadow',
    x: 0,
    z: -8,
    radius: 6,
    kind: 'watchtower',
  },
  {
    id: 'golden-duel-ring',
    name: 'Altın Ova Düello Meydanı',
    biome: 'plains',
    x: 52,
    z: 4,
    radius: 14,
    kind: 'duel_ring',
  },
  {
    id: 'bozdag-summit',
    name: 'Bozdağ Zirve Sunağı',
    biome: 'mountain',
    x: 0,
    z: -68,
    radius: 11,
    kind: 'summit',
  },
  {
    id: 'silver-lake-pier',
    name: 'Gümüş Göl İskelesi',
    biome: 'lake',
    x: -36,
    z: 8,
    radius: 9,
    kind: 'pier',
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

/**
 * Deterministic multi-landform terrain height function.
 * Sculpts:
 *  - Central/South Emerald Meadow (rolling hills + flat sanctuary plaza)
 *  - Eastern Golden Plains (broad open steppe for PvP duels)
 *  - Northern Bozdağ Mountain Range (terraced climbable slope + rocky peaks)
 *  - Western Silver Lake & Valley (basin dipping below WATER_LEVEL)
 *  - Outer natural mountain/cliff rim beyond WORLD_PLAYABLE_RADIUS
 */
export function groundHeightAt(x: number, z: number): number {
  // Base organic multi-octave undulations
  const n1 = Math.sin(x * 0.045) * Math.cos(z * 0.045) * 1.45;
  const n2 = Math.sin(x * 0.095 + 1.3) * Math.sin(z * 0.088 - 0.7) * 0.65;
  const n3 = Math.cos((x + z) * 0.032) * 0.85;
  let h = 1.2 + n1 + n2 + n3;

  // 1. Bozdağ Mountain Range in the North (z < -18)
  const northFactor = smoothstep(-16, -54, z);
  const centralSummit = gaussian(x, z + 68, 28) * 16.5;
  const westPeak = gaussian(x + 42, z + 72, 22) * 20.5;
  const eastPeak = gaussian(x - 44, z + 68, 22) * 19.0;
  const ridgeDetail = Math.abs(Math.sin(x * 0.14) * Math.cos(z * 0.12)) * 2.2 * northFactor;
  h += northFactor * 3.8 + centralSummit + westPeak + eastPeak + ridgeDetail;

  // Carve a climbable gentle trail up the south face of Bozdağ toward the Summit Altar (0, -68)
  const summitTrailDist = Math.abs(x - Math.sin(z * 0.09) * 8);
  const trailZone = smoothstep(-18, -30, z) * (1 - smoothstep(-62, -74, z));
  const trailMask = (1 - smoothstep(4, 15, summitTrailDist)) * trailZone;
  if (trailMask > 0) {
    const targetSlope = 1.2 + smoothstep(-18, -68, z) * 14.2;
    h = h * (1 - trailMask * 0.62) + targetSlope * (trailMask * 0.62);
  }

  // Flatten the Summit Altar plateau slightly so PvP fights at the peak feel awesome
  const summitFlat = gaussian(x, z + 68, 9.5);
  h = h * (1 - summitFlat * 0.72) + 17.4 * (summitFlat * 0.72);

  // 2. Western Silver Lake & Valley (centered around -54, 8)
  const lakeBasin = gaussian(x + 56, z - 6, 22) * 5.6 + gaussian(x + 46, z + 18, 16) * 3.8;
  h -= lakeBasin;

  // 3. Eastern Golden Plains (x > 20, gentle flat-ish sweeping steppe)
  const plainsMask = smoothstep(18, 42, x) * (1 - smoothstep(-24, -52, z));
  const plainsTarget = 1.5 + Math.sin(x * 0.05) * 0.55 + Math.cos(z * 0.06) * 0.45;
  h = h * (1 - plainsMask * 0.68) + plainsTarget * (plainsMask * 0.68);

  // Flatten Golden Duel Ring slightly
  const duelRingFlat = gaussian(x - 52, z - 4, 13);
  h = h * (1 - duelRingFlat * 0.8) + 1.55 * (duelRingFlat * 0.8);

  // 4. Central Sanctuary Plaza (Taş Meydan at 0, 14) + Watchtower knoll at (0, -8)
  const sanctuaryFlat = gaussian(x - SAFE_ZONE_CENTER.x, z - SAFE_ZONE_CENTER.z, 14);
  h = h * (1 - sanctuaryFlat * 0.88) + 1.15 * (sanctuaryFlat * 0.88);

  const watchtowerKnoll = gaussian(x, z + 8, 9.5);
  h = h * (1 - watchtowerKnoll * 0.65) + 2.45 * (watchtowerKnoll * 0.65);

  // 5. Natural perimeter mountains & highlands beyond playable radius (no box walls!)
  const r = Math.hypot(x, z);
  if (r > WORLD_PLAYABLE_RADIUS - 2) {
    const rim = smoothstep(WORLD_PLAYABLE_RADIUS - 2, WORLD_EXTENT - 8, r);
    // Keep western coastline low into deep lake water, raise cliffs everywhere else
    const isWestCoast = x < -45 && Math.abs(z - 10) < 55;
    if (isWestCoast) {
      h -= rim * 4.5;
    } else {
      const crag = 1 + 0.35 * Math.sin(Math.atan2(z, x) * 9) + 0.2 * Math.cos(r * 0.18);
      h += rim * rim * 26 * crag;
    }
  }

  return h;
}

export function getTerrainNormalAt(x: number, z: number): { nx: number; ny: number; nz: number } {
  const eps = 0.6;
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
  const h = groundHeightAt(x, z);
  if (z < -26 || h >= 6.4) {
    return 'mountain';
  }
  if (x < -25 && (h < WATER_LEVEL + 1.85 || Math.hypot(x + 54, z - 8) < 34)) {
    return 'lake';
  }
  if (x > 24 && z > -28) {
    return 'plains';
  }
  return 'meadow';
}

export function isInsideSafeZone(x: number, z: number): boolean {
  const dx = x - SAFE_ZONE_CENTER.x;
  const dz = z - SAFE_ZONE_CENTER.z;
  return dx * dx + dz * dz <= SAFE_ZONE_RADIUS * SAFE_ZONE_RADIUS;
}

export function isSwimmableWater(x: number, z: number): boolean {
  return groundHeightAt(x, z) < WATER_LEVEL - 0.15;
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
