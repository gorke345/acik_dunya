import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultProfile,
  awardXpAndGold,
  applyUpgrade,
  getUpgradeCost,
  calculateDamage,
  canDealPvpDamage,
  sanitizeProfileForFirestore,
  xpRequiredForLevel,
  getDerivedStats,
} from './combatRules';

test('leveling up awards levels and boosts derived combat stats', () => {
  const base = createDefaultProfile('user-1', 'Alparslan', '#c43b3b');
  const baseStats = getDerivedStats(base);

  const needed = xpRequiredForLevel(1) + 25;
  const res = awardXpAndGold(base, needed, 120);
  assert.equal(res.leveledUp, true);
  assert.equal(res.levelsGained, 1);
  assert.equal(res.profile.level, 2);
  assert.equal(res.profile.xp, 25);
  assert.equal(res.profile.gold, 170);

  const nextStats = getDerivedStats(res.profile);
  assert.ok(nextStats.maxHp > baseStats.maxHp);
  assert.ok(nextStats.attackPower > baseStats.attackPower);
});

test('upgrades deduct exact gold and reject insufficient funds', () => {
  const rich = { ...createDefaultProfile('user-2', 'Mete'), gold: 500 };
  const cost = getUpgradeCost(1);
  const up = applyUpgrade(rich, 'sword');
  assert.equal(up.success, true);
  assert.equal(up.profile.swordTier, 2);
  assert.equal(up.profile.gold, 500 - cost);

  const poor = { ...createDefaultProfile('user-3', 'Deniz'), gold: 10 };
  const fail = applyUpgrade(poor, 'armor');
  assert.equal(fail.success, false);
  assert.equal(fail.profile.armorTier, 1);
});

test('PvP rules respect safe zone, peaceful toggle, and friend party protection', () => {
  const p1 = { id: 'a', x: 52, z: 4, pvpEnabled: true, partyCode: '' };
  const p2 = { id: 'b', x: 55, z: 4, pvpEnabled: true, partyCode: '' };
  assert.equal(canDealPvpDamage(p1, p2).allowed, true);

  // Same friend party -> protected
  assert.equal(
    canDealPvpDamage({ ...p1, partyCode: 'KARTAL' }, { ...p2, partyCode: 'kartal' }).allowed,
    false
  );

  // Safe zone -> protected
  assert.equal(canDealPvpDamage({ ...p1, x: 0, z: 14 }, p2).allowed, false);

  // Peaceful mode -> protected
  assert.equal(canDealPvpDamage(p1, { ...p2, pvpEnabled: false }).allowed, false);
});

test('damage calculation scales with attack, skill multiplier, and crits', () => {
  const normal = calculateDamage(25, 10, 1.0, false);
  const heavy = calculateDamage(25, 10, 1.8, false);
  const crit = calculateDamage(25, 10, 1.0, true);
  assert.ok(heavy > normal);
  assert.ok(crit > normal);
});

test('Firestore payload sanitizer clamps every field to blueprint limits', () => {
  const dirty = {
    ...createDefaultProfile('spoof', 'A'.repeat(60), 'invalid'),
    level: 999,
    gold: -50,
    swordTier: 99,
    lastX: 5000,
    discoveredBiomes: ['meadow', 'plains', 'meadow'] as any,
  };
  const clean = sanitizeProfileForFirestore(dirty, 'real_uid_123');
  assert.equal(clean.uid, 'real_uid_123');
  assert.equal(clean.displayName.length, 24);
  assert.equal(clean.tunicColor, '#c43b3b');
  assert.equal(clean.level, 99);
  assert.equal(clean.gold, 0);
  assert.equal(clean.swordTier, 10);
  assert.equal(clean.lastX, 195);
  assert.deepEqual(clean.discoveredBiomes, ['meadow', 'plains']);
});
