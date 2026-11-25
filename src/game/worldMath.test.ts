import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groundHeightAt,
  walkableHeightAt,
  getBiomeAt,
  isInsideSafeZone,
  isInsideDarkForest,
  clampToPlayableWorld,
  WATER_LEVEL,
  SAFE_ZONE_CENTER,
  DARK_FOREST_POS,
  MOUNTAIN_CRYSTAL_POS,
  DESERT_ARENA_POS,
  VIKING_SHIP_POS,
  VIKING_DECK_Y,
  PIER_START_X,
  PIER_END_X,
  PIER_Z,
  WORLD_PLAYABLE_RADIUS,
  HARBOR_POS,
  HARBOR_DECK_Y,
  PIRATE_ISLAND_POS,
  WIZARD_ISLAND_POS,
  FLOATING_TOWN_POS,
  FLOATING_TOWN_DECK_Y,
  WHIRLPOOL_POS,
  UNDERWATER_CITY_POS,
  HORROR_FOREST_POS,
  PIRATE_ISLAND_RADIUS,
  WIZARD_ISLAND_RADIUS,
  HORROR_FOREST_RADIUS,
  NORTH_POLE_POS,
  NORTH_POLE_RADIUS,
  NORTH_POLE_DOCK_POS,
  YETI_BOSS_POS,
  isInsideNorthPole,
} from './worldMath';

test('Main Island contains central town, Kara Orman, mountain, desert plains, lake, and ocean harbor', () => {
  assert.ok(WORLD_PLAYABLE_RADIUS >= 1400, `Expected vast ocean world radius >= 1400, got ${WORLD_PLAYABLE_RADIUS}`);

  const townY = groundHeightAt(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z);
  const forestY = groundHeightAt(DARK_FOREST_POS.x, DARK_FOREST_POS.z);
  const mountainY = groundHeightAt(MOUNTAIN_CRYSTAL_POS.x, MOUNTAIN_CRYSTAL_POS.z);
  const lakeY = groundHeightAt(VIKING_SHIP_POS.x, VIKING_SHIP_POS.z);
  const desertY = groundHeightAt(DESERT_ARENA_POS.x, DESERT_ARENA_POS.z);

  assert.equal(getBiomeAt(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z), 'meadow');
  assert.equal(getBiomeAt(DARK_FOREST_POS.x, DARK_FOREST_POS.z), 'dark_forest');
  assert.equal(isInsideDarkForest(DARK_FOREST_POS.x, DARK_FOREST_POS.z), true);
  assert.equal(getBiomeAt(MOUNTAIN_CRYSTAL_POS.x, MOUNTAIN_CRYSTAL_POS.z), 'mountain');
  assert.equal(getBiomeAt(VIKING_SHIP_POS.x, VIKING_SHIP_POS.z), 'lake');
  assert.equal(getBiomeAt(DESERT_ARENA_POS.x, DESERT_ARENA_POS.z), 'plains');
  assert.equal(getBiomeAt(HARBOR_POS.x, HARBOR_POS.z), 'harbor');

  const harborDeck = walkableHeightAt(HARBOR_POS.x, HARBOR_POS.z);
  assert.equal(harborDeck.onStructure, true);
  assert.ok(harborDeck.y >= HARBOR_DECK_Y - 0.1);

  assert.ok(mountainY > townY + 12, `Expected mountain (${mountainY}) much higher than town (${townY})`);
  assert.ok(lakeY < WATER_LEVEL, `Expected lake bed (${lakeY}) below water level (${WATER_LEVEL})`);
  assert.ok(forestY > WATER_LEVEL + 1.5, `Expected Kara Orman well above water, got ${forestY}`);
  assert.ok(Math.abs(desertY - 1.55) < 1.5, `Expected flat desert arena near 1.55, got ${desertY}`);
});

test('Vast ocean surrounds Main Island and hosts 5 expanded biome islands + 4x massive Kuzey Kutbu glacier', () => {
  // Open ocean between Main Island and Floating Town
  assert.equal(getBiomeAt(0, 360), 'ocean');
  assert.ok(groundHeightAt(0, 360) < WATER_LEVEL, 'Open ocean seabed must sit below WATER_LEVEL');

  // Expanded island radii
  assert.ok(PIRATE_ISLAND_RADIUS >= 120, `Expected expanded Pirate Island radius >= 120, got ${PIRATE_ISLAND_RADIUS}`);
  assert.ok(WIZARD_ISLAND_RADIUS >= 110, `Expected expanded Wizard Island radius >= 110, got ${WIZARD_ISLAND_RADIUS}`);
  assert.ok(HORROR_FOREST_RADIUS >= 120, `Expected expanded Horror Forest radius >= 120, got ${HORROR_FOREST_RADIUS}`);

  // 1) Pirate Island
  assert.equal(getBiomeAt(PIRATE_ISLAND_POS.x, PIRATE_ISLAND_POS.z), 'pirate_island');
  assert.ok(groundHeightAt(PIRATE_ISLAND_POS.x, PIRATE_ISLAND_POS.z) > WATER_LEVEL + 1.0);

  // 2) Wizard Island
  assert.equal(getBiomeAt(WIZARD_ISLAND_POS.x, WIZARD_ISLAND_POS.z), 'wizard_island');
  assert.ok(groundHeightAt(WIZARD_ISLAND_POS.x, WIZARD_ISLAND_POS.z) > WATER_LEVEL + 1.0);

  // 3) Small Floating Town (walkable floating deck above ocean)
  assert.equal(getBiomeAt(FLOATING_TOWN_POS.x, FLOATING_TOWN_POS.z), 'floating_town');
  const floatingDeck = walkableHeightAt(FLOATING_TOWN_POS.x, FLOATING_TOWN_POS.z);
  assert.equal(floatingDeck.onStructure, true);
  assert.ok(floatingDeck.y >= FLOATING_TOWN_DECK_Y - 0.1);

  // 4) Whirlpool & Underwater City Atlantis
  assert.equal(getBiomeAt(WHIRLPOOL_POS.x, WHIRLPOOL_POS.z), 'whirlpool');
  assert.equal(getBiomeAt(UNDERWATER_CITY_POS.x, UNDERWATER_CITY_POS.z), 'underwater_city');
  const atlantisFloor = walkableHeightAt(UNDERWATER_CITY_POS.x, UNDERWATER_CITY_POS.z);
  assert.ok(atlantisFloor.y > WATER_LEVEL + 1.0, `Expected walkable Atlantis plaza > WATER_LEVEL+1, got ${atlantisFloor.y}`);

  // 5) Misty Horror Forest
  assert.equal(getBiomeAt(HORROR_FOREST_POS.x, HORROR_FOREST_POS.z), 'horror_forest');
  assert.ok(groundHeightAt(HORROR_FOREST_POS.x, HORROR_FOREST_POS.z) > WATER_LEVEL + 1.0);

  // 6) 4x Massive Kuzey Kutbu (North Pole) Continent + Lv.1000 Yeti Boss Arena + Ice Pier
  assert.ok(NORTH_POLE_RADIUS >= 240, `Expected 4x Kuzey Kutbu radius >= 240, got ${NORTH_POLE_RADIUS}`);
  assert.equal(getBiomeAt(NORTH_POLE_POS.x, NORTH_POLE_POS.z), 'north_pole');
  assert.equal(isInsideNorthPole(YETI_BOSS_POS.x, YETI_BOSS_POS.z), true);
  assert.ok(groundHeightAt(YETI_BOSS_POS.x, YETI_BOSS_POS.z) > WATER_LEVEL + 2.0);
  const iceDock = walkableHeightAt(NORTH_POLE_DOCK_POS.x, NORTH_POLE_DOCK_POS.z + 18);
  assert.equal(iceDock.onStructure, true);
  assert.ok(iceDock.y > WATER_LEVEL + 0.5);
});

test('Enlarged Viking Bridge connects dry shore seamlessly to Viking Longship deck across wide 8.4m span', () => {
  const shoreEntranceY = groundHeightAt(PIER_START_X + 3.5, PIER_Z);
  assert.ok(shoreEntranceY > WATER_LEVEL + 0.5, `Expected dry shore entrance > WATER_LEVEL+0.5, got ${shoreEntranceY}`);

  for (let x = PIER_START_X + 2; x >= VIKING_SHIP_POS.x; x -= 2) {
    const spot = walkableHeightAt(x, PIER_Z);
    assert.equal(spot.onStructure, true, `Expected continuous walkable bridge/deck at x=${x}`);
    assert.ok(spot.y > WATER_LEVEL + 0.4, `Expected deck above water at x=${x}, got ${spot.y}`);
  }

  const pierMidX = (PIER_START_X + PIER_END_X) * 0.5;
  assert.equal(walkableHeightAt(pierMidX, PIER_Z + 3.8).onStructure, true);
  assert.equal(walkableHeightAt(pierMidX, PIER_Z - 3.8).onStructure, true);

  const shipDeck = walkableHeightAt(VIKING_SHIP_POS.x, VIKING_SHIP_POS.z);
  assert.equal(shipDeck.onStructure, true);
  assert.ok(shipDeck.y >= VIKING_DECK_Y - 0.01 && shipDeck.y > WATER_LEVEL);
});

test('central Starter Town safe zone boundary protects town plaza and opens PvP outside', () => {
  assert.equal(isInsideSafeZone(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z), true);
  assert.equal(isInsideSafeZone(0, 12), true);
  assert.equal(isInsideSafeZone(DESERT_ARENA_POS.x, DESERT_ARENA_POS.z), false);
  assert.equal(isInsideSafeZone(DARK_FOREST_POS.x, DARK_FOREST_POS.z), false);
});

test('world boundary clamping keeps actors within vast ocean playable radius', () => {
  const inside = clampToPlayableWorld(470, 360);
  assert.equal(inside.clamped, false);
  assert.equal(inside.x, 470);

  const outside = clampToPlayableWorld(2200, 0);
  assert.equal(outside.clamped, true);
  assert.ok(Math.abs(outside.x - WORLD_PLAYABLE_RADIUS) < 0.01);
});
