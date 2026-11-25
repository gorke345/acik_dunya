import * as THREE from 'three';
import type { PlayerClassId, WeaponKind } from './combatRules';

export type EnemyArchetype =
  | 'skirmisher'
  | 'lancer'
  | 'warden'
  | 'arena_gladiator'
  | 'viking'
  | 'viking_leader'
  | 'elf_archer'
  | 'orc_boss'
  | 'bandit_archer'
  | 'bandit_melee'
  | 'pirate_swordsman'
  | 'pirate_first_mate'
  | 'pirate_captain'
  | 'pirate_cannoneer'
  | 'pirate_archer'
  | 'navy_sailor'
  | 'navy_captain'
  | 'navy_cannoneer'
  | 'horror_stalker'
  | 'horror_reaper'
  | 'horror_abomination'
  | 'arcane_mage'
  | 'sea_guardian'
  | 'polar_yeti'
  | 'yeti_boss';

export interface BowDrawParts {
  group: THREE.Group;
  stringUpper: THREE.Mesh;
  stringLower: THREE.Mesh;
  nockedArrow: THREE.Group;
  arrowTipMat: THREE.MeshStandardMaterial;
  scale: number;
}

export interface WarriorRigOptions {
  tunicColor: string;
  swordTier: number;
  armorTier: number;
  weaponKind?: WeaponKind;
  playerClass?: PlayerClassId;
  isRunicYeti?: boolean;
  displayName?: string;
  level?: number;
  isEnemy?: boolean;
  enemyType?: EnemyArchetype;
  shadowTexture: THREE.Texture;
}

export interface WarriorRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  cloak: THREE.Mesh;
  weaponGroup: THREE.Group;
  shieldGroup: THREE.Group;
  shadowDisc: THREE.Mesh;
  hitFlashMaterials: THREE.MeshStandardMaterial[];
  tunicMaterial: THREE.MeshStandardMaterial;
  bladeMaterial: THREE.MeshStandardMaterial;
  bowParts?: BowDrawParts;
  runicHalo?: THREE.Group;
  isYetiModel?: boolean;
  telegraphRing?: THREE.Mesh;
  stunRing?: THREE.Group;
  nameSprite?: THREE.Sprite;
  nameCanvas?: HTMLCanvasElement;
  nameTexture?: THREE.CanvasTexture;
  lastTagKey?: string;
}

export interface HorseRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  neckHead: THREE.Group;
  tail: THREE.Mesh;
  legs: [THREE.Group, THREE.Group, THREE.Group, THREE.Group];
  saddleY: number;
}

export interface ShipModelRig {
  root: THREE.Group;
  hullGroup: THREE.Group;
  sails: THREE.Mesh[];
  deckY: number;
  halfWidth: number;
  halfLength: number;
  hpSprite?: THREE.Sprite;
  hpCanvas?: HTMLCanvasElement;
  hpTexture?: THREE.CanvasTexture;
  lastHpKey?: string;
}

/**
 * Builds a properly aligned, animatable Recurve Longbow:
 *  - Upright along +Y / -Y, grip forward at +Z, recurve tips at (0, ±0.74s, -0.15s)
 *  - Split upper & lower bowstring halves + nocked arrow group so setBowDrawAmount(0..1)
 *    smoothly bends the bowstring into a V-shape and pulls the arrow back!
 */
export function buildRecurveBowGroup(opts: {
  woodColor: number;
  emissiveColor?: number;
  trimColor?: number;
  stringColor?: number;
  arrowGlowColor?: number;
  scale?: number;
}): THREE.Group & { userData: { bowParts?: BowDrawParts } } {
  const bow = new THREE.Group() as THREE.Group & { userData: { bowParts?: BowDrawParts } };
  const s = opts.scale ?? 1.0;

  const woodMat = new THREE.MeshStandardMaterial({
    color: opts.woodColor,
    emissive: opts.emissiveColor ?? 0x000000,
    emissiveIntensity: opts.emissiveColor ? 0.35 : 0,
    roughness: 0.38,
    metalness: 0.16,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: opts.trimColor ?? 0xe8be54,
    roughness: 0.24,
    metalness: 0.84,
  });
  const stringMat = new THREE.MeshBasicMaterial({
    color: opts.stringColor ?? 0xf4f8ee,
  });
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0x855a34,
    roughness: 0.68,
  });
  const tipGlowColor = opts.arrowGlowColor ?? 0x5ef59b;
  const tipMat = new THREE.MeshStandardMaterial({
    color: tipGlowColor,
    emissive: tipGlowColor,
    emissiveIntensity: 0.75,
    roughness: 0.18,
    metalness: 0.68,
  });

  const bowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, -0.74 * s, -0.15 * s),
    new THREE.Vector3(0, -0.58 * s, 0.05 * s),
    new THREE.Vector3(0, -0.28 * s, 0.21 * s),
    new THREE.Vector3(0, 0, 0.25 * s),
    new THREE.Vector3(0, 0.28 * s, 0.21 * s),
    new THREE.Vector3(0, 0.58 * s, 0.05 * s),
    new THREE.Vector3(0, 0.74 * s, -0.15 * s),
  ]);
  const limbMesh = new THREE.Mesh(new THREE.TubeGeometry(bowCurve, 24, 0.038 * s, 8, false), woodMat);
  limbMesh.castShadow = true;
  bow.add(limbMesh);

  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.048 * s, 0.048 * s, 0.24 * s, 8), trimMat);
  grip.position.set(0, 0, 0.25 * s);
  bow.add(grip);

  for (const dir of [-1, 1]) {
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.044 * s, 0.013 * s, 6, 12), trimMat);
    collar.position.set(0, dir * 0.44 * s, 0.14 * s);
    collar.rotation.x = Math.PI / 2;
    const tipCap = new THREE.Mesh(new THREE.SphereGeometry(0.044 * s, 7, 7), trimMat);
    tipCap.position.set(0, dir * 0.74 * s, -0.15 * s);
    bow.add(collar, tipCap);
  }

  // Two-segment animatable bowstring (pivots from upper & lower horn nocks)
  const halfLen = 0.74 * s;
  const upperGeo = new THREE.CylinderGeometry(0.0085 * s, 0.0085 * s, halfLen, 6);
  upperGeo.translate(0, -halfLen * 0.5, 0);
  const stringUpper = new THREE.Mesh(upperGeo, stringMat);
  stringUpper.position.set(0, 0.74 * s, -0.15 * s);

  const lowerGeo = new THREE.CylinderGeometry(0.0085 * s, 0.0085 * s, halfLen, 6);
  lowerGeo.translate(0, halfLen * 0.5, 0);
  const stringLower = new THREE.Mesh(lowerGeo, stringMat);
  stringLower.position.set(0, -0.74 * s, -0.15 * s);
  bow.add(stringUpper, stringLower);

  // Nocked Arrow Group (slides cleanly back along -Z during bow draw)
  const nockedArrow = new THREE.Group();
  const arrowLen = 1.02 * s;
  const arrowShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016 * s, 0.016 * s, arrowLen, 6),
    shaftMat
  );
  arrowShaft.rotation.x = Math.PI / 2;
  arrowShaft.position.set(0.036 * s, 0.03 * s, -0.15 * s + arrowLen * 0.5);
  nockedArrow.add(arrowShaft);

  const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.048 * s, 0.18 * s, 4), tipMat);
  arrowHead.rotation.x = Math.PI / 2;
  arrowHead.position.set(0.036 * s, 0.03 * s, -0.15 * s + arrowLen + 0.08 * s);
  nockedArrow.add(arrowHead);

  const fletchGeo = new THREE.BoxGeometry(0.095 * s, 0.009 * s, 0.17 * s);
  const fletch1 = new THREE.Mesh(fletchGeo, tipMat);
  fletch1.position.set(0.036 * s, 0.03 * s, -0.05 * s);
  const fletch2 = new THREE.Mesh(fletchGeo, tipMat);
  fletch2.rotation.z = Math.PI / 2;
  fletch2.position.set(0.036 * s, 0.03 * s, -0.05 * s);
  nockedArrow.add(fletch1, fletch2);
  bow.add(nockedArrow);

  const bowParts: BowDrawParts = {
    group: bow,
    stringUpper,
    stringLower,
    nockedArrow,
    arrowTipMat: tipMat,
    scale: s,
  };
  bow.userData.bowParts = bowParts;
  return bow;
}

/**
 * Visually bends the bowstring back into a V and slides the nocked arrow back as draw01 goes 0 -> 1.
 */
export function setBowDrawAmount(parts: BowDrawParts | undefined, draw01: number) {
  if (!parts) return;
  const d = Math.max(0, Math.min(1, draw01));
  const s = parts.scale;
  const pullBack = d * 0.44 * s;
  const halfY = 0.74 * s;
  const len = Math.hypot(halfY, pullBack);
  const angle = Math.atan2(pullBack, halfY);

  parts.stringUpper.rotation.x = angle;
  parts.stringUpper.scale.set(1, len / halfY, 1);

  parts.stringLower.rotation.x = -angle;
  parts.stringLower.scale.set(1, len / halfY, 1);

  parts.nockedArrow.position.z = -pullBack;
  parts.arrowTipMat.emissiveIntensity = 0.75 + d * 2.1;
}

/**
 * Ornate Poseidon's Trident ("Poseidon'un Mızrağı") for Balıkadam & Atlantis Relic Pedestal.
 */
export function buildPoseidonTridentGroup(scale = 1.0): THREE.Group {
  const g = new THREE.Group();
  const s = scale;

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf4c85b,
    emissive: 0x6b4708,
    emissiveIntensity: 0.35,
    metalness: 0.9,
    roughness: 0.18,
  });
  const aquaGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.45,
    metalness: 0.55,
    roughness: 0.14,
  });
  const wrapMat = new THREE.MeshStandardMaterial({
    color: 0x0f4c75,
    roughness: 0.58,
  });

  // Main Sculpted Shaft
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.042 * s, 0.048 * s, 2.55 * s, 10), goldMat);
  shaft.position.y = 0.95 * s;
  g.add(shaft);

  // Grip Wrap Rings
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.052 * s, 0.014 * s, 6, 12), wrapMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = (0.25 + i * 0.18) * s;
    g.add(ring);
  }

  // Ornate Sea-Crown Crossbar & Glowing Ocean Pearl Core
  const crown = new THREE.Mesh(new THREE.BoxGeometry(0.76 * s, 0.11 * s, 0.1 * s), goldMat);
  crown.position.y = 2.18 * s;
  const pearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.15 * s, 1), aquaGlowMat);
  pearl.position.y = 2.18 * s;
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.22 * s, 0.028 * s, 8, 16), goldMat);
  halo.position.y = 2.18 * s;
  g.add(crown, pearl, halo);

  // Tall Central Aquamarine Spear Prong
  const midProng = new THREE.Mesh(new THREE.ConeGeometry(0.095 * s, 0.88 * s, 4), aquaGlowMat);
  midProng.position.y = 2.66 * s;
  g.add(midProng);

  // Two Curved Barbed Outer Prongs
  for (const side of [-1, 1]) {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.036 * s, 0.044 * s, 0.42 * s, 7), goldMat);
    stem.position.set(side * 0.34 * s, 2.38 * s, 0);
    stem.rotation.z = -side * 0.14;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.072 * s, 0.54 * s, 4), aquaGlowMat);
    tip.position.set(side * 0.37 * s, 2.74 * s, 0);
    tip.rotation.z = -side * 0.08;
    const barb = new THREE.Mesh(new THREE.ConeGeometry(0.04 * s, 0.18 * s, 4), goldMat);
    barb.position.set(side * 0.43 * s, 2.46 * s, 0);
    barb.rotation.z = -side * 0.95;
    g.add(stem, tip, barb);
  }

  // Pommel Spike
  const pommel = new THREE.Mesh(new THREE.ConeGeometry(0.06 * s, 0.24 * s, 6), goldMat);
  pommel.rotation.x = Math.PI;
  pommel.position.y = -0.38 * s;
  g.add(pommel);

  return g;
}

/**
 * Heavy Pirate Escape Cannon spawned temporarily when Bombacı uses Shift ("Top Fırlatışı").
 */
export function buildEscapeCannonMesh(): THREE.Group {
  const g = new THREE.Group();
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e2229, metalness: 0.85, roughness: 0.32 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85, roughness: 0.25 });
  const oakMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.8 });

  const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.55, 1.55), oakMat);
  carriage.position.y = 0.48;
  g.add(carriage);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.14, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const sx of [-0.64, 0.64]) {
    for (const sz of [-0.52, 0.52]) {
      const wheel = new THREE.Mesh(wheelGeo, oakMat);
      wheel.position.set(sx, 0.36, sz);
      g.add(wheel);
    }
  }

  const barrelGroup = new THREE.Group();
  barrelGroup.position.set(0, 0.92, 0);
  barrelGroup.rotation.x = -0.62; // angled up ~35 degrees to launch the Bomber sky-high!

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.48, 2.15, 14), ironMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.42;
  const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.065, 8, 16), brassMat);
  muzzle.position.z = 1.48;
  const breech = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 10), ironMat);
  breech.position.z = -0.62;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.045, 6, 14), brassMat);
  band.position.z = 0.25;
  barrelGroup.add(barrel, muzzle, breech, band);
  g.add(barrelGroup);

  return g;
}

export function updateNameTagSprite(
  rig: WarriorRig,
  name: string,
  level: number,
  hp: number,
  maxHp: number,
  badgeText: string,
  badgeColor: string
) {
  if (!rig.nameCanvas || !rig.nameTexture) return;
  const hpPct = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 0));
  const key = `${name}|${level}|${Math.round(hpPct * 50)}|${badgeText}|${badgeColor}`;
  if (rig.lastTagKey === key) return;
  rig.lastTagKey = key;

  const canvas = rig.nameCanvas;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(13, 19, 25, 0.88)';
  ctx.beginPath();
  ctx.roundRect(10, 10, canvas.width - 20, 74, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(235, 212, 162, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(18, 19, 76, 28, 6);
  ctx.fill();
  ctx.fillStyle = '#0e1318';
  ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Sv${level}`, 56, 39);

  ctx.fillStyle = '#f6f0e1';
  ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(name.slice(0, 18), 102, 40);

  if (badgeText) {
    ctx.fillStyle = badgeColor;
    ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(badgeText, canvas.width - 18, 38);
  }

  const barX = 20;
  const barY = 58;
  const barW = canvas.width - 40;
  const barH = 14;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 6);
  ctx.fill();

  const fillColor = hpPct > 0.5 ? '#58c472' : hpPct > 0.25 ? '#e8a838' : '#e04f4f';
  ctx.fillStyle = fillColor;
  if (hpPct > 0.01) {
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(8, barW * hpPct), barH, 6);
    ctx.fill();
  }

  rig.nameTexture.needsUpdate = true;
}

export function updateShipHpSprite(
  ship: ShipModelRig,
  title: string,
  subtitle: string,
  hp: number,
  maxHp: number,
  accentColor: string
) {
  if (!ship.hpCanvas || !ship.hpTexture) return;
  const pct = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 0));
  const key = `${title}|${subtitle}|${Math.round(pct * 50)}|${accentColor}`;
  if (ship.lastHpKey === key) return;
  ship.lastHpKey = key;

  const canvas = ship.hpCanvas;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(10, 17, 24, 0.9)';
  ctx.beginPath();
  ctx.roundRect(8, 8, canvas.width - 16, 84, 12);
  ctx.fill();
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = '#f8f2e0';
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.slice(0, 28), canvas.width / 2, 34);

  ctx.fillStyle = accentColor;
  ctx.font = 'bold 14px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtitle.slice(0, 34), canvas.width / 2, 54);

  const bx = 22;
  const by = 64;
  const bw = canvas.width - 44;
  const bh = 16;
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 6);
  ctx.fill();
  ctx.fillStyle = pct > 0.45 ? '#38bdf8' : pct > 0.2 ? '#f59e0b' : '#ef4444';
  if (pct > 0.01) {
    ctx.beginPath();
    ctx.roundRect(bx, by, Math.max(8, bw * pct), bh, 6);
    ctx.fill();
  }
  ship.hpTexture.needsUpdate = true;
}

/**
 * Custom hulking Yeti & Runic Yeti 3D Rig (used for Yeti player class, Polar Yetis, and Lv.1000 Giant Yeti Boss).
 */
function buildYetiBodyRig(options: WarriorRigOptions): WarriorRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isBoss = options.enemyType === 'yeti_boss';
  const isPolarEnemy = options.enemyType === 'polar_yeti';
  const isRunic = Boolean(options.isRunicYeti) || isBoss;

  const scaleFactor = isBoss ? 3.25 : isPolarEnemy ? 1.55 : isRunic ? 1.48 : 1.32;
  bodyGroup.scale.setScalar(scaleFactor);

  const furMat = new THREE.MeshStandardMaterial({
    color: isRunic ? 0xd8f3ff : 0xf1f7fb,
    roughness: 0.88,
    metalness: 0.04,
  });
  const deepFurMat = new THREE.MeshStandardMaterial({
    color: isRunic ? 0x6ea9cf : 0xc7d9e8,
    roughness: 0.9,
    metalness: 0.05,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: isRunic ? 0x26486b : 0x5c7388,
    roughness: 0.62,
    metalness: 0.1,
  });
  const hornMat = new THREE.MeshStandardMaterial({
    color: isRunic ? 0x1a385c : 0x3b4958,
    roughness: 0.35,
    metalness: 0.35,
  });
  const runeGlowMat = new THREE.MeshStandardMaterial({
    color: isBoss ? 0x38bdf8 : 0x7dd3fc,
    emissive: isBoss ? 0x0284c7 : 0x00c8ff,
    emissiveIntensity: isRunic ? 2.1 : 0.4,
    roughness: 0.14,
    metalness: 0.55,
  });
  const clawMat = new THREE.MeshStandardMaterial({
    color: isRunic ? 0x7dd3fc : 0xdbeafe,
    emissive: isRunic ? 0x0284c7 : 0x000000,
    emissiveIntensity: isRunic ? 1.4 : 0,
    roughness: 0.18,
    metalness: 0.78,
  });

  const hitFlashMaterials = [furMat, deepFurMat, skinMat];

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.22 * scaleFactor, 20),
    new THREE.MeshBasicMaterial({
      map: options.shadowTexture,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;
  root.add(shadowDisc);

  // Thick Muscular Yeti Legs
  const buildYetiLeg = (side: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.3, 0.84, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.19, 0.5, 9), furMat);
    thigh.position.y = -0.24;
    thigh.castShadow = true;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.38, 9), deepFurMat);
    shin.position.y = -0.6;
    const paw = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.44), skinMat);
    paw.position.set(0, -0.76, 0.08);
    legGroup.add(thigh, shin, paw);
    for (let c = -1; c <= 1; c++) {
      const toeClaw = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16, 5), clawMat);
      toeClaw.rotation.x = Math.PI * 0.45;
      toeClaw.position.set(c * 0.09, -0.78, 0.34);
      legGroup.add(toeClaw);
    }
    return legGroup;
  };
  const leftLeg = buildYetiLeg(-1);
  const rightLeg = buildYetiLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // Broad Hulking Yeti Torso + Furred Back Hump & Frost Mane
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.42, 0.96, 12), furMat);
  torso.position.y = 1.26;
  torso.castShadow = true;
  const chestPlate = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), deepFurMat);
  chestPlate.scale.set(1.18, 0.92, 0.78);
  chestPlate.position.set(0, 1.38, 0.22);
  const backHump = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56, 1), furMat);
  backHump.scale.set(1.25, 0.92, 0.95);
  backHump.position.set(0, 1.66, -0.14);
  backHump.castShadow = true;
  bodyGroup.add(torso, chestPlate, backHump);

  // Back Fur Mane (serves as animated cloak slot)
  const cloakGeo = new THREE.ConeGeometry(0.55, 0.95, 7);
  cloakGeo.translate(0, -0.45, 0);
  const cloak = new THREE.Mesh(cloakGeo, deepFurMat);
  cloak.position.set(0, 1.68, -0.34);
  cloak.rotation.x = 0.24;
  bodyGroup.add(cloak);

  // Savage Horned Yeti Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 9), furMat);
  head.position.set(0, 1.98, 0.14);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.3, 0.26), skinMat);
  face.position.set(0, 1.92, 0.34);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.24), furMat);
  brow.position.set(0, 2.08, 0.34);
  const eyeMat = new THREE.MeshStandardMaterial({
    color: isRunic ? 0x38bdf8 : 0x93c5fd,
    emissive: isRunic ? 0x00d4ff : 0x2563eb,
    emissiveIntensity: isRunic ? 2.4 : 1.4,
  });
  const eL = new THREE.Mesh(new THREE.SphereGeometry(0.048, 7, 7), eyeMat);
  eL.position.set(-0.1, 1.98, 0.46);
  const eR = eL.clone();
  eR.position.x = 0.1;

  // Lower Fang Tusks
  for (const side of [-1, 1]) {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.15, 5), clawMat);
    fang.position.set(side * 0.1, 1.82, 0.45);
    fang.rotation.x = 0.2;
    bodyGroup.add(fang);
  }

  // Sweeping Curved Ram/Glacier Horns
  for (const side of [-1, 1]) {
    const hornBase = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.56, 7), hornMat);
    hornBase.position.set(side * 0.32, 2.24, 0.14);
    hornBase.rotation.z = -side * 0.72;
    hornBase.rotation.x = 0.22;
    const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.36, 7), isRunic ? runeGlowMat : hornMat);
    hornTip.position.set(side * 0.52, 2.48, 0.24);
    hornTip.rotation.z = -side * 0.22;
    hornTip.rotation.x = 0.42;
    bodyGroup.add(hornBase, hornTip);
  }
  bodyGroup.add(head, face, brow, eL, eR);

  // Massive Clawed Yeti Arms
  const buildYetiArm = (side: number) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.66, 1.62, 0.04);
    const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3, 1), furMat);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.58, 9), furMat);
    upper.position.y = -0.3;
    upper.castShadow = true;
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.17, 0.52, 9), deepFurMat);
    forearm.position.set(0, -0.74, 0.08);
    forearm.rotation.x = -0.18;
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.26, 0.32), skinMat);
    fist.position.set(0, -0.98, 0.14);
    arm.add(shoulder, upper, forearm, fist);
    for (let c = -1; c <= 1; c++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.28, 5), clawMat);
      claw.rotation.x = Math.PI * 0.56;
      claw.position.set(c * 0.09, -1.04, 0.34);
      arm.add(claw);
    }
    if (isRunic) {
      const runeBracer = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.036, 6, 14), runeGlowMat);
      runeBracer.rotation.x = Math.PI / 2;
      runeBracer.position.set(0, -0.72, 0.08);
      arm.add(runeBracer);
    }
    return arm;
  };
  const leftArm = buildYetiArm(-1);
  const rightArm = buildYetiArm(1);
  bodyGroup.add(leftArm, rightArm);

  const shieldGroup = new THREE.Group();
  leftArm.add(shieldGroup);
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0, -0.94, 0.16);
  rightArm.add(weaponGroup);

  // RUNIC YETI REDESIGN: Glowing Carved Rune Bands, Crystal Ice Crown & Orbiting Runic Halo!
  let runicHalo: THREE.Group | undefined;
  if (isRunic) {
    // Glowing V-shaped runic chest sigil & icy belt band
    const runeChest1 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 0.06), runeGlowMat);
    runeChest1.position.set(0, 1.48, 0.54);
    runeChest1.rotation.z = 0.42;
    const runeChest2 = runeChest1.clone();
    runeChest2.rotation.z = -0.42;
    const runeCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), runeGlowMat);
    runeCore.position.set(0, 1.44, 0.58);
    const runeBelt = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.042, 6, 18), runeGlowMat);
    runeBelt.rotation.x = Math.PI / 2;
    runeBelt.position.y = 0.94;
    bodyGroup.add(runeChest1, runeChest2, runeCore, runeBelt);

    // Jagged Glacial Ice Spikes growing from the Yeti's shoulders & spine
    for (const side of [-1, 1]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.62, 5), runeGlowMat);
      spike.position.set(side * 0.52, 2.02, -0.14);
      spike.rotation.z = -side * 0.45;
      spike.rotation.x = -0.25;
      bodyGroup.add(spike);
    }

    // Floating Orbiting Runic Ice Ring + 6 Glowing Runic Shards behind the Yeti!
    runicHalo = new THREE.Group();
    runicHalo.position.set(0, 1.85, -0.42);
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.042, 8, 28), runeGlowMat);
    runicHalo.add(haloRing);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), runeGlowMat);
      shard.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0);
      runicHalo.add(shard);
    }
    bodyGroup.add(runicHalo);
  }

  let telegraphRing: THREE.Mesh | undefined;
  let stunRing: THREE.Group | undefined;
  if (options.isEnemy) {
    const ringRadius = isBoss ? 8.8 : 4.2;
    telegraphRing = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius * 0.72, ringRadius, 28),
      new THREE.MeshBasicMaterial({
        color: isBoss ? 0x38bdf8 : 0x7dd3fc,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    telegraphRing.rotation.x = -Math.PI / 2;
    telegraphRing.position.y = 0.14;
    telegraphRing.visible = false;
    root.add(telegraphRing);

    stunRing = new THREE.Group();
    stunRing.position.y = 2.65 * scaleFactor;
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffe45c });
    const starGeo = new THREE.OctahedronGeometry(0.18, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
      stunRing.add(star);
    }
    stunRing.visible = false;
    root.add(stunRing);
  }

  let nameSprite: THREE.Sprite | undefined;
  let nameCanvas: HTMLCanvasElement | undefined;
  let nameTexture: THREE.CanvasTexture | undefined;
  if (options.displayName) {
    nameCanvas = document.createElement('canvas');
    nameCanvas.width = 360;
    nameCanvas.height = 96;
    nameTexture = new THREE.CanvasTexture(nameCanvas);
    nameTexture.colorSpace = THREE.SRGBColorSpace;
    nameSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: nameTexture, transparent: true, depthTest: false })
    );
    nameSprite.position.y = 2.95 * scaleFactor;
    nameSprite.scale.set(isBoss ? 5.2 : 3.2, isBoss ? 1.38 : 0.85, 1);
    root.add(nameSprite);
  }

  const rig: WarriorRig = {
    root,
    bodyGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    cloak,
    weaponGroup,
    shieldGroup,
    shadowDisc,
    hitFlashMaterials,
    tunicMaterial: furMat,
    bladeMaterial: clawMat,
    runicHalo,
    isYetiModel: true,
    telegraphRing,
    stunRing,
    nameSprite,
    nameCanvas,
    nameTexture,
  };

  if (options.displayName) {
    updateNameTagSprite(
      rig,
      options.displayName,
      options.level || 1,
      100,
      100,
      isBoss ? 'DEV YETİ BOSS' : isRunic ? 'RÜNİK YETİ 5x' : 'BUZ YETİSİ',
      isBoss ? '#38bdf8' : isRunic ? '#38bdf8' : '#7dd3fc'
    );
  }

  return rig;
}

/**
 * Builds detailed articulated multi-part warrior, Balıkadam, Yeti, or enemy models.
 */
export function buildWarriorRig(options: WarriorRigOptions): WarriorRig {
  const et = options.enemyType;
  if (options.playerClass === 'yeti' || et === 'yeti_boss' || et === 'polar_yeti') {
    return buildYetiBodyRig(options);
  }

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isFishman = options.playerClass === 'fishman';
  const isVikingLeader = et === 'viking_leader';
  const isViking = et === 'viking' || isVikingLeader;
  const isElf = et === 'elf_archer';
  const isOrcBoss = et === 'orc_boss';
  const isBanditArcher = et === 'bandit_archer';
  const isBanditMelee = et === 'bandit_melee';
  const isBandit = isBanditArcher || isBanditMelee;
  const isPirateCaptain = et === 'pirate_captain';
  const isPirateFirstMate = et === 'pirate_first_mate';
  const isPirateCannoneer = et === 'pirate_cannoneer';
  const isPirateArcher = et === 'pirate_archer';
  const isPirate =
    et === 'pirate_swordsman' ||
    isPirateFirstMate ||
    isPirateCaptain ||
    isPirateCannoneer ||
    isPirateArcher;
  const isNavyCaptain = et === 'navy_captain';
  const isNavyCannoneer = et === 'navy_cannoneer';
  const isNavy = et === 'navy_sailor' || isNavyCaptain || isNavyCannoneer;
  const isHorrorAbom = et === 'horror_abomination';
  const isHorrorReaper = et === 'horror_reaper';
  const isHorror = et === 'horror_stalker' || isHorrorReaper || isHorrorAbom;
  const isArcaneMage = et === 'arcane_mage';
  const isSeaGuardian = et === 'sea_guardian';

  const isBowRig = options.weaponKind === 'bow' || isElf || isBanditArcher || isPirateArcher;
  const isCannoneerRig = isPirateCannoneer || isNavyCannoneer;
  const isStaffRig = options.weaponKind === 'staff' || isArcaneMage;
  const isDaggerRig = options.weaponKind === 'daggers';
  const isTridentRig = options.weaponKind === 'trident';
  const isBoss =
    et === 'warden' ||
    isVikingLeader ||
    isOrcBoss ||
    isPirateCaptain ||
    isNavyCaptain ||
    isHorrorAbom;

  const scaleFactor = isPirateCaptain
    ? 2.38
    : isHorrorAbom
    ? 2.18
    : isOrcBoss
    ? 1.88
    : isVikingLeader || isNavyCaptain
    ? 1.65
    : isPirateFirstMate || isHorrorReaper
    ? 1.48
    : et === 'warden' || isSeaGuardian
    ? 1.38
    : et === 'horror_stalker'
    ? 1.3
    : et === 'viking'
    ? 1.18
    : isBandit || isPirate || isNavy
    ? 1.12
    : et === 'lancer' || et === 'arena_gladiator'
    ? 1.1
    : isFishman
    ? 1.08
    : isElf
    ? 1.06
    : 1.0;
  bodyGroup.scale.setScalar(scaleFactor);

  const tunicMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(options.tunicColor),
    roughness: isHorror ? 0.9 : isFishman ? 0.38 : 0.72,
    metalness: isFishman || isSeaGuardian ? 0.42 : 0.08,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: isHorror
      ? 0x16111c
      : isFishman
      ? 0x0e4a66
      : isBandit || isPirate
      ? 0x261a18
      : isNavy
      ? 0x1a2842
      : isElf
      ? 0x2b3b2d
      : 0x453123,
    roughness: 0.74,
    metalness: 0.1,
  });

  const steelTint = isHorror
    ? 0x2b2436
    : isFishman || isSeaGuardian
    ? 0x38c0db
    : isOrcBoss
    ? 0x454a52
    : isBandit || isPirate
    ? 0x3a3e46
    : options.armorTier >= 5
    ? 0xe4d2a4
    : isBoss
    ? 0x626b78
    : 0xbac4d0;
  const steelMat = new THREE.MeshStandardMaterial({
    color: steelTint,
    roughness: 0.24,
    metalness: 0.82,
  });

  const skinColor = isHorror
    ? 0x2d2438
    : isFishman || isSeaGuardian
    ? 0x67d2e8
    : isOrcBoss
    ? 0x4d7339
    : isElf
    ? 0xead4be
    : 0xdcb491;
  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColor,
    roughness: isFishman ? 0.35 : 0.62,
    metalness: isFishman ? 0.18 : 0.02,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: isHorror
      ? 0xc026d3
      : isFishman
      ? 0xf7d060
      : isElf || isPirateCaptain || isNavyCaptain
      ? 0xf5ca5b
      : options.swordTier >= 4
      ? 0xf0be54
      : 0xc99a4b,
    roughness: 0.22,
    metalness: 0.86,
  });

  const bladeColor = isHorror
    ? 0xf43f5e
    : options.swordTier >= 7
    ? 0x79e2ff
    : options.swordTier >= 4
    ? 0xf5d67b
    : 0xe2eaf4;
  const bladeMat = new THREE.MeshStandardMaterial({
    color: bladeColor,
    roughness: 0.14,
    metalness: 0.92,
    emissive: isHorror
      ? new THREE.Color(0x9f1239)
      : options.swordTier >= 7
      ? new THREE.Color(0x1f6d8c)
      : new THREE.Color(0x000000),
    emissiveIntensity: isHorror ? 0.75 : options.swordTier >= 7 ? 0.55 : 0,
  });

  const hitFlashMaterials = [tunicMat, steelMat, leatherMat];

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95 * scaleFactor, 18),
    new THREE.MeshBasicMaterial({
      map: options.shadowTexture,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;
  root.add(shadowDisc);

  // Articulated Armored Legs with Knee Cops & Boots
  const buildLeg = (side: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * (isOrcBoss || isPirateCaptain ? 0.22 : 0.18), 0.78, 0);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(isOrcBoss ? 0.145 : 0.115, isOrcBoss ? 0.12 : 0.098, 0.44, 9),
      leatherMat
    );
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    legGroup.add(thigh);

    const kneeCop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), trimMat);
    kneeCop.position.set(0, -0.43, 0.05);
    legGroup.add(kneeCop);

    const greave = new THREE.Mesh(
      new THREE.CylinderGeometry(isOrcBoss ? 0.12 : 0.098, isOrcBoss ? 0.105 : 0.088, 0.34, 9),
      steelMat
    );
    greave.position.y = -0.58;
    greave.castShadow = true;
    legGroup.add(greave);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.13, 0.3), leatherMat);
    boot.position.set(0, -0.72, 0.05);
    legGroup.add(boot);

    return legGroup;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // Sculpted Torso, Layered Cuirass, Chest Emblem & Waist Tassets
  const torsoRadiusTop = isOrcBoss || isPirateCaptain || isHorrorAbom ? 0.44 : isElf ? 0.28 : 0.34;
  const torsoRadiusBot = isOrcBoss || isPirateCaptain || isHorrorAbom ? 0.34 : isElf ? 0.22 : 0.26;
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(torsoRadiusTop, torsoRadiusBot, 0.78, 12),
    tunicMat
  );
  torso.position.y = 1.18;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const cuirass = new THREE.Mesh(
    new THREE.CylinderGeometry(torsoRadiusTop + 0.025, torsoRadiusBot + 0.025, 0.48, 12),
    isElf || isPirate || isArcaneMage ? leatherMat : steelMat
  );
  cuirass.position.y = 1.28;
  bodyGroup.add(cuirass);

  // Sculpted Chest Crest Emblem & Shoulder Strap
  const chestCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), trimMat);
  chestCrest.scale.set(1.1, 1.35, 0.45);
  chestCrest.position.set(0, 1.34, torsoRadiusTop + 0.02);
  bodyGroup.add(chestCrest);

  // Armored Waist Belt + Tasset Plates
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(torsoRadiusBot + 0.032, torsoRadiusBot + 0.032, 0.12, 12),
    leatherMat
  );
  belt.position.y = 0.88;
  bodyGroup.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.09), trimMat);
  buckle.position.set(0, 0.88, torsoRadiusBot + 0.02);
  bodyGroup.add(buckle);

  for (const side of [-1, 1]) {
    const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.06), steelMat);
    tasset.position.set(side * 0.22, 0.74, 0.18);
    tasset.rotation.z = -side * 0.15;
    bodyGroup.add(tasset);
  }

  // Sculpted Layered Pauldrons with Gold Rim
  const shoulderX = isOrcBoss || isPirateCaptain || isHorrorAbom ? 0.5 : 0.41;
  for (const side of [-1, 1]) {
    const pauldronGroup = new THREE.Group();
    pauldronGroup.position.set(side * shoulderX, 1.49, 0);
    pauldronGroup.rotation.z = -side * 0.34;
    const pDome = new THREE.Mesh(
      new THREE.SphereGeometry(isOrcBoss || isPirateCaptain ? 0.26 : 0.19, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.65),
      isPirateCaptain || isNavyCaptain ? trimMat : steelMat
    );
    const pRim = new THREE.Mesh(new THREE.TorusGeometry(isOrcBoss || isPirateCaptain ? 0.24 : 0.18, 0.025, 6, 12), trimMat);
    pRim.rotation.x = Math.PI / 2;
    pRim.position.y = 0.01;
    pauldronGroup.add(pDome, pRim);
    bodyGroup.add(pauldronGroup);
  }

  // Flowing Tapered Cloak with Shoulder Clasps
  const cloakGeo = new THREE.BoxGeometry(isOrcBoss || isPirateCaptain ? 0.74 : 0.58, 0.96, 0.045);
  cloakGeo.translate(0, -0.48, 0);
  const cloak = new THREE.Mesh(cloakGeo, tunicMat);
  cloak.position.set(0, 1.5, -(torsoRadiusBot + 0.03));
  cloak.rotation.x = 0.16;
  bodyGroup.add(cloak);

  // Head + Unique Detailed Headgear
  const head = new THREE.Mesh(new THREE.SphereGeometry(isOrcBoss || isPirateCaptain ? 0.25 : 0.215, 12, 10), skinMat);
  head.position.y = 1.77;
  bodyGroup.add(head);

  if (isFishman || isSeaGuardian) {
    // Balıkadam Aquatic Crest Fin, Ocean Crown, Glowing Aqua Eyes & Side Gill Fins!
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0369a1,
      emissiveIntensity: 0.75,
      roughness: 0.28,
      metalness: 0.35,
    });
    const dorsalFin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.54, 4), finMat);
    dorsalFin.scale.set(0.35, 1.0, 1.55);
    dorsalFin.position.set(0, 2.08, -0.04);
    dorsalFin.rotation.x = -0.28;

    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.032, 6, 16), trimMat);
    circlet.rotation.x = Math.PI / 2;
    circlet.position.y = 1.88;

    const eyeGlow = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x00d4ff,
      emissiveIntensity: 1.8,
    });
    for (const side of [-1, 1]) {
      const gillFin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 4), finMat);
      gillFin.position.set(side * 0.25, 1.76, -0.02);
      gillFin.rotation.z = -side * 1.12;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), eyeGlow);
      eye.position.set(side * 0.075, 1.8, 0.19);
      bodyGroup.add(gillFin, eye);
    }
    // Back Aqua Dorsal Ridge
    const backFin = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 4), finMat);
    backFin.scale.set(0.25, 1, 1.2);
    backFin.position.set(0, 1.32, -0.34);
    backFin.rotation.x = -0.45;
    bodyGroup.add(dorsalFin, circlet, backFin);
  } else if (isHorror) {
    const eyeGlow = new THREE.MeshStandardMaterial({
      color: isHorrorAbom ? 0xff2244 : 0xd946ef,
      emissive: isHorrorAbom ? 0xff0033 : 0xc026d3,
      emissiveIntensity: 2.0,
    });
    const eL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeGlow);
    eL.position.set(-0.08, 1.8, 0.2);
    const eR = eL.clone();
    eR.position.x = 0.08;
    bodyGroup.add(eL, eR);
    if (isHorrorAbom) {
      const eL2 = eL.clone();
      eL2.position.set(-0.12, 1.88, 0.18);
      const eR2 = eR.clone();
      eR2.position.set(0.12, 1.88, 0.18);
      bodyGroup.add(eL2, eR2);
    }
    const hornGeo = new THREE.ConeGeometry(0.075, 0.56, 6);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x1a0e24, roughness: 0.4 });
    const hL = new THREE.Mesh(hornGeo, hornMat);
    hL.position.set(-0.22, 2.12, -0.02);
    hL.rotation.z = 0.55;
    const hR = hL.clone();
    hR.position.x = 0.22;
    hR.rotation.z = -0.55;
    bodyGroup.add(hL, hR);
    if (isHorrorReaper) {
      const cowl = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.6, 8), leatherMat);
      cowl.position.set(0, 2.02, -0.03);
      bodyGroup.add(cowl);
    }
  } else if (isPirateCaptain || isPirateFirstMate || isNavyCaptain) {
    const hatMat = new THREE.MeshStandardMaterial({
      color: isNavyCaptain ? 0x122645 : 0x1a1414,
      roughness: 0.72,
    });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.42, 0.07, 3), hatMat);
    brim.position.set(0, 1.96, 0.02);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.22, 8), hatMat);
    crown.position.set(0, 2.08, 0);
    const emblem = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), trimMat);
    emblem.position.set(0, 2.06, 0.25);
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.44, 6),
      new THREE.MeshStandardMaterial({ color: isNavyCaptain ? 0xf8fafc : 0xe11d48, roughness: 0.6 })
    );
    plume.position.set(0.2, 2.26, -0.04);
    plume.rotation.z = -0.4;
    const beard = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.22, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x1d1614, roughness: 0.9 })
    );
    beard.position.set(0, 1.56, 0.18);
    bodyGroup.add(brim, crown, emblem, plume, beard);
  } else if (isPirate || options.playerClass === 'bomber') {
    const bandana = new THREE.Mesh(
      new THREE.SphereGeometry(0.235, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.56),
      new THREE.MeshStandardMaterial({ color: options.playerClass === 'bomber' ? 0xd96b1f : 0xb91c1c, roughness: 0.82 })
    );
    bandana.position.y = 1.81;
    const patch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.05), leatherMat);
    patch.position.set(0.07, 1.8, 0.2);
    const goggles = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 10), trimMat);
    goggles.position.set(-0.07, 1.8, 0.2);
    bodyGroup.add(bandana, patch, goggles);
  } else if (isArcaneMage || options.weaponKind === 'staff' || options.playerClass === 'mage') {
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x3b1766, roughness: 0.68 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 14), hatMat);
    brim.position.y = 1.95;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.66, 10), hatMat);
    cone.position.set(0, 2.26, -0.04);
    cone.rotation.x = -0.15;
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.235, 0.028, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x9333ea, emissiveIntensity: 1.2 })
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = 1.99;
    bodyGroup.add(brim, cone, band);
  } else if (isOrcBoss) {
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.26), skinMat);
    jaw.position.set(0, 1.62, 0.11);
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xf0e6c8, roughness: 0.45 });
    const tuskGeo = new THREE.ConeGeometry(0.045, 0.18, 6);
    const tuskL = new THREE.Mesh(tuskGeo, tuskMat);
    tuskL.position.set(-0.11, 1.68, 0.22);
    tuskL.rotation.x = 0.28;
    const tuskR = tuskL.clone();
    tuskR.position.x = 0.11;
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff3b2f,
      emissive: 0xff2200,
      emissiveIntensity: 1.6,
    });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
    eyeL.position.set(-0.08, 1.79, 0.22);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.08;
    const warHelm = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      steelMat
    );
    warHelm.position.y = 1.82;
    const hornGeo = new THREE.ConeGeometry(0.075, 0.42, 7);
    const hL = new THREE.Mesh(hornGeo, tuskMat);
    hL.position.set(-0.26, 2.04, 0.04);
    hL.rotation.z = 0.72;
    const hR = hL.clone();
    hR.position.x = 0.26;
    hR.rotation.z = -0.72;
    bodyGroup.add(jaw, tuskL, tuskR, eyeL, eyeR, warHelm, hL, hR);
  } else if (isElf || options.playerClass === 'archer') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.29, 0.54, 8), tunicMat);
    hood.position.set(0, 1.98, -0.04);
    hood.rotation.x = -0.24;
    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.025, 6, 16), trimMat);
    circlet.rotation.x = Math.PI / 2;
    circlet.position.y = 1.85;
    if (isElf) {
      const earGeo = new THREE.ConeGeometry(0.045, 0.22, 5);
      const earL = new THREE.Mesh(earGeo, skinMat);
      earL.position.set(-0.24, 1.76, -0.02);
      earL.rotation.z = 1.15;
      const earR = earL.clone();
      earR.position.x = 0.24;
      earR.rotation.z = -1.15;
      bodyGroup.add(earL, earR);
    }
    bodyGroup.add(hood, circlet);
  } else if (isBandit || options.playerClass === 'assassin') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.54, 8), tunicMat);
    hood.position.set(0, 1.99, -0.03);
    hood.rotation.x = -0.18;
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.16), leatherMat);
    mask.position.set(0, 1.71, 0.16);
    bodyGroup.add(hood, mask);
  } else {
    const helmDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.245, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.64),
      et === 'skirmisher' ? tunicMat : steelMat
    );
    helmDome.position.y = 1.8;
    bodyGroup.add(helmDome);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.075, 0.15), trimMat);
    visor.position.set(0, 1.8, 0.18);
    bodyGroup.add(visor);

    if (isViking || isBoss) {
      const hornMat = isVikingLeader
        ? trimMat
        : new THREE.MeshStandardMaterial({ color: 0xe6dec8, roughness: 0.55 });
      const hornGeo = new THREE.ConeGeometry(
        isVikingLeader ? 0.08 : 0.058,
        isVikingLeader ? 0.48 : 0.34,
        7
      );
      const leftHorn = new THREE.Mesh(hornGeo, hornMat);
      leftHorn.position.set(-0.24, 1.99, 0.04);
      leftHorn.rotation.z = 0.72;
      const rightHorn = new THREE.Mesh(hornGeo, hornMat);
      rightHorn.position.set(0.24, 1.99, 0.04);
      rightHorn.rotation.z = -0.72;
      bodyGroup.add(leftHorn, rightHorn);
    } else {
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.19, 0.38), tunicMat);
      crest.position.set(0, 2.06, -0.02);
      bodyGroup.add(crest);
    }
  }

  // Articulated Arms with Forearm Bracers & Gauntlets
  const buildArm = (side: number) => {
    const arm = new THREE.Group();
    arm.position.set(side * shoulderX, 1.44, 0);
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(isOrcBoss || isPirateCaptain ? 0.12 : 0.09, 0.08, 0.34, 9),
      isOrcBoss ? skinMat : leatherMat
    );
    upper.position.y = -0.17;
    const bracer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.092, 0.082, 0.25, 9),
      steelMat
    );
    bracer.position.y = -0.42;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.082, 7, 6), leatherMat);
    hand.position.y = -0.56;
    arm.add(upper, bracer, hand);
    return arm;
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);
  bodyGroup.add(leftArm, rightArm);

  // Off-hand Shield or Twin Dagger
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(-0.1, -0.36, 0.14);
  if (isDaggerRig || isBanditMelee || isPirateFirstMate) {
    const offMat = isDaggerRig
      ? new THREE.MeshStandardMaterial({
          color: 0x2dd4bf,
          emissive: 0x0f766e,
          emissiveIntensity: 0.75,
          metalness: 0.85,
          roughness: 0.18,
        })
      : bladeMat;
    const offBlade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.03), offMat);
    offBlade.rotation.x = Math.PI * 0.42;
    offBlade.position.set(0, -0.1, 0.24);
    shieldGroup.add(offBlade);
  } else if (
    et !== 'skirmisher' &&
    !isBowRig &&
    !isCannoneerRig &&
    !isStaffRig &&
    !isOrcBoss &&
    !isHorror &&
    !isTridentRig &&
    options.weaponKind !== 'bomb'
  ) {
    const shieldMat = isViking
      ? new THREE.MeshStandardMaterial({
          color: isVikingLeader ? 0xb52b26 : 0x2c5e94,
          roughness: 0.58,
          metalness: 0.25,
        })
      : steelMat;
    const shieldBody = new THREE.Mesh(
      new THREE.CylinderGeometry(isViking ? 0.38 : 0.34, isViking ? 0.38 : 0.26, 0.075, 12),
      shieldMat
    );
    shieldBody.rotation.x = Math.PI / 2;
    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(isViking ? 0.38 : 0.32, 0.03, 6, 14), trimMat);
    const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), trimMat);
    shieldBoss.position.z = 0.05;
    shieldGroup.add(shieldBody, shieldRim, shieldBoss);
  }
  leftArm.add(shieldGroup);

  if (isBowRig) {
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.65, 8), leatherMat);
    quiver.position.set(0.18, 1.32, -0.32);
    quiver.rotation.z = -0.32;
    const fletchColor = isBanditArcher || isPirateArcher ? 0xff4c3b : isElf ? 0x52f2a8 : 0x5be38c;
    const fletch = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.18, 6),
      new THREE.MeshStandardMaterial({
        color: fletchColor,
        emissive: fletchColor,
        emissiveIntensity: 0.45,
      })
    );
    fletch.position.set(0.28, 1.66, -0.32);
    bodyGroup.add(quiver, fletch);
  }

  // Primary Weapon on Right Arm
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0, -0.52, 0.12);
  weaponGroup.rotation.x = Math.PI * 0.42;
  let bowParts: BowDrawParts | undefined;

  if (isBowRig) {
    const bowMesh = buildRecurveBowGroup({
      woodColor: isBanditArcher || isPirateArcher ? 0x7c2d12 : isElf ? 0x1e6b43 : 0x2d7a47,
      emissiveColor: isBanditArcher || isPirateArcher ? 0x3b0b08 : 0x0d3b1e,
      trimColor: 0xf0c75e,
      stringColor: 0xf5fff0,
      arrowGlowColor: isBanditArcher || isPirateArcher ? 0xff6b4a : 0x5ef59b,
      scale: 0.98,
    });
    bowParts = bowMesh.userData.bowParts;
    bowMesh.position.set(0, 0.22, 0.2);
    weaponGroup.rotation.x = 0.04;
    weaponGroup.add(bowMesh);
  } else if (isTridentRig) {
    const trident = buildPoseidonTridentGroup(1.0);
    weaponGroup.add(trident);
  } else if (isCannoneerRig) {
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x272a30, metalness: 0.82, roughness: 0.35 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 1.25, 10), barrelMat);
    barrel.position.set(0, 0.48, 0.12);
    const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 6, 12), trimMat);
    muzzleRing.rotation.x = Math.PI / 2;
    muzzleRing.position.set(0, 1.1, 0.12);
    weaponGroup.add(barrel, muzzleRing);
  } else if (options.weaponKind === 'bomb') {
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e2228, metalness: 0.72, roughness: 0.35 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), ironMat);
    orb.position.set(0, 0.2, 0.14);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 8), trimMat);
    cap.position.set(0, 0.44, 0.14);
    const sparkMat = new THREE.MeshStandardMaterial({
      color: 0xff9b26,
      emissive: 0xff5500,
      emissiveIntensity: 1.8,
    });
    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), sparkMat);
    spark.position.set(0, 0.56, 0.14);
    weaponGroup.rotation.x = 0.12;
    weaponGroup.add(orb, cap, spark);
  } else if (isStaffRig) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 2.35, 8), leatherMat);
    shaft.position.y = 0.85;
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xd8b4fe,
      emissive: 0x9333ea,
      emissiveIntensity: 1.4,
      roughness: 0.15,
      metalness: 0.3,
    });
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 1), gemMat);
    orb.position.y = 2.15;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 14), trimMat);
    halo.position.y = 2.15;
    weaponGroup.add(shaft, orb, halo);
  } else if (isDaggerRig) {
    const dagMat = new THREE.MeshStandardMaterial({
      color: 0x2dd4bf,
      emissive: 0x0f766e,
      emissiveIntensity: 0.85,
      metalness: 0.88,
      roughness: 0.16,
    });
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.24, 8), leatherMat);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.86, 0.03), dagMat);
    blade.position.y = 0.52;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 4), dagMat);
    tip.position.y = 1.06;
    weaponGroup.add(hilt, blade, tip);
  } else if (isHorrorReaper || isHorrorAbom) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.45, 8), leatherMat);
    shaft.position.y = 0.95;
    const scytheBlade = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 0.06), bladeMat);
    scytheBlade.position.set(0.45, 2.08, 0);
    scytheBlade.rotation.z = -0.32;
    weaponGroup.add(shaft, scytheBlade);
  } else if (isOrcBoss) {
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 2.25, 8), leatherMat);
    haft.position.y = 0.78;
    const cleaverMat = new THREE.MeshStandardMaterial({
      color: 0xb8402c,
      emissive: 0x6b1408,
      emissiveIntensity: 0.65,
      roughness: 0.28,
      metalness: 0.8,
    });
    const cleaverBlade = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.35, 0.09), cleaverMat);
    cleaverBlade.position.set(0.18, 1.55, 0);
    const spikeTop = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 4), steelMat);
    spikeTop.position.set(0.08, 2.32, 0);
    weaponGroup.add(haft, cleaverBlade, spikeTop);
  } else if (isVikingLeader) {
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 2.05, 8), leatherMat);
    haft.position.y = 0.7;
    const frostBladeMat = new THREE.MeshStandardMaterial({
      color: 0x99e8ff,
      emissive: 0x2687c7,
      emissiveIntensity: 0.9,
      roughness: 0.14,
      metalness: 0.88,
    });
    const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.07), frostBladeMat);
    bladeL.position.set(-0.28, 1.55, 0);
    const bladeR = bladeL.clone();
    bladeR.position.x = 0.28;
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.36, 0.22), trimMat);
    collar.position.y = 1.55;
    weaponGroup.add(haft, bladeL, bladeR, collar);
  } else if (et === 'viking') {
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 1.45, 8), leatherMat);
    haft.position.y = 0.48;
    const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.06), bladeMat);
    axeHead.position.set(0.18, 1.08, 0);
    weaponGroup.add(haft, axeHead);
  } else if (options.weaponKind === 'mace') {
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 1.38, 8), steelMat);
    haft.position.y = 0.44;
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.16, 8), trimMat);
    collar.position.y = 1.08;
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x5cd0ff,
      emissive: 0x1d7ed6,
      emissiveIntensity: 1.1,
      roughness: 0.14,
      metalness: 0.45,
    });
    const headCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), crystalMat);
    headCore.position.y = 1.32;
    const flange1 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.1), crystalMat);
    flange1.position.y = 1.32;
    const flange2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.56), crystalMat);
    flange2.position.y = 1.32;
    weaponGroup.add(haft, collar, headCore, flange1, flange2);
  } else if (options.weaponKind === 'spear' || et === 'lancer' || et === 'arena_gladiator' || isSeaGuardian) {
    if (isSeaGuardian) {
      weaponGroup.add(buildPoseidonTridentGroup(0.95));
    } else {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.044, 2.55, 8), trimMat);
      shaft.position.y = 0.95;
      const spearMat = new THREE.MeshStandardMaterial({
        color: 0xff6e4a,
        emissive: 0xd9261c,
        emissiveIntensity: 1.05,
        roughness: 0.14,
        metalness: 0.85,
      });
      const spearBlade = new THREE.Mesh(new THREE.ConeGeometry(0.125, 0.68, 4), spearMat);
      spearBlade.position.y = 2.48;
      const sunRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 8, 16), trimMat);
      sunRing.position.y = 2.08;
      weaponGroup.add(shaft, spearBlade, sunRing);
    }
  } else {
    const bladeLen = isPirateCaptain
      ? 1.75
      : 1.18 + Math.min(0.5, (options.swordTier - 1) * 0.06);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.32, 8), leatherMat);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 7), trimMat);
    pommel.position.y = -0.17;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.065, 0.095), trimMat);
    guard.position.y = 0.16;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, bladeLen, 0.032), bladeMat);
    blade.position.y = 0.16 + bladeLen * 0.5;
    const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.032, bladeLen * 0.78, 0.038), trimMat);
    fuller.position.y = 0.16 + bladeLen * 0.44;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.072, 0.24, 4), bladeMat);
    tip.rotation.y = Math.PI / 4;
    tip.position.y = 0.16 + bladeLen + 0.12;
    weaponGroup.add(hilt, pommel, guard, blade, fuller, tip);
  }
  rightArm.add(weaponGroup);

  let telegraphRing: THREE.Mesh | undefined;
  let stunRing: THREE.Group | undefined;
  if (options.isEnemy) {
    const ringRadius =
      isPirateCaptain || isHorrorAbom
        ? 6.8
        : isOrcBoss
        ? 6.0
        : isVikingLeader || isNavyCaptain
        ? 5.2
        : isBoss
        ? 4.4
        : 3.1;
    telegraphRing = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius * 0.72, ringRadius, 24),
      new THREE.MeshBasicMaterial({
        color: isHorror ? 0xd946ef : isBoss || isBandit || isPirate ? 0xff4433 : 0xff9b2f,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.0,
        depthWrite: false,
      })
    );
    telegraphRing.rotation.x = -Math.PI / 2;
    telegraphRing.position.y = 0.14;
    telegraphRing.visible = false;
    root.add(telegraphRing);

    stunRing = new THREE.Group();
    stunRing.position.y = 2.22 * scaleFactor;
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffe45c });
    const starGeo = new THREE.OctahedronGeometry(0.15, 0);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const star = new THREE.Mesh(starGeo, starMat);
      star.position.set(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55);
      stunRing.add(star);
    }
    stunRing.visible = false;
    root.add(stunRing);
  }

  let nameSprite: THREE.Sprite | undefined;
  let nameCanvas: HTMLCanvasElement | undefined;
  let nameTexture: THREE.CanvasTexture | undefined;

  if (options.displayName) {
    nameCanvas = document.createElement('canvas');
    nameCanvas.width = 360;
    nameCanvas.height = 96;
    nameTexture = new THREE.CanvasTexture(nameCanvas);
    nameTexture.colorSpace = THREE.SRGBColorSpace;

    const spriteMat = new THREE.SpriteMaterial({
      map: nameTexture,
      transparent: true,
      depthTest: false,
    });
    nameSprite = new THREE.Sprite(spriteMat);
    nameSprite.position.y = 2.68 * scaleFactor;
    nameSprite.scale.set(3.0, 0.82, 1);
    root.add(nameSprite);
  }

  const rig: WarriorRig = {
    root,
    bodyGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    cloak,
    weaponGroup,
    shieldGroup,
    shadowDisc,
    hitFlashMaterials,
    tunicMaterial: tunicMat,
    bladeMaterial: bladeMat,
    bowParts,
    telegraphRing,
    stunRing,
    nameSprite,
    nameCanvas,
    nameTexture,
  };

  if (options.displayName) {
    updateNameTagSprite(
      rig,
      options.displayName,
      options.level || 1,
      100,
      100,
      options.isEnemy ? 'RAKİP' : 'OYUNCU',
      options.isEnemy ? '#f0674a' : '#7ad689'
    );
  }

  return rig;
}

/**
 * Builds detailed drivable & NPC 3D Ocean Ships (Sloop, Galleon, Escalating Convoy Boat, Pirate War Galleon).
 */
export function buildShipModel(opts: {
  variant: 'sloop' | 'galleon' | 'convoy' | 'pirate_galleon';
  scale?: number;
  withHpBar?: boolean;
}): ShipModelRig {
  const root = new THREE.Group();
  const hullGroup = new THREE.Group();
  root.add(hullGroup);

  const s = opts.scale ?? 1.0;
  const isPirate = opts.variant === 'pirate_galleon';
  const isGalleon = opts.variant === 'galleon' || isPirate;
  const isConvoy = opts.variant === 'convoy';

  const hullColor = isPirate ? 0x261a18 : isGalleon ? 0x4f2c1a : isConvoy ? 0x6f4b2b : 0x7a4e2c;
  const deckColor = isPirate ? 0x453126 : 0x9b7048;
  const sailColor = isPirate ? 0x1e1818 : isGalleon ? 0xc9302c : isConvoy ? 0xe0f2fe : 0xf5efe0;
  const stripeColor = isPirate ? 0xdc2626 : isConvoy ? 0x0284c7 : 0xe5b84b;

  const hullMat = new THREE.MeshStandardMaterial({ color: hullColor, roughness: 0.78, metalness: 0.1 });
  const deckMat = new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.76 });
  const sailMat = new THREE.MeshStandardMaterial({
    color: sailColor,
    roughness: 0.62,
    side: THREE.DoubleSide,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.34, metalness: 0.52 });
  const cannonMat = new THREE.MeshStandardMaterial({ color: 0x23272e, metalness: 0.82, roughness: 0.32 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffe494,
    emissive: 0xffa630,
    emissiveIntensity: 1.5,
  });

  const baseW = isPirate ? 12.0 : isGalleon ? 7.6 : isConvoy ? 4.4 : 4.6;
  const baseL = isPirate ? 28.0 : isGalleon ? 19.5 : isConvoy ? 10.6 : 11.4;
  const baseH = isPirate ? 3.2 : isGalleon ? 2.5 : 1.5;

  const W = baseW * s;
  const L = baseL * s;
  const H = baseH * s;

  const mainHull = new THREE.Mesh(new THREE.BoxGeometry(W, H, L * 0.72), hullMat);
  mainHull.position.y = H * 0.35;
  mainHull.castShadow = true;
  mainHull.receiveShadow = true;
  hullGroup.add(mainHull);

  const bow = new THREE.Mesh(new THREE.ConeGeometry(W * 0.68, L * 0.3, 4), hullMat);
  bow.rotation.x = Math.PI / 2;
  bow.rotation.z = Math.PI / 4;
  bow.scale.set(1, 1, H / (W * 0.96));
  bow.position.set(0, H * 0.35, L * 0.36 + L * 0.14);
  hullGroup.add(bow);

  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.18 * s, L * 0.32, 7), hullMat);
  bowsprit.rotation.x = Math.PI * 0.42;
  bowsprit.position.set(0, H * 0.88, L * 0.56);
  hullGroup.add(bowsprit);

  const deckY = H * 0.88;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(W * 0.92, 0.22 * s, L * 0.74), deckMat);
  deck.position.y = deckY - 0.1 * s;
  deck.receiveShadow = true;
  hullGroup.add(deck);

  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28 * s, 0.65 * s, L * 0.72), trimMat);
    rail.position.set(side * (W * 0.48), deckY + 0.28 * s, 0);
    hullGroup.add(rail);
  }

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(W * 0.88, H * 0.52, L * 0.24), hullMat);
  cabin.position.set(0, deckY + H * 0.24, -L * 0.26);
  const sternLamp = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.65 * s, 0.5 * s), lanternMat);
  sternLamp.position.set(0, deckY + H * 0.65, -L * 0.38);
  hullGroup.add(cabin, sternLamp);

  const helm = new THREE.Mesh(new THREE.TorusGeometry(0.55 * s, 0.07 * s, 6, 12), trimMat);
  helm.position.set(0, deckY + 0.95 * s, -L * 0.12);
  hullGroup.add(helm);

  const sails: THREE.Mesh[] = [];
  const mastZList = isGalleon ? [-L * 0.14, L * 0.08, L * 0.28] : [L * 0.04];
  mastZList.forEach((mz, idx) => {
    const mastH =
      (isPirate ? 15.5 : isGalleon ? 10.4 : 8.2) *
      s *
      (idx === 1 || mastZList.length === 1 ? 1.0 : 0.82);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.25 * s, mastH, 8), hullMat);
    mast.position.set(0, deckY + mastH * 0.5, mz);
    hullGroup.add(mast);

    const sailW = W * (idx === 1 || mastZList.length === 1 ? 0.96 : 0.78);
    const sailH = mastH * 0.44;
    const sail = new THREE.Mesh(new THREE.BoxGeometry(sailW, sailH, 0.16 * s), sailMat);
    sail.position.set(0, deckY + mastH * 0.66, mz + 0.25 * s);
    sail.castShadow = true;
    hullGroup.add(sail);
    sails.push(sail);

    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, sailW * 1.1, 6), hullMat);
    yard.rotation.z = Math.PI / 2;
    yard.position.set(0, deckY + mastH * 0.88, mz + 0.16 * s);
    hullGroup.add(yard);

    if (idx === 0 || mastZList.length === 1) {
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4 * s, 1.1 * s), trimMat);
      flag.position.set(1.2 * s, deckY + mastH + 0.35 * s, mz);
      hullGroup.add(flag);
    }
  });

  // Bow & Broadside Cannons
  const cannonGeo = new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 1.45 * s, 8);
  const bowCannon = new THREE.Mesh(cannonGeo, cannonMat);
  bowCannon.rotation.x = Math.PI / 2;
  bowCannon.position.set(0, deckY + 0.38 * s, L * 0.38);
  hullGroup.add(bowCannon);

  if (isGalleon) {
    for (const side of [-1, 1]) {
      for (const cz of [-L * 0.12, L * 0.06, L * 0.22]) {
        const c = new THREE.Mesh(cannonGeo, cannonMat);
        c.rotation.z = Math.PI / 2;
        c.position.set(side * (W * 0.52), deckY + 0.26 * s, cz);
        hullGroup.add(c);
      }
    }
  }

  let hpSprite: THREE.Sprite | undefined;
  let hpCanvas: HTMLCanvasElement | undefined;
  let hpTexture: THREE.CanvasTexture | undefined;

  if (opts.withHpBar) {
    hpCanvas = document.createElement('canvas');
    hpCanvas.width = 420;
    hpCanvas.height = 100;
    hpTexture = new THREE.CanvasTexture(hpCanvas);
    hpTexture.colorSpace = THREE.SRGBColorSpace;
    hpSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: hpTexture,
        transparent: true,
        depthTest: false,
      })
    );
    hpSprite.position.y = deckY + (isPirate ? 18.5 : 11.2) * s;
    hpSprite.scale.set(isPirate ? 11.5 : 7.6 * s, isPirate ? 2.75 : 1.85 * s, 1);
    root.add(hpSprite);
  }

  return {
    root,
    hullGroup,
    sails,
    deckY,
    halfWidth: W * 0.52,
    halfLength: L * 0.52,
    hpSprite,
    hpCanvas,
    hpTexture,
  };
}

/**
 * Grounded articulated warhorse mount (400 Gold from Starter Town Stable).
 */
export function buildHorseRig(shadowTexture: THREE.Texture): HorseRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const coatMat = new THREE.MeshStandardMaterial({ color: 0x6e4226, roughness: 0.72, metalness: 0.05 });
  const darkManeMat = new THREE.MeshStandardMaterial({ color: 0x261710, roughness: 0.88 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0x452616, roughness: 0.75 });
  const blanketMat = new THREE.MeshStandardMaterial({ color: 0x9c2e28, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe6b94c, roughness: 0.28, metalness: 0.82 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });

  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.45, 18),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.03;
  root.add(shadowDisc);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.48, 1.85, 12), coatMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 1.24, 0);
  barrel.castShadow = true;
  bodyGroup.add(barrel);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), coatMat);
  chest.position.set(0, 1.28, 0.84);
  bodyGroup.add(chest);

  const croup = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), coatMat);
  croup.position.set(0, 1.25, -0.84);
  bodyGroup.add(croup);

  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.28, 0.96), blanketMat);
  blanket.position.set(0, 1.56, -0.02);
  bodyGroup.add(blanket);

  const saddleSeat = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.18, 0.72), saddleMat);
  saddleSeat.position.set(0, 1.72, -0.02);
  const pommel = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.16), saddleMat);
  pommel.position.set(0, 1.84, 0.32);
  const cantle = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.14), saddleMat);
  cantle.position.set(0, 1.84, -0.34);
  bodyGroup.add(saddleSeat, pommel, cantle);

  for (const side of [-1, 1]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 0.08), saddleMat);
    strap.position.set(side * 0.48, 1.38, 0.04);
    const stirrup = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 6, 10), goldMat);
    stirrup.position.set(side * 0.48, 1.08, 0.04);
    bodyGroup.add(strap, stirrup);
  }

  const neckHead = new THREE.Group();
  neckHead.position.set(0, 1.48, 0.92);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.96, 8), coatMat);
  neck.position.set(0, 0.38, 0.24);
  neck.rotation.x = 0.56;
  neckHead.add(neck);
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.88, 0.2), darkManeMat);
  mane.position.set(0, 0.48, 0.08);
  mane.rotation.x = 0.56;
  neckHead.add(mane);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.54), coatMat);
  skull.position.set(0, 0.78, 0.62);
  skull.rotation.x = 0.36;
  neckHead.add(skull);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.42), coatMat);
  muzzle.position.set(0, 0.64, 0.94);
  muzzle.rotation.x = 0.42;
  neckHead.add(muzzle);
  const bridle = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.07, 0.48), goldMat);
  bridle.position.set(0, 0.69, 0.85);
  bridle.rotation.x = 0.4;
  neckHead.add(bridle);
  const earGeo = new THREE.ConeGeometry(0.055, 0.2, 5);
  const earL = new THREE.Mesh(earGeo, coatMat);
  earL.position.set(-0.11, 1.0, 0.52);
  const earR = earL.clone();
  earR.position.x = 0.11;
  neckHead.add(earL, earR);
  bodyGroup.add(neckHead);

  const tailGeo = new THREE.ConeGeometry(0.14, 0.98, 7);
  tailGeo.translate(0, -0.49, 0);
  const tail = new THREE.Mesh(tailGeo, darkManeMat);
  tail.position.set(0, 1.38, -1.26);
  tail.rotation.x = -0.32;
  bodyGroup.add(tail);

  const buildHorseLeg = (x: number, z: number): THREE.Group => {
    const leg = new THREE.Group();
    leg.position.set(x, 1.06, z);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.56, 8), coatMat);
    upper.position.y = -0.28;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.44, 8), coatMat);
    lower.position.y = -0.74;
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.088, 0.12, 8), hoofMat);
    hoof.position.y = -1.0;
    leg.add(upper, lower, hoof);
    bodyGroup.add(leg);
    return leg;
  };

  const fl = buildHorseLeg(-0.3, 0.78);
  const fr = buildHorseLeg(0.3, 0.78);
  const bl = buildHorseLeg(-0.3, -0.78);
  const br = buildHorseLeg(0.3, -0.78);

  return {
    root,
    bodyGroup,
    neckHead,
    tail,
    legs: [fl, fr, bl, br],
    saddleY: 1.56,
  };
}
