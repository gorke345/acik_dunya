import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultProfile,
  awardXpAndGold,
  applyUpgrade,
  buyHorse,
  buyFoodItem,
  consumeFoodItem,
  buyWeaponItem,
  equipWeaponItem,
  buyArmorItem,
  equipArmorItem,
  buyHarborShip,
  getUpgradeCost,
  calculateDamage,
  canDealPvpDamage,
  sanitizeProfileForFirestore,
  xpRequiredForLevel,
  getDerivedStats,
  tryUnlockClassWeapon,
  unlockYetiRune,
  canWalkOnOcean,
  recordDesertArenaKill,
  CLASS_DEFINITIONS,
  VALID_CLASSES,
  DESERT_ARENA_REQUIRED_KILLS,
  HORSE_PRICE,
  MAX_LEVEL,
} from './combatRules';
import { FOOD_ITEMS, HARBOR_SHIPS } from './inventoryData';

test('slower progression uses steeper XP curve and boosts derived combat stats on level-up', () => {
  const base = createDefaultProfile('user-1', 'Alparslan', '#2b74c7', 'guardian');
  const baseStats = getDerivedStats(base);

  const lv1Need = xpRequiredForLevel(1);
  assert.ok(lv1Need >= 140, `Expected slower progression Lv1 XP requirement >= 140, got ${lv1Need}`);

  // A modest 100 XP no longer multi-levels instantaneously
  const small = awardXpAndGold(base, 100, 120);
  assert.equal(small.leveledUp, false);
  assert.equal(small.profile.gold, 150 + 120);

  // Larger XP awards a well-earned level up
  const res = awardXpAndGold(base, 400, 120);
  assert.equal(res.leveledUp, true);
  assert.ok(res.levelsGained >= 1);

  const nextStats = getDerivedStats(res.profile);
  assert.ok(nextStats.maxHp > baseStats.maxHp);
  assert.ok(nextStats.attackPower > baseStats.attackPower);
});

test('all 8 classes (including Balıkadam and Buz Yetisi) have distinct colors, ocean walking, and 5x Yeti Rune', () => {
  assert.equal(VALID_CLASSES.length, 8);
  const guardian = createDefaultProfile('g1', 'Mavi', undefined, 'guardian');
  const archer = createDefaultProfile('a1', 'Yesil', undefined, 'archer');
  const lancer = createDefaultProfile('l1', 'Kirmizi', undefined, 'lancer');
  const bomber = createDefaultProfile('b1', 'Bombaci', undefined, 'bomber');
  const mage = createDefaultProfile('m1', 'Buyucu', undefined, 'mage');
  const assassin = createDefaultProfile('as1', 'Suikastci', undefined, 'assassin');
  const fishman = createDefaultProfile('fm1', 'Balikadam', undefined, 'fishman');
  const yeti = createDefaultProfile('yt1', 'BuzYetisi', undefined, 'yeti');

  assert.equal(guardian.tunicColor, CLASS_DEFINITIONS.guardian.colorHex);
  assert.equal(archer.tunicColor, CLASS_DEFINITIONS.archer.colorHex);
  assert.equal(lancer.tunicColor, CLASS_DEFINITIONS.lancer.colorHex);
  assert.equal(bomber.tunicColor, CLASS_DEFINITIONS.bomber.colorHex);
  assert.equal(mage.tunicColor, CLASS_DEFINITIONS.mage.colorHex);
  assert.equal(assassin.tunicColor, CLASS_DEFINITIONS.assassin.colorHex);
  assert.equal(fishman.tunicColor, CLASS_DEFINITIONS.fishman.colorHex);
  assert.equal(yeti.tunicColor, CLASS_DEFINITIONS.yeti.colorHex);

  // Only Balıkadam can walk and swim across the open ocean
  assert.equal(canWalkOnOcean('fishman'), true);
  assert.equal(canWalkOnOcean('guardian'), false);
  assert.equal(canWalkOnOcean('yeti'), false);

  // Buz Yetisi starts directly with Yeti Claws (not human starter sword)
  assert.equal(yeti.equippedWeaponId, 'yeti_claws');
  assert.equal(getDerivedStats(yeti).activeWeaponKind, 'yeti_claws');

  // Defeating Lv.1000 Yeti Boss unlocks Yeti Rune -> 5x stats + Runic Yeti Claws!
  const yetiBaseStats = getDerivedStats(yeti);
  const runeRes = unlockYetiRune(yeti);
  assert.equal(runeRes.newlyUnlocked, true);
  assert.equal(runeRes.profile.yetiRuneUnlocked, true);
  assert.equal(runeRes.profile.equippedWeaponId, 'runic_yeti_claws');
  const yetiRunicStats = getDerivedStats(runeRes.profile);
  assert.ok(yetiRunicStats.maxHp >= yetiBaseStats.maxHp * 4.5, 'Runic Yeti HP must scale ~5x');
  assert.ok(yetiRunicStats.attackPower >= yetiBaseStats.attackPower * 4.5, 'Runic Yeti ATK must scale ~5x');
  assert.ok(yetiRunicStats.defense >= yetiBaseStats.defense * 4.5, 'Runic Yeti DEF must scale ~5x');

  const gStats = getDerivedStats(guardian);
  const aStats = getDerivedStats(archer);
  const lStats = getDerivedStats(lancer);

  assert.ok(gStats.maxHp > lStats.maxHp && lStats.maxHp > aStats.maxHp);
  assert.ok(gStats.defense > lStats.defense && lStats.defense > aStats.defense);
  assert.ok(lStats.attackPower > aStats.attackPower && aStats.attackPower > gStats.attackPower);
  assert.ok(aStats.moveSpeed > lStats.moveSpeed && lStats.moveSpeed > gStats.moveSpeed);
});

test('all signature & hidden island weapons unlock properly into inventory including Poseidon Trident', () => {
  // 1) Blue Guardian -> Mountain Crystal -> Stunning Mace
  const guardian = createDefaultProfile('g2', 'Muhafiz', undefined, 'guardian');
  assert.equal(tryUnlockClassWeapon(guardian, 'forest_tree').wrongClass, true);
  const gUnlock = tryUnlockClassWeapon(guardian, 'mountain_crystal');
  assert.equal(gUnlock.unlocked, true);
  const gUnlockedStats = getDerivedStats(gUnlock.profile);
  assert.equal(gUnlockedStats.activeWeaponKind, 'mace');
  assert.ok(gUnlockedStats.stunLightSec > 0 && gUnlockedStats.stunHeavySec > gUnlockedStats.stunLightSec);

  // 2) Green Archer -> Forest Tree -> Fixed Ranged Bow
  const archer = createDefaultProfile('a2', 'Okcu', undefined, 'archer');
  assert.equal(tryUnlockClassWeapon(archer, 'mountain_crystal').wrongClass, true);
  const aUnlock = tryUnlockClassWeapon(archer, 'forest_tree');
  assert.equal(aUnlock.unlocked, true);
  const aUnlockedStats = getDerivedStats(aUnlock.profile);
  assert.equal(aUnlockedStats.activeWeaponKind, 'bow');
  assert.equal(aUnlockedStats.rangedEnabled, true);

  // 3) Red Lancer -> Desert Arena (5 waves) -> Legendary Spear
  assert.equal(DESERT_ARENA_REQUIRED_KILLS, 5);
  let lancer = createDefaultProfile('l2', 'Mizrakci', undefined, 'lancer');
  for (let w = 1; w <= 4; w++) {
    const step = recordDesertArenaKill(lancer);
    assert.equal(step.profile.desertArenaProgress, w);
    assert.equal(step.weaponUnlocked, false);
    lancer = step.profile;
  }
  const finalWave = recordDesertArenaKill(lancer);
  assert.equal(finalWave.profile.desertArenaProgress, 5);
  assert.equal(finalWave.arenaJustCompleted, true);
  assert.equal(finalWave.weaponUnlocked, true);
  const lUnlockedStats = getDerivedStats(finalWave.profile);
  assert.equal(lUnlockedStats.activeWeaponKind, 'spear');
  assert.ok(lUnlockedStats.meleeReach >= 5.5);

  // 4) Pirate Island -> Bomber Bomb, 5) Wizard Island -> Arcane Staff, 6) Horror -> Daggers, 7) Underwater -> Poseidon's Trident
  const bomber = createDefaultProfile('b2', 'Korsan', undefined, 'bomber');
  const bUnlock = tryUnlockClassWeapon(bomber, 'pirate_island');
  assert.equal(bUnlock.unlocked, true);
  assert.equal(getDerivedStats(bUnlock.profile).activeWeaponKind, 'bomb');
  assert.equal(getDerivedStats(bUnlock.profile).rangedEnabled, true);

  const mage = createDefaultProfile('m2', 'Buyucu', undefined, 'mage');
  const mUnlock = tryUnlockClassWeapon(mage, 'wizard_island');
  assert.equal(mUnlock.unlocked, true);
  assert.equal(getDerivedStats(mUnlock.profile).activeWeaponKind, 'staff');
  assert.equal(getDerivedStats(mUnlock.profile).rangedEnabled, true);

  const assassin = createDefaultProfile('as2', 'Golge', undefined, 'assassin');
  const asUnlock = tryUnlockClassWeapon(assassin, 'horror_forest');
  assert.equal(asUnlock.unlocked, true);
  assert.equal(getDerivedStats(asUnlock.profile).activeWeaponKind, 'daggers');

  const fishman = createDefaultProfile('fm2', 'Balikadam', undefined, 'fishman');
  const fmUnlock = tryUnlockClassWeapon(fishman, 'underwater_city');
  assert.equal(fmUnlock.unlocked, true);
  assert.equal(fmUnlock.profile.equippedWeaponId, 'poseidon_trident');
  assert.equal(getDerivedStats(fmUnlock.profile).activeWeaponKind, 'trident');
});

test('Inventory: 10 unique Tavern foods, purchasable weapons/armors, and 2 Harbor ships work end-to-end', () => {
  assert.equal(FOOD_ITEMS.length, 10);
  const uniqueBuffKinds = new Set(FOOD_ITEMS.map((f) => f.buffKind));
  assert.equal(uniqueBuffKinds.size, 10, 'Each of the 10 foods must provide a distinct buff kind');

  const rich = { ...createDefaultProfile('inv-1', 'Tüccar', undefined, 'lancer'), gold: 50000 };

  // Tavern food purchase requires town
  assert.equal(buyFoodItem(rich, 'venison', false).success, false);
  const boughtVenison = buyFoodItem(rich, 'venison', true);
  assert.equal(boughtVenison.success, true);
  assert.equal(boughtVenison.profile.foodInventory.venison, 1);

  // Consuming food removes 1 from bag and buffs stats
  const consumed = consumeFoodItem(boughtVenison.profile, 'venison');
  assert.equal(consumed.success, true);
  assert.equal(consumed.profile.foodInventory.venison, undefined);
  const unbuffedStats = getDerivedStats(consumed.profile, []);
  const buffedStats = getDerivedStats(consumed.profile, [{ foodId: 'venison', remainingSec: 90 }]);
  assert.ok(buffedStats.attackPower > unbuffedStats.attackPower);

  // Buying and equipping weapon & armor
  const boughtSword = buyWeaponItem(rich, 'abyss_blade');
  assert.equal(boughtSword.success, true);
  assert.equal(boughtSword.profile.equippedWeaponId, 'abyss_blade');
  const swappedBack = equipWeaponItem(boughtSword.profile, 'starter_sword');
  assert.equal(swappedBack.success, true);
  assert.equal(swappedBack.profile.equippedWeaponId, 'starter_sword');

  const boughtArmor = buyArmorItem(rich, 'nightmare_aegis');
  assert.equal(boughtArmor.success, true);
  assert.equal(boughtArmor.profile.equippedArmorId, 'nightmare_aegis');
  assert.ok(getDerivedStats(boughtArmor.profile).maxHp > getDerivedStats(rich).maxHp);
  const swappedArmor = equipArmorItem(boughtArmor.profile, 'cloth_tunic');
  assert.equal(swappedArmor.success, true);

  // Buying both Harbor ships (Sloop + Galleon)
  assert.equal(HARBOR_SHIPS.length, 2);
  const s1 = buyHarborShip(rich, 'sloop');
  assert.equal(s1.success, true);
  assert.equal(s1.profile.activeShipId, 'sloop');
  const s2 = buyHarborShip(s1.profile, 'galleon');
  assert.equal(s2.success, true);
  assert.equal(s2.profile.ownedShips.length, 2);
  assert.equal(s2.profile.activeShipId, 'galleon');
});

test('upgrades require Starter Town, deduct exact gold, and reject insufficient funds', () => {
  const rich = { ...createDefaultProfile('user-2', 'Mete'), gold: 500 };

  const outsideFail = applyUpgrade(rich, 'sword', false);
  assert.equal(outsideFail.success, false);
  assert.equal(outsideFail.profile.swordTier, 1);

  const cost = getUpgradeCost(1);
  const up = applyUpgrade(rich, 'sword', true);
  assert.equal(up.success, true);
  assert.equal(up.profile.swordTier, 2);
  assert.equal(up.profile.gold, 500 - cost);

  const poor = { ...createDefaultProfile('user-3', 'Deniz'), gold: 10 };
  const fail = applyUpgrade(poor, 'armor', true);
  assert.equal(fail.success, false);
  assert.equal(fail.profile.armorTier, 1);
});

test('Town Stable Horse costs 400 Gold, requires Starter Town, and blocks duplicate purchase', () => {
  const rich = { ...createDefaultProfile('user-h1', 'Kagan'), gold: 450 };

  assert.equal(buyHorse(rich, false).success, false);

  const poor = { ...rich, gold: 399 };
  assert.equal(buyHorse(poor, true).success, false);

  const bought = buyHorse(rich, true);
  assert.equal(bought.success, true);
  assert.equal(bought.profile.hasHorse, true);
  assert.equal(bought.profile.gold, 450 - HORSE_PRICE);

  const dup = buyHorse({ ...bought.profile, gold: 900 }, true);
  assert.equal(dup.success, false);
});

test('PvP rules respect Starter Town safe zone, peaceful toggle, and friend party protection', () => {
  const p1 = { id: 'a', x: 80, z: 10, pvpEnabled: true, partyCode: '' };
  const p2 = { id: 'b', x: 84, z: 10, pvpEnabled: true, partyCode: '' };
  assert.equal(canDealPvpDamage(p1, p2).allowed, true);

  assert.equal(
    canDealPvpDamage({ ...p1, partyCode: 'KARTAL' }, { ...p2, partyCode: 'kartal' }).allowed,
    false
  );
  assert.equal(canDealPvpDamage({ ...p1, x: 0, z: 12 }, p2).allowed, false);
  assert.equal(canDealPvpDamage(p1, { ...p2, pvpEnabled: false }).allowed, false);
});

test('damage calculation scales with attack, skill multiplier, and crits', () => {
  const normal = calculateDamage(25, 10, 1.0, false);
  const heavy = calculateDamage(25, 10, 1.8, false);
  const crit = calculateDamage(25, 10, 1.0, true);
  assert.ok(heavy > normal);
  assert.ok(crit > normal);
});

test('Firestore payload sanitizer clamps every field to ocean archipelago & Lv1200 blueprint limits', () => {
  assert.equal(MAX_LEVEL, 1200);
  const dirty = {
    ...createDefaultProfile('spoof', 'A'.repeat(60), 'invalid', 'bomber'),
    level: 9999,
    gold: -50,
    swordTier: 99,
    desertArenaProgress: 99,
    hasHorse: true,
    lastX: 5000,
    convoyTier: 42,
    discoveredBiomes: ['meadow', 'pirate_island', 'horror_forest', 'meadow'] as any,
  };
  const clean = sanitizeProfileForFirestore(dirty, 'real_uid_123');
  assert.equal(clean.uid, 'real_uid_123');
  assert.equal(clean.displayName.length, 24);
  assert.equal(clean.tunicColor, CLASS_DEFINITIONS.bomber.colorHex);
  assert.equal(clean.playerClass, 'bomber');
  assert.equal(clean.level, MAX_LEVEL);
  assert.equal(clean.gold, 0);
  assert.equal(clean.swordTier, 10);
  assert.equal(clean.desertArenaProgress, 5);
  assert.equal(clean.hasHorse, true);
  assert.equal(clean.lastX, 1900);
  assert.equal(clean.convoyTier, 10);
  assert.deepEqual(clean.discoveredBiomes, ['meadow', 'pirate_island', 'horror_forest']);
});
