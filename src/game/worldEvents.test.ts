import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DESERT_ARENA_TOTAL_WAVES,
  DESERT_ARENA_ORC_BOSS_LEVEL,
  BANDIT_AMBUSH_INTERVAL_SEC,
  BANDIT_AMBUSH_CHANCE,
  BANDIT_LEVEL,
  BANDIT_ARCHER_COUNT,
  BANDIT_MELEE_COUNT,
  DARK_FOREST_ELF_COUNT,
  DARK_FOREST_ELF_LEVEL,
  HORSE_PRICE,
  HORROR_FOREST_MIN_LEVEL,
  CONVOY_BOAT_COUNT,
  CONVOY_MAX_TIER,
  CONVOY_BASE_GOLD,
  ENEMY_CANNON_COOLDOWN_SEC,
  ENEMY_CANNON_HULL_MULT,
  PIRATE_AMBUSH_INTERVAL_SEC,
  PIRATE_AMBUSH_CHANCE,
  YETI_BOSS_LEVEL,
  YETI_RUNE_STAT_MULTIPLIER,
  CLASS_ESCAPE_CONFIG,
  getBowChargeMultiplier,
  getBowArrowSpeed,
  getDesertArenaWaveConfig,
  getConvoyTierConfig,
  getPirateShipCrewSpec,
  evaluateBanditAmbushTick,
  evaluatePirateAmbushTick,
} from './worldEvents';

test('Desert Arena 5-wave progression scales counts (+1/wave), levels (+50/wave), and spawns Lv500 Orc Boss in wave 5', () => {
  assert.equal(DESERT_ARENA_TOTAL_WAVES, 5);

  const w1 = getDesertArenaWaveConfig(1);
  assert.equal(w1.regularCount, 5);
  assert.equal(w1.regularLevel, 50);
  assert.equal(w1.hasOrcBoss, false);
  assert.equal(w1.totalEnemies, 5);

  const w2 = getDesertArenaWaveConfig(2);
  assert.equal(w2.regularCount, 6);
  assert.equal(w2.regularLevel, 100);
  assert.equal(w2.hasOrcBoss, false);

  const w3 = getDesertArenaWaveConfig(3);
  assert.equal(w3.regularCount, 7);
  assert.equal(w3.regularLevel, 150);
  assert.equal(w3.hasOrcBoss, false);

  const w4 = getDesertArenaWaveConfig(4);
  assert.equal(w4.regularCount, 8);
  assert.equal(w4.regularLevel, 200);
  assert.equal(w4.hasOrcBoss, false);

  const w5 = getDesertArenaWaveConfig(5);
  assert.equal(w5.regularCount, 9);
  assert.equal(w5.regularLevel, 250);
  assert.equal(w5.hasOrcBoss, true);
  assert.equal(w5.orcBossLevel, DESERT_ARENA_ORC_BOSS_LEVEL);
  assert.equal(w5.orcBossLevel, 500);
  assert.equal(w5.totalEnemies, 10);
});

test('Bandit Ambush timer only evaluates outside town every 5 minutes with 5% chance', () => {
  assert.equal(BANDIT_AMBUSH_INTERVAL_SEC, 300);
  assert.equal(BANDIT_AMBUSH_CHANCE, 0.05);
  assert.equal(BANDIT_LEVEL, 250);
  assert.equal(BANDIT_ARCHER_COUNT, 2);
  assert.equal(BANDIT_MELEE_COUNT, 3);

  const inTownTick = evaluateBanditAmbushTick(295, 20, true, () => 0.0);
  assert.equal(inTownTick.checked, false);
  assert.equal(inTownTick.triggered, false);
  assert.equal(inTownTick.nextElapsedSec, 295);

  const midTick = evaluateBanditAmbushTick(120, 60, false, () => 0.0);
  assert.equal(midTick.checked, false);
  assert.equal(midTick.triggered, false);
  assert.equal(midTick.nextElapsedSec, 180);

  const triggerTick = evaluateBanditAmbushTick(295, 10, false, () => 0.049);
  assert.equal(triggerTick.checked, true);
  assert.equal(triggerTick.triggered, true);
  assert.equal(triggerTick.nextElapsedSec, 5);

  const missTick = evaluateBanditAmbushTick(295, 10, false, () => 0.05);
  assert.equal(missTick.checked, true);
  assert.equal(missTick.triggered, false);
  assert.equal(missTick.nextElapsedSec, 5);
});

test('Destroyed Convoy Boats always drop 1000 Gold and have weakened cannons while scaling crew/tier', () => {
  assert.equal(CONVOY_BOAT_COUNT, 2);
  assert.equal(CONVOY_MAX_TIER, 10);
  assert.equal(CONVOY_BASE_GOLD, 1000);
  assert.ok(ENEMY_CANNON_COOLDOWN_SEC >= 4.0);
  assert.ok(ENEMY_CANNON_HULL_MULT <= 0.5);

  const t1 = getConvoyTierConfig(1);
  assert.equal(t1.goldReward, 1000);
  assert.equal(t1.crewCount, 0);
  assert.equal(t1.hasNavyCaptain, false);

  const t2 = getConvoyTierConfig(2);
  assert.equal(t2.goldReward, 1000);
  assert.equal(t2.crewCount, 5);
  assert.ok(t2.hullHp > t1.hullHp);
  assert.ok(t2.shipScale > t1.shipScale);

  const t10 = getConvoyTierConfig(10);
  assert.equal(t10.goldReward, 1000);
  assert.equal(t10.crewCount, 45);
  assert.equal(t10.hasNavyCaptain, true);
  assert.equal(t10.cannoneerCount, 5);
  assert.ok(t10.cannonDamage > 0 && t10.cannonDamage <= 65, 'Tier 10 cannon damage should be weakened');
});

test('Ocean Pirate Ship Ambush drops 1000 Gold with weakened cannoneers and 29-pirate roster', () => {
  const spec = getPirateShipCrewSpec();
  assert.equal(spec.swordsmenCount, 20);
  assert.equal(spec.swordsmenLevel, 150);
  assert.equal(spec.firstMatesCount, 2);
  assert.equal(spec.firstMatesLevel, 500);
  assert.equal(spec.captainCount, 1);
  assert.equal(spec.captainLevel, 1000);
  assert.equal(spec.cannoneersCount, 2);
  assert.equal(spec.cannoneersLevel, 100);
  assert.equal(spec.archersCount, 4);
  assert.equal(spec.archersLevel, 100);
  assert.equal(spec.totalCrew, 29);
  assert.equal(spec.shipGoldReward, 1000);
  assert.ok(spec.cannoneerDamage <= 60);

  // Never triggers on land
  const landTick = evaluatePirateAmbushTick(PIRATE_AMBUSH_INTERVAL_SEC - 1, 5, false, () => 0.0);
  assert.equal(landTick.checked, false);
  assert.equal(landTick.triggered, false);

  // Triggers on open ocean when roll < PIRATE_AMBUSH_CHANCE
  const hitTick = evaluatePirateAmbushTick(
    PIRATE_AMBUSH_INTERVAL_SEC - 1,
    5,
    true,
    () => PIRATE_AMBUSH_CHANCE * 0.5
  );
  assert.equal(hitTick.checked, true);
  assert.equal(hitTick.triggered, true);
});

test('Bow draw charge scaling, Lv.1000 Yeti Boss, and all 8 unique Class Escape abilities match spec', () => {
  assert.equal(DARK_FOREST_ELF_COUNT, 6);
  assert.equal(DARK_FOREST_ELF_LEVEL, 50);
  assert.equal(HORSE_PRICE, 400);
  assert.ok(HORROR_FOREST_MIN_LEVEL >= 800);
  assert.equal(YETI_BOSS_LEVEL, 1000);
  assert.equal(YETI_RUNE_STAT_MULTIPLIER, 5);

  // Bow charge damage & arrow speed increase monotonically from 0 -> 1
  const quickMult = getBowChargeMultiplier(0);
  const fullMult = getBowChargeMultiplier(1);
  assert.ok(fullMult >= 2.5 && fullMult > quickMult * 2);
  assert.ok(getBowArrowSpeed(1) > getBowArrowSpeed(0) + 40);

  // Every single one of the 8 classes has a unique escape ability
  const escapeIds = new Set(Object.values(CLASS_ESCAPE_CONFIG).map((c) => c.id));
  assert.equal(escapeIds.size, 8);
  // Bomber cannon launches very high and very far
  assert.ok(CLASS_ESCAPE_CONFIG.bomber.horizontalSpeed >= 40);
  assert.ok(CLASS_ESCAPE_CONFIG.bomber.verticalBoost >= 18);
  // Mage teleports instantaneously
  assert.ok((CLASS_ESCAPE_CONFIG.mage.instantTeleportDist || 0) >= 20);
});
