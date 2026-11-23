import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groundHeightAt,
  getBiomeAt,
  isInsideSafeZone,
  clampToPlayableWorld,
  WATER_LEVEL,
  SAFE_ZONE_CENTER,
  WORLD_PLAYABLE_RADIUS,
} from './worldMath';

test('world terrain contains distinct mountain, plains, meadow, and lake landforms', () => {
  const meadowY = groundHeightAt(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z);
  const mountainY = groundHeightAt(0, -68);
  const lakeY = groundHeightAt(-56, 6);
  const plainsY = groundHeightAt(52, 4);

  assert.equal(getBiomeAt(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z), 'meadow');
  assert.equal(getBiomeAt(0, -68), 'mountain');
  assert.equal(getBiomeAt(-56, 6), 'lake');
  assert.equal(getBiomeAt(52, 4), 'plains');

  assert.ok(mountainY > meadowY + 12, `Expected mountain (${mountainY}) much higher than meadow (${meadowY})`);
  assert.ok(lakeY < WATER_LEVEL, `Expected lake bed (${lakeY}) below water level (${WATER_LEVEL})`);
  assert.ok(Math.abs(plainsY - 1.55) < 1.2, `Expected flat golden plains near 1.55, got ${plainsY}`);
});

test('safe zone boundary accurately protects sanctuary plaza and opens PvP outside', () => {
  assert.equal(isInsideSafeZone(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z), true);
  assert.equal(isInsideSafeZone(52, 4), false);
  assert.equal(isInsideSafeZone(0, -68), false);
});

test('world boundary clamping keeps actors within playable radius', () => {
  const inside = clampToPlayableWorld(20, -30);
  assert.equal(inside.clamped, false);
  assert.equal(inside.x, 20);

  const outside = clampToPlayableWorld(200, 0);
  assert.equal(outside.clamped, true);
  assert.ok(Math.abs(outside.x - WORLD_PLAYABLE_RADIUS) < 0.01);
});
