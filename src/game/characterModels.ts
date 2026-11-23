import * as THREE from 'three';

export type EnemyArchetype = 'skirmisher' | 'lancer' | 'warden';

export interface WarriorRigOptions {
  tunicColor: string;
  swordTier: number;
  armorTier: number;
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
  telegraphRing?: THREE.Mesh;
  nameSprite?: THREE.Sprite;
  nameCanvas?: HTMLCanvasElement;
  nameTexture?: THREE.CanvasTexture;
  lastTagKey?: string;
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

  // Dark parchment/slate backing
  ctx.fillStyle = 'rgba(13, 19, 25, 0.84)';
  ctx.beginPath();
  ctx.roundRect(14, 10, canvas.width - 28, 74, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(235, 212, 162, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Level medallion
  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(24, 20, 44, 28, 6);
  ctx.fill();
  ctx.fillStyle = '#0e1318';
  ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Sv${level}`, 46, 40);

  // Name + badge
  ctx.fillStyle = '#f6f0e1';
  ctx.font = '700 20px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(name.slice(0, 16), 78, 41);

  if (badgeText) {
    ctx.fillStyle = badgeColor;
    ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(badgeText, canvas.width - 24, 39);
  }

  // Health bar track
  const barX = 24;
  const barY = 58;
  const barW = canvas.width - 48;
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

/**
 * Builds a grounded 10+ part composite warrior/NPC model (bottom-center pivot at y=0).
 * Distinct roughness/metalness contrast between matte cloth, leather, and brushed steel.
 */
export function buildWarriorRig(options: WarriorRigOptions): WarriorRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const isBoss = options.enemyType === 'warden';
  const scaleFactor = isBoss ? 1.38 : options.enemyType === 'lancer' ? 1.08 : 1.0;
  bodyGroup.scale.setScalar(scaleFactor);

  // Materials with clear roughness & metalness separation
  const tunicMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(options.tunicColor),
    roughness: 0.82,
    metalness: 0.05,
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: 0x453123,
    roughness: 0.78,
    metalness: 0.08,
  });

  const steelTint = options.armorTier >= 5 ? 0xd9c79c : isBoss ? 0x5d6570 : 0xaeb8c4;
  const steelMat = new THREE.MeshStandardMaterial({
    color: steelTint,
    roughness: 0.28,
    metalness: 0.76,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xdcb491,
    roughness: 0.65,
    metalness: 0.02,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: options.swordTier >= 4 ? 0xf0be54 : 0xc49547,
    roughness: 0.26,
    metalness: 0.82,
  });

  const bladeColor =
    options.swordTier >= 7 ? 0x79e2ff : options.swordTier >= 4 ? 0xf5d67b : 0xdce4ee;
  const bladeMat = new THREE.MeshStandardMaterial({
    color: bladeColor,
    roughness: 0.16,
    metalness: 0.9,
    emissive: options.swordTier >= 7 ? new THREE.Color(0x1f6d8c) : new THREE.Color(0x000000),
    emissiveIntensity: options.swordTier >= 7 ? 0.55 : 0,
  });

  const hitFlashMaterials = [tunicMat, steelMat, leatherMat];

  // Grounded contact shadow disc
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(0.95 * scaleFactor, 20),
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

  // Legs (articulated at hip y = 0.78)
  const buildLeg = (side: number) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.18, 0.78, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.46, 10), leatherMat);
    thigh.position.y = -0.23;
    thigh.castShadow = true;
    legGroup.add(thigh);

    const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.34, 10), steelMat);
    greave.position.y = -0.58;
    greave.castShadow = true;
    legGroup.add(greave);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.28), leatherMat);
    boot.position.set(0, -0.72, 0.05);
    boot.castShadow = true;
    legGroup.add(boot);

    return legGroup;
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // Torso: Tunic + Cuirass Plate + Belt & Buckle
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.78, 12), tunicMat);
  torso.position.y = 1.18;
  torso.castShadow = true;
  bodyGroup.add(torso);

  const cuirass = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.46, 12), steelMat);
  cuirass.position.y = 1.28;
  cuirass.castShadow = true;
  bodyGroup.add(cuirass);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.11, 12), leatherMat);
  belt.position.y = 0.88;
  bodyGroup.add(belt);

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.08), trimMat);
  buckle.position.set(0, 0.88, 0.26);
  bodyGroup.add(buckle);

  // Pauldrons (shoulder armor plates)
  const leftPauldron = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.65),
    steelMat
  );
  leftPauldron.position.set(-0.39, 1.48, 0);
  leftPauldron.rotation.z = 0.35;
  leftPauldron.castShadow = true;
  bodyGroup.add(leftPauldron);

  const rightPauldron = leftPauldron.clone();
  rightPauldron.position.x = 0.39;
  rightPauldron.rotation.z = -0.35;
  bodyGroup.add(rightPauldron);

  // Flowing back cloak (pivoted at shoulders)
  const cloakGeo = new THREE.BoxGeometry(0.56, 0.92, 0.045);
  cloakGeo.translate(0, -0.46, 0);
  const cloak = new THREE.Mesh(cloakGeo, tunicMat);
  cloak.position.set(0, 1.5, -0.27);
  cloak.rotation.x = 0.16;
  cloak.castShadow = true;
  bodyGroup.add(cloak);

  // Head + Crested Helm / Hood + Visor
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), skinMat);
  head.position.y = 1.76;
  head.castShadow = true;
  bodyGroup.add(head);

  const helmDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
    options.enemyType === 'skirmisher' ? tunicMat : steelMat
  );
  helmDome.position.y = 1.79;
  helmDome.castShadow = true;
  bodyGroup.add(helmDome);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.075, 0.14), trimMat);
  visor.position.set(0, 1.79, 0.18);
  bodyGroup.add(visor);

  if (isBoss) {
    // Twin alpine horns on Mountain Warden
    const hornGeo = new THREE.ConeGeometry(0.055, 0.32, 8);
    const leftHorn = new THREE.Mesh(hornGeo, trimMat);
    leftHorn.position.set(-0.22, 1.98, 0.04);
    leftHorn.rotation.z = 0.65;
    const rightHorn = new THREE.Mesh(hornGeo, trimMat);
    rightHorn.position.set(0.22, 1.98, 0.04);
    rightHorn.rotation.z = -0.65;
    bodyGroup.add(leftHorn, rightHorn);
  } else {
    // Crested highland plume
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.34), tunicMat);
    crest.position.set(0, 2.04, -0.02);
    bodyGroup.add(crest);
  }

  // Arms
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.4, 1.44, 0);
  const leftLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.56, 10), leatherMat);
  leftLimb.position.y = -0.26;
  leftLimb.castShadow = true;
  leftArm.add(leftLimb);
  bodyGroup.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.4, 1.44, 0);
  const rightLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.56, 10), leatherMat);
  rightLimb.position.y = -0.26;
  rightLimb.castShadow = true;
  rightArm.add(rightLimb);
  bodyGroup.add(rightArm);

  // Shield on Left Arm
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(-0.1, -0.36, 0.14);
  if (options.enemyType !== 'skirmisher') {
    const shieldBody = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.06, 6), steelMat);
    shieldBody.rotation.x = Math.PI / 2;
    shieldBody.castShadow = true;
    const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), trimMat);
    shieldBoss.position.z = 0.04;
    shieldGroup.add(shieldBody, shieldBoss);
  }
  leftArm.add(shieldGroup);

  // Weapon on Right Arm
  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0, -0.5, 0.12);
  weaponGroup.rotation.x = Math.PI * 0.42;

  if (options.enemyType === 'warden') {
    // Heavy Runic Warhammer
    const haft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.65, 8), leatherMat);
    haft.position.y = 0.5;
    const headBlock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.28), steelMat);
    headBlock.position.y = 1.25;
    const runeBand = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.3), trimMat);
    runeBand.position.y = 1.25;
    weaponGroup.add(haft, headBlock, runeBand);
  } else if (options.enemyType === 'lancer') {
    // Long Golden Steppe Lance
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 2.3, 8), leatherMat);
    shaft.position.y = 0.85;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.48, 6), bladeMat);
    tip.position.y = 2.15;
    const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.22, 0.36), tunicMat);
    pennant.position.set(0, 1.72, -0.18);
    weaponGroup.add(shaft, tip, pennant);
  } else {
    // Upgradable Highland Blade
    const bladeLen = 1.15 + Math.min(0.48, (options.swordTier - 1) * 0.06);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.3, 8), leatherMat);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.09), trimMat);
    guard.position.y = 0.16;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, bladeLen, 0.03),
      bladeMat
    );
    blade.position.y = 0.16 + bladeLen * 0.5;
    blade.castShadow = true;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.22, 4), bladeMat);
    tip.rotation.y = Math.PI / 4;
    tip.position.y = 0.16 + bladeLen + 0.11;
    weaponGroup.add(hilt, guard, blade, tip);
  }
  rightArm.add(weaponGroup);

  // Enemy ground attack telegraph ring
  let telegraphRing: THREE.Mesh | undefined;
  if (options.isEnemy) {
    const ringRadius = isBoss ? 4.4 : options.enemyType === 'lancer' ? 2.6 : 2.3;
    telegraphRing = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius * 0.72, ringRadius, 32),
      new THREE.MeshBasicMaterial({
        color: isBoss ? 0xff4433 : 0xff9b2f,
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
  }

  // Floating overhead Name + Level + HP sprite for NPCs and remote friends
  let nameSprite: THREE.Sprite | undefined;
  let nameCanvas: HTMLCanvasElement | undefined;
  let nameTexture: THREE.CanvasTexture | undefined;

  if (options.displayName) {
    nameCanvas = document.createElement('canvas');
    nameCanvas.width = 340;
    nameCanvas.height = 96;
    nameTexture = new THREE.CanvasTexture(nameCanvas);
    nameTexture.colorSpace = THREE.SRGBColorSpace;

    const spriteMat = new THREE.SpriteMaterial({
      map: nameTexture,
      transparent: true,
      depthTest: false,
    });
    nameSprite = new THREE.Sprite(spriteMat);
    nameSprite.position.y = 2.65 * scaleFactor;
    nameSprite.scale.set(2.8, 0.78, 1);
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
    telegraphRing,
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
