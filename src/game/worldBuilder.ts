import * as THREE from 'three';
import {
  groundHeightAt,
  getBiomeAt,
  WATER_LEVEL,
  WORLD_EXTENT,
  WORLD_PLAYABLE_RADIUS,
  SAFE_ZONE_CENTER,
  SAFE_ZONE_RADIUS,
} from './worldMath';
import {
  createTerrainDetailTexture,
  createStoneMasonryTextures,
  createTimberTextures,
} from './proceduralTextures';

export interface WorldCollidable {
  x: number;
  z: number;
  radius: number;
}

export interface BuiltWorld {
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  cloudsGroup: THREE.Group;
  campfireFlame: THREE.Mesh;
  campfireLight: THREE.PointLight;
  summitCrystal: THREE.Mesh;
  bannerMeshes: THREE.Mesh[];
  collidables: WorldCollidable[];
  dispose: () => void;
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Distance from point (x,z) to a line segment (ax,az)-(bx,bz) */
function distToSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number): number {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = x - ax;
  const wz = z - az;
  const len2 = vx * vx + vz * vz;
  const t = len2 > 0 ? Math.max(0, Math.min(1, (wx * vx + wz * vz) / len2)) : 0;
  const px = ax + t * vx;
  const pz = az + t * vz;
  return Math.hypot(x - px, z - pz);
}

export function buildOpenWorld(
  scene: THREE.Scene,
  maxAnisotropy: number
): BuiltWorld {
  const disposables: { dispose: () => void }[] = [];
  const collidables: WorldCollidable[] = [];
  const bannerMeshes: THREE.Mesh[] = [];

  const { bumpMap: terrainBump } = createTerrainDetailTexture(maxAnisotropy);
  const stoneTex = createStoneMasonryTextures(maxAnisotropy);
  const timberTex = createTimberTextures(maxAnisotropy);
  disposables.push(terrainBump, stoneTex.map, stoneTex.bumpMap, timberTex.map, timberTex.bumpMap);

  // 1. Sculpted Multi-Landform Terrain Mesh (320m x 320m, 96x96 grid)
  const size = WORLD_EXTENT * 2;
  const segments = 96;
  const terrainGeo = new THREE.PlaneGeometry(size, size, segments, segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const c = new THREE.Color();

  // Road segments linking landmarks
  const roads: [number, number, number, number][] = [
    [0, 14, 0, -8], // Sanctuary -> Watchtower
    [0, 14, 52, 4], // Sanctuary -> Golden Plains Duel Ring
    [0, -8, 0, -68], // Watchtower -> Bozdağ Summit Trail
    [0, 14, -34, 8], // Sanctuary -> Silver Lake Pier
  ];

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = groundHeightAt(x, z);
    posAttr.setY(i, y);

    const biome = getBiomeAt(x, z);
    const hL = groundHeightAt(x - 1.2, z);
    const hR = groundHeightAt(x + 1.2, z);
    const hD = groundHeightAt(x, z - 1.2);
    const hU = groundHeightAt(x, z + 1.2);
    const slope = Math.hypot((hR - hL) / 2.4, (hU - hD) / 2.4);

    // Rich calibrated highland biome palette
    if (biome === 'mountain') {
      if (y > 13.0) {
        c.set('#e2ebf2'); // Alpine snow cap
      } else if (slope > 0.38 || y > 8.6) {
        c.set('#5a636e'); // Granite cliff
      } else {
        c.set('#3f5d3c'); // Highland pine slope
      }
    } else if (biome === 'plains') {
      const grain = Math.sin(x * 0.16) * Math.cos(z * 0.16) * 0.04;
      c.set('#b88e3e').offsetHSL(0, 0, grain);
    } else if (biome === 'lake') {
      if (y < WATER_LEVEL + 0.55) {
        c.set('#b8a376'); // Sandy lakebed & beach
      } else {
        c.set('#3d7546'); // River valley grass
      }
    } else {
      const grassVar = Math.sin(x * 0.11 + z * 0.09) * 0.035;
      c.set('#447d39').offsetHSL(grassVar * 0.25, 0, grassVar);
    }

    // Blend stony cliff faces on steep slopes anywhere
    if (slope > 0.54 && y <= 13.0) {
      c.lerp(new THREE.Color('#565e68'), Math.min(0.88, (slope - 0.54) * 1.45));
    }

    // Blend dirt/cobblestone footpaths between major landmarks
    let minRoad = 999;
    for (const [ax, az, bx, bz] of roads) {
      const d = distToSegment(x, z, ax, az, bx, bz);
      if (d < minRoad) minRoad = d;
    }
    if (minRoad < 3.4 && y > WATER_LEVEL + 0.4) {
      const roadBlend = 1 - minRoad / 3.4;
      c.lerp(new THREE.Color('#8c7858'), roadBlend * 0.72);
    }

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    bumpMap: terrainBump,
    bumpScale: 0.16,
    roughness: 0.92,
    metalness: 0.02,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 2. Shimmering Silver Lake Water Plane
  const waterGeo = new THREE.PlaneGeometry(180, 180, 16, 16);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x3b8fb8,
    roughness: 0.16,
    metalness: 0.35,
    transparent: true,
    opacity: 0.84,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(-64, WATER_LEVEL, 8);
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);
  disposables.push(waterGeo, waterMat);

  // Shared Architectural Materials
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xd8d0c2,
    map: stoneTex.map,
    bumpMap: stoneTex.bumpMap,
    bumpScale: 0.16,
    roughness: 0.88,
    metalness: 0.03,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x626870,
    roughness: 0.78,
    metalness: 0.08,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: timberTex.map,
    bumpMap: timberTex.bumpMap,
    bumpScale: 0.1,
    roughness: 0.82,
    metalness: 0.02,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x8f4030,
    roughness: 0.72,
    metalness: 0.05,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xc99a45,
    roughness: 0.28,
    metalness: 0.82,
  });
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xc23535,
    roughness: 0.85,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  disposables.push(stoneMat, darkStoneMat, timberMat, roofMat, bronzeMat, bannerMat);

  // 3. Landmark A: Taş Meydan Kampı (Safe Campfire Sanctuary at 0, 14)
  const campY = groundHeightAt(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z);
  const campGroup = new THREE.Group();
  campGroup.position.set(SAFE_ZONE_CENTER.x, campY, SAFE_ZONE_CENTER.z);

  const plazaDisc = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 0.28, 24), stoneMat);
  plazaDisc.position.y = 0.06;
  plazaDisc.receiveShadow = true;
  campGroup.add(plazaDisc);

  // Subtle Safe Zone Perimeter Ring Markers (8 carved boundary runestones)
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const rx = SAFE_ZONE_CENTER.x + Math.cos(angle) * SAFE_ZONE_RADIUS;
    const rz = SAFE_ZONE_CENTER.z + Math.sin(angle) * SAFE_ZONE_RADIUS;
    const ry = groundHeightAt(rx, rz);

    const post = new THREE.Group();
    post.position.set(rx, ry, rz);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.5, 6), darkStoneMat);
    pillar.position.y = 0.75;
    pillar.castShadow = true;
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshStandardMaterial({
        color: 0x5be38c,
        emissive: 0x2ba859,
        emissiveIntensity: 0.85,
        roughness: 0.2,
      })
    );
    gem.position.y = 1.66;
    post.add(pillar, gem);
    scene.add(post);
  }

  // Central Campfire Hearth (stone ring + crossed logs + flame)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), darkStoneMat);
    rock.position.set(Math.cos(a) * 1.15, 0.24, Math.sin(a) * 1.15);
    rock.scale.set(1.2, 0.75, 1.1);
    campGroup.add(rock);
  }
  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 1.55, 7), timberMat);
    log.position.y = 0.34;
    log.rotation.z = Math.PI / 2.6;
    log.rotation.y = (i / 4) * Math.PI * 2;
    campGroup.add(log);
  }
  const campfireFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 1.15, 7),
    new THREE.MeshStandardMaterial({
      color: 0xffb347,
      emissive: 0xff621a,
      emissiveIntensity: 1.5,
      roughness: 0.4,
    })
  );
  campfireFlame.position.y = 0.76;
  campGroup.add(campfireFlame);

  const campfireLight = new THREE.PointLight(0xff9c4a, 4.2, 22, 1.6);
  campfireLight.position.set(SAFE_ZONE_CENTER.x, campY + 2.4, SAFE_ZONE_CENTER.z);
  scene.add(campfireLight);

  // Wooden benches & forge anvil around campfire
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5;
    const bench = new THREE.Group();
    bench.position.set(Math.cos(a) * 4.4, 0.2, Math.sin(a) * 4.4);
    bench.rotation.y = -a + Math.PI / 2;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.58), timberMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.48), timberMat);
    leg1.position.set(-0.78, 0.22, 0);
    const leg2 = leg1.clone();
    leg2.position.x = 0.78;
    bench.add(seat, leg1, leg2);
    campGroup.add(bench);
  }

  scene.add(campGroup);
  collidables.push({ x: SAFE_ZONE_CENTER.x, z: SAFE_ZONE_CENTER.z, radius: 1.35 });

  // 4. Landmark B: Yayla Gözetleme Kulesi (Tall Landmark at 0, -8 — hero spawn vista!)
  const towerY = groundHeightAt(0, -8);
  const tower = new THREE.Group();
  tower.position.set(0, towerY - 0.3, -8);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.0, 2.2, 8), darkStoneMat);
  plinth.position.y = 1.1;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  tower.add(plinth);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.0, 10.5, 8), stoneMat);
  shaft.position.y = 7.2;
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  tower.add(shaft);

  const galleryFloor = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 2.6, 1.1, 8), timberMat);
  galleryFloor.position.y = 12.6;
  galleryFloor.castShadow = true;
  tower.add(galleryFloor);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.5, 0.24), timberMat);
    post.position.set(Math.cos(a) * 3.0, 14.3, Math.sin(a) * 3.0);
    post.castShadow = true;
    tower.add(post);
  }

  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1, 4.2, 8), roofMat);
  roof.position.y = 17.5;
  roof.castShadow = true;
  tower.add(roof);

  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.2, 8), bronzeMat);
  finial.position.y = 20.4;
  tower.add(finial);

  const towerBanner = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.05, 4, 1), bannerMat);
  towerBanner.position.set(1.35, 20.6, 0);
  tower.add(towerBanner);
  bannerMeshes.push(towerBanner);

  scene.add(tower);
  collidables.push({ x: 0, z: -8, radius: 3.7 });

  // 5. Landmark C: Altın Ova Düello Meydanı (Golden Plains Arena at 52, 4)
  const duelY = groundHeightAt(52, 4);
  const duelGroup = new THREE.Group();
  duelGroup.position.set(52, duelY, 4);

  const ringBorder = new THREE.Mesh(
    new THREE.RingGeometry(11.4, 12.6, 40),
    new THREE.MeshStandardMaterial({
      color: 0xd1b88a,
      roughness: 0.85,
      side: THREE.DoubleSide,
    })
  );
  ringBorder.rotation.x = -Math.PI / 2;
  ringBorder.position.y = 0.08;
  duelGroup.add(ringBorder);

  // 4 Ancient Sandstone Arches flanking the duel ring
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const arch = new THREE.Group();
    const ax = Math.cos(a) * 13.4;
    const az = Math.sin(a) * 13.4;
    arch.position.set(ax, 0, az);
    arch.rotation.y = -a + Math.PI / 2;

    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 5.2, 0.95), stoneMat);
    pL.position.set(-2.1, 2.6, 0);
    pL.castShadow = true;
    const pR = pL.clone();
    pR.position.x = 2.1;
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.85, 1.15), stoneMat);
    lintel.position.set(0, 5.4, 0);
    lintel.castShadow = true;
    const crest = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.5), bronzeMat);
    crest.position.set(0, 6.2, 0);
    arch.add(pL, pR, lintel, crest);
    duelGroup.add(arch);

    collidables.push({
      x: 52 + ax - Math.sin(a) * 2.1,
      z: 4 + az + Math.cos(a) * 2.1,
      radius: 0.8,
    });
  }
  scene.add(duelGroup);

  // 6. Landmark D: Bozdağ Zirve Sunağı (Summit Altar at 0, -68)
  const summitY = groundHeightAt(0, -68);
  const summitGroup = new THREE.Group();
  summitGroup.position.set(0, summitY - 0.35, -68);

  const dais1 = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.6, 0.7, 12), darkStoneMat);
  dais1.position.y = 0.35;
  dais1.receiveShadow = true;
  const dais2 = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 0.6, 12), stoneMat);
  dais2.position.y = 1.0;
  dais2.receiveShadow = true;
  summitGroup.add(dais1, dais2);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.58, 5.8, 4), darkStoneMat);
    obelisk.position.set(Math.cos(a) * 5.2, 3.2, Math.sin(a) * 5.2);
    obelisk.castShadow = true;
    summitGroup.add(obelisk);
  }

  const summitCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1, 0),
    new THREE.MeshStandardMaterial({
      color: 0x73dcff,
      emissive: 0x2597c7,
      emissiveIntensity: 1.15,
      roughness: 0.14,
      metalness: 0.4,
    })
  );
  summitCrystal.position.y = 3.8;
  summitGroup.add(summitCrystal);
  scene.add(summitGroup);

  // 7. Landmark E: Gümüş Göl İskelesi (Wooden Pier at -36, 8)
  const pierGroup = new THREE.Group();
  const pierDeckY = WATER_LEVEL + 0.95;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.25, 3.4), timberMat);
  deck.position.set(-39, pierDeckY, 8);
  deck.receiveShadow = true;
  deck.castShadow = true;
  pierGroup.add(deck);

  for (let i = 0; i < 4; i++) {
    const px = -35 - i * 2.8;
    for (const pz of [6.5, 9.5]) {
      const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 3.6, 8), timberMat);
      piling.position.set(px, pierDeckY - 1.3, pz);
      pierGroup.add(piling);
    }
  }
  // Lantern post on pier end
  const lanternPole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.8, 7), timberMat);
  lanternPole.position.set(-43.8, pierDeckY + 1.4, 6.6);
  const lanternGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.44, 0.36),
    new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0xff9f38,
      emissiveIntensity: 1.4,
      roughness: 0.3,
    })
  );
  lanternGlow.position.set(-43.8, pierDeckY + 2.75, 6.6);
  pierGroup.add(lanternPole, lanternGlow);
  scene.add(pierGroup);

  // 8. Instanced Nature Props (Pine Trees, Broadleaf Trees, Granite Boulders, Grass/Wheat Tufts)
  const rand = seededRandom(20261123);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  // Helper to ensure props don't block landmarks or spawn roads
  const isClearForProp = (x: number, z: number, minPad = 4.5): boolean => {
    if (Math.hypot(x - SAFE_ZONE_CENTER.x, z - SAFE_ZONE_CENTER.z) < SAFE_ZONE_RADIUS + 1.5) return false;
    if (Math.hypot(x, z + 8) < 8.5) return false; // Watchtower
    if (Math.hypot(x - 52, z - 4) < 16.5) return false; // Duel Ring
    if (Math.hypot(x, z + 68) < 11.5) return false; // Summit Altar
    if (Math.hypot(x + 39, z - 8) < 9.5) return false; // Pier
    for (const [ax, az, bx, bz] of roads) {
      if (distToSegment(x, z, ax, az, bx, bz) < minPad) return false;
    }
    return true;
  };

  // Pine Trees (Mountain & Northern Meadow)
  const pinePositions: { x: number; y: number; z: number; s: number; rot: number }[] = [];
  for (let i = 0; i < 420 && pinePositions.length < 130; i++) {
    const angle = rand() * Math.PI * 2;
    const rad = 16 + rand() * (WORLD_PLAYABLE_RADIUS + 14);
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = groundHeightAt(x, z);
    const biome = getBiomeAt(x, z);
    if (y < WATER_LEVEL + 0.8 || y > 13.8) continue;
    if (biome !== 'mountain' && !(biome === 'meadow' && z < 4)) continue;
    if (!isClearForProp(x, z, 4.6)) continue;
    pinePositions.push({ x, y, z, s: 0.85 + rand() * 0.42, rot: rand() * Math.PI * 2 });
  }

  const pineTrunkGeo = new THREE.CylinderGeometry(0.18, 0.34, 2.2, 7);
  pineTrunkGeo.translate(0, 1.1, 0);
  const pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c402c, roughness: 0.9 });
  const pineTrunkInst = new THREE.InstancedMesh(pineTrunkGeo, pineTrunkMat, pinePositions.length);

  const pineCone1Geo = new THREE.ConeGeometry(1.75, 3.6, 7);
  pineCone1Geo.translate(0, 3.3, 0);
  const pineCone2Geo = new THREE.ConeGeometry(1.25, 2.9, 7);
  pineCone2Geo.translate(0, 5.1, 0);
  const pineLeafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
  const pineLeaf1Inst = new THREE.InstancedMesh(pineCone1Geo, pineLeafMat, pinePositions.length);
  const pineLeaf2Inst = new THREE.InstancedMesh(pineCone2Geo, pineLeafMat, pinePositions.length);

  pinePositions.forEach((p, idx) => {
    dummy.position.set(p.x, p.y - 0.15, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.setScalar(p.s);
    dummy.updateMatrix();
    pineTrunkInst.setMatrixAt(idx, dummy.matrix);
    pineLeaf1Inst.setMatrixAt(idx, dummy.matrix);
    pineLeaf2Inst.setMatrixAt(idx, dummy.matrix);

    tint.set('#2e5c3e').offsetHSL((rand() - 0.5) * 0.04, 0, (rand() - 0.5) * 0.08);
    pineLeaf1Inst.setColorAt(idx, tint);
    tint.offsetHSL(0, 0, 0.05);
    pineLeaf2Inst.setColorAt(idx, tint);

    if (Math.hypot(p.x, p.z) < WORLD_PLAYABLE_RADIUS) {
      collidables.push({ x: p.x, z: p.z, radius: 0.55 * p.s });
    }
  });
  pineTrunkInst.computeBoundingSphere();
  pineLeaf1Inst.computeBoundingSphere();
  pineLeaf2Inst.computeBoundingSphere();
  pineTrunkInst.castShadow = true;
  pineLeaf1Inst.castShadow = true;
  scene.add(pineTrunkInst, pineLeaf1Inst, pineLeaf2Inst);
  disposables.push(pineTrunkGeo, pineTrunkMat, pineCone1Geo, pineCone2Geo, pineLeafMat);

  // Broadleaf Meadow & Lake Trees
  const oakPositions: { x: number; y: number; z: number; s: number; rot: number; isPlains: boolean }[] = [];
  for (let i = 0; i < 360 && oakPositions.length < 95; i++) {
    const angle = rand() * Math.PI * 2;
    const rad = 18 + rand() * (WORLD_PLAYABLE_RADIUS + 8);
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = groundHeightAt(x, z);
    const biome = getBiomeAt(x, z);
    if (y < WATER_LEVEL + 0.65 || biome === 'mountain') continue;
    if (biome === 'plains' && rand() > 0.32) continue; // Keep plains open & sweeping!
    if (!isClearForProp(x, z, 4.8)) continue;
    oakPositions.push({
      x,
      y,
      z,
      s: 0.85 + rand() * 0.4,
      rot: rand() * Math.PI * 2,
      isPlains: biome === 'plains',
    });
  }

  const oakTrunkGeo = new THREE.CylinderGeometry(0.22, 0.36, 2.5, 7);
  oakTrunkGeo.translate(0, 1.25, 0);
  const oakCrownGeo = new THREE.DodecahedronGeometry(1.75, 1);
  oakCrownGeo.translate(0, 3.6, 0);
  const oakCrownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 });
  const oakTrunkInst = new THREE.InstancedMesh(oakTrunkGeo, pineTrunkMat, oakPositions.length);
  const oakCrownInst = new THREE.InstancedMesh(oakCrownGeo, oakCrownMat, oakPositions.length);

  oakPositions.forEach((p, idx) => {
    dummy.position.set(p.x, p.y - 0.15, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.set(p.s, p.s * (0.9 + rand() * 0.2), p.s);
    dummy.updateMatrix();
    oakTrunkInst.setMatrixAt(idx, dummy.matrix);
    oakCrownInst.setMatrixAt(idx, dummy.matrix);

    tint
      .set(p.isPlains ? '#a88c3b' : '#4a8a3d')
      .offsetHSL((rand() - 0.5) * 0.05, 0, (rand() - 0.5) * 0.09);
    oakCrownInst.setColorAt(idx, tint);

    if (Math.hypot(p.x, p.z) < WORLD_PLAYABLE_RADIUS) {
      collidables.push({ x: p.x, z: p.z, radius: 0.6 * p.s });
    }
  });
  oakTrunkInst.computeBoundingSphere();
  oakCrownInst.computeBoundingSphere();
  oakTrunkInst.castShadow = true;
  oakCrownInst.castShadow = true;
  scene.add(oakTrunkInst, oakCrownInst);
  disposables.push(oakTrunkGeo, oakCrownGeo, oakCrownMat);

  // Granite Boulders & Outcrops
  const rockPositions: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number }[] = [];
  for (let i = 0; i < 240 && rockPositions.length < 85; i++) {
    const angle = rand() * Math.PI * 2;
    const rad = 18 + rand() * (WORLD_PLAYABLE_RADIUS + 6);
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 0.1) continue;
    if (!isClearForProp(x, z, 4.2)) continue;
    const base = 0.7 + rand() * 1.4;
    rockPositions.push({
      x,
      y,
      z,
      sx: base * (0.85 + rand() * 0.5),
      sy: base * (0.55 + rand() * 0.45),
      sz: base * (0.85 + rand() * 0.5),
      rot: rand() * Math.PI * 2,
    });
  }

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0.05 });
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockPositions.length);
  rockPositions.forEach((r, idx) => {
    dummy.position.set(r.x, r.y + r.sy * 0.32, r.z);
    dummy.rotation.set(rand() * 0.4, r.rot, rand() * 0.4);
    dummy.scale.set(r.sx, r.sy, r.sz);
    dummy.updateMatrix();
    rockInst.setMatrixAt(idx, dummy.matrix);
    tint.set('#7a8087').offsetHSL(0, 0, (rand() - 0.5) * 0.14);
    rockInst.setColorAt(idx, tint);
    if (Math.hypot(r.x, r.z) < WORLD_PLAYABLE_RADIUS && r.sx > 0.9) {
      collidables.push({ x: r.x, z: r.z, radius: Math.max(r.sx, r.sz) * 0.72 });
    }
  });
  rockInst.computeBoundingSphere();
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  scene.add(rockInst);
  disposables.push(rockGeo, rockMat);

  // Wildflower & Golden Steppe Grass Tufts
  const tuftCount = 320;
  const tuftGeo = new THREE.ConeGeometry(0.28, 0.65, 4);
  tuftGeo.translate(0, 0.32, 0);
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const tuftInst = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftCount);
  let placedTufts = 0;
  for (let i = 0; i < 950 && placedTufts < tuftCount; i++) {
    const a = rand() * Math.PI * 2;
    const rad = 11 + rand() * (WORLD_PLAYABLE_RADIUS - 6);
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    const y = groundHeightAt(x, z);
    const biome = getBiomeAt(x, z);
    if (y < WATER_LEVEL + 0.5 || y > 9.5) continue;
    if (Math.hypot(x - SAFE_ZONE_CENTER.x, z - SAFE_ZONE_CENTER.z) < 10.6) continue;
    if (Math.hypot(x - 52, z - 4) < 13.0) continue;
    if (Math.hypot(x, z + 8) < 5.5) continue;
    dummy.position.set(x, y - 0.04, z);
    dummy.rotation.set(0, rand() * Math.PI, 0);
    const sc = 0.7 + rand() * 0.75;
    dummy.scale.set(sc, sc * (0.8 + rand() * 0.5), sc);
    dummy.updateMatrix();
    tuftInst.setMatrixAt(placedTufts, dummy.matrix);
    if (biome === 'plains') {
      tint.set('#e0b853').offsetHSL(0, 0, (rand() - 0.5) * 0.08);
    } else if (rand() > 0.75) {
      tint.set(rand() > 0.5 ? '#f5df78' : '#e88b8b'); // Meadow wildflowers
    } else {
      tint.set('#5fa34b').offsetHSL(0, 0, (rand() - 0.5) * 0.08);
    }
    tuftInst.setColorAt(placedTufts, tint);
    placedTufts++;
  }
  tuftInst.count = placedTufts;
  tuftInst.computeBoundingSphere();
  scene.add(tuftInst);
  disposables.push(tuftGeo, tuftMat);

  // 9. High-Altitude Drifting Stylized Clouds
  const cloudsGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    opacity: 0.85,
  });
  const puffGeo = new THREE.DodecahedronGeometry(4.5, 1);
  for (let i = 0; i < 14; i++) {
    const cloud = new THREE.Group();
    const cx = (rand() - 0.5) * 240;
    const cz = (rand() - 0.5) * 240;
    const cy = 42 + rand() * 16;
    cloud.position.set(cx, cy, cz);
    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set((p - 1) * 4.2, (rand() - 0.5) * 1.4, (rand() - 0.5) * 2.2);
      puff.scale.set(1.2 + rand() * 0.5, 0.5 + rand() * 0.2, 0.85 + rand() * 0.35);
      cloud.add(puff);
    }
    cloudsGroup.add(cloud);
  }
  scene.add(cloudsGroup);
  disposables.push(puffGeo, cloudMat);

  return {
    terrainMesh,
    waterMesh,
    cloudsGroup,
    campfireFlame,
    campfireLight,
    summitCrystal,
    bannerMeshes,
    collidables,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
