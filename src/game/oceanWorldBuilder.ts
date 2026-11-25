import * as THREE from 'three';
import {
  groundHeightAt,
  WATER_LEVEL,
  TOWN_TAVERN_POS,
  HARBOR_POS,
  HARBOR_SAILOR_POS,
  HARBOR_DECK_Y,
  PIRATE_ISLAND_POS,
  PIRATE_ISLAND_RADIUS,
  PIRATE_RELIC_POS,
  WIZARD_ISLAND_POS,
  WIZARD_ISLAND_RADIUS,
  WIZARD_RELIC_POS,
  FLOATING_TOWN_POS,
  FLOATING_TOWN_DECK_Y,
  WHIRLPOOL_POS,
  WHIRLPOOL_RADIUS,
  UNDERWATER_CITY_POS,
  UNDERWATER_CITY_RADIUS,
  UNDERWATER_RELIC_POS,
  UNDERWATER_EXIT_POS,
  HORROR_FOREST_POS,
  HORROR_FOREST_RADIUS,
  HORROR_RELIC_POS,
  NORTH_POLE_POS,
  NORTH_POLE_RADIUS,
  NORTH_POLE_DOCK_POS,
  YETI_BOSS_POS,
} from './worldMath';
import {
  buildShipModel,
  buildPoseidonTridentGroup,
  ShipModelRig,
} from './characterModels';

export interface OceanArchipelagoHandles {
  whirlpoolGroup: THREE.Group;
  pirateRelic: THREE.Group;
  wizardRelic: THREE.Group;
  horrorRelic: THREE.Group;
  underwaterRelic: THREE.Group;
  underwaterExitPortal: THREE.Group;
  harborDisplayShips: ShipModelRig[];
  underwaterBubbles: THREE.Mesh[];
  lighthouseBeacon: THREE.Mesh;
  northPoleAurora: THREE.Group;
}

export interface OceanSharedMaterials {
  stoneMat: THREE.MeshStandardMaterial;
  darkStoneMat: THREE.MeshStandardMaterial;
  timberMat: THREE.MeshStandardMaterial;
  plasterMat: THREE.MeshStandardMaterial;
  roofMat: THREE.MeshStandardMaterial;
  bronzeMat: THREE.MeshStandardMaterial;
  windowGlowMat: THREE.MeshStandardMaterial;
  ironMat: THREE.MeshStandardMaterial;
  terrainMap: THREE.Texture;
  terrainBump: THREE.Texture;
  glacialMap: THREE.Texture;
  glacialBump: THREE.Texture;
  atlantisMarbleMap: THREE.Texture;
  atlantisMarbleBump: THREE.Texture;
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildIslandTerrainMesh(
  cx: number,
  cz: number,
  size: number,
  segments: number,
  colorMap: THREE.Texture,
  bumpMap: THREE.Texture,
  roughness: number,
  bumpScale: number,
  colorFn: (x: number, z: number, y: number, dist: number, slope: number) => string,
  scene: THREE.Scene,
  disposables: { dispose: () => void }[]
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const cols = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);
    const wx = cx + lx;
    const wz = cz + lz;
    const y = groundHeightAt(wx, wz);
    pos.setY(i, y);

    const hL = groundHeightAt(wx - 2.0, wz);
    const hR = groundHeightAt(wx + 2.0, wz);
    const hD = groundHeightAt(wx, wz - 2.0);
    const hU = groundHeightAt(wx, wz + 2.0);
    const slope = Math.hypot((hR - hL) / 4.0, (hU - hD) / 4.0);

    const dist = Math.hypot(lx, lz);
    c.set(colorFn(wx, wz, y, dist, slope));
    cols[i * 3] = c.r;
    cols[i * 3 + 1] = c.g;
    cols[i * 3 + 2] = c.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: colorMap,
    bumpMap,
    bumpScale,
    roughness,
    metalness: 0.04,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(cx, 0, cz);
  mesh.receiveShadow = true;
  scene.add(mesh);
  disposables.push(geo, mat);
  return mesh;
}

function buildNpcFigure(
  tunicColor: number,
  hatColor: number,
  accentColor: number
): THREE.Group {
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xefc39b, roughness: 0.72 });
  const tunicMat = new THREE.MeshStandardMaterial({ color: tunicColor, roughness: 0.72 });
  const hatMat = new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.62 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.9,
  });

  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.72, 8), hatMat);
  legs.position.y = 0.36;
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.8, 0.4), tunicMat);
  torso.position.y = 1.1;
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.44), hatMat);
  belt.position.y = 0.78;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skinMat);
  head.position.y = 1.74;
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.28, 10), hatMat);
  hat.position.y = 2.02;
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), accentMat);
  beacon.position.y = 2.7;

  g.add(legs, torso, belt, head, hat, beacon);
  return g;
}

export function buildOceanArchipelago(
  scene: THREE.Scene,
  mats: OceanSharedMaterials,
  collidables: { x: number; z: number; radius: number }[],
  disposables: { dispose: () => void }[]
): OceanArchipelagoHandles {
  const rand = seededRand(20261125);
  const dummy = new THREE.Object3D();

  // ============================================================================
  // 1. KASABA YEMEKHANESİ (TOWN DINING HALL — 10 BUFF FOODS) AT (18, 12)
  // ============================================================================
  const tavernY = groundHeightAt(TOWN_TAVERN_POS.x, TOWN_TAVERN_POS.z);
  const tavernGroup = new THREE.Group();
  tavernGroup.position.set(TOWN_TAVERN_POS.x, tavernY, TOWN_TAVERN_POS.z);
  tavernGroup.rotation.y = -Math.PI * 0.75;

  const tavernFloor = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.36, 7.0), mats.stoneMat);
  tavernFloor.position.y = 0.18;
  tavernFloor.receiveShadow = true;

  const tavernWalls = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.8, 5.8), mats.plasterMat);
  tavernWalls.position.y = 2.12;
  tavernWalls.castShadow = true;
  tavernWalls.receiveShadow = true;

  // Timber frame corner beams on the Dining Hall
  for (const bx of [-3.8, 3.8]) {
    for (const bz of [-2.9, 2.9]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.9, 0.32), mats.timberMat);
      post.position.set(bx, 2.12, bz);
      tavernGroup.add(post);
    }
  }

  const tavernRoof = new THREE.Mesh(new THREE.ConeGeometry(6.6, 3.2, 4), mats.roofMat);
  tavernRoof.rotation.y = Math.PI / 4;
  tavernRoof.scale.set(1.22, 1.0, 0.96);
  tavernRoof.position.y = 5.55;
  tavernRoof.castShadow = true;

  const tavernChimney = new THREE.Mesh(new THREE.BoxGeometry(1.15, 3.8, 1.15), mats.darkStoneMat);
  tavernChimney.position.set(-2.3, 5.4, -1.3);

  const warmAwningMat = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.76,
    side: THREE.DoubleSide,
  });
  const feastMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.95,
  });
  disposables.push(warmAwningMat, feastMat);

  const tavernAwning = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.16, 2.4), warmAwningMat);
  tavernAwning.position.set(0, 3.25, 3.75);
  tavernAwning.rotation.x = 0.24;

  for (const wx of [-2.2, 2.2]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.18, 0.2), mats.windowGlowMat);
    win.position.set(wx, 2.25, 2.96);
    tavernGroup.add(win);
  }
  const tavernDoor = new THREE.Mesh(new THREE.BoxGeometry(1.55, 2.45, 0.24), mats.timberMat);
  tavernDoor.position.set(0, 1.48, 2.96);

  // Outdoor Banquet Table + Glowing Soup Cauldron + Chef NPC
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.92, 1.25), mats.timberMat);
  table.position.set(1.65, 0.64, 4.0);
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.38, 0.24, 10), feastMat);
  platter.position.set(1.65, 1.22, 4.0);

  const chefNpc = buildNpcFigure(0xfef3c7, 0xffffff, 0xf59e0b);
  chefNpc.position.set(-1.45, 0.34, 3.85);

  tavernGroup.add(
    tavernFloor,
    tavernWalls,
    tavernRoof,
    tavernChimney,
    tavernAwning,
    tavernDoor,
    table,
    platter,
    chefNpc
  );
  scene.add(tavernGroup);
  collidables.push({ x: TOWN_TAVERN_POS.x + 1.0, z: TOWN_TAVERN_POS.z + 1.0, radius: 3.4 });

  // ============================================================================
  // 2. ANA ADA LİMANI (SOUTH COAST HARBOR + DENİZCİ + 2 MOORED SHIPS) AT (0, 214)
  // ============================================================================
  const harborGroup = new THREE.Group();
  const quayY = HARBOR_DECK_Y;

  const quay = new THREE.Mesh(new THREE.BoxGeometry(46, 3.6, 25), mats.stoneMat);
  quay.position.set(HARBOR_POS.x, quayY - 1.8, HARBOR_POS.z);
  quay.receiveShadow = true;
  quay.castShadow = true;
  harborGroup.add(quay);

  const approachRamp = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.5, 14), mats.timberMat);
  approachRamp.position.set(HARBOR_POS.x, quayY - 0.1, HARBOR_POS.z - 16);
  approachRamp.rotation.x = 0.08;
  approachRamp.receiveShadow = true;
  harborGroup.add(approachRamp);

  for (const px of [-14.5, 14.5]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.44, 26), mats.timberMat);
    pier.position.set(HARBOR_POS.x + px, quayY - 0.16, HARBOR_POS.z + 23);
    pier.receiveShadow = true;
    pier.castShadow = true;
    harborGroup.add(pier);

    for (let j = 0; j < 4; j++) {
      const pz = HARBOR_POS.z + 13 + j * 6.8;
      for (const sx of [-2.5, 2.5]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 5.4, 8), mats.timberMat);
        pile.position.set(HARBOR_POS.x + px + sx, quayY - 2.35, pz);
        harborGroup.add(pile);
      }
      if (j === 3) {
        const lampPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.9, 6), mats.ironMat);
        lampPost.position.set(HARBOR_POS.x + px, quayY + 1.45, pz);
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 0.48), mats.windowGlowMat);
        lamp.position.set(HARBOR_POS.x + px, quayY + 3.0, pz);
        harborGroup.add(lampPost, lamp);
      }
    }
  }

  // Coastal Stone Lighthouse
  const lhGroup = new THREE.Group();
  lhGroup.position.set(HARBOR_POS.x - 19.5, quayY, HARBOR_POS.z - 4);
  const lhBase = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.6, 15, 12), mats.plasterMat);
  lhBase.position.y = 7.5;
  lhBase.castShadow = true;
  const lhStripeMat = new THREE.MeshStandardMaterial({ color: 0xc9302c, roughness: 0.7 });
  const lhStripe = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.1, 3.4, 12), lhStripeMat);
  lhStripe.position.y = 8.6;
  const lhCap = new THREE.Mesh(new THREE.ConeGeometry(3.3, 2.8, 12), mats.roofMat);
  lhCap.position.y = 18.6;
  const lighthouseBeacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.18, 1),
    new THREE.MeshStandardMaterial({
      color: 0xfff3b0,
      emissive: 0xffb703,
      emissiveIntensity: 2.3,
    })
  );
  lighthouseBeacon.position.y = 16.2;
  lhGroup.add(lhBase, lhStripe, lhCap, lighthouseBeacon);
  harborGroup.add(lhGroup);
  disposables.push(lhStripeMat);
  collidables.push({ x: HARBOR_POS.x - 19.5, z: HARBOR_POS.z - 4, radius: 3.5 });

  // Boathouse & Sailor NPC
  const boatHouse = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.5, 5.4), mats.timberMat);
  boatHouse.position.set(HARBOR_POS.x + 16.5, quayY + 1.75, HARBOR_POS.z - 5);
  boatHouse.castShadow = true;
  const boatRoof = new THREE.Mesh(new THREE.ConeGeometry(5.4, 2.5, 4), mats.roofMat);
  boatRoof.rotation.y = Math.PI / 4;
  boatRoof.position.set(HARBOR_POS.x + 16.5, quayY + 4.75, HARBOR_POS.z - 5);
  harborGroup.add(boatHouse, boatRoof);
  collidables.push({ x: HARBOR_POS.x + 16.5, z: HARBOR_POS.z - 5, radius: 3.5 });

  const sailorNpc = buildNpcFigure(0x1d4ed8, 0x0f172a, 0x38bdf8);
  sailorNpc.position.set(HARBOR_SAILOR_POS.x, quayY, HARBOR_SAILOR_POS.z);
  harborGroup.add(sailorNpc);

  const sloopDisplay = buildShipModel({ variant: 'sloop', scale: 1.0 });
  sloopDisplay.root.position.set(HARBOR_POS.x - 7.8, WATER_LEVEL, HARBOR_POS.z + 25.5);
  sloopDisplay.root.rotation.y = 0.08;
  harborGroup.add(sloopDisplay.root);

  const galleonDisplay = buildShipModel({ variant: 'galleon', scale: 1.0 });
  galleonDisplay.root.position.set(HARBOR_POS.x + 25.2, WATER_LEVEL, HARBOR_POS.z + 26.5);
  galleonDisplay.root.rotation.y = -0.1;
  harborGroup.add(galleonDisplay.root);

  scene.add(harborGroup);

  // ============================================================================
  // 3. ISLAND 1 — GENİŞ KORSAN ADASI (EXPANDED PIRATE ISLAND) AT (640, 460)
  // ============================================================================
  buildIslandTerrainMesh(
    PIRATE_ISLAND_POS.x,
    PIRATE_ISLAND_POS.z,
    390,
    68,
    mats.terrainMap,
    mats.terrainBump,
    0.88,
    0.26,
    (wx, wz, y, dist, slope) => {
      if (y < WATER_LEVEL + 2.0) return '#e5c57f';
      if (slope > 0.48 || y > 13.0) return '#433834';
      const v = Math.sin(wx * 0.07) * Math.cos(wz * 0.07);
      return dist > PIRATE_ISLAND_RADIUS * 0.68 ? '#d1af62' : v > 0 ? '#3e7f38' : '#2a642f';
    },
    scene,
    disposables
  );

  // 78 Lush Tropical Palm Trees across the larger Pirate Island
  const palmPositions: { x: number; y: number; z: number; rot: number; s: number }[] = [];
  for (let i = 0; i < 320 && palmPositions.length < 78; i++) {
    const a = rand() * Math.PI * 2;
    const r = 18 + rand() * (PIRATE_ISLAND_RADIUS - 30);
    const x = PIRATE_ISLAND_POS.x + Math.cos(a) * r;
    const z = PIRATE_ISLAND_POS.z + Math.sin(a) * r;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 1.4 || y > 13.5) continue;
    if (Math.hypot(x - PIRATE_RELIC_POS.x, z - PIRATE_RELIC_POS.z) < 16) continue;
    palmPositions.push({ x, y, z, rot: rand() * Math.PI * 2, s: 0.95 + rand() * 0.55 });
  }
  const palmTrunkGeo = new THREE.CylinderGeometry(0.18, 0.36, 8.2, 7);
  palmTrunkGeo.translate(0, 4.1, 0);
  const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x7c5436, roughness: 0.9 });
  const palmCrownGeo = new THREE.ConeGeometry(3.1, 2.3, 7);
  palmCrownGeo.translate(0, 8.4, 0);
  const palmCrownMat = new THREE.MeshStandardMaterial({ color: 0x2d8d45, roughness: 0.78 });
  const palmTrunkInst = new THREE.InstancedMesh(palmTrunkGeo, palmTrunkMat, palmPositions.length);
  const palmCrownInst = new THREE.InstancedMesh(palmCrownGeo, palmCrownMat, palmPositions.length);
  palmPositions.forEach((p, idx) => {
    dummy.position.set(p.x, p.y - 0.15, p.z);
    dummy.rotation.set(0.14, p.rot, 0.08);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    palmTrunkInst.setMatrixAt(idx, dummy.matrix);
    palmCrownInst.setMatrixAt(idx, dummy.matrix);
  });
  scene.add(palmTrunkInst, palmCrownInst);
  disposables.push(palmTrunkGeo, palmTrunkMat, palmCrownGeo, palmCrownMat);

  // Grand Pirate Bastion Fort & Bombacı Relic
  const pirateFortY = groundHeightAt(PIRATE_RELIC_POS.x, PIRATE_RELIC_POS.z);
  const pirateFort = new THREE.Group();
  pirateFort.position.set(PIRATE_RELIC_POS.x, pirateFortY, PIRATE_RELIC_POS.z);

  const fortBase = new THREE.Mesh(new THREE.CylinderGeometry(9.2, 10.4, 1.35, 12), mats.stoneMat);
  fortBase.position.y = 0.65;
  const fortDeck = new THREE.Mesh(new THREE.CylinderGeometry(8.8, 9.0, 0.25, 12), mats.timberMat);
  fortDeck.position.y = 1.42;
  pirateFort.add(fortBase, fortDeck);

  // Corner palisade watch posts & cannons around Pirate Fort
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 3.6, 8), mats.timberMat);
    post.position.set(Math.cos(a) * 8.4, 2.6, Math.sin(a) * 8.4);
    pirateFort.add(post);
  }

  const skullMast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 14.5, 8), mats.timberMat);
  skullMast.position.set(-5.8, 7.2, -5.8);
  const pirateFlagMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const pirateFlag = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 2.6), pirateFlagMat);
  pirateFlag.position.set(-3.2, 12.8, -5.8);
  const flagSkull = new THREE.Mesh(
    new THREE.SphereGeometry(0.64, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc })
  );
  flagSkull.position.set(-3.2, 12.8, -5.74);
  pirateFort.add(skullMast, pirateFlag, flagSkull);

  const pirateRelic = new THREE.Group();
  pirateRelic.position.set(0, 3.1, 0);
  const bombBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.8, 16, 14),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, metalness: 0.82, roughness: 0.26 })
  );
  const bombRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.28, 0.09, 8, 24),
    new THREE.MeshStandardMaterial({
      color: 0xff8c26,
      emissive: 0xea580c,
      emissiveIntensity: 1.55,
    })
  );
  bombRing.rotation.x = Math.PI / 2;
  const bombSpark = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.36, 0),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf97316,
      emissiveIntensity: 2.1,
    })
  );
  bombSpark.position.y = 1.05;
  pirateRelic.add(bombBody, bombRing, bombSpark);
  pirateFort.add(pirateRelic);
  scene.add(pirateFort);
  disposables.push(pirateFlagMat);

  // ============================================================================
  // 4. ISLAND 2 — GENİŞ BÜYÜCÜ ADASI (EXPANDED WIZARD ISLAND) AT (-650, 470)
  // ============================================================================
  buildIslandTerrainMesh(
    WIZARD_ISLAND_POS.x,
    WIZARD_ISLAND_POS.z,
    390,
    68,
    mats.terrainMap,
    mats.terrainBump,
    0.84,
    0.25,
    (wx, wz, y, _dist, slope) => {
      if (y < WATER_LEVEL + 2.0) return '#c8cbe4';
      if (slope > 0.45 || y > 11.5) return '#6b21a8';
      const v = Math.sin(wx * 0.07 + wz * 0.07);
      return v > 0 ? '#4c1d95' : '#312e81';
    },
    scene,
    disposables
  );

  // 64 Glowing Amethyst Crystal Spires across expanded Wizard Island
  const crystalGeo = new THREE.OctahedronGeometry(1.3, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 1.2,
    roughness: 0.14,
    metalness: 0.38,
  });
  const crystalInst = new THREE.InstancedMesh(crystalGeo, crystalMat, 64);
  let placedCrystals = 0;
  for (let i = 0; i < 240 && placedCrystals < 64; i++) {
    const a = rand() * Math.PI * 2;
    const r = 16 + rand() * (WIZARD_ISLAND_RADIUS - 26);
    const x = WIZARD_ISLAND_POS.x + Math.cos(a) * r;
    const z = WIZARD_ISLAND_POS.z + Math.sin(a) * r;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 1.2) continue;
    const s = 1.05 + rand() * 2.4;
    dummy.position.set(x, y + s * 1.15, z);
    dummy.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.3);
    dummy.scale.set(s * 0.65, s * 2.2, s * 0.65);
    dummy.updateMatrix();
    crystalInst.setMatrixAt(placedCrystals++, dummy.matrix);
  }
  crystalInst.count = placedCrystals;
  scene.add(crystalInst);
  disposables.push(crystalGeo, crystalMat);

  // Arcane Citadel Spire & Staff Relic
  const wizY = groundHeightAt(WIZARD_RELIC_POS.x, WIZARD_RELIC_POS.z);
  const wizGroup = new THREE.Group();
  wizGroup.position.set(WIZARD_RELIC_POS.x, wizY, WIZARD_RELIC_POS.z);

  const wizTower = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.8, 22, 10), mats.darkStoneMat);
  wizTower.position.set(0, 11, -13);
  wizTower.castShadow = true;
  const wizRoofMat = new THREE.MeshStandardMaterial({ color: 0x3b0764, roughness: 0.42, metalness: 0.35 });
  const wizRoof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 8.4, 10), wizRoofMat);
  wizRoof.position.set(0, 26, -13);
  const wizRing = new THREE.Mesh(new THREE.TorusGeometry(6.6, 0.25, 8, 30), crystalMat);
  wizRing.rotation.x = Math.PI / 2;
  wizRing.position.set(0, 17, -13);
  wizGroup.add(wizTower, wizRoof, wizRing);
  disposables.push(wizRoofMat);
  collidables.push({ x: WIZARD_RELIC_POS.x, z: WIZARD_RELIC_POS.z - 13, radius: 5.0 });

  const wizDais = new THREE.Mesh(new THREE.CylinderGeometry(5.8, 6.6, 0.9, 14), mats.darkStoneMat);
  wizDais.position.y = 0.45;
  wizGroup.add(wizDais);

  const wizardRelic = new THREE.Group();
  wizardRelic.position.set(0, 2.9, 0);
  const staffPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 3.5, 8), mats.bronzeMat);
  const staffOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 1), crystalMat);
  staffOrb.position.y = 1.9;
  const staffHalo = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.09, 8, 24), crystalMat);
  staffHalo.rotation.x = Math.PI / 2;
  wizardRelic.add(staffPole, staffOrb, staffHalo);
  wizGroup.add(wizardRelic);
  scene.add(wizGroup);

  // ============================================================================
  // 5. ISLAND 3 — GENİŞ YÜZEN KASABA (EXPANDED FLOATING STILT TOWN) AT (0, 620)
  // ============================================================================
  const ftGroup = new THREE.Group();
  ftGroup.position.set(FLOATING_TOWN_POS.x, FLOATING_TOWN_DECK_Y, FLOATING_TOWN_POS.z);

  const tealRoofMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.56 });
  const coralRoofMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.58 });
  disposables.push(tealRoofMat, coralRoofMat);

  // Expanded 86m x 86m Floating Timber Boardwalk & Grand North Trade Pier
  const ftMainDeck = new THREE.Mesh(new THREE.BoxGeometry(86, 0.72, 86), mats.timberMat);
  ftMainDeck.position.y = -0.36;
  ftMainDeck.receiveShadow = true;
  ftGroup.add(ftMainDeck);

  const ftNorthPier = new THREE.Mesh(new THREE.BoxGeometry(16, 0.58, 46), mats.timberMat);
  ftNorthPier.position.set(0, -0.3, -64);
  ftNorthPier.receiveShadow = true;
  ftGroup.add(ftNorthPier);

  for (let gx = -36; gx <= 36; gx += 12) {
    for (let gz = -36; gz <= 36; gz += 12) {
      const stilt = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 8.6, 7), mats.timberMat);
      stilt.position.set(gx, -4.4, gz);
      ftGroup.add(stilt);
    }
  }

  // 10 Stilt Cottages around the Floating Town Grand Harbor Square
  const ftHouses: [number, number, number][] = [
    [-29, -26, 0.45],
    [29, -26, -0.45],
    [-32, -8, Math.PI * 0.5],
    [32, -8, -Math.PI * 0.5],
    [-32, 12, Math.PI * 0.5],
    [32, 12, -Math.PI * 0.5],
    [-26, 29, Math.PI * 0.85],
    [26, 29, -Math.PI * 0.85],
    [-9, 32, Math.PI],
    [9, 32, Math.PI],
  ];
  ftHouses.forEach(([hx, hz, hrot], idx) => {
    const h = new THREE.Group();
    h.position.set(hx, 0, hz);
    h.rotation.y = hrot;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.8, 5.8), mats.plasterMat);
    walls.position.y = 1.9;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5.8, 3.0, 4),
      idx % 2 === 0 ? tealRoofMat : coralRoofMat
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 5.1;
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.15, 0.2), mats.windowGlowMat);
    win.position.set(0, 2.1, 2.96);
    h.add(walls, roof, win);
    ftGroup.add(h);
    collidables.push({
      x: FLOATING_TOWN_POS.x + hx,
      z: FLOATING_TOWN_POS.z + hz,
      radius: 4.0,
    });
  });

  const ftBeacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.25, 0),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.65,
    })
  );
  ftBeacon.position.set(0, 6.2, 0);
  const ftPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 5.0, 10), mats.stoneMat);
  ftPillar.position.set(0, 2.5, 0);
  ftGroup.add(ftPillar, ftBeacon);
  scene.add(ftGroup);

  // ============================================================================
  // 6. ISLAND 4 — DEV GİRDAP (-640, -340) -> SUALTI ŞEHRİ ATLANTİS (-960, -760)
  //    NOW HOUSES POSEIDON'UN MIZRAĞI (POSEIDON'S TRIDENT) FOR BALIKADAM!
  // ============================================================================
  const whirlpoolGroup = new THREE.Group();
  whirlpoolGroup.position.set(WHIRLPOOL_POS.x, WATER_LEVEL + 0.14, WHIRLPOOL_POS.z);

  const vortexCoreMat = new THREE.MeshBasicMaterial({
    color: 0x03182b,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
  });
  const vortexCore = new THREE.Mesh(new THREE.CircleGeometry(16, 36), vortexCoreMat);
  vortexCore.rotation.x = -Math.PI / 2;
  vortexCore.position.y = 0.08;
  whirlpoolGroup.add(vortexCore);

  const ringRadii = [17, 26, 36, WHIRLPOOL_RADIUS];
  ringRadii.forEach((rad, idx) => {
    const ringMat = new THREE.MeshStandardMaterial({
      color: idx % 2 === 0 ? 0x38bdf8 : 0xe0f2fe,
      emissive: 0x0284c7,
      emissiveIntensity: 1.2 - idx * 0.16,
      transparent: true,
      opacity: 0.86 - idx * 0.09,
      roughness: 0.18,
    });
    const torus = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.78 - idx * 0.08, 8, 44), ringMat);
    torus.rotation.x = Math.PI / 2;
    torus.position.y = 0.14 + idx * 0.08;
    whirlpoolGroup.add(torus);
    disposables.push(ringMat);
  });

  const finMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.68,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const fin = new THREE.Mesh(new THREE.PlaneGeometry(28, 2.5), finMat);
    fin.rotation.x = -Math.PI / 2;
    fin.rotation.z = a + 0.6;
    fin.position.set(Math.cos(a) * 26, 0.32, Math.sin(a) * 26);
    whirlpoolGroup.add(fin);
  }
  scene.add(whirlpoolGroup);
  disposables.push(vortexCoreMat, finMat);

  // --- EXPANDED SUALTI ŞEHRİ ATLANTİS AT (-960, -760) ---
  buildIslandTerrainMesh(
    UNDERWATER_CITY_POS.x,
    UNDERWATER_CITY_POS.z,
    340,
    60,
    mats.atlantisMarbleMap,
    mats.atlantisMarbleBump,
    0.58,
    0.16,
    (wx, wz, y) => {
      if (y < WATER_LEVEL + 0.6) return '#0a3a52';
      const v = Math.sin(wx * 0.09) * Math.cos(wz * 0.09);
      return v > 0 ? '#1f7b8c' : '#145b6e';
    },
    scene,
    disposables
  );

  const uwY = groundHeightAt(UNDERWATER_CITY_POS.x, UNDERWATER_CITY_POS.z);
  const uwGroup = new THREE.Group();
  uwGroup.position.set(UNDERWATER_CITY_POS.x, uwY, UNDERWATER_CITY_POS.z);

  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0e7490,
    emissiveIntensity: 0.48,
    transparent: true,
    opacity: 0.2,
    roughness: 0.08,
    metalness: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const uwDome = new THREE.Mesh(
    new THREE.SphereGeometry(UNDERWATER_CITY_RADIUS, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52),
    domeMat
  );
  uwDome.position.y = -2;
  uwGroup.add(uwDome);
  disposables.push(domeMat);

  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xe8f9fb,
    map: mats.atlantisMarbleMap,
    bumpMap: mats.atlantisMarbleBump,
    bumpScale: 0.14,
    roughness: 0.3,
    metalness: 0.14,
  });
  const coralGlowMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.55,
    roughness: 0.18,
  });
  const pinkCoralMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xdb2777,
    emissiveIntensity: 1.15,
    roughness: 0.28,
  });
  disposables.push(marbleMat, coralGlowMat, pinkCoralMat);

  // 16 Grand Atlantis Fluted Marble Colonnade Pillars
  for (let i = 0; i < 16; i++) {
    const a = ((i + 0.5) / 16) * Math.PI * 2;
    const px = Math.cos(a) * 48;
    const pz = Math.sin(a) * 48;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.55, 16, 12), marbleMat);
    col.position.set(px, 8, pz);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 3.2), marbleMat);
    cap.position.set(px, 16.2, pz);
    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.95, 0),
      i % 2 === 0 ? coralGlowMat : pinkCoralMat
    );
    orb.position.set(px, 17.8, pz);
    uwGroup.add(col, cap, orb);
    collidables.push({
      x: UNDERWATER_CITY_POS.x + px,
      z: UNDERWATER_CITY_POS.z + pz,
      radius: 1.7,
    });
  }

  // Rising Underwater Bubbles
  const underwaterBubbles: THREE.Mesh[] = [];
  const bubbleGeo = new THREE.SphereGeometry(0.6, 8, 8);
  const bubbleMat = new THREE.MeshBasicMaterial({
    color: 0xa5f3fc,
    transparent: true,
    opacity: 0.55,
  });
  for (let i = 0; i < 32; i++) {
    const a = rand() * Math.PI * 2;
    const r = 10 + rand() * 76;
    const b = new THREE.Mesh(bubbleGeo, bubbleMat);
    b.position.set(Math.cos(a) * r, 2 + rand() * 32, Math.sin(a) * r);
    b.scale.setScalar(0.5 + rand() * 1.25);
    uwGroup.add(b);
    underwaterBubbles.push(b);
  }
  disposables.push(bubbleGeo, bubbleMat);

  // POSEIDON'UN MIZRAĞI (POSEIDON'S TRIDENT RELIC) AT UNDERWATER_RELIC_POS
  const tridentPedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.0, 1.3, 12), marbleMat);
  tridentPedestal.position.set(
    UNDERWATER_RELIC_POS.x - UNDERWATER_CITY_POS.x,
    0.65,
    UNDERWATER_RELIC_POS.z - UNDERWATER_CITY_POS.z
  );
  uwGroup.add(tridentPedestal);

  const underwaterRelic = new THREE.Group();
  underwaterRelic.position.set(
    UNDERWATER_RELIC_POS.x - UNDERWATER_CITY_POS.x,
    2.6,
    UNDERWATER_RELIC_POS.z - UNDERWATER_CITY_POS.z
  );
  const tridentRelicModel = buildPoseidonTridentGroup(1.55);
  tridentRelicModel.position.y = -0.35;
  const tridentHalo = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.1, 8, 28), coralGlowMat);
  tridentHalo.rotation.x = Math.PI / 2;
  tridentHalo.position.y = 0.6;
  underwaterRelic.add(tridentRelicModel, tridentHalo);
  uwGroup.add(underwaterRelic);

  // Glowing Surface Exit Portal
  const underwaterExitPortal = new THREE.Group();
  underwaterExitPortal.position.set(
    UNDERWATER_EXIT_POS.x - UNDERWATER_CITY_POS.x,
    2.8,
    UNDERWATER_EXIT_POS.z - UNDERWATER_CITY_POS.z
  );
  const exitRing = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.26, 10, 30), coralGlowMat);
  const exitCore = new THREE.Mesh(
    new THREE.CircleGeometry(2.55, 24),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
    })
  );
  underwaterExitPortal.add(exitRing, exitCore);
  uwGroup.add(underwaterExitPortal);
  scene.add(uwGroup);

  // ============================================================================
  // 7. ISLAND 5 — GENİŞ SİSLİ KORKU ORMANI (EXPANDED HORROR FOREST) AT (680, -360)
  // ============================================================================
  buildIslandTerrainMesh(
    HORROR_FOREST_POS.x,
    HORROR_FOREST_POS.z,
    410,
    68,
    mats.terrainMap,
    mats.terrainBump,
    0.94,
    0.28,
    (wx, wz, y) => {
      if (y < WATER_LEVEL + 1.8) return '#27272a';
      const v = Math.sin(wx * 0.09) * Math.cos(wz * 0.09);
      return v > 0 ? '#211729' : '#181820';
    },
    scene,
    disposables
  );

  // 185 Twisted Dead Gnarled Horror Trees
  const deadTrees: { x: number; y: number; z: number; s: number; rot: number }[] = [];
  for (let i = 0; i < 620 && deadTrees.length < 185; i++) {
    const a = rand() * Math.PI * 2;
    const r = 16 + rand() * (HORROR_FOREST_RADIUS - 22);
    const x = HORROR_FOREST_POS.x + Math.cos(a) * r;
    const z = HORROR_FOREST_POS.z + Math.sin(a) * r;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 1.2) continue;
    if (Math.hypot(x - HORROR_RELIC_POS.x, z - HORROR_RELIC_POS.z) < 14) continue;
    deadTrees.push({ x, y, z, s: 1.05 + rand() * 0.85, rot: rand() * Math.PI * 2 });
  }
  const deadTrunkGeo = new THREE.CylinderGeometry(0.18, 0.5, 12.2, 6);
  deadTrunkGeo.translate(0, 6.1, 0);
  const deadBranchGeo = new THREE.CylinderGeometry(0.08, 0.17, 4.8, 5);
  deadBranchGeo.rotateZ(0.78);
  deadBranchGeo.translate(1.5, 9.2, 0);
  const deadBarkMat = new THREE.MeshStandardMaterial({ color: 0x1c191c, roughness: 0.96 });
  const deadTrunkInst = new THREE.InstancedMesh(deadTrunkGeo, deadBarkMat, deadTrees.length);
  const deadBranchInst = new THREE.InstancedMesh(deadBranchGeo, deadBarkMat, deadTrees.length);
  deadTrees.forEach((t, idx) => {
    dummy.position.set(t.x, t.y - 0.2, t.z);
    dummy.rotation.set((rand() - 0.5) * 0.12, t.rot, (rand() - 0.5) * 0.12);
    dummy.scale.setScalar(t.s);
    dummy.updateMatrix();
    deadTrunkInst.setMatrixAt(idx, dummy.matrix);
    deadBranchInst.setMatrixAt(idx, dummy.matrix);
  });
  scene.add(deadTrunkInst, deadBranchInst);
  disposables.push(deadTrunkGeo, deadBranchGeo, deadBarkMat);

  const horrorY = groundHeightAt(HORROR_RELIC_POS.x, HORROR_RELIC_POS.z);
  const horrorAltar = new THREE.Group();
  horrorAltar.position.set(HORROR_RELIC_POS.x, horrorY, HORROR_RELIC_POS.z);

  const crimsonGlowMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xbe123c,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });
  const tealShadowMat = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0f766e,
    emissiveIntensity: 1.4,
    metalness: 0.8,
    roughness: 0.18,
  });
  disposables.push(crimsonGlowMat, tealShadowMat);

  const altarBase = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 7.6, 1.0, 10), mats.darkStoneMat);
  altarBase.position.y = 0.5;
  horrorAltar.add(altarBase);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const grave = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 0.36), mats.darkStoneMat);
    grave.position.set(Math.cos(a) * 9.8, 1.1, Math.sin(a) * 9.8);
    grave.rotation.y = -a + Math.PI / 2;
    const eerieOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.36, 0), crimsonGlowMat);
    eerieOrb.position.set(Math.cos(a) * 6.2, 3.0, Math.sin(a) * 6.2);
    horrorAltar.add(grave, eerieOrb);
  }

  const horrorRelic = new THREE.Group();
  horrorRelic.position.set(0, 2.8, 0);
  const dag1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.3, 0.08), tealShadowMat);
  dag1.rotation.z = 0.48;
  const dag2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.3, 0.08), tealShadowMat);
  dag2.rotation.z = -0.48;
  const dagHalo = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.09, 8, 24), crimsonGlowMat);
  dagHalo.rotation.x = Math.PI / 2;
  horrorRelic.add(dag1, dag2, dagHalo);
  horrorAltar.add(horrorRelic);
  scene.add(horrorAltar);

  // ============================================================================
  // 8. 4× DEVASA KUZEY KUTBU (NORTH POLE GLACIAL CONTINENT) AT (0, -860), R = 260
  //    HOME OF THE LV.1000 DEVASA YETİ BOSS & YETI RUNE AWAKENING ARENA!
  // ============================================================================
  buildIslandTerrainMesh(
    NORTH_POLE_POS.x,
    NORTH_POLE_POS.z,
    620,
    92,
    mats.glacialMap,
    mats.glacialBump,
    0.66,
    0.24,
    (wx, wz, y, _dist, slope) => {
      if (y < WATER_LEVEL + 0.9) return '#5897b8'; // Frozen turquoise ice shelf edge
      if (slope > 0.56) return '#8ecae6'; // Exposed glacial blue ice cliffs
      if (y > 24) return '#f5fbff'; // Pure alpine summit snow
      const distBoss = Math.hypot(wx - YETI_BOSS_POS.x, wz - YETI_BOSS_POS.z);
      if (distBoss < 34) return '#cdeeff'; // Carved frost arena ice floor
      const drift = Math.sin(wx * 0.045) * Math.cos(wz * 0.045);
      return drift > 0.15 ? '#eef7fc' : '#d8edf8';
    },
    scene,
    disposables
  );

  // Kuzey Kutbu Southern Ice Landing Pier at NORTH_POLE_DOCK_POS = (0, -608)
  const npDockGroup = new THREE.Group();
  const npDockY = WATER_LEVEL + 1.15;
  const npPierDeck = new THREE.Mesh(new THREE.BoxGeometry(14, 0.5, 34), mats.timberMat);
  npPierDeck.position.set(NORTH_POLE_DOCK_POS.x, npDockY, NORTH_POLE_DOCK_POS.z + 6);
  npPierDeck.receiveShadow = true;
  npDockGroup.add(npPierDeck);

  const frostGlowMat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc,
    emissive: 0x0284c7,
    emissiveIntensity: 1.7,
    roughness: 0.14,
  });
  const iceSpireMat = new THREE.MeshStandardMaterial({
    color: 0xbbe8ff,
    emissive: 0x164e63,
    emissiveIntensity: 0.32,
    roughness: 0.16,
    metalness: 0.25,
    transparent: true,
    opacity: 0.88,
  });
  disposables.push(frostGlowMat, iceSpireMat);

  for (const sx of [-6.2, 6.2]) {
    for (const dz of [-8, 6, 20]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 6.2, 8), mats.timberMat);
      pile.position.set(NORTH_POLE_DOCK_POS.x + sx, npDockY - 2.6, NORTH_POLE_DOCK_POS.z + dz);
      npDockGroup.add(pile);
      if (dz === -8 || dz === 20) {
        const brazier = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), frostGlowMat);
        brazier.position.set(NORTH_POLE_DOCK_POS.x + sx, npDockY + 2.4, NORTH_POLE_DOCK_POS.z + dz);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.2, 6), mats.ironMat);
        pole.position.set(NORTH_POLE_DOCK_POS.x + sx, npDockY + 1.1, NORTH_POLE_DOCK_POS.z + dz);
        npDockGroup.add(pole, brazier);
      }
    }
  }
  scene.add(npDockGroup);

  // 58 Towering Crystalline Glacial Ice Spires & Coastal Icebergs across Kuzey Kutbu
  const iceSpireGeo = new THREE.ConeGeometry(2.6, 12.5, 6);
  iceSpireGeo.translate(0, 6.0, 0);
  const iceSpireInst = new THREE.InstancedMesh(iceSpireGeo, iceSpireMat, 58);
  let placedSpires = 0;
  for (let i = 0; i < 240 && placedSpires < 58; i++) {
    const a = rand() * Math.PI * 2;
    const r = 38 + rand() * (NORTH_POLE_RADIUS - 28);
    const x = NORTH_POLE_POS.x + Math.cos(a) * r;
    const z = NORTH_POLE_POS.z + Math.sin(a) * r;
    if (Math.hypot(x - YETI_BOSS_POS.x, z - YETI_BOSS_POS.z) < 42) continue;
    if (Math.abs(x) < 22 && z > NORTH_POLE_POS.z + 40) continue; // Keep southern corridor clear
    const y = Math.max(WATER_LEVEL - 0.5, groundHeightAt(x, z));
    const s = 0.9 + rand() * 2.2;
    dummy.position.set(x, y - 0.8, z);
    dummy.rotation.set((rand() - 0.5) * 0.24, rand() * Math.PI * 2, (rand() - 0.5) * 0.24);
    dummy.scale.set(s * 0.9, s * (0.9 + rand() * 0.9), s * 0.9);
    dummy.updateMatrix();
    iceSpireInst.setMatrixAt(placedSpires++, dummy.matrix);
  }
  iceSpireInst.count = placedSpires;
  scene.add(iceSpireInst);
  disposables.push(iceSpireGeo);

  // 70 Frosted Snow Pines scattered through the Kuzey Kutbu glacial valleys
  const snowPines: { x: number; y: number; z: number; s: number; rot: number }[] = [];
  for (let i = 0; i < 320 && snowPines.length < 70; i++) {
    const a = rand() * Math.PI * 2;
    const r = 24 + rand() * (NORTH_POLE_RADIUS - 58);
    const x = NORTH_POLE_POS.x + Math.cos(a) * r;
    const z = NORTH_POLE_POS.z + Math.sin(a) * r;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 1.8 || y > 18) continue;
    if (Math.hypot(x - YETI_BOSS_POS.x, z - YETI_BOSS_POS.z) < 38) continue;
    if (Math.abs(x) < 16 && z > YETI_BOSS_POS.z) continue;
    snowPines.push({ x, y, z, s: 0.9 + rand() * 0.65, rot: rand() * Math.PI * 2 });
  }
  const spTrunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 4.2, 6);
  spTrunkGeo.translate(0, 2.1, 0);
  const spConeGeo = new THREE.ConeGeometry(2.6, 8.2, 7);
  spConeGeo.translate(0, 6.8, 0);
  const spTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3b2f2a, roughness: 0.94 });
  const spLeafMat = new THREE.MeshStandardMaterial({ color: 0xcbe8f4, roughness: 0.78 });
  const spTrunkInst = new THREE.InstancedMesh(spTrunkGeo, spTrunkMat, snowPines.length);
  const spConeInst = new THREE.InstancedMesh(spConeGeo, spLeafMat, snowPines.length);
  snowPines.forEach((p, idx) => {
    dummy.position.set(p.x, p.y - 0.15, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    spTrunkInst.setMatrixAt(idx, dummy.matrix);
    spConeInst.setMatrixAt(idx, dummy.matrix);
  });
  scene.add(spTrunkInst, spConeInst);
  disposables.push(spTrunkGeo, spConeGeo, spTrunkMat, spLeafMat);

  // --- DEVASA YETİ BOSS RUNE ARENA AT YETI_BOSS_POS = (0, -925) ---
  const yetiArenaY = groundHeightAt(YETI_BOSS_POS.x, YETI_BOSS_POS.z);
  const yetiArena = new THREE.Group();
  yetiArena.position.set(YETI_BOSS_POS.x, yetiArenaY, YETI_BOSS_POS.z);

  const runeFloorRing = new THREE.Mesh(
    new THREE.RingGeometry(24, 27.5, 48),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.3,
      roughness: 0.2,
      side: THREE.DoubleSide,
    })
  );
  runeFloorRing.rotation.x = -Math.PI / 2;
  runeFloorRing.position.y = 0.22;
  yetiArena.add(runeFloorRing);

  // 8 Monumental Runic Ice Obelisks ringing the Yeti Boss Sanctuary (South gap open)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.2) continue; // Leave South entrance wide open
    const ox = Math.cos(a) * 30;
    const oz = Math.sin(a) * 30;

    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.9, 13.5, 6), iceSpireMat);
    obelisk.position.set(ox, 6.7, oz);
    obelisk.castShadow = true;

    const runeBand = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.16, 8, 18), frostGlowMat);
    runeBand.rotation.x = Math.PI / 2;
    runeBand.position.set(ox, 7.6, oz);

    const obeliskCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 0), frostGlowMat);
    obeliskCrystal.position.set(ox, 14.8, oz);

    yetiArena.add(obelisk, runeBand, obeliskCrystal);
    collidables.push({ x: YETI_BOSS_POS.x + ox, z: YETI_BOSS_POS.z + oz, radius: 2.1 });
  }
  scene.add(yetiArena);

  // --- SHIMMERING NORTHERN AURORA BOREALIS RIBBONS ABOVE KUZEY KUTBU ---
  const northPoleAurora = new THREE.Group();
  northPoleAurora.position.set(NORTH_POLE_POS.x, 96, NORTH_POLE_POS.z - 25);
  const auroraColors = [0x38bdf8, 0x34d399, 0x818cf8];
  auroraColors.forEach((hex, idx) => {
    const mat = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: true,
      opacity: 0.28 - idx * 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ribbonGeo = new THREE.CylinderGeometry(
      140 + idx * 34,
      152 + idx * 34,
      26 + idx * 4,
      36,
      1,
      true,
      0,
      Math.PI * 1.45
    );
    const ribbon = new THREE.Mesh(ribbonGeo, mat);
    ribbon.position.y = idx * 9;
    ribbon.rotation.y = idx * 0.9;
    northPoleAurora.add(ribbon);
    disposables.push(ribbonGeo, mat);
  });
  scene.add(northPoleAurora);

  return {
    whirlpoolGroup,
    pirateRelic,
    wizardRelic,
    horrorRelic,
    underwaterRelic,
    underwaterExitPortal,
    harborDisplayShips: [sloopDisplay, galleonDisplay],
    underwaterBubbles,
    lighthouseBeacon,
    northPoleAurora,
  };
}
