import * as THREE from 'three';
import {
  groundHeightAt,
  getBiomeAt,
  WATER_LEVEL,
  MAIN_ISLAND_RADIUS,
  SAFE_ZONE_CENTER,
  SAFE_ZONE_RADIUS,
  TOWN_FORGE_POS,
  TOWN_STABLE_POS,
  TOWN_TAVERN_POS,
  HARBOR_POS,
  DARK_FOREST_POS,
  DARK_FOREST_RADIUS,
  MOUNTAIN_CRYSTAL_POS,
  FOREST_TREE_POS,
  DESERT_ARENA_POS,
  VIKING_SHIP_POS,
  PIER_START_X,
  PIER_END_X,
  PIER_Z,
  PIER_HALF_WIDTH,
  PIER_DECK_Y,
  VIKING_DECK_Y,
} from './worldMath';
import {
  createTerrainDetailTexture,
  createStoneMasonryTextures,
  createCobblestoneTextures,
  createRoofShingleTextures,
  createSandstoneTextures,
  createTimberTextures,
  createDarkBarkTextures,
  createGlacialIceTextures,
  createOceanWaveTextures,
  createAtlantisMarbleTextures,
  createContactShadowTexture,
} from './proceduralTextures';
import { buildHorseRig, buildRecurveBowGroup, ShipModelRig } from './characterModels';
import { buildOceanArchipelago } from './oceanWorldBuilder';

export interface WorldCollidable {
  x: number;
  z: number;
  radius: number;
}

export interface BuiltWorld {
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh;
  oceanWaveMap: THREE.Texture;
  oceanWaveBump: THREE.Texture;
  cloudsGroup: THREE.Group;
  cloudMaterial: THREE.MeshStandardMaterial;
  campfireFlame: THREE.Mesh;
  campfireLight: THREE.PointLight;
  summitCrystal: THREE.Mesh;
  forestTreeRelic: THREE.Group;
  desertSpearRelic: THREE.Group;
  vikingShipGroup: THREE.Group;
  vikingSailMesh: THREE.Mesh;
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

  const { map: terrainMap, bumpMap: terrainBump } = createTerrainDetailTexture(maxAnisotropy);
  const stoneTex = createStoneMasonryTextures(maxAnisotropy);
  const cobbleTex = createCobblestoneTextures(maxAnisotropy);
  const roofTex = createRoofShingleTextures(maxAnisotropy);
  const sandstoneTex = createSandstoneTextures(maxAnisotropy);
  const timberTex = createTimberTextures(maxAnisotropy);
  const darkBarkTex = createDarkBarkTextures(maxAnisotropy);
  const glacialTex = createGlacialIceTextures(maxAnisotropy);
  const oceanTex = createOceanWaveTextures(maxAnisotropy);
  const atlantisMarbleTex = createAtlantisMarbleTextures(maxAnisotropy);
  const propShadowTex = createContactShadowTexture();

  disposables.push(
    terrainMap,
    terrainBump,
    stoneTex.map,
    stoneTex.bumpMap,
    cobbleTex.map,
    cobbleTex.bumpMap,
    roofTex.map,
    roofTex.bumpMap,
    sandstoneTex.map,
    sandstoneTex.bumpMap,
    timberTex.map,
    timberTex.bumpMap,
    darkBarkTex.map,
    darkBarkTex.bumpMap,
    glacialTex.map,
    glacialTex.bumpMap,
    oceanTex.map,
    oceanTex.bumpMap,
    atlantisMarbleTex.map,
    atlantisMarbleTex.bumpMap,
    propShadowTex
  );

  // 1. Main Island High-Detail Coastal Terrain Mesh (560m x 560m, 140x140 grid)
  const size = 560;
  const segments = 140;
  const terrainGeo = new THREE.PlaneGeometry(size, size, segments, segments);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const c = new THREE.Color();

  // Main regional stone/dirt highways radiating from Starter Town (0, 0)
  const roads: [number, number, number, number][] = [
    [0, 0, 0, MOUNTAIN_CRYSTAL_POS.z], // North Highway -> Bozdağ Summit Crystal
    [0, 0, DESERT_ARENA_POS.x, DESERT_ARENA_POS.z], // East Highway -> Altın Çöl Arenası
    [0, 0, FOREST_TREE_POS.x, FOREST_TREE_POS.z], // NW Road -> Kadim Ağaç & Kara Orman
    [FOREST_TREE_POS.x, FOREST_TREE_POS.z, DARK_FOREST_POS.x, DARK_FOREST_POS.z], // Deep Kara Orman Trail
    [0, 0, PIER_START_X + 2, PIER_Z], // West Road -> Gümüş Göl İskelesi & Viking Ship
    [0, 0, HARBOR_POS.x, HARBOR_POS.z - 14], // South Harbor Highway -> Ana Ada Limanı
  ];

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = groundHeightAt(x, z);
    posAttr.setY(i, y);

    const biome = getBiomeAt(x, z);
    const hL = groundHeightAt(x - 1.5, z);
    const hR = groundHeightAt(x + 1.5, z);
    const hD = groundHeightAt(x, z - 1.5);
    const hU = groundHeightAt(x, z + 1.5);
    const slope = Math.hypot((hR - hL) / 3.0, (hU - hD) / 3.0);

    const distTown = Math.hypot(x - SAFE_ZONE_CENTER.x, z - SAFE_ZONE_CENTER.z);
    if (distTown < SAFE_ZONE_RADIUS - 1.5) {
      const tileVar = Math.sin(x * 0.35) * Math.cos(z * 0.35) * 0.025;
      c.set('#a29783').offsetHSL(0, 0, tileVar);
    } else if (y < WATER_LEVEL + 1.45) {
      c.set(y < WATER_LEVEL - 0.8 ? '#356270' : '#e0c688');
    } else if (biome === 'mountain') {
      if (y > 16.5) {
        c.set('#edf4fa');
      } else if (slope > 0.36 || y > 10.5) {
        c.set('#5c6672');
      } else {
        c.set('#3d613c');
      }
    } else if (biome === 'dark_forest') {
      const mossVar = Math.sin(x * 0.14) * Math.cos(z * 0.14) * 0.04;
      c.set('#1f432e').offsetHSL(mossVar * 0.3, 0.05, mossVar);
    } else if (biome === 'plains') {
      const grain = Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.04;
      const distArena = Math.hypot(x - DESERT_ARENA_POS.x, z - DESERT_ARENA_POS.z);
      if (distArena < 28) {
        c.set('#e5b962').offsetHSL(0, 0, grain * 0.7);
      } else {
        c.set('#cfa046').offsetHSL(0, 0, grain);
      }
    } else if (biome === 'lake') {
      if (y < WATER_LEVEL + 0.65) {
        c.set('#c7b183');
      } else {
        c.set('#3d7b48');
      }
    } else {
      const grassVar = Math.sin(x * 0.08 + z * 0.07) * 0.04;
      c.set('#49873d').offsetHSL(grassVar * 0.25, 0.03, grassVar);
    }

    if (slope > 0.5 && y <= 16.5 && y > WATER_LEVEL + 1.2) {
      c.lerp(new THREE.Color('#5a636e'), Math.min(0.9, (slope - 0.5) * 1.5));
    }

    let minRoad = 999;
    for (const [ax, az, bx, bz] of roads) {
      const d = distToSegment(x, z, ax, az, bx, bz);
      if (d < minRoad) minRoad = d;
    }
    if (minRoad < 4.8 && y > WATER_LEVEL + 0.45 && distTown >= SAFE_ZONE_RADIUS - 3) {
      const roadBlend = 1 - minRoad / 4.8;
      c.lerp(new THREE.Color('#9c8662'), roadBlend * 0.78);
    }

    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: terrainMap,
    bumpMap: terrainBump,
    bumpScale: 0.26,
    roughness: 0.9,
    metalness: 0.02,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  scene.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 2. Colossal Open Ocean Plane Surrounding Main Island, 5 Islands & 4x North Pole (4600m x 4600m)
  const waterGeo = new THREE.PlaneGeometry(4600, 4600, 48, 48);
  waterGeo.rotateX(-Math.PI / 2);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: oceanTex.map,
    bumpMap: oceanTex.bumpMap,
    bumpScale: 0.18,
    roughness: 0.14,
    metalness: 0.36,
    transparent: true,
    opacity: 0.9,
  });
  const waterMesh = new THREE.Mesh(waterGeo, waterMat);
  waterMesh.position.set(0, WATER_LEVEL, 0);
  waterMesh.receiveShadow = true;
  scene.add(waterMesh);
  disposables.push(waterGeo, waterMat);

  // Shared High-Detail Procedural Architectural Materials
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xe0d8ca,
    map: stoneTex.map,
    bumpMap: stoneTex.bumpMap,
    bumpScale: 0.22,
    roughness: 0.86,
    metalness: 0.03,
  });
  const cobbleMat = new THREE.MeshStandardMaterial({
    color: 0xe6ded0,
    map: cobbleTex.map,
    bumpMap: cobbleTex.bumpMap,
    bumpScale: 0.2,
    roughness: 0.88,
    metalness: 0.02,
  });
  const sandstoneMat = new THREE.MeshStandardMaterial({
    color: 0xf2d9ab,
    map: sandstoneTex.map,
    bumpMap: sandstoneTex.bumpMap,
    bumpScale: 0.22,
    roughness: 0.84,
    metalness: 0.03,
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x5c636c,
    map: stoneTex.map,
    bumpMap: stoneTex.bumpMap,
    bumpScale: 0.18,
    roughness: 0.8,
    metalness: 0.08,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: timberTex.map,
    bumpMap: timberTex.bumpMap,
    bumpScale: 0.16,
    roughness: 0.82,
    metalness: 0.02,
  });
  const plasterMat = new THREE.MeshStandardMaterial({
    color: 0xebe1cc,
    roughness: 0.9,
    metalness: 0.01,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: roofTex.map,
    bumpMap: roofTex.bumpMap,
    bumpScale: 0.2,
    roughness: 0.74,
    metalness: 0.04,
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0xcfa048,
    roughness: 0.26,
    metalness: 0.84,
  });
  const bannerMat = new THREE.MeshStandardMaterial({
    color: 0xc23535,
    roughness: 0.84,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe094,
    emissive: 0xffa638,
    emissiveIntensity: 1.25,
    roughness: 0.3,
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x3b4048,
    roughness: 0.36,
    metalness: 0.82,
  });
  const hayMat = new THREE.MeshStandardMaterial({
    color: 0xd9b452,
    roughness: 0.94,
    metalness: 0.0,
  });
  const awningBlueMat = new THREE.MeshStandardMaterial({
    color: 0x2c639c,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });
  const awningGreenMat = new THREE.MeshStandardMaterial({
    color: 0x2d7d4d,
    roughness: 0.86,
    side: THREE.DoubleSide,
  });
  disposables.push(
    stoneMat,
    cobbleMat,
    sandstoneMat,
    darkStoneMat,
    timberMat,
    plasterMat,
    roofMat,
    bronzeMat,
    bannerMat,
    windowGlowMat,
    ironMat,
    hayMat,
    awningBlueMat,
    awningGreenMat
  );

  // ============================================================================
  // 3. REORGANIZED CENTRAL STARTER TOWN (BAŞLANGIÇ KASABASI) AT (0, 0) — RADIUS 38m
  //    SYMMETRICAL BOULEVARDS, GRAND PLAZA, 4 CIVIC DISTRICTS, UNOBSTRUCTED GATES
  // ============================================================================
  const townY = groundHeightAt(SAFE_ZONE_CENTER.x, SAFE_ZONE_CENTER.z);
  const townGroup = new THREE.Group();
  townGroup.position.set(SAFE_ZONE_CENTER.x, townY, SAFE_ZONE_CENTER.z);

  // Grand Cobblestone Town Square + Wide Symmetrical Cardinal Boulevards
  const plazaDisc = new THREE.Mesh(new THREE.CylinderGeometry(28.5, 29.6, 0.24, 48), cobbleMat);
  plazaDisc.position.y = 0.03;
  plazaDisc.receiveShadow = true;
  townGroup.add(plazaDisc);

  const innerMedallion = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.9, 0.28, 32), stoneMat);
  innerMedallion.position.y = 0.05;
  innerMedallion.receiveShadow = true;
  townGroup.add(innerMedallion);

  for (const rotY of [0, Math.PI / 2]) {
    const roadStrip = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.22, 74), cobbleMat);
    roadStrip.position.y = 0.03;
    roadStrip.rotation.y = rotY;
    roadStrip.receiveShadow = true;
    townGroup.add(roadStrip);
  }

  // Decorative Stone Curb Ring & 4 Plaza Benches with Flower Planters
  const flowerLeafMat = new THREE.MeshStandardMaterial({ color: 0x2f8541, roughness: 0.85 });
  const flowerBloomMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.65 });
  disposables.push(flowerLeafMat, flowerBloomMat);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const bx = Math.cos(a) * 6.5;
    const bz = Math.sin(a) * 6.5;
    const bench = new THREE.Group();
    bench.position.set(bx, 0.2, bz);
    bench.rotation.y = -a + Math.PI / 2;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.58), timberMat);
    seat.position.y = 0.42;
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.42, 0.12), timberMat);
    back.position.set(0, 0.68, -0.24);
    const planter = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.48, 0.85), stoneMat);
    planter.position.set(1.6, 0.24, 0);
    const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), flowerLeafMat);
    bush.position.set(1.6, 0.62, 0);
    const bloom = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), flowerBloomMat);
    bloom.position.set(1.65, 0.92, 0.08);
    bench.add(seat, back, planter, bush, bloom);
    townGroup.add(bench);
  }

  // Central Town Hearth & Fountain Brazier at (0, 0)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), darkStoneMat);
    rock.position.set(Math.cos(a) * 1.55, 0.28, Math.sin(a) * 1.55);
    rock.scale.set(1.2, 0.78, 1.1);
    townGroup.add(rock);
  }
  const brazierBasin = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 0.96, 0.58, 12), darkStoneMat);
  brazierBasin.position.y = 0.4;
  townGroup.add(brazierBasin);

  for (let i = 0; i < 4; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.65, 7), timberMat);
    log.position.y = 0.68;
    log.rotation.z = Math.PI / 2.6;
    log.rotation.y = (i / 4) * Math.PI * 2;
    townGroup.add(log);
  }
  const campfireFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.58, 1.55, 7),
    new THREE.MeshStandardMaterial({
      color: 0xffba49,
      emissive: 0xff621a,
      emissiveIntensity: 1.6,
      roughness: 0.35,
    })
  );
  campfireFlame.position.y = 1.22;
  townGroup.add(campfireFlame);

  const campfireLight = new THREE.PointLight(0xffa44c, 5.6, 40, 1.45);
  campfireLight.position.set(0, townY + 3.4, 0);
  scene.add(campfireLight);
  collidables.push({ x: 0, z: 0, radius: 1.8 });

  // 4 Grand Stone-and-Timber Town Gate Arches at radius 35.4m (N, S, E, W)
  const gateAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  gateAngles.forEach((ang) => {
    const gate = new THREE.Group();
    const gx = Math.sin(ang) * 35.4;
    const gz = Math.cos(ang) * 35.4;
    gate.position.set(gx, 0, gz);
    gate.rotation.y = ang;

    const pL = new THREE.Mesh(new THREE.BoxGeometry(1.45, 6.2, 1.45), stoneMat);
    pL.position.set(-4.0, 3.1, 0);
    pL.castShadow = true;
    const pR = pL.clone();
    pR.position.x = 4.0;

    const beam = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.96, 1.6), timberMat);
    beam.position.set(0, 6.3, 0);
    beam.castShadow = true;

    const gateRoof = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.3, 4), roofMat);
    gateRoof.rotation.y = Math.PI / 4;
    gateRoof.scale.set(1.22, 1, 0.45);
    gateRoof.position.set(0, 7.8, 0);
    gateRoof.castShadow = true;

    const gateBanner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), bannerMat);
    gateBanner.position.set(0, 4.6, 0.88);
    bannerMeshes.push(gateBanner);

    for (const sx of [-4.0, 4.0]) {
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.42), windowGlowMat);
      lantern.position.set(sx, 4.9, 0.92);
      gate.add(lantern);
    }

    gate.add(pL, pR, beam, gateRoof, gateBanner);
    townGroup.add(gate);

    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    collidables.push(
      { x: gx - 4.0 * cosA, z: gz + 4.0 * sinA, radius: 1.05 },
      { x: gx + 4.0 * cosA, z: gz - 4.0 * sinA, radius: 1.05 }
    );
  });

  // Town Perimeter Low Stone Walls & Safe-Zone Emerald Lantern Posts at radius 35.4m
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2 + Math.PI / 20;
    const nearGate = gateAngles.some((ga) => {
      const diff = Math.abs(Math.atan2(Math.sin(a - ga), Math.cos(a - ga)));
      return diff < 0.22;
    });
    if (nearGate) continue;

    const wx = Math.sin(a) * 35.4;
    const wz = Math.cos(a) * 35.4;
    const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.0, 0.95), stoneMat);
    wallSeg.position.set(wx, 1.0, wz);
    wallSeg.rotation.y = a;
    wallSeg.castShadow = true;
    wallSeg.receiveShadow = true;
    townGroup.add(wallSeg);

    if (i % 2 === 0) {
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.26, 0),
        new THREE.MeshStandardMaterial({
          color: 0x62f29b,
          emissive: 0x22b862,
          emissiveIntensity: 1.05,
        })
      );
      gem.position.set(wx, 2.5, wz);
      townGroup.add(gem);
    }
    collidables.push({ x: wx, z: wz, radius: 1.5 });
  }

  // ---- BUILDING 1: DEMİRCİ OCAĞI (BLACKSMITH FORGE) AT TOWN_FORGE_POS (11, -6) ----
  const forgeGroup = new THREE.Group();
  forgeGroup.position.set(TOWN_FORGE_POS.x, 0, TOWN_FORGE_POS.z);
  forgeGroup.rotation.y = -Math.PI * 0.22;

  const forgeFloor = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.36, 5.4), darkStoneMat);
  forgeFloor.position.y = 0.18;
  forgeFloor.receiveShadow = true;
  forgeGroup.add(forgeFloor);

  // Back stone hearth & tall chimney
  const forgeWall = new THREE.Mesh(new THREE.BoxGeometry(6.2, 3.6, 1.4), stoneMat);
  forgeWall.position.set(0, 1.9, -1.9);
  forgeWall.castShadow = true;
  const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.8, 6.2, 1.6), darkStoneMat);
  chimney.position.set(-1.6, 3.8, -1.9);
  chimney.castShadow = true;
  const coalBed = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.7, 1.1),
    new THREE.MeshStandardMaterial({
      color: 0xff6b21,
      emissive: 0xff3b00,
      emissiveIntensity: 1.6,
      roughness: 0.4,
    })
  );
  coalBed.position.set(-1.6, 1.15, -1.0);

  // Timber roof posts & sloped shingled canopy
  for (const px of [-2.9, 2.9]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.5, 0.32), timberMat);
    post.position.set(px, 1.95, 2.2);
    post.castShadow = true;
    forgeGroup.add(post);
  }
  const forgeRoof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.42, 6.2), roofMat);
  forgeRoof.position.set(0, 3.95, 0.2);
  forgeRoof.rotation.x = 0.14;
  forgeRoof.castShadow = true;

  // Heavy Iron Anvil on Oak Stump + Quench Barrel + Weapon Rack
  const stump = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.85, 8), timberMat);
  stump.position.set(0.6, 0.65, 0.8);
  const anvilBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.36, 0.48), ironMat);
  anvilBase.position.set(0.6, 1.24, 0.8);
  const anvilHorn = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 6), ironMat);
  anvilHorn.rotation.z = Math.PI / 2;
  anvilHorn.position.set(1.22, 1.28, 0.8);

  const quenchBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.4, 0.95, 10), timberMat);
  quenchBarrel.position.set(2.2, 0.72, 0.8);
  const forgeBeacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffb347,
      emissive: 0xff6e1a,
      emissiveIntensity: 1.3,
    })
  );
  forgeBeacon.position.set(0.6, 2.35, 0.8);

  forgeGroup.add(forgeWall, chimney, coalBed, forgeRoof, stump, anvilBase, anvilHorn, quenchBarrel, forgeBeacon);
  townGroup.add(forgeGroup);
  collidables.push({ x: TOWN_FORGE_POS.x + 0.8, z: TOWN_FORGE_POS.z - 1.2, radius: 2.4 });

  // ---- BUILDING 2: KASABA AHIRI (TOWN STABLE — 400 ALTIN AT) AT TOWN_STABLE_POS (-12, -6) ----
  const stableGroup = new THREE.Group();
  stableGroup.position.set(TOWN_STABLE_POS.x, 0, TOWN_STABLE_POS.z);
  stableGroup.rotation.y = Math.PI * 0.22;

  const stableFloor = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.24, 5.8), timberMat);
  stableFloor.position.y = 0.12;
  stableFloor.receiveShadow = true;
  stableGroup.add(stableFloor);

  const stableBack = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.6, 0.45), timberMat);
  stableBack.position.set(0, 1.9, -2.6);
  stableBack.castShadow = true;
  stableGroup.add(stableBack);

  for (const sx of [-3.4, 0, 3.4]) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.6, 0.34), timberMat);
    sp.position.set(sx, 1.9, 2.4);
    sp.castShadow = true;
    stableGroup.add(sp);
  }
  const stableRoof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 2.4, 4), roofMat);
  stableRoof.rotation.y = Math.PI / 4;
  stableRoof.scale.set(1.22, 1.0, 0.92);
  stableRoof.position.set(0, 4.75, 0);
  stableRoof.castShadow = true;
  stableGroup.add(stableRoof);

  // Wooden Corral Fence + Golden Hay Bales + Water Trough
  const fenceRail = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 0.16), timberMat);
  fenceRail.position.set(-1.7, 1.05, 2.4);
  const hay1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.85, 0.95), hayMat);
  hay1.position.set(-2.2, 0.55, -1.2);
  const hay2 = hay1.clone();
  hay2.position.set(-1.9, 1.32, -1.2);
  hay2.rotation.y = 0.22;
  const trough = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.72), darkStoneMat);
  trough.position.set(2.1, 0.42, 1.6);
  stableGroup.add(fenceRail, hay1, hay2, trough);

  // Display Warhorse tethered inside the Town Stable so players immediately spot where to buy a horse!
  const displayHorse = buildHorseRig(propShadowTex);
  displayHorse.root.position.set(1.4, 0.22, -0.3);
  displayHorse.root.rotation.y = -0.35;
  stableGroup.add(displayHorse.root);

  townGroup.add(stableGroup);
  collidables.push({ x: TOWN_STABLE_POS.x - 1.2, z: TOWN_STABLE_POS.z - 1.0, radius: 2.6 });

  // ---- 4 DETAILED TIMBER-FRAMED MEDIEVAL COTTAGES AROUND STARTER TOWN ----
  const buildCottage = (cx: number, cz: number, rotY: number) => {
    const house = new THREE.Group();
    house.position.set(cx, 0, cz);
    house.rotation.y = rotY;

    const foundation = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.9, 6.2), stoneMat);
    foundation.position.y = 0.45;
    foundation.castShadow = true;
    foundation.receiveShadow = true;

    const walls = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.4, 5.8), plasterMat);
    walls.position.y = 2.55;
    walls.castShadow = true;
    walls.receiveShadow = true;

    // Corner timber framing pillars & horizontal lintels
    for (const bx of [-3.4, 3.4]) {
      for (const bz of [-2.9, 2.9]) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.36, 3.6, 0.36), timberMat);
        beam.position.set(bx, 2.55, bz);
        house.add(beam);
      }
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.28, 6.0), timberMat);
    crossBeam.position.y = 4.25;

    // Terracotta Shingle Pitched Roof + Stone Chimney
    const houseRoof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 3.3, 4), roofMat);
    houseRoof.rotation.y = Math.PI / 4;
    houseRoof.scale.set(1.12, 1, 0.98);
    houseRoof.position.y = 5.95;
    houseRoof.castShadow = true;

    const houseChimney = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.6, 0.95), stoneMat);
    houseChimney.position.set(1.8, 6.3, -1.1);
    houseChimney.castShadow = true;

    // Oak Door + Warm Glowing Windows
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.35, 0.22), timberMat);
    door.position.set(0, 1.85, 2.95);
    for (const wx of [-2.0, 2.0]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.15, 0.18), windowGlowMat);
      win.position.set(wx, 2.55, 2.94);
      const shutter = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.16, 0.28), timberMat);
      shutter.position.set(wx, 1.94, 2.98);
      house.add(win, shutter);
    }

    house.add(foundation, walls, crossBeam, houseRoof, houseChimney, door);
    townGroup.add(house);
    collidables.push({ x: cx, z: cz, radius: 4.1 });
  };

  // Symmetrical Outer Residential Terrace Cottages (clear of the 4 wide cardinal boulevards!)
  buildCottage(-24, 24, Math.PI * 0.75);
  buildCottage(24, 24, -Math.PI * 0.75);
  buildCottage(-24, -24, Math.PI * 0.25);
  buildCottage(24, -24, -Math.PI * 0.25);

  // ---- SW QUADRANT: MARKET SQUARE WITH TWIN COLORFUL STALLS AT (-18, 12) ----
  const buildMarketStall = (mx: number, mz: number, rotY: number, mat: THREE.Material) => {
    const stall = new THREE.Group();
    stall.position.set(mx, 0, mz);
    stall.rotation.y = rotY;

    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.05, 1.5), timberMat);
    counter.position.y = 0.55;
    counter.castShadow = true;
    stall.add(counter);

    for (const px of [-1.6, 1.6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 3.0, 6), timberMat);
      pole.position.set(px, 1.5, -0.6);
      stall.add(pole);
    }
    const awning = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.14, 2.2), mat);
    awning.position.set(0, 2.9, 0.1);
    awning.rotation.x = 0.24;
    awning.castShadow = true;
    stall.add(awning);

    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.76, 0.76), timberMat);
    crate.position.set(-2.2, 0.4, 0.15);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.34, 0.88, 10), timberMat);
    barrel.position.set(2.2, 0.46, 0.2);
    stall.add(crate, barrel);

    townGroup.add(stall);
    collidables.push({ x: mx, z: mz, radius: 2.0 });
  };

  buildMarketStall(-14.5, 10.5, Math.PI * 0.72, awningBlueMat);
  buildMarketStall(-19.5, 15.5, Math.PI * 0.78, awningGreenMat);

  // Town Street Lanterns symmetrically lining the Grand Plaza
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const lx = Math.cos(a) * 11.2;
    const lz = Math.sin(a) * 11.2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.8, 7), ironMat);
    post.position.set(lx, 1.9, lz);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.1, 0.1), ironMat);
    arm.position.set(lx, 3.65, lz);
    const globe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.38), windowGlowMat);
    globe.position.set(lx, 3.4, lz);
    townGroup.add(post, arm, globe);
  }

  scene.add(townGroup);

  // ============================================================================
  // 4. NORTH WATCHTOWER AT (11, -43) — FLANKING THE NORTH HIGHWAY OUTSIDE NORTH GATE
  // ============================================================================
  const towerX = 11;
  const towerZ = -43;
  const towerY = groundHeightAt(towerX, towerZ);
  const tower = new THREE.Group();
  tower.position.set(towerX, towerY - 0.25, towerZ);

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 2.4, 8), darkStoneMat);
  plinth.position.y = 1.2;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.8, 11.5, 8), stoneMat);
  shaft.position.y = 7.8;
  shaft.castShadow = true;
  const galleryFloor = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 2.5, 1.1, 8), timberMat);
  galleryFloor.position.y = 13.8;
  const towerRoof = new THREE.Mesh(new THREE.ConeGeometry(4.0, 4.4, 8), roofMat);
  towerRoof.position.y = 18.6;
  towerRoof.castShadow = true;
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 2.2, 8), bronzeMat);
  finial.position.y = 21.5;
  const towerBanner = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.1, 4, 1), bannerMat);
  towerBanner.position.set(1.45, 21.6, 0);
  bannerMeshes.push(towerBanner);
  tower.add(plinth, shaft, galleryFloor, towerRoof, finial, towerBanner);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.6, 0.24), timberMat);
    post.position.set(Math.cos(a) * 2.9, 15.5, Math.sin(a) * 2.9);
    tower.add(post);
  }
  scene.add(tower);
  collidables.push({ x: towerX, z: towerZ, radius: 3.5 });

  // ============================================================================
  // 5. ALTIN ÇÖL ARENASI (5-WAVE DESERT COLOSSEUM AT 122, 10)
  // ============================================================================
  const duelY = groundHeightAt(DESERT_ARENA_POS.x, DESERT_ARENA_POS.z);
  const duelGroup = new THREE.Group();
  duelGroup.position.set(DESERT_ARENA_POS.x, duelY, DESERT_ARENA_POS.z);

  const arenaSandDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(16.2, 16.8, 0.2, 40),
    new THREE.MeshStandardMaterial({
      color: 0xe3ba6c,
      bumpMap: terrainBump,
      bumpScale: 0.14,
      roughness: 0.92,
    })
  );
  arenaSandDisc.position.y = 0.04;
  arenaSandDisc.receiveShadow = true;
  duelGroup.add(arenaSandDisc);

  const ringBorder = new THREE.Mesh(
    new THREE.RingGeometry(15.6, 17.2, 44),
    new THREE.MeshStandardMaterial({
      color: 0xc94238,
      roughness: 0.78,
      side: THREE.DoubleSide,
    })
  );
  ringBorder.rotation.x = -Math.PI / 2;
  ringBorder.position.y = 0.16;
  duelGroup.add(ringBorder);

  // 7 Sandstone Colosseum Obelisk Pillars & Grand Arches (South i===2 left open for clear fixed-camera view)
  for (let i = 0; i < 8; i++) {
    if (i === 2) continue;
    const a = (i / 8) * Math.PI * 2;
    const ox = Math.cos(a) * 17.8;
    const oz = Math.sin(a) * 17.8;

    if (i % 2 === 1) {
      // Grand Sandstone Arch
      const arch = new THREE.Group();
      arch.position.set(ox, 0, oz);
      arch.rotation.y = -a + Math.PI / 2;

      const pL = new THREE.Mesh(new THREE.BoxGeometry(1.15, 6.2, 1.15), sandstoneMat);
      pL.position.set(-2.5, 3.1, 0);
      pL.castShadow = true;
      const pR = pL.clone();
      pR.position.x = 2.5;
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.0, 1.35), sandstoneMat);
      lintel.position.set(0, 6.4, 0);
      lintel.castShadow = true;
      const crest = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.1, 0.55), bronzeMat);
      crest.position.set(0, 7.35, 0);
      const arenaBanner = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.5), bannerMat);
      arenaBanner.position.set(0, 4.6, 0.72);
      bannerMeshes.push(arenaBanner);

      arch.add(pL, pR, lintel, crest, arenaBanner);
      duelGroup.add(arch);
    } else {
      // Obelisk Brazier Pillar
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 5.2, 6), sandstoneMat);
      pillar.position.set(ox, 2.6, oz);
      pillar.castShadow = true;
      const fire = new THREE.Mesh(
        new THREE.ConeGeometry(0.45, 1.1, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffb347,
          emissive: 0xff5a12,
          emissiveIntensity: 1.5,
        })
      );
      fire.position.set(ox, 5.75, oz);
      duelGroup.add(pillar, fire);
      collidables.push({ x: DESERT_ARENA_POS.x + ox, z: DESERT_ARENA_POS.z + oz, radius: 1.0 });
    }
  }

  // Legendary Desert Spear Pedestal on the North rim of the Arena
  const desertSpearRelic = new THREE.Group();
  desertSpearRelic.position.set(0, 0.2, -13.2);
  const spearPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.45, 1.2, 8), darkStoneMat);
  spearPedestal.position.y = 0.6;
  const spearHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.08, 8, 24),
    new THREE.MeshStandardMaterial({
      color: 0xff5a45,
      emissive: 0xc9261c,
      emissiveIntensity: 1.3,
      roughness: 0.2,
    })
  );
  spearHalo.rotation.x = Math.PI / 2;
  spearHalo.position.y = 1.35;
  const relicSpearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 3.4, 8), bronzeMat);
  relicSpearShaft.position.y = 2.95;
  const relicSpearHead = new THREE.Mesh(
    new THREE.ConeGeometry(0.26, 0.9, 4),
    new THREE.MeshStandardMaterial({
      color: 0xff8052,
      emissive: 0xd93626,
      emissiveIntensity: 1.4,
      roughness: 0.16,
      metalness: 0.85,
    })
  );
  relicSpearHead.position.y = 4.9;
  desertSpearRelic.add(spearPedestal, spearHalo, relicSpearShaft, relicSpearHead);
  duelGroup.add(desertSpearRelic);
  scene.add(duelGroup);

  // ============================================================================
  // 6. BOZDAĞ ZİRVE KRİSTALİ AT (0, -158) — BLUE GUARDIAN'S MACE SHRINE
  // ============================================================================
  const summitY = groundHeightAt(MOUNTAIN_CRYSTAL_POS.x, MOUNTAIN_CRYSTAL_POS.z);
  const summitGroup = new THREE.Group();
  summitGroup.position.set(MOUNTAIN_CRYSTAL_POS.x, summitY - 0.35, MOUNTAIN_CRYSTAL_POS.z);

  const dais1 = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.8, 0.72, 12), darkStoneMat);
  dais1.position.y = 0.36;
  dais1.receiveShadow = true;
  const dais2 = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.4, 0.62, 12), stoneMat);
  dais2.position.y = 1.02;
  dais2.receiveShadow = true;
  summitGroup.add(dais1, dais2);

  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.62, 6.2, 4), darkStoneMat);
    obelisk.position.set(Math.cos(a) * 5.4, 3.4, Math.sin(a) * 5.4);
    obelisk.castShadow = true;
    summitGroup.add(obelisk);
  }

  const summitCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.5, 0),
    new THREE.MeshStandardMaterial({
      color: 0x4fc3ff,
      emissive: 0x1d7ed6,
      emissiveIntensity: 1.5,
      roughness: 0.12,
      metalness: 0.45,
    })
  );
  summitCrystal.position.y = 4.1;
  summitGroup.add(summitCrystal);
  scene.add(summitGroup);

  // ============================================================================
  // 7. KADİM ORMAN AĞACI AT (-58, -48) — GREEN ARCHER'S BOW SHRINE (EDGE OF KARA ORMAN)
  // ============================================================================
  const forestY = groundHeightAt(FOREST_TREE_POS.x, FOREST_TREE_POS.z);
  const forestGroup = new THREE.Group();
  forestGroup.position.set(FOREST_TREE_POS.x, forestY - 0.25, FOREST_TREE_POS.z);

  const ancientBarkMat = new THREE.MeshStandardMaterial({
    color: 0x6b4b34,
    map: darkBarkTex.map,
    bumpMap: darkBarkTex.bumpMap,
    bumpScale: 0.24,
    roughness: 0.92,
  });
  const ancientLeafMat = new THREE.MeshStandardMaterial({
    color: 0x2a8f54,
    emissive: 0x103b22,
    emissiveIntensity: 0.35,
    roughness: 0.78,
  });
  const emeraldGlowMat = new THREE.MeshStandardMaterial({
    color: 0x62f29b,
    emissive: 0x22b862,
    emissiveIntensity: 1.4,
    roughness: 0.18,
  });
  disposables.push(ancientBarkMat, ancientLeafMat, emeraldGlowMat);

  const sacredTrunk = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 2.0, 8.2, 10), ancientBarkMat);
  sacredTrunk.position.y = 4.1;
  sacredTrunk.castShadow = true;
  forestGroup.add(sacredTrunk);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.4, 2.4), ancientBarkMat);
    rootMesh.position.set(Math.cos(a) * 1.8, 0.55, Math.sin(a) * 1.8);
    rootMesh.rotation.y = -a + Math.PI / 2;
    rootMesh.rotation.x = 0.28;
    forestGroup.add(rootMesh);

    const runeStone = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), emeraldGlowMat);
    runeStone.position.set(Math.cos(a + 0.3) * 4.8, 0.9, Math.sin(a + 0.3) * 4.8);
    forestGroup.add(runeStone);
  }

  const canopyOffsets: [number, number, number, number][] = [
    [0, 9.6, 0, 4.6],
    [-2.8, 8.2, 1.8, 3.1],
    [2.9, 8.4, -1.6, 3.2],
    [2.0, 8.0, 2.4, 2.8],
    [-2.2, 8.6, -2.3, 2.9],
  ];
  for (const [cx, cy, cz, cr] of canopyOffsets) {
    const dome = new THREE.Mesh(new THREE.DodecahedronGeometry(cr, 1), ancientLeafMat);
    dome.position.set(cx, cy, cz);
    dome.scale.set(1.08, 0.78, 1.08);
    dome.castShadow = true;
    forestGroup.add(dome);
  }

  const forestTreeRelic = new THREE.Group();
  forestTreeRelic.position.set(0, 2.5, 3.6);
  const relicBow = buildRecurveBowGroup({
    woodColor: 0x2d8a52,
    emissiveColor: 0x104d2a,
    trimColor: 0xf2cb5c,
    stringColor: 0xf7fff2,
    arrowGlowColor: 0x62f29b,
    scale: 1.45,
  });
  forestTreeRelic.add(relicBow);
  forestGroup.add(forestTreeRelic);

  scene.add(forestGroup);
  collidables.push({ x: FOREST_TREE_POS.x, z: FOREST_TREE_POS.z, radius: 2.0 });

  // ============================================================================
  // 8. GÜMÜŞ GÖL BÜYÜK KÖPRÜSÜ & VİKİNG DRAKKAR GEMİSİ AT (-134, 24)
  // ============================================================================
  const pierGroup = new THREE.Group();
  const bridgeWidth = PIER_HALF_WIDTH * 2; // 8.4m wide grand bridge
  const mainStartX = PIER_START_X - 5;
  const mainLen = mainStartX - PIER_END_X + 1.2;
  const mainCenterX = (mainStartX + PIER_END_X - 0.6) * 0.5;

  // Main wide bridge span across Silver Lake right onto the Viking Ship deck
  const deck = new THREE.Mesh(new THREE.BoxGeometry(mainLen, 0.36, bridgeWidth), timberMat);
  deck.position.set(mainCenterX, (PIER_DECK_Y + VIKING_DECK_Y) * 0.5 - 0.16, PIER_Z);
  deck.rotation.z = -Math.atan2(VIKING_DECK_Y - PIER_DECK_Y, mainLen);
  deck.receiveShadow = true;
  deck.castShadow = true;
  pierGroup.add(deck);

  // Dry-shore approach ramp connecting the West road cleanly up onto the bridge
  const shoreX = PIER_START_X + 3.5;
  const shoreY = Math.max(WATER_LEVEL + 0.5, groundHeightAt(shoreX, PIER_Z));
  const rampLen = shoreX - mainStartX + 0.6;
  const rampMesh = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.36, bridgeWidth), timberMat);
  rampMesh.position.set((shoreX + mainStartX) * 0.5, (shoreY + PIER_DECK_Y) * 0.5 - 0.16, PIER_Z);
  rampMesh.rotation.z = -Math.atan2(PIER_DECK_Y - shoreY, rampLen);
  rampMesh.receiveShadow = true;
  rampMesh.castShadow = true;
  pierGroup.add(rampMesh);

  // Heavy side timber beams, deep lake pilings, guardrails, and bridge lanterns
  const sideCurbGeo = new THREE.BoxGeometry(mainLen, 0.28, 0.36);
  const railBarGeo = new THREE.BoxGeometry(mainLen, 0.14, 0.14);
  for (const side of [-1, 1]) {
    const edgeZ = PIER_Z + side * (PIER_HALF_WIDTH - 0.18);
    const curb = new THREE.Mesh(sideCurbGeo, darkStoneMat);
    curb.position.set(mainCenterX, (PIER_DECK_Y + VIKING_DECK_Y) * 0.5 + 0.08, edgeZ);
    curb.rotation.z = deck.rotation.z;
    const topRail = new THREE.Mesh(railBarGeo, timberMat);
    topRail.position.set(mainCenterX, (PIER_DECK_Y + VIKING_DECK_Y) * 0.5 + 1.02, edgeZ);
    topRail.rotation.z = deck.rotation.z;
    pierGroup.add(curb, topRail);
  }
  disposables.push(sideCurbGeo, railBarGeo);

  const pilingGeo = new THREE.CylinderGeometry(0.24, 0.28, 7.6, 8);
  const postGeo = new THREE.BoxGeometry(0.22, 1.15, 0.22);
  const numBays = 12;
  for (let i = 0; i <= numBays; i++) {
    const t = i / numBays;
    const px = mainStartX - t * (mainStartX - PIER_END_X);
    const py = PIER_DECK_Y + t * (VIKING_DECK_Y - PIER_DECK_Y);
    for (const side of [-1, 1]) {
      const pz = PIER_Z + side * (PIER_HALF_WIDTH - 0.2);
      const piling = new THREE.Mesh(pilingGeo, timberMat);
      piling.position.set(px, py - 3.6, pz);
      const post = new THREE.Mesh(postGeo, timberMat);
      post.position.set(px, py + 0.55, pz);
      pierGroup.add(piling, post);

      // Glowing Nordic lanterns every 2nd bay along the bridge
      if (i % 3 === 0) {
        const lPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 6), timberMat);
        lPole.position.set(px, py + 1.25, pz);
        const lGlow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.44, 0.38), windowGlowMat);
        lGlow.position.set(px, py + 2.55, pz);
        pierGroup.add(lPole, lGlow);
      }
    }
  }
  disposables.push(pilingGeo, postGeo);

  // Grand stone-and-timber entrance pillars flanking the dry shore mouth of the bridge
  for (const side of [-1, 1]) {
    const entPillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.6, 0.9), darkStoneMat);
    entPillar.position.set(shoreX + 0.2, shoreY + 1.7, PIER_Z + side * (PIER_HALF_WIDTH + 0.45));
    entPillar.castShadow = true;
    const entLamp = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.46), windowGlowMat);
    entLamp.position.set(shoreX + 0.2, shoreY + 3.72, PIER_Z + side * (PIER_HALF_WIDTH + 0.45));
    pierGroup.add(entPillar, entLamp);
  }
  scene.add(pierGroup);

  // 3D Viking Drakkar Longship on Silver Lake (-134, 24)
  const vikingShipGroup = new THREE.Group();
  vikingShipGroup.position.set(VIKING_SHIP_POS.x, WATER_LEVEL, VIKING_SHIP_POS.z);

  const darkOakMat = new THREE.MeshStandardMaterial({
    color: 0x4d311f,
    map: timberTex.map,
    bumpMap: timberTex.bumpMap,
    bumpScale: 0.16,
    roughness: 0.85,
    metalness: 0.04,
  });
  const deckPlankMat = new THREE.MeshStandardMaterial({
    color: 0x7c5536,
    map: timberTex.map,
    bumpMap: timberTex.bumpMap,
    bumpScale: 0.12,
    roughness: 0.84,
    metalness: 0.02,
  });
  const vikingIronMat = new THREE.MeshStandardMaterial({
    color: 0x9aa4b0,
    roughness: 0.32,
    metalness: 0.78,
  });
  const shieldRedMat = new THREE.MeshStandardMaterial({ color: 0xb83028, roughness: 0.65 });
  const shieldBlueMat = new THREE.MeshStandardMaterial({ color: 0x265c96, roughness: 0.65 });

  const sailCanvas = document.createElement('canvas');
  sailCanvas.width = 256;
  sailCanvas.height = 256;
  const sCtx = sailCanvas.getContext('2d')!;
  const stripes = 8;
  for (let i = 0; i < stripes; i++) {
    sCtx.fillStyle = i % 2 === 0 ? '#b82925' : '#f2ead8';
    sCtx.fillRect((i * 256) / stripes, 0, 256 / stripes + 1, 256);
  }
  const sailTex = new THREE.CanvasTexture(sailCanvas);
  sailTex.colorSpace = THREE.SRGBColorSpace;
  const sailMat = new THREE.MeshStandardMaterial({
    map: sailTex,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  disposables.push(darkOakMat, deckPlankMat, vikingIronMat, shieldRedMat, shieldBlueMat, sailTex, sailMat);

  const hullBase = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.5, 16.0), darkOakMat);
  hullBase.position.y = 0.45;
  hullBase.castShadow = true;
  hullBase.receiveShadow = true;
  vikingShipGroup.add(hullBase);

  const deckSurface = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.26, 17.5), deckPlankMat);
  deckSurface.position.y = VIKING_DECK_Y - WATER_LEVEL - 0.13;
  deckSurface.receiveShadow = true;
  vikingShipGroup.add(deckSurface);

  const bowHull = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.8, 5.2, 4), darkOakMat);
  bowHull.rotation.y = Math.PI / 4;
  bowHull.rotation.x = -Math.PI / 2;
  bowHull.scale.set(1.05, 1.0, 0.45);
  bowHull.position.set(0, 0.72, -10.4);
  vikingShipGroup.add(bowHull);

  const sternHull = bowHull.clone();
  sternHull.rotation.x = Math.PI / 2;
  sternHull.position.set(0, 0.72, 10.4);
  vikingShipGroup.add(sternHull);

  const portRail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, 16.6), darkOakMat);
  portRail.position.set(-4.0, 1.55, 0);
  const stbdRailNorth = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, 5.8), darkOakMat);
  stbdRailNorth.position.set(4.0, 1.55, -5.4);
  const stbdRailSouth = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, 5.8), darkOakMat);
  stbdRailSouth.position.set(4.0, 1.55, 5.4);
  vikingShipGroup.add(portRail, stbdRailNorth, stbdRailSouth);

  const dragonNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.65, 4.6, 8), darkOakMat);
  dragonNeck.position.set(0, 3.1, -11.4);
  dragonNeck.rotation.x = 0.25;
  const dragonHead = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 2.0), darkOakMat);
  dragonHead.position.set(0, 5.3, -12.4);
  const dragonCrest = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.35, 5), bronzeMat);
  dragonCrest.position.set(0, 6.1, -11.7);
  dragonCrest.rotation.x = 0.45;
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), windowGlowMat);
  eyeL.position.set(-0.46, 5.45, -12.7);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.46;
  vikingShipGroup.add(dragonNeck, dragonHead, dragonCrest, eyeL, eyeR);

  const tailSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.58, 4.2, 8), darkOakMat);
  tailSpine.position.set(0, 2.8, 11.4);
  tailSpine.rotation.x = -0.25;
  const tailCurl = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.22, 8, 14, Math.PI * 1.4), bronzeMat);
  tailCurl.position.set(0, 5.1, 11.9);
  tailCurl.rotation.y = Math.PI / 2;
  vikingShipGroup.add(tailSpine, tailCurl);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 13.8, 10), darkOakMat);
  mast.position.set(0, 7.6, -1.0);
  mast.castShadow = true;
  const yardarm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 10.6, 8), darkOakMat);
  yardarm.rotation.z = Math.PI / 2;
  yardarm.position.set(0, 12.2, -1.0);
  const lowerYard = yardarm.clone();
  lowerYard.position.set(0, 5.4, -1.0);

  const sailGeo = new THREE.PlaneGeometry(9.6, 6.8, 10, 6);
  const sailPos = sailGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < sailPos.count; i++) {
    const sx = sailPos.getX(i);
    const sy = sailPos.getY(i);
    sailPos.setZ(i, Math.cos((sx / 9.6) * Math.PI) * Math.cos((sy / 6.8) * Math.PI) * 1.35);
  }
  sailGeo.computeVertexNormals();
  const vikingSailMesh = new THREE.Mesh(sailGeo, sailMat);
  vikingSailMesh.position.set(0, 8.8, -0.8);
  vikingSailMesh.castShadow = true;
  disposables.push(sailGeo);

  const mastBanner = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.1), bannerMat);
  mastBanner.position.set(1.65, 14.2, -1.0);
  bannerMeshes.push(mastBanner);
  vikingShipGroup.add(mast, yardarm, lowerYard, vikingSailMesh, mastBanner);

  const shieldGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.14, 14);
  const bossGeo = new THREE.SphereGeometry(0.22, 8, 8);
  const oarGeo = new THREE.CylinderGeometry(0.06, 0.08, 5.2, 6);
  disposables.push(shieldGeo, bossGeo, oarGeo);

  const shieldZPositions = [-6.8, -4.4, -2.0, 2.2, 4.6, 7.0];
  shieldZPositions.forEach((sz, idx) => {
    for (const side of [-1, 1]) {
      if (side === 1 && Math.abs(sz) < 2.5) continue;
      const sh = new THREE.Group();
      sh.position.set(side * 4.28, 1.55, sz);
      const disc = new THREE.Mesh(
        shieldGeo,
        (idx + (side > 0 ? 1 : 0)) % 2 === 0 ? shieldRedMat : shieldBlueMat
      );
      disc.rotation.z = Math.PI / 2;
      const boss = new THREE.Mesh(bossGeo, vikingIronMat);
      boss.position.x = side * 0.08;
      sh.add(disc, boss);
      vikingShipGroup.add(sh);

      if (idx % 2 === 0) {
        const oar = new THREE.Mesh(oarGeo, timberMat);
        oar.position.set(side * 5.6, 0.55, sz);
        oar.rotation.z = side * 1.15;
        vikingShipGroup.add(oar);
      }
    }
  });

  for (const bz of [-6.4, 6.4]) {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.32, 0.6, 8), darkStoneMat);
    bowl.position.set(-2.3, 1.55, bz);
    const fire = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.9, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffa838,
        emissive: 0xff5a12,
        emissiveIntensity: 1.5,
      })
    );
    fire.position.set(-2.3, 2.15, bz);
    vikingShipGroup.add(bowl, fire);
  }

  scene.add(vikingShipGroup);
  collidables.push({ x: VIKING_SHIP_POS.x, z: VIKING_SHIP_POS.z - 1.0, radius: 0.72 });

  // ============================================================================
  // 9. KARA ORMAN (DENSE TOWERING DARK FOREST AROUND -86, -64) — 280+ GIANT TREES!
  // ============================================================================
  const rand = seededRandom(20261124);
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  const isClearForProp = (x: number, z: number, minPad = 5.2): boolean => {
    if (Math.hypot(x, z) > MAIN_ISLAND_RADIUS - 16) return false;
    if (Math.hypot(x - SAFE_ZONE_CENTER.x, z - SAFE_ZONE_CENTER.z) < SAFE_ZONE_RADIUS + 4) return false;
    if (Math.hypot(x - TOWN_TAVERN_POS.x, z - TOWN_TAVERN_POS.z) < 8) return false;
    if (Math.hypot(x - HARBOR_POS.x, z - HARBOR_POS.z) < 34) return false;
    if (Math.hypot(x - DESERT_ARENA_POS.x, z - DESERT_ARENA_POS.z) < 23) return false;
    if (Math.hypot(x - MOUNTAIN_CRYSTAL_POS.x, z - MOUNTAIN_CRYSTAL_POS.z) < 14) return false;
    if (Math.hypot(x - FOREST_TREE_POS.x, z - FOREST_TREE_POS.z) < 11) return false;
    if (Math.hypot(x - VIKING_SHIP_POS.x, z - VIKING_SHIP_POS.z) < 24) return false;
    if (x >= PIER_END_X - 5 && x <= PIER_START_X + 12 && Math.abs(z - PIER_Z) < PIER_HALF_WIDTH + 5.5) return false;
    for (const [ax, az, bx, bz] of roads) {
      if (distToSegment(x, z, ax, az, bx, bz) < minPad) return false;
    }
    return true;
  };

  // Towering Ancient Dark Forest Redwoods/Spruces (14m – 22m tall, tall clear trunks so fixed camera always has clean sightlines!)
  const darkForestTrees: { x: number; y: number; z: number; s: number; hMult: number; rot: number }[] = [];
  for (let i = 0; i < 1050 && darkForestTrees.length < 285; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (DARK_FOREST_RADIUS + 6);
    const x = DARK_FOREST_POS.x + Math.cos(a) * r;
    const z = DARK_FOREST_POS.z + Math.sin(a) * r;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 1.0) continue;
    if (Math.hypot(x - FOREST_TREE_POS.x, z - FOREST_TREE_POS.z) < 10.5) continue;
    // Keep forest footpath & Elf glade clear enough for clean combat sightlines
    if (distToSegment(x, z, FOREST_TREE_POS.x, FOREST_TREE_POS.z, DARK_FOREST_POS.x, DARK_FOREST_POS.z) < 5.6) {
      continue;
    }
    if (Math.hypot(x - DARK_FOREST_POS.x, z - DARK_FOREST_POS.z) < 11.5) continue; // Central Elf clearing
    darkForestTrees.push({
      x,
      y,
      z,
      s: 0.88 + rand() * 0.42,
      hMult: 1.2 + rand() * 0.52, // Towering 14m–22m old-growth giants
      rot: rand() * Math.PI * 2,
    });
  }

  const dfTrunkGeo = new THREE.CylinderGeometry(0.24, 0.48, 9.2, 7);
  dfTrunkGeo.translate(0, 4.6, 0);
  const dfTrunkMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: darkBarkTex.map,
    bumpMap: darkBarkTex.bumpMap,
    bumpScale: 0.22,
    roughness: 0.94,
  });
  const dfCone1Geo = new THREE.ConeGeometry(1.95, 4.2, 7);
  dfCone1Geo.translate(0, 10.2, 0);
  const dfCone2Geo = new THREE.ConeGeometry(1.5, 3.8, 7);
  dfCone2Geo.translate(0, 12.6, 0);
  const dfCone3Geo = new THREE.ConeGeometry(1.0, 3.2, 7);
  dfCone3Geo.translate(0, 14.8, 0);
  const dfLeafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86 });

  const dfTrunkInst = new THREE.InstancedMesh(dfTrunkGeo, dfTrunkMat, darkForestTrees.length);
  const dfCone1Inst = new THREE.InstancedMesh(dfCone1Geo, dfLeafMat, darkForestTrees.length);
  const dfCone2Inst = new THREE.InstancedMesh(dfCone2Geo, dfLeafMat, darkForestTrees.length);
  const dfCone3Inst = new THREE.InstancedMesh(dfCone3Geo, dfLeafMat, darkForestTrees.length);

  darkForestTrees.forEach((t, idx) => {
    dummy.position.set(t.x, t.y - 0.25, t.z);
    dummy.rotation.set(0, t.rot, 0);
    dummy.scale.set(t.s, t.hMult, t.s);
    dummy.updateMatrix();
    dfTrunkInst.setMatrixAt(idx, dummy.matrix);
    dfCone1Inst.setMatrixAt(idx, dummy.matrix);
    dfCone2Inst.setMatrixAt(idx, dummy.matrix);
    dfCone3Inst.setMatrixAt(idx, dummy.matrix);

    tint.set('#143326').offsetHSL((rand() - 0.5) * 0.04, 0.04, (rand() - 0.5) * 0.06);
    dfCone1Inst.setColorAt(idx, tint);
    tint.offsetHSL(0, 0, 0.03);
    dfCone2Inst.setColorAt(idx, tint);
    tint.offsetHSL(0, 0, 0.03);
    dfCone3Inst.setColorAt(idx, tint);

    if (idx % 2 === 0 && Math.hypot(t.x, t.z) < MAIN_ISLAND_RADIUS - 10) {
      collidables.push({ x: t.x, z: t.z, radius: 0.7 * t.s });
    }
  });
  dfTrunkInst.computeBoundingSphere();
  dfCone1Inst.computeBoundingSphere();
  dfCone2Inst.computeBoundingSphere();
  dfCone3Inst.computeBoundingSphere();
  dfTrunkInst.castShadow = true;
  dfCone1Inst.castShadow = true;
  scene.add(dfTrunkInst, dfCone1Inst, dfCone2Inst, dfCone3Inst);
  disposables.push(dfTrunkGeo, dfTrunkMat, dfCone1Geo, dfCone2Geo, dfCone3Geo, dfLeafMat);

  // Fallen Mossy Ancient Logs inside Kara Orman
  const logGeo = new THREE.CylinderGeometry(0.38, 0.46, 5.2, 7);
  logGeo.rotateZ(Math.PI / 2);
  const logInst = new THREE.InstancedMesh(logGeo, dfTrunkMat, 18);
  let placedLogs = 0;
  for (let i = 0; i < 60 && placedLogs < 18; i++) {
    const a = rand() * Math.PI * 2;
    const r = 10 + rand() * (DARK_FOREST_RADIUS - 12);
    const lx = DARK_FOREST_POS.x + Math.cos(a) * r;
    const lz = DARK_FOREST_POS.z + Math.sin(a) * r;
    const ly = groundHeightAt(lx, lz);
    if (ly < WATER_LEVEL + 1.0) continue;
    dummy.position.set(lx, ly + 0.28, lz);
    dummy.rotation.set(0, rand() * Math.PI, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    logInst.setMatrixAt(placedLogs++, dummy.matrix);
  }
  logInst.count = placedLogs;
  logInst.computeBoundingSphere();
  scene.add(logInst);
  disposables.push(logGeo);

  // ============================================================================
  // 10. REGIONAL NATURE PROPS ACROSS THE 5× WORLD (PINES, OAKS, BOULDERS, TUFTS)
  // ============================================================================
  const pinePositions: { x: number; y: number; z: number; s: number; rot: number }[] = [];
  for (let i = 0; i < 900 && pinePositions.length < 200; i++) {
    const angle = rand() * Math.PI * 2;
    const rad = 36 + rand() * (MAIN_ISLAND_RADIUS - 48);
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = groundHeightAt(x, z);
    const biome = getBiomeAt(x, z);
    if (y < WATER_LEVEL + 1.5 || y > 16.5) continue;
    if (biome !== 'mountain' && !(biome === 'meadow' && z < 20)) continue;
    if (!isClearForProp(x, z, 5.4)) continue;
    pinePositions.push({ x, y, z, s: 0.9 + rand() * 0.55, rot: rand() * Math.PI * 2 });
  }

  const pineTrunkGeo = new THREE.CylinderGeometry(0.2, 0.36, 2.4, 7);
  pineTrunkGeo.translate(0, 1.2, 0);
  const pineTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c402c, roughness: 0.9 });
  const pineCone1Geo = new THREE.ConeGeometry(1.85, 3.8, 7);
  pineCone1Geo.translate(0, 3.5, 0);
  const pineCone2Geo = new THREE.ConeGeometry(1.3, 3.0, 7);
  pineCone2Geo.translate(0, 5.4, 0);
  const pineLeafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });

  const pineTrunkInst = new THREE.InstancedMesh(pineTrunkGeo, pineTrunkMat, pinePositions.length);
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

    if (Math.hypot(p.x, p.z) < MAIN_ISLAND_RADIUS - 10) {
      collidables.push({ x: p.x, z: p.z, radius: 0.58 * p.s });
    }
  });
  pineTrunkInst.computeBoundingSphere();
  pineLeaf1Inst.computeBoundingSphere();
  pineLeaf2Inst.computeBoundingSphere();
  pineTrunkInst.castShadow = true;
  pineLeaf1Inst.castShadow = true;
  scene.add(pineTrunkInst, pineLeaf1Inst, pineLeaf2Inst);
  disposables.push(pineTrunkGeo, pineTrunkMat, pineCone1Geo, pineCone2Geo, pineLeafMat);

  // Broadleaf Meadow, Lake & Desert Oasis Trees
  const oakPositions: { x: number; y: number; z: number; s: number; rot: number; isPlains: boolean }[] = [];
  for (let i = 0; i < 820 && oakPositions.length < 165; i++) {
    const angle = rand() * Math.PI * 2;
    const rad = 36 + rand() * (MAIN_ISLAND_RADIUS - 48);
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = groundHeightAt(x, z);
    const biome = getBiomeAt(x, z);
    if (y < WATER_LEVEL + 1.5 || biome === 'mountain' || biome === 'dark_forest') continue;
    if (biome === 'plains' && rand() > 0.28) continue;
    if (!isClearForProp(x, z, 5.5)) continue;
    oakPositions.push({
      x,
      y,
      z,
      s: 0.9 + rand() * 0.48,
      rot: rand() * Math.PI * 2,
      isPlains: biome === 'plains',
    });
  }

  const oakTrunkGeo = new THREE.CylinderGeometry(0.24, 0.38, 2.7, 7);
  oakTrunkGeo.translate(0, 1.35, 0);
  const oakCrownGeo = new THREE.DodecahedronGeometry(1.85, 1);
  oakCrownGeo.translate(0, 3.85, 0);
  const oakCrownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 });
  const oakTrunkInst = new THREE.InstancedMesh(oakTrunkGeo, pineTrunkMat, oakPositions.length);
  const oakCrownInst = new THREE.InstancedMesh(oakCrownGeo, oakCrownMat, oakPositions.length);

  oakPositions.forEach((p, idx) => {
    dummy.position.set(p.x, p.y - 0.15, p.z);
    dummy.rotation.set(0, p.rot, 0);
    dummy.scale.set(p.s, p.s * (0.9 + rand() * 0.22), p.s);
    dummy.updateMatrix();
    oakTrunkInst.setMatrixAt(idx, dummy.matrix);
    oakCrownInst.setMatrixAt(idx, dummy.matrix);

    tint
      .set(p.isPlains ? '#b0913d' : '#4a8a3d')
      .offsetHSL((rand() - 0.5) * 0.05, 0, (rand() - 0.5) * 0.09);
    oakCrownInst.setColorAt(idx, tint);

    if (Math.hypot(p.x, p.z) < MAIN_ISLAND_RADIUS - 10) {
      collidables.push({ x: p.x, z: p.z, radius: 0.62 * p.s });
    }
  });
  oakTrunkInst.computeBoundingSphere();
  oakCrownInst.computeBoundingSphere();
  oakTrunkInst.castShadow = true;
  oakCrownInst.castShadow = true;
  scene.add(oakTrunkInst, oakCrownInst);
  disposables.push(oakTrunkGeo, oakCrownGeo, oakCrownMat);

  // Granite & Mossy Boulders across the expanded world
  const rockPositions: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rot: number; dark: boolean }[] = [];
  for (let i = 0; i < 650 && rockPositions.length < 165; i++) {
    const angle = rand() * Math.PI * 2;
    const rad = 36 + rand() * (MAIN_ISLAND_RADIUS - 48);
    const x = Math.cos(angle) * rad;
    const z = Math.sin(angle) * rad;
    const y = groundHeightAt(x, z);
    if (y < WATER_LEVEL + 1.8) continue;
    if (getBiomeAt(x, z) === 'lake') continue;
    if (!isClearForProp(x, z, 4.8)) continue;
    const base = 0.8 + rand() * 1.85;
    rockPositions.push({
      x,
      y,
      z,
      sx: base * (0.85 + rand() * 0.5),
      sy: base * (0.55 + rand() * 0.45),
      sz: base * (0.85 + rand() * 0.5),
      rot: rand() * Math.PI * 2,
      dark: getBiomeAt(x, z) === 'dark_forest',
    });
  }

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    bumpMap: stoneTex.bumpMap,
    bumpScale: 0.14,
    roughness: 0.88,
    metalness: 0.05,
  });
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockPositions.length);
  rockPositions.forEach((r, idx) => {
    dummy.position.set(r.x, r.y + r.sy * 0.32, r.z);
    dummy.rotation.set(rand() * 0.4, r.rot, rand() * 0.4);
    dummy.scale.set(r.sx, r.sy, r.sz);
    dummy.updateMatrix();
    rockInst.setMatrixAt(idx, dummy.matrix);
    tint.set(r.dark ? '#44544b' : '#7a8087').offsetHSL(0, 0, (rand() - 0.5) * 0.14);
    rockInst.setColorAt(idx, tint);
    if (Math.hypot(r.x, r.z) < MAIN_ISLAND_RADIUS - 10 && r.sx > 1.0) {
      collidables.push({ x: r.x, z: r.z, radius: Math.max(r.sx, r.sz) * 0.72 });
    }
  });
  rockInst.computeBoundingSphere();
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  scene.add(rockInst);
  disposables.push(rockGeo, rockMat);

  // Roadside Directional Signposts along outgoing highways
  const signLocations: [number, number, number][] = [
    [5.5, -42, 0],
    [-36, -30, Math.PI * 0.25],
    [45, 7, Math.PI * 0.5],
    [-46, 15, -Math.PI * 0.5],
  ];
  for (const [sx, sz, srot] of signLocations) {
    const sy = groundHeightAt(sx, sz);
    const sign = new THREE.Group();
    sign.position.set(sx, sy, sz);
    sign.rotation.y = srot;
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 2.8, 6), timberMat);
    sp.position.y = 1.4;
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.12), timberMat);
    board.position.set(0.35, 2.35, 0);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.24), windowGlowMat);
    lantern.position.set(-0.32, 2.15, 0);
    sign.add(sp, board, lantern);
    scene.add(sign);
  }

  // Wildflower & Steppe Grass Tufts on Main Island
  const tuftCount = 540;
  const tuftGeo = new THREE.ConeGeometry(0.32, 0.72, 4);
  tuftGeo.translate(0, 0.36, 0);
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const tuftInst = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftCount);
  let placedTufts = 0;
  for (let i = 0; i < 1600 && placedTufts < tuftCount; i++) {
    const a = rand() * Math.PI * 2;
    const rad = 33 + rand() * (MAIN_ISLAND_RADIUS - 48);
    const x = Math.cos(a) * rad;
    const z = Math.sin(a) * rad;
    const y = groundHeightAt(x, z);
    const biome = getBiomeAt(x, z);
    if (y < WATER_LEVEL + 1.4 || y > 11.5) continue;
    if (Math.hypot(x - DESERT_ARENA_POS.x, z - DESERT_ARENA_POS.z) < 19) continue;
    if (Math.hypot(x - HARBOR_POS.x, z - HARBOR_POS.z) < 34) continue;
    dummy.position.set(x, y - 0.04, z);
    dummy.rotation.set(0, rand() * Math.PI, 0);
    const sc = 0.75 + rand() * 0.85;
    dummy.scale.set(sc, sc * (0.8 + rand() * 0.55), sc);
    dummy.updateMatrix();
    tuftInst.setMatrixAt(placedTufts, dummy.matrix);
    if (biome === 'plains') {
      tint.set('#e0b853').offsetHSL(0, 0, (rand() - 0.5) * 0.08);
    } else if (biome === 'dark_forest') {
      tint.set('#225c3e').offsetHSL(0, 0, (rand() - 0.5) * 0.06);
    } else if (rand() > 0.75) {
      tint.set(rand() > 0.5 ? '#f5df78' : '#e88b8b');
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

  // 11. High-Altitude Drifting Stylized Clouds across the Ocean Archipelago
  const cloudsGroup = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    opacity: 0.85,
  });
  const puffGeo = new THREE.DodecahedronGeometry(8.0, 1);
  for (let i = 0; i < 48; i++) {
    const cloud = new THREE.Group();
    const cx = (rand() - 0.5) * 2600;
    const cz = (rand() - 0.5) * 2600;
    const cy = 66 + rand() * 30;
    cloud.position.set(cx, cy, cz);
    for (let p = 0; p < 3; p++) {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set((p - 1) * 7.0, (rand() - 0.5) * 2.0, (rand() - 0.5) * 3.2);
      puff.scale.set(1.35 + rand() * 0.55, 0.52 + rand() * 0.2, 0.95 + rand() * 0.35);
      cloud.add(puff);
    }
    cloudsGroup.add(cloud);
  }
  scene.add(cloudsGroup);
  disposables.push(puffGeo, cloudMat);

  // 12. Build Town Dining Hall, Ocean Harbor + 2 Ships, 5 Expanded Islands & 4x Kuzey Kutbu
  const archipelago = buildOceanArchipelago(
    scene,
    {
      stoneMat,
      darkStoneMat,
      timberMat,
      plasterMat,
      roofMat,
      bronzeMat,
      windowGlowMat,
      ironMat,
      terrainMap,
      terrainBump,
      glacialMap: glacialTex.map,
      glacialBump: glacialTex.bumpMap,
      atlantisMarbleMap: atlantisMarbleTex.map,
      atlantisMarbleBump: atlantisMarbleTex.bumpMap,
    },
    collidables,
    disposables
  );

  return {
    terrainMesh,
    waterMesh,
    oceanWaveMap: oceanTex.map,
    oceanWaveBump: oceanTex.bumpMap,
    cloudsGroup,
    cloudMaterial: cloudMat,
    campfireFlame,
    campfireLight,
    summitCrystal,
    forestTreeRelic,
    desertSpearRelic,
    vikingShipGroup,
    vikingSailMesh,
    whirlpoolGroup: archipelago.whirlpoolGroup,
    pirateRelic: archipelago.pirateRelic,
    wizardRelic: archipelago.wizardRelic,
    horrorRelic: archipelago.horrorRelic,
    underwaterRelic: archipelago.underwaterRelic,
    underwaterExitPortal: archipelago.underwaterExitPortal,
    harborDisplayShips: archipelago.harborDisplayShips,
    underwaterBubbles: archipelago.underwaterBubbles,
    lighthouseBeacon: archipelago.lighthouseBeacon,
    northPoleAurora: archipelago.northPoleAurora,
    bannerMeshes,
    collidables,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
