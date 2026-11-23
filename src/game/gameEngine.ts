import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  groundHeightAt,
  getBiomeAt,
  isInsideSafeZone,
  clampToPlayableWorld,
  WATER_LEVEL,
  SAFE_ZONE_CENTER,
  BiomeId,
  BIOME_META,
} from './worldMath';
import {
  PlayerProfileData,
  getDerivedStats,
  calculateDamage,
} from './combatRules';
import { createContactShadowTexture } from './proceduralTextures';
import {
  buildWarriorRig,
  updateNameTagSprite,
  WarriorRig,
  EnemyArchetype,
} from './characterModels';
import { buildOpenWorld, BuiltWorld } from './worldBuilder';
import { soundEngine } from './soundEngine';
import type { RemotePlayerState } from '../services/multiplayer';

export type GameModeState = 'title' | 'playing' | 'paused' | 'gameover';

export interface MinimapActor {
  id: string;
  x: number;
  z: number;
  kind: 'self' | 'friend' | 'rival' | 'enemy';
  label?: string;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  biome: BiomeId;
  inSafeZone: boolean;
  nearCampfire: boolean;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  lightCooldown: number;
  heavyCooldown: number;
  dashCooldown: number;
  actors: MinimapActor[];
}

export interface EngineCallbacks {
  onHudSnapshot: (snap: HudSnapshot) => void;
  onBiomeDiscovered: (biome: BiomeId) => void;
  onEnemyDefeated: (enemyName: string, xp: number, gold: number) => void;
  onPlayerDefeated: (killerName: string) => void;
  onLocalStateBroadcast: (payload: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    hp: number;
    maxHp: number;
    anim: 'idle' | 'run' | 'jump' | 'slash' | 'heavy' | 'dash' | 'ko';
  }) => void;
  onLocalAttackBroadcast: (heavy: boolean) => void;
  onCampfireInteract: () => void;
  onCombatToast: (text: string, tone: 'hit' | 'danger' | 'reward' | 'info') => void;
}

interface EnemyEntity {
  id: string;
  name: string;
  archetype: EnemyArchetype;
  level: number;
  homeX: number;
  homeZ: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  xpReward: number;
  goldReward: number;
  state: 'patrol' | 'approach' | 'orbit' | 'windup' | 'strike' | 'recover' | 'ko' | 'respawning';
  stateTimer: number;
  orbitDir: number;
  chargeDirX: number;
  chargeDirZ: number;
  hitFlashTimer: number;
  walkPhase: number;
  rig: WarriorRig;
}

interface RemoteEntity {
  state: RemotePlayerState;
  curX: number;
  curY: number;
  curZ: number;
  curYaw: number;
  attackAnimTimer: number;
  hitFlashTimer: number;
  walkPhase: number;
  rig: WarriorRig;
}

interface ParticleSlot {
  active: boolean;
  life: number;
  maxLife: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scale: number;
  color: THREE.Color;
}

// Pre-allocated scratch helpers (Zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _flashColor = new THREE.Color(0xffffff);
const _zeroColor = new THREE.Color(0x000000);

const PARTICLE_POOL_SIZE = 140;

export class OpenWorldEngine {
  private container: HTMLDivElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunLight: THREE.DirectionalLight;
  private world: BuiltWorld;
  private shadowTexture: THREE.Texture;
  private isSoftwareGl: boolean;

  private gameState: GameModeState = 'title';
  private profile: PlayerProfileData;
  private partyCode = '';
  private pvpEnabled = true;

  // Local player physics & combat state
  private playerRig: WarriorRig;
  private slashArcMesh: THREE.Mesh;
  private slashArcTimer = 0;
  private px = 0;
  private py = 1.2;
  private pz = 18;
  private pvx = 0;
  private pvy = 0;
  private pvz = 0;
  private pYaw = Math.PI; // Facing North toward Watchtower & Bozdağ Summit!
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private walkDist = 0;
  private squashX = 1;
  private squashY = 1;

  private hp = 100;
  private maxHp = 100;
  private stamina = 100;
  private maxStamina = 100;
  private lightCd = 0;
  private heavyCd = 0;
  private dashCd = 0;
  private dashTimer = 0;
  private dashDirX = 0;
  private dashDirZ = -1;
  private attackAnimTimer = 0;
  private attackIsHeavy = false;
  private hitFlashTimer = 0;
  private regenTick = 0;

  // Camera rig
  private camYaw = Math.PI;
  private camPitch = 0.16;
  private camDistance = 9.6;
  private trauma = 0;
  private hitstopTimer = 0;
  private titleTime = 0;
  private pointerDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private pointerDownX = 0;
  private pointerDownY = 0;

  // Input state (continuous held vs edge-triggered)
  private keysHeld = new Set<string>();
  private justPressed = new Set<string>();

  // Entities & Particles
  private enemies: EnemyEntity[] = [];
  private remotes = new Map<string, RemoteEntity>();
  private particles: ParticleSlot[] = [];
  private particleMesh: THREE.InstancedMesh;
  private particleCursor = 0;

  // Timers & loop control
  private frameId = 0;
  private lastTime = 0;
  private hudEmitAcc = 0;
  private netEmitAcc = 0;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    container: HTMLDivElement,
    initialProfile: PlayerProfileData,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.profile = initialProfile;
    this.callbacks = callbacks;

    // Detect Software WebGL (SwiftShader / llvmpipe / WARP)
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'world-canvas');
    container.appendChild(this.renderer.domElement);

    // Scene, Horizon Sky & Fog Continuity
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color('#a4cde6');
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(skyColor.getHex(), 0.0046);

    // Mandatory Procedural Studio Reflection Environment (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Camera
    this.camera = new THREE.PerspectiveCamera(58, width / height, 0.2, 340);

    // Balanced Warm/Cool Outdoor Lighting Rig (1 shadow caster)
    const hemiLight = new THREE.HemisphereLight(0x8fc3eb, 0x4b5c34, 0.68);
    hemiLight.position.set(0, 80, 0);
    this.scene.add(hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffe9c2, 1.58);
    this.sunLight.position.set(42, 68, 36);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 160;
    const d = 42;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Subtle cool rim fill light (unshadowed)
    const rimLight = new THREE.DirectionalLight(0x8ec2eb, 0.45);
    rimLight.position.set(-40, 28, -45);
    this.scene.add(rimLight);

    // Build Open World Terrain, Water, Landmarks, and Nature
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.world = buildOpenWorld(this.scene, maxAniso);
    this.shadowTexture = createContactShadowTexture();

    // Build Local Player Warrior
    this.playerRig = buildWarriorRig({
      tunicColor: initialProfile.tunicColor,
      swordTier: initialProfile.swordTier,
      armorTier: initialProfile.armorTier,
      shadowTexture: this.shadowTexture,
    });
    this.scene.add(this.playerRig.root);

    // Visual Slash Arc attached to player
    const arcGeo = new THREE.RingGeometry(1.1, 2.75, 22, 1, -Math.PI * 0.42, Math.PI * 0.84);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xffe49c,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.slashArcMesh = new THREE.Mesh(arcGeo, arcMat);
    this.slashArcMesh.rotation.x = -Math.PI / 2;
    this.slashArcMesh.position.y = 1.25;
    this.slashArcMesh.visible = false;
    this.playerRig.root.add(this.slashArcMesh);

    // Pooled Zero-GC Particle InstancedMesh
    const pGeo = new THREE.OctahedronGeometry(0.18, 0);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, PARTICLE_POOL_SIZE);
    this.particleMesh.frustumCulled = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        active: false,
        life: 0,
        maxLife: 1,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        scale: 0,
        color: new THREE.Color(0xffffff),
      });
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
      this.particleMesh.setColorAt(i, new THREE.Color(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.particleMesh);

    // Spawn 6 Autonomous Challengers across the 3 combat archetypes
    this.spawnWorldChallengers();

    // Position player at Sanctuary Plaza facing Watchtower & Bozdağ
    this.applyProfile(initialProfile, true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind Input & Resize Listeners
    this.bindEvents();

    // Start loop
    this.lastTime = performance.now();
    this.tick();
  }

  private spawnWorldChallengers() {
    const specs: {
      id: string;
      name: string;
      archetype: EnemyArchetype;
      level: number;
      x: number;
      z: number;
      tunic: string;
    }[] = [
      { id: 'npc-skirm-1', name: 'Çayır Avcısı', archetype: 'skirmisher', level: 1, x: -16, z: -18, tunic: '#3e7c44' },
      { id: 'npc-skirm-2', name: 'Vadi İzci', archetype: 'skirmisher', level: 2, x: -24, z: 24, tunic: '#2f7c6f' },
      { id: 'npc-lancer-1', name: 'Ova Mızrakçısı', archetype: 'lancer', level: 3, x: 46, z: 12, tunic: '#c4832b' },
      { id: 'npc-lancer-2', name: 'Bozkır Süvarisi', archetype: 'lancer', level: 4, x: 60, z: -10, tunic: '#b5562b' },
      { id: 'npc-warden-1', name: 'Bozdağ Muhafızı', archetype: 'warden', level: 5, x: -12, z: -48, tunic: '#54406e' },
      { id: 'npc-warden-2', name: 'Zirve Şampiyonu', archetype: 'warden', level: 7, x: 2, z: -64, tunic: '#8c2832' },
    ];

    for (const s of specs) {
      const y = groundHeightAt(s.x, s.z);
      const maxHp = s.archetype === 'warden' ? 190 + s.level * 28 : s.archetype === 'lancer' ? 120 + s.level * 18 : 95 + s.level * 14;
      const rig = buildWarriorRig({
        tunicColor: s.tunic,
        swordTier: Math.min(10, s.level),
        armorTier: Math.min(10, s.level),
        displayName: s.name,
        level: s.level,
        isEnemy: true,
        enemyType: s.archetype,
        shadowTexture: this.shadowTexture,
      });
      rig.root.position.set(s.x, y, s.z);
      this.scene.add(rig.root);

      const entity: EnemyEntity = {
        id: s.id,
        name: s.name,
        archetype: s.archetype,
        level: s.level,
        homeX: s.x,
        homeZ: s.z,
        x: s.x,
        y,
        z: s.z,
        vx: 0,
        vz: 0,
        yaw: 0,
        hp: maxHp,
        maxHp,
        attack: s.archetype === 'warden' ? 24 + s.level * 3 : s.archetype === 'lancer' ? 18 + s.level * 2 : 13 + s.level * 2,
        defense: 3 + s.level * 2,
        xpReward: s.archetype === 'warden' ? 115 + s.level * 18 : s.archetype === 'lancer' ? 75 + s.level * 12 : 55 + s.level * 10,
        goldReward: s.archetype === 'warden' ? 68 + s.level * 10 : s.archetype === 'lancer' ? 42 + s.level * 7 : 30 + s.level * 5,
        state: 'patrol',
        stateTimer: 1.5,
        orbitDir: Math.random() > 0.5 ? 1 : -1,
        chargeDirX: 0,
        chargeDirZ: 1,
        hitFlashTimer: 0,
        walkPhase: 0,
        rig,
      };
      updateNameTagSprite(rig, s.name, s.level, maxHp, maxHp, s.archetype === 'warden' ? 'ZİRVE' : 'RAKİP', '#f07154');
      this.enemies.push(entity);
    }
  }

  public setGameState(next: GameModeState) {
    this.gameState = next;
    this.keysHeld.clear();
    this.justPressed.clear();
    this.pointerDragging = false;
    if (next === 'playing') {
      // Snap camera smoothly behind player facing open watchtower vista
      this.camYaw = this.pYaw;
    }
  }

  public setPvpSettings(pvpEnabled: boolean, partyCode: string) {
    this.pvpEnabled = pvpEnabled;
    this.partyCode = partyCode.trim().toUpperCase();
  }

  public applyProfile(next: PlayerProfileData, teleportToSaved = false) {
    const prevSword = this.profile.swordTier;
    const prevArmor = this.profile.armorTier;
    const prevColor = this.profile.tunicColor;
    this.profile = next;

    const stats = getDerivedStats(next);
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = stats.maxHp;
    this.hp = Math.min(this.maxHp, Math.max(1, Math.round(hpRatio * this.maxHp)));
    this.maxStamina = stats.maxStamina;
    this.stamina = Math.min(this.maxStamina, this.stamina);

    // Rebuild warrior mesh if gear tier or tunic color changed
    if (
      prevSword !== next.swordTier ||
      prevArmor !== next.armorTier ||
      prevColor !== next.tunicColor
    ) {
      this.scene.remove(this.playerRig.root);
      this.playerRig = buildWarriorRig({
        tunicColor: next.tunicColor,
        swordTier: next.swordTier,
        armorTier: next.armorTier,
        shadowTexture: this.shadowTexture,
      });
      this.playerRig.root.add(this.slashArcMesh);
      this.scene.add(this.playerRig.root);
    }

    if (teleportToSaved) {
      const clamped = clampToPlayableWorld(next.lastX, next.lastZ);
      const y = groundHeightAt(clamped.x, clamped.z);
      if (y < WATER_LEVEL + 0.2) {
        this.px = SAFE_ZONE_CENTER.x;
        this.pz = SAFE_ZONE_CENTER.z + 4;
      } else {
        this.px = clamped.x;
        this.pz = clamped.z;
      }
      this.py = Math.max(WATER_LEVEL + 0.1, groundHeightAt(this.px, this.pz));
      this.pvy = 0;
      this.pvx = 0;
      this.pvz = 0;
      this.pYaw = Math.PI; // Facing North toward Watchtower & Bozdağ
      this.camYaw = Math.PI;
      this.hp = this.maxHp;
      this.stamina = this.maxStamina;
      this.playerRig.root.position.set(this.px, this.py, this.pz);
      this.playerRig.root.rotation.y = this.pYaw;
    }
  }

  public respawnAtSanctuary() {
    this.px = SAFE_ZONE_CENTER.x;
    this.pz = SAFE_ZONE_CENTER.z + 4.5;
    this.py = groundHeightAt(this.px, this.pz);
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pYaw = Math.PI;
    this.camYaw = Math.PI;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.hitFlashTimer = 0;
    this.spawnBurst(this.px, this.py + 1.1, this.pz, 18, 0x62e894, 4.5);
    this.emitHud();
  }

  public healFull() {
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.spawnBurst(this.px, this.py + 1.0, this.pz, 14, 0x62e894, 3.6);
    this.emitHud();
  }

  public getPlayerPosition(): { x: number; z: number } {
    return { x: this.px, z: this.pz };
  }

  public syncRemotePlayers(list: RemotePlayerState[], selfId: string) {
    const seen = new Set<string>();
    for (const p of list) {
      if (p.id === selfId) continue;
      seen.add(p.id);
      this.upsertRemotePlayer(p);
    }
    for (const [id, ent] of this.remotes.entries()) {
      if (!seen.has(id)) {
        this.scene.remove(ent.rig.root);
        this.remotes.delete(id);
      }
    }
  }

  public upsertRemotePlayer(p: RemotePlayerState) {
    const existing = this.remotes.get(p.id);
    if (existing) {
      existing.state = p;
      const isAlly =
        this.partyCode.length > 0 &&
        p.partyCode.toUpperCase() === this.partyCode;
      updateNameTagSprite(
        existing.rig,
        p.displayName,
        p.level,
        p.hp,
        p.maxHp,
        isAlly ? 'GRUP' : p.pvpEnabled ? 'PvP' : 'BARIŞÇIL',
        isAlly ? '#65d9ff' : p.pvpEnabled ? '#f2a649' : '#7ad689'
      );
      return;
    }

    const rig = buildWarriorRig({
      tunicColor: p.tunicColor,
      swordTier: p.swordTier,
      armorTier: p.armorTier,
      displayName: p.displayName,
      level: p.level,
      isEnemy: false,
      shadowTexture: this.shadowTexture,
    });
    rig.root.position.set(p.x, p.y, p.z);
    this.scene.add(rig.root);

    this.remotes.set(p.id, {
      state: p,
      curX: p.x,
      curY: p.y,
      curZ: p.z,
      curYaw: p.yaw,
      attackAnimTimer: 0,
      hitFlashTimer: 0,
      walkPhase: 0,
      rig,
    });
  }

  public removeRemotePlayer(id: string) {
    const ent = this.remotes.get(id);
    if (ent) {
      this.scene.remove(ent.rig.root);
      this.remotes.delete(id);
    }
  }

  public triggerRemoteAttackVisual(id: string, heavy: boolean) {
    const ent = this.remotes.get(id);
    if (!ent) return;
    ent.attackAnimTimer = heavy ? 0.42 : 0.28;
    this.spawnBurst(ent.curX, ent.curY + 1.2, ent.curZ, heavy ? 14 : 6, heavy ? 0xffaa44 : 0xfff0b3, 3.8);
  }

  public applyIncomingPvpHit(
    damage: number,
    knockX: number,
    knockZ: number,
    attackerName: string,
    isHeavy: boolean
  ) {
    if (this.gameState !== 'playing' || this.hp <= 0) return;
    if (this.dashTimer > 0.08) {
      this.callbacks.onCombatToast('Sıyrıldın!', 'info');
      return;
    }
    this.hp = Math.max(0, this.hp - damage);
    this.pvx += knockX;
    this.pvz += knockZ;
    this.hitFlashTimer = 0.14;
    this.trauma = Math.min(1, this.trauma + (isHeavy ? 0.55 : 0.32));
    this.hitstopTimer = isHeavy ? 0.055 : 0.03;
    soundEngine.playHurt();
    this.spawnBurst(this.px, this.py + 1.2, this.pz, 14, 0xff4b4b, 5.0);
    this.callbacks.onCombatToast(`${attackerName} -${damage} hasar!`, 'danger');
    if (this.hp <= 0) {
      this.callbacks.onPlayerDefeated(attackerName);
    }
    this.emitHud();
  }

  public triggerLocalAttack(heavy: boolean) {
    if (this.gameState !== 'playing' || this.hp <= 0) return;
    if (heavy) {
      if (this.heavyCd > 0 || this.stamina < 28) return;
      this.heavyCd = 2.4;
      this.stamina -= 28;
      this.attackAnimTimer = 0.42;
      this.attackIsHeavy = true;
      this.slashArcTimer = 0.3;
      this.slashArcMesh.scale.setScalar(1.48);
      (this.slashArcMesh.material as THREE.MeshBasicMaterial).color.setHex(0xffae42);
      soundEngine.playSlash(true);
    } else {
      if (this.lightCd > 0 || this.stamina < 8) return;
      this.lightCd = 0.42;
      this.stamina -= 8;
      this.attackAnimTimer = 0.28;
      this.attackIsHeavy = false;
      this.slashArcTimer = 0.18;
      this.slashArcMesh.scale.setScalar(1.0);
      (this.slashArcMesh.material as THREE.MeshBasicMaterial).color.setHex(0xfff1bf);
      soundEngine.playSlash(false);
    }

    // Lunge forward slightly along facing direction
    const fx = Math.sin(this.pYaw);
    const fz = Math.cos(this.pYaw);
    this.pvx += fx * (heavy ? 5.2 : 2.6);
    this.pvz += fz * (heavy ? 5.2 : 2.6);

    // Notify multiplayer server for PvP hits
    this.callbacks.onLocalAttackBroadcast(heavy);

    // Local hit check against world NPC challengers
    const stats = getDerivedStats(this.profile);
    const reach = heavy ? 4.8 : 3.5;
    let landedAny = false;

    for (const enemy of this.enemies) {
      if (enemy.state === 'ko' || enemy.state === 'respawning') continue;
      const dx = enemy.x - this.px;
      const dz = enemy.z - this.pz;
      const dist = Math.hypot(dx, dz);
      if (dist > reach) continue;

      // Directional cone check for light slash; 360 cleave for heavy
      if (!heavy && dist > 1.1) {
        const dot = (dx / dist) * fx + (dz / dist) * fz;
        if (dot < 0.15) continue;
      }

      const isCrit = Math.random() < 0.2;
      const dmg = calculateDamage(stats.attackPower, enemy.defense, heavy ? 1.72 : 1.0, isCrit);
      enemy.hp = Math.max(0, enemy.hp - dmg);
      enemy.hitFlashTimer = 0.14;
      const invD = dist > 0.01 ? 1 / dist : 1;
      const knock = heavy ? 8.2 : 4.2;
      enemy.vx += dx * invD * knock;
      enemy.vz += dz * invD * knock;
      landedAny = true;

      this.spawnBurst(enemy.x, enemy.y + 1.25, enemy.z, heavy ? 20 : 10, isCrit ? 0xffe45c : 0xff7043, 5.4);
      updateNameTagSprite(
        enemy.rig,
        enemy.name,
        enemy.level,
        enemy.hp,
        enemy.maxHp,
        enemy.archetype === 'warden' ? 'ZİRVE' : 'RAKİP',
        '#f07154'
      );

      if (enemy.hp <= 0) {
        enemy.state = 'ko';
        enemy.stateTimer = 0.45;
        if (enemy.rig.telegraphRing) enemy.rig.telegraphRing.visible = false;
        this.spawnBurst(enemy.x, enemy.y + 1.3, enemy.z, 26, 0xffd54f, 6.2);
        this.callbacks.onEnemyDefeated(enemy.name, enemy.xpReward, enemy.goldReward);
      } else {
        this.callbacks.onCombatToast(
          `${enemy.name}: -${dmg}${isCrit ? ' KRİTİK!' : ''}`,
          'hit'
        );
      }
    }

    if (landedAny) {
      soundEngine.playHit(heavy, false);
      this.hitstopTimer = heavy ? 0.06 : 0.035;
      this.trauma = Math.min(1, this.trauma + (heavy ? 0.42 : 0.2));
    }
  }

  public triggerDash() {
    if (this.gameState !== 'playing' || this.dashCd > 0 || this.stamina < 22) return;
    this.stamina -= 22;
    this.dashCd = 1.35;
    this.dashTimer = 0.28;
    this.dashDirX = Math.sin(this.pYaw);
    this.dashDirZ = Math.cos(this.pYaw);
    this.squashX = 0.84;
    this.squashY = 1.18;
    soundEngine.playDash();
    this.spawnBurst(this.px, this.py + 0.5, this.pz, 10, 0xd8d2c2, 3.2);
  }

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    hexColor: number,
    speed: number
  ) {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.particleCursor];
      this.particleCursor = (this.particleCursor + 1) % PARTICLE_POOL_SIZE;
      const a = Math.random() * Math.PI * 2;
      const up = 0.35 + Math.random() * 0.9;
      const sp = speed * (0.45 + Math.random() * 0.75);
      slot.active = true;
      slot.life = 0;
      slot.maxLife = 0.35 + Math.random() * 0.35;
      slot.x = x + (Math.random() - 0.5) * 0.4;
      slot.y = y + (Math.random() - 0.5) * 0.3;
      slot.z = z + (Math.random() - 0.5) * 0.4;
      slot.vx = Math.cos(a) * sp;
      slot.vy = up * sp;
      slot.vz = Math.sin(a) * sp;
      slot.scale = 0.55 + Math.random() * 0.85;
      slot.color.setHex(hexColor);
      this.particleMesh.setColorAt(this.particleCursor === 0 ? PARTICLE_POOL_SIZE - 1 : this.particleCursor - 1, slot.color);
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private isTypingInForm(e: KeyboardEvent): boolean {
    const tag = (e.target as HTMLElement | null)?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isTypingInForm(e)) return;
    const code = e.code;
    if (!this.keysHeld.has(code)) {
      this.justPressed.add(code);
    }
    this.keysHeld.add(code);

    if (this.gameState === 'playing') {
      if (code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight') {
        e.preventDefault();
      }
      if (code === 'Space') {
        this.jumpBufferTimer = 0.13;
      } else if (code === 'KeyJ') {
        this.triggerLocalAttack(false);
      } else if (code === 'KeyK') {
        this.triggerLocalAttack(true);
      } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
        this.triggerDash();
      } else if (code === 'KeyE') {
        const distCamp = Math.hypot(this.px - SAFE_ZONE_CENTER.x, this.pz - SAFE_ZONE_CENTER.z);
        if (distCamp <= 9.5) {
          this.callbacks.onCampfireInteract();
        }
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
    // Variable jump height cut on early release
    if (e.code === 'Space' && this.pvy > 2.2) {
      this.pvy *= 0.48;
    }
  };

  private onBlur = () => {
    this.keysHeld.clear();
    this.justPressed.clear();
    this.pointerDragging = false;
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.gameState !== 'playing') return;
    this.pointerDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.pointerDownX = e.clientX;
    this.pointerDownY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.pointerDragging || this.gameState !== 'playing') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.camYaw -= dx * 0.0065;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0045, 0.12, 0.92);
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pointerDragging) return;
    this.pointerDragging = false;
    if (this.gameState !== 'playing') return;
    const moved = Math.hypot(e.clientX - this.pointerDownX, e.clientY - this.pointerDownY);
    if (moved < 8) {
      if (e.button === 2) {
        this.triggerLocalAttack(true);
      } else if (e.button === 0) {
        this.triggerLocalAttack(false);
      }
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    if (this.gameState === 'playing') {
      e.preventDefault();
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (this.gameState !== 'playing') return;
    this.camDistance = THREE.MathUtils.clamp(this.camDistance + e.deltaY * 0.006, 6.5, 16.5);
  };

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('contextmenu', this.onContextMenu);
    dom.addEventListener('wheel', this.onWheel, { passive: true });

    this.resizeObserver = new ResizeObserver(() => {
      if (this.destroyed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.render(this.scene, this.camera);
    });
    this.resizeObserver.observe(this.container);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.destroyed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.destroyed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.updateAmbientWorld(dt, now * 0.001);

    if (this.gameState === 'title') {
      this.updateTitleFlyover(dt);
    } else if (this.gameState === 'playing') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
        this.updateHitFlashesAndVfx(dt);
      } else {
        this.updatePlayer(dt);
        this.updateEnemies(dt);
        this.updateRemotes(dt);
        this.updateHitFlashesAndVfx(dt);
      }
      this.updateGameplayCamera(dt);
    } else {
      // paused or gameover: keep gentle particle decay & static camera
      this.updateParticles(dt * 0.25);
    }

    this.justPressed.clear();
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private updateAmbientWorld(dt: number, elapsed: number) {
    // Drifting clouds
    this.world.cloudsGroup.children.forEach((cloud, i) => {
      cloud.position.x += dt * (0.8 + (i % 3) * 0.35);
      if (cloud.position.x > 130) cloud.position.x = -130;
    });

    // Flickering sanctuary campfire flame
    const flicker = 0.92 + Math.sin(elapsed * 13) * 0.1 + Math.cos(elapsed * 21) * 0.06;
    this.world.campfireFlame.scale.set(flicker, 0.85 + Math.sin(elapsed * 16) * 0.2, flicker);
    this.world.campfireLight.intensity = 3.8 + Math.sin(elapsed * 12) * 0.6;

    // Hovering Bozdağ Summit Crystal
    this.world.summitCrystal.rotation.y += dt * 1.1;
    this.world.summitCrystal.position.y = 3.8 + Math.sin(elapsed * 2.2) * 0.35;

    // Subtle banner sway
    this.world.bannerMeshes.forEach((b) => {
      b.rotation.y = Math.sin(elapsed * 3.1) * 0.18;
    });

    // Gentle lake water shimmer
    this.world.waterMesh.position.y = WATER_LEVEL + Math.sin(elapsed * 1.6) * 0.04;
  }

  private updateTitleFlyover(dt: number) {
    this.titleTime += dt;
    // Sweeping panoramic camera showcasing Watchtower, Emerald Meadow, Golden Plains, Silver Lake & Bozdağ Summit
    const angle = this.titleTime * 0.09 + 0.36;
    const cx = Math.sin(angle) * 38;
    const cz = 20 + Math.cos(angle) * 34;
    const cy = 18.5 + Math.sin(this.titleTime * 0.26) * 2.2;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(0, 9.5, -24);

    // Idle warrior breath at sanctuary
    this.playerRig.cloak.rotation.x = 0.15 + Math.sin(this.titleTime * 2.4) * 0.05;
  }

  private updatePlayer(dt: number) {
    const stats = getDerivedStats(this.profile);

    // Cooldowns & stamina regeneration
    this.lightCd = Math.max(0, this.lightCd - dt);
    this.heavyCd = Math.max(0, this.heavyCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    const regenRate = isInsideSafeZone(this.px, this.pz) ? 34 : 20;
    this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * dt);

    // Safe Zone Sanctuary HP regeneration
    if (isInsideSafeZone(this.px, this.pz) && this.hp > 0 && this.hp < this.maxHp) {
      this.regenTick += dt;
      if (this.regenTick >= 0.45) {
        this.regenTick = 0;
        this.hp = Math.min(this.maxHp, this.hp + Math.ceil(this.maxHp * 0.04));
      }
    }

    // Keyboard camera turn (Q / E)
    if (this.keysHeld.has('KeyQ')) this.camYaw += dt * 2.1;
    if (this.keysHeld.has('KeyE')) this.camYaw -= dt * 2.1;

    // Movement input vector relative to camera yaw
    let inputForward = 0;
    let inputRight = 0;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) inputForward += 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) inputForward -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) inputRight += 1;
    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) inputRight -= 1;

    const camForwardX = Math.sin(this.camYaw);
    const camForwardZ = Math.cos(this.camYaw);
    const camRightX = -camForwardZ;
    const camRightZ = camForwardX;

    let moveX = camForwardX * inputForward + camRightX * inputRight;
    let moveZ = camForwardZ * inputForward + camRightZ * inputRight;
    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 0.01) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }

    // Apply Dash or Normal Locomotion
    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      const dashSpd = stats.moveSpeed * 2.25;
      this.pvx = this.dashDirX * dashSpd;
      this.pvz = this.dashDirZ * dashSpd;
    } else {
      const targetVx = moveX * stats.moveSpeed;
      const targetVz = moveZ * stats.moveSpeed;
      const damp = 1 - Math.exp(-12 * dt);
      this.pvx = THREE.MathUtils.lerp(this.pvx, targetVx, damp);
      this.pvz = THREE.MathUtils.lerp(this.pvz, targetVz, damp);
    }

    // Smoothly turn player toward movement direction
    if (inputLen > 0.05) {
      const targetYaw = Math.atan2(moveX, moveZ);
      let diff = targetYaw - this.pYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.pYaw += diff * (1 - Math.exp(-14 * dt));
    }

    // Horizontal step + world clamp + obstacle sliding
    let nextX = this.px + this.pvx * dt;
    let nextZ = this.pz + this.pvz * dt;

    // Prevent walking into deep water
    if (groundHeightAt(nextX, nextZ) < WATER_LEVEL - 0.55) {
      nextX = this.px;
      nextZ = this.pz;
      this.pvx *= 0.2;
      this.pvz *= 0.2;
    }

    // Static landmark & tree collision push-out
    for (const col of this.world.collidables) {
      const dx = nextX - col.x;
      const dz = nextZ - col.z;
      const minD = col.radius + 0.55;
      const distSq = dx * dx + dz * dz;
      if (distSq < minD * minD && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = minD - dist;
        nextX += (dx / dist) * push;
        nextZ += (dz / dist) * push;
      }
    }

    const clamped = clampToPlayableWorld(nextX, nextZ);
    const stepDist = Math.hypot(clamped.x - this.px, clamped.z - this.pz);
    this.px = clamped.x;
    this.pz = clamped.z;

    // Vertical physics: gravity, coyote time, buffered jump
    const floorY = Math.max(WATER_LEVEL - 0.1, groundHeightAt(this.px, this.pz));
    if (this.grounded) {
      this.coyoteTimer = 0.1;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.pvy = 10.6;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.squashX = 0.85;
      this.squashY = 1.18;
      soundEngine.playJump();
      this.spawnBurst(this.px, floorY + 0.12, this.pz, 5, 0xd4cbb8, 2.4);
    }

    this.pvy -= 26.5 * dt;
    this.py += this.pvy * dt;

    if (this.py <= floorY) {
      if (!this.grounded && this.pvy < -4.5) {
        this.squashX = 1.2;
        this.squashY = 0.8;
        this.spawnBurst(this.px, floorY + 0.1, this.pz, 6, 0xc8bfa8, 2.2);
      }
      this.py = floorY;
      this.pvy = 0;
      this.grounded = true;
    } else if (this.py > floorY + 0.15) {
      this.grounded = false;
    }

    // Damped squash-and-stretch recovery
    const squashDamp = 1 - Math.exp(-14 * dt);
    this.squashX = THREE.MathUtils.lerp(this.squashX, 1, squashDamp);
    this.squashY = THREE.MathUtils.lerp(this.squashY, 1, squashDamp);

    // Gait-synced warrior animation
    const horizSpeed = Math.hypot(this.pvx, this.pvz);
    if (this.grounded) {
      this.walkDist += stepDist * 2.15;
    }
    const stride = this.grounded && horizSpeed > 0.4 ? Math.sin(this.walkDist) : 0;
    this.playerRig.leftLeg.rotation.x = stride * 0.65;
    this.playerRig.rightLeg.rotation.x = -stride * 0.65;
    this.playerRig.leftArm.rotation.x = -stride * 0.48;
    this.playerRig.cloak.rotation.x = 0.16 + Math.min(0.65, horizSpeed * 0.065) + Math.sin(this.walkDist * 0.8) * 0.06;

    if (this.attackAnimTimer > 0) {
      const dur = this.attackIsHeavy ? 0.42 : 0.28;
      const p = 1 - this.attackAnimTimer / dur;
      this.playerRig.rightArm.rotation.x = -2.2 + p * 3.1;
      this.playerRig.rightArm.rotation.y = (p - 0.5) * 1.4;
    } else {
      this.playerRig.rightArm.rotation.x = stride * 0.45;
      this.playerRig.rightArm.rotation.y = 0;
    }

    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.pYaw;
    this.playerRig.bodyGroup.scale.set(this.squashX, this.squashY, this.squashX);

    // Keep shadow map frustum centered near player
    this.sunLight.position.set(this.px + 38, this.py + 58, this.pz + 32);
    this.sunLight.target.position.set(this.px, this.py, this.pz);
    this.sunLight.target.updateMatrixWorld();

    // Check Biome Discovery
    const curBiome = getBiomeAt(this.px, this.pz);
    if (!this.profile.discoveredBiomes.includes(curBiome)) {
      this.callbacks.onBiomeDiscovered(curBiome);
    }

    // Throttled HUD & Network Broadcast
    this.hudEmitAcc += dt;
    if (this.hudEmitAcc >= 0.1) {
      this.hudEmitAcc = 0;
      this.emitHud();
    }

    this.netEmitAcc += dt;
    if (this.netEmitAcc >= 0.085) {
      this.netEmitAcc = 0;
      const anim =
        this.hp <= 0
          ? 'ko'
          : this.attackAnimTimer > 0
          ? this.attackIsHeavy
            ? 'heavy'
            : 'slash'
          : this.dashTimer > 0
          ? 'dash'
          : !this.grounded
          ? 'jump'
          : horizSpeed > 0.6
          ? 'run'
          : 'idle';

      this.callbacks.onLocalStateBroadcast({
        x: Number(this.px.toFixed(2)),
        y: Number(this.py.toFixed(2)),
        z: Number(this.pz.toFixed(2)),
        yaw: Number(this.pYaw.toFixed(3)),
        hp: Math.round(this.hp),
        maxHp: Math.round(this.maxHp),
        anim,
      });
    }
  }

  private updateEnemies(dt: number) {
    const playerInSafe = isInsideSafeZone(this.px, this.pz);
    const stats = getDerivedStats(this.profile);

    // Attack token pool: max 2 enemies actively winding up or striking simultaneously
    let activeAttackers = 0;
    for (const e of this.enemies) {
      if (e.state === 'windup' || e.state === 'strike') activeAttackers++;
    }

    for (const e of this.enemies) {
      if (e.state === 'respawning') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.x = e.homeX;
          e.z = e.homeZ;
          e.y = groundHeightAt(e.x, e.z);
          e.hp = e.maxHp;
          e.state = 'patrol';
          e.rig.root.visible = true;
          e.rig.bodyGroup.rotation.x = 0;
          updateNameTagSprite(e.rig, e.name, e.level, e.hp, e.maxHp, e.archetype === 'warden' ? 'ZİRVE' : 'RAKİP', '#f07154');
        }
        continue;
      }

      if (e.state === 'ko') {
        e.stateTimer -= dt;
        e.rig.bodyGroup.rotation.x = THREE.MathUtils.lerp(e.rig.bodyGroup.rotation.x, -Math.PI * 0.48, 1 - Math.exp(-10 * dt));
        if (e.stateTimer <= 0) {
          e.state = 'respawning';
          e.stateTimer = 16;
          e.rig.root.visible = false;
        }
        continue;
      }

      const dxToP = this.px - e.x;
      const dzToP = this.pz - e.z;
      const distToP = Math.hypot(dxToP, dzToP);
      const distHome = Math.hypot(e.x - e.homeX, e.z - e.homeZ);

      const aggroRange = e.archetype === 'lancer' ? 22 : e.archetype === 'warden' ? 18 : 17;
      const canAggro = !playerInSafe && this.hp > 0 && distToP < aggroRange && distHome < 34;

      if (!canAggro && e.state !== 'patrol' && e.state !== 'windup' && e.state !== 'strike') {
        e.state = 'patrol';
      }

      const baseSpeed = e.archetype === 'skirmisher' ? 6.1 : e.archetype === 'lancer' ? 5.6 : 4.2;

      if (e.state === 'patrol') {
        if (canAggro) {
          e.state = 'approach';
        } else {
          const hx = e.homeX - e.x;
          const hz = e.homeZ - e.z;
          const hd = Math.hypot(hx, hz);
          if (hd > 2.2) {
            e.vx = THREE.MathUtils.lerp(e.vx, (hx / hd) * 3.2, 1 - Math.exp(-6 * dt));
            e.vz = THREE.MathUtils.lerp(e.vz, (hz / hd) * 3.2, 1 - Math.exp(-6 * dt));
            e.yaw = Math.atan2(hx, hz);
          } else {
            e.vx *= Math.exp(-8 * dt);
            e.vz *= Math.exp(-8 * dt);
          }
        }
      } else if (e.state === 'approach') {
        const inv = distToP > 0.01 ? 1 / distToP : 1;
        e.yaw = Math.atan2(dxToP, dzToP);

        if (e.archetype === 'skirmisher') {
          if (distToP < 5.5) {
            e.state = 'orbit';
            e.stateTimer = 1.1 + Math.random() * 0.8;
          } else {
            e.vx = THREE.MathUtils.lerp(e.vx, dxToP * inv * baseSpeed, 1 - Math.exp(-7 * dt));
            e.vz = THREE.MathUtils.lerp(e.vz, dzToP * inv * baseSpeed, 1 - Math.exp(-7 * dt));
          }
        } else if (e.archetype === 'lancer') {
          // Lancer plants and telegraphs a line-of-sight charge from medium range (6-13m)
          if (distToP < 12.5 && distToP > 3.2 && activeAttackers < 2) {
            e.state = 'windup';
            e.stateTimer = 0.55;
            e.chargeDirX = dxToP * inv;
            e.chargeDirZ = dzToP * inv;
            activeAttackers++;
            soundEngine.playTelegraphWarning();
          } else {
            e.vx = THREE.MathUtils.lerp(e.vx, dxToP * inv * baseSpeed, 1 - Math.exp(-6 * dt));
            e.vz = THREE.MathUtils.lerp(e.vz, dzToP * inv * baseSpeed, 1 - Math.exp(-6 * dt));
          }
        } else {
          // Mountain Warden marches in and winds up heavy ground slam
          if (distToP < 4.2 && activeAttackers < 2) {
            e.state = 'windup';
            e.stateTimer = 0.68;
            activeAttackers++;
            soundEngine.playTelegraphWarning();
          } else {
            e.vx = THREE.MathUtils.lerp(e.vx, dxToP * inv * baseSpeed, 1 - Math.exp(-5 * dt));
            e.vz = THREE.MathUtils.lerp(e.vz, dzToP * inv * baseSpeed, 1 - Math.exp(-5 * dt));
          }
        }
      } else if (e.state === 'orbit') {
        // Skirmisher circles around player before darting in
        const inv = distToP > 0.01 ? 1 / distToP : 1;
        e.yaw = Math.atan2(dxToP, dzToP);
        const tangentX = -dzToP * inv * e.orbitDir;
        const tangentZ = dxToP * inv * e.orbitDir;
        e.vx = THREE.MathUtils.lerp(e.vx, tangentX * baseSpeed * 0.9, 1 - Math.exp(-7 * dt));
        e.vz = THREE.MathUtils.lerp(e.vz, tangentZ * baseSpeed * 0.9, 1 - Math.exp(-7 * dt));
        e.stateTimer -= dt;
        if (e.stateTimer <= 0 && activeAttackers < 2) {
          e.state = 'windup';
          e.stateTimer = 0.42;
          e.chargeDirX = dxToP * inv;
          e.chargeDirZ = dzToP * inv;
          activeAttackers++;
          soundEngine.playTelegraphWarning();
        }
      } else if (e.state === 'windup') {
        e.vx *= Math.exp(-10 * dt);
        e.vz *= Math.exp(-10 * dt);
        e.stateTimer -= dt;
        e.rig.rightArm.rotation.x = -2.4;

        if (e.rig.telegraphRing) {
          e.rig.telegraphRing.visible = true;
          const pulse = 0.55 + (1 - Math.max(0, e.stateTimer / 0.68)) * 0.45;
          e.rig.telegraphRing.scale.setScalar(pulse);
          (e.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0.65;
        }

        if (e.stateTimer <= 0) {
          e.state = 'strike';
          e.stateTimer = e.archetype === 'lancer' ? 0.34 : 0.22;
          if (e.archetype === 'lancer') {
            e.vx = e.chargeDirX * 16.5;
            e.vz = e.chargeDirZ * 16.5;
          } else if (e.archetype === 'skirmisher') {
            e.vx = e.chargeDirX * 10.5;
            e.vz = e.chargeDirZ * 10.5;
          }
          soundEngine.playSlash(e.archetype === 'warden');

          // Active strike hit check
          const hitRadius = e.archetype === 'warden' ? 4.5 : 2.8;
          if (!playerInSafe && distToP <= hitRadius && this.dashTimer <= 0.08 && this.hp > 0) {
            const dmg = calculateDamage(e.attack, stats.defense, e.archetype === 'warden' ? 1.35 : 1.0, false);
            this.hp = Math.max(0, this.hp - dmg);
            this.hitFlashTimer = 0.14;
            this.trauma = Math.min(1, this.trauma + (e.archetype === 'warden' ? 0.55 : 0.3));
            this.hitstopTimer = e.archetype === 'warden' ? 0.055 : 0.03;
            const inv = distToP > 0.01 ? 1 / distToP : 1;
            this.pvx += dxToP * inv * (e.archetype === 'warden' ? 8.5 : 4.5);
            this.pvz += dzToP * inv * (e.archetype === 'warden' ? 8.5 : 4.5);
            soundEngine.playHurt();
            this.spawnBurst(this.px, this.py + 1.1, this.pz, 14, 0xff5252, 4.8);
            this.callbacks.onCombatToast(`${e.name} -${dmg} hasar!`, 'danger');
            if (this.hp <= 0) {
              this.callbacks.onPlayerDefeated(e.name);
            }
            this.emitHud();
          } else if (e.archetype === 'warden') {
            this.spawnBurst(e.x, e.y + 0.3, e.z, 16, 0xd4a45a, 5.2);
          }
        }
      } else if (e.state === 'strike') {
        e.stateTimer -= dt;
        e.rig.rightArm.rotation.x = 0.9;
        if (e.rig.telegraphRing) e.rig.telegraphRing.visible = false;
        if (e.stateTimer <= 0) {
          e.state = 'recover';
          e.stateTimer = e.archetype === 'warden' ? 1.05 : 0.7;
        }
      } else if (e.state === 'recover') {
        e.vx *= Math.exp(-8 * dt);
        e.vz *= Math.exp(-8 * dt);
        e.stateTimer -= dt;
        e.rig.rightArm.rotation.x = THREE.MathUtils.lerp(e.rig.rightArm.rotation.x, 0, 1 - Math.exp(-10 * dt));
        if (e.stateTimer <= 0) {
          e.state = 'approach';
        }
      }

      // Integrate enemy position (keep out of safe zone & water)
      const nx = e.x + e.vx * dt;
      const nz = e.z + e.vz * dt;
      if (!isInsideSafeZone(nx, nz) && groundHeightAt(nx, nz) > WATER_LEVEL - 0.1) {
        e.x = nx;
        e.z = nz;
      }
      e.y = groundHeightAt(e.x, e.z);

      const spd = Math.hypot(e.vx, e.vz);
      e.walkPhase += spd * dt * 2.1;
      const swing = spd > 0.35 ? Math.sin(e.walkPhase) * 0.55 : 0;
      e.rig.leftLeg.rotation.x = swing;
      e.rig.rightLeg.rotation.x = -swing;
      e.rig.cloak.rotation.x = 0.16 + Math.min(0.5, spd * 0.06);
      e.rig.root.position.set(e.x, e.y, e.z);
      e.rig.root.rotation.y = e.yaw;
    }
  }

  private updateRemotes(dt: number) {
    const damp = 1 - Math.exp(-12 * dt);
    for (const ent of this.remotes.values()) {
      const prevX = ent.curX;
      const prevZ = ent.curZ;
      ent.curX = THREE.MathUtils.lerp(ent.curX, ent.state.x, damp);
      ent.curY = THREE.MathUtils.lerp(ent.curY, ent.state.y, damp);
      ent.curZ = THREE.MathUtils.lerp(ent.curZ, ent.state.z, damp);

      let diff = ent.state.yaw - ent.curYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      ent.curYaw += diff * damp;

      const moved = Math.hypot(ent.curX - prevX, ent.curZ - prevZ);
      ent.walkPhase += moved * 2.2;
      const swing = moved > 0.01 ? Math.sin(ent.walkPhase) * 0.6 : 0;
      ent.rig.leftLeg.rotation.x = swing;
      ent.rig.rightLeg.rotation.x = -swing;
      ent.rig.cloak.rotation.x = 0.16 + Math.min(0.55, (moved / Math.max(dt, 0.01)) * 0.06);

      if (ent.attackAnimTimer > 0) {
        ent.attackAnimTimer = Math.max(0, ent.attackAnimTimer - dt);
        ent.rig.rightArm.rotation.x = -1.6 + (1 - ent.attackAnimTimer / 0.35) * 2.5;
      } else {
        ent.rig.rightArm.rotation.x = swing * 0.4;
      }

      ent.rig.root.position.set(ent.curX, ent.curY, ent.curZ);
      ent.rig.root.rotation.y = ent.curYaw;
    }
  }

  private updateHitFlashesAndVfx(dt: number) {
    // Player hit flash
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
      const on = this.hitFlashTimer > 0;
      for (const m of this.playerRig.hitFlashMaterials) {
        m.emissive.copy(on ? _flashColor : _zeroColor);
        m.emissiveIntensity = on ? 0.65 : 0;
      }
    }

    // Enemy hit flashes
    for (const e of this.enemies) {
      if (e.hitFlashTimer > 0) {
        e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
        const on = e.hitFlashTimer > 0;
        for (const m of e.rig.hitFlashMaterials) {
          m.emissive.copy(on ? _flashColor : _zeroColor);
          m.emissiveIntensity = on ? 0.72 : 0;
        }
      }
    }

    // Slash Arc visual
    if (this.slashArcTimer > 0) {
      this.slashArcTimer = Math.max(0, this.slashArcTimer - dt);
      this.slashArcMesh.visible = true;
      const mat = this.slashArcMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(0.75, this.slashArcTimer * 3.8);
      this.slashArcMesh.rotation.z = -this.slashArcTimer * 9;
    } else {
      this.slashArcMesh.visible = false;
    }

    this.updateParticles(dt);
  }

  private updateParticles(dt: number) {
    let anyActive = false;
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyActive = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _dummy.position.set(0, -999, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vy -= 12 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const t = 1 - p.life / p.maxLife;
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.life * 6, p.life * 4, 0);
      _dummy.scale.setScalar(p.scale * t);
      _dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, _dummy.matrix);
    }
    if (anyActive) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateGameplayCamera(dt: number) {
    const horizDist = Math.cos(this.camPitch) * this.camDistance;
    const vertDist = Math.sin(this.camPitch) * this.camDistance + 2.25;

    _camDesired.set(
      this.px - Math.sin(this.camYaw) * horizDist,
      this.py + vertDist,
      this.pz - Math.cos(this.camYaw) * horizDist
    );

    // Prevent camera from clipping below terrain slopes
    const groundUnderCam = groundHeightAt(_camDesired.x, _camDesired.z) + 1.35;
    if (_camDesired.y < groundUnderCam) {
      _camDesired.y = groundUnderCam;
    }

    const damp = 1 - Math.exp(-10 * dt);
    this.camera.position.lerp(_camDesired, damp);

    _camTarget.set(this.px, this.py + 2.65, this.pz);

    // Decaying trauma^2 camera shake
    if (this.trauma > 0) {
      const shake = this.trauma * this.trauma;
      _v1.set(
        (Math.random() * 2 - 1) * shake * 0.55,
        (Math.random() * 2 - 1) * shake * 0.45,
        (Math.random() * 2 - 1) * shake * 0.55
      );
      _camTarget.add(_v1);
      this.trauma = Math.max(0, this.trauma - dt * 2.1);
    }

    this.camera.lookAt(_camTarget);
  }

  public emitHud() {
    const actors: MinimapActor[] = [
      { id: 'self', x: this.px, z: this.pz, kind: 'self' },
    ];
    for (const r of this.remotes.values()) {
      const isAlly =
        this.partyCode.length > 0 &&
        r.state.partyCode.toUpperCase() === this.partyCode;
      actors.push({
        id: r.state.id,
        x: r.curX,
        z: r.curZ,
        kind: isAlly ? 'friend' : 'rival',
        label: r.state.displayName,
      });
    }
    for (const e of this.enemies) {
      if (e.state === 'respawning' || e.state === 'ko') continue;
      actors.push({
        id: e.id,
        x: e.x,
        z: e.z,
        kind: 'enemy',
      });
    }

    const distCamp = Math.hypot(this.px - SAFE_ZONE_CENTER.x, this.pz - SAFE_ZONE_CENTER.z);
    this.callbacks.onHudSnapshot({
      hp: Math.round(this.hp),
      maxHp: Math.round(this.maxHp),
      stamina: Math.round(this.stamina),
      maxStamina: Math.round(this.maxStamina),
      biome: getBiomeAt(this.px, this.pz),
      inSafeZone: isInsideSafeZone(this.px, this.pz),
      nearCampfire: distCamp <= 9.5,
      playerX: Math.round(this.px),
      playerZ: Math.round(this.pz),
      playerYaw: this.pYaw,
      lightCooldown: this.lightCd,
      heavyCooldown: this.heavyCd,
      dashCooldown: this.dashCd,
      actors,
    });
  }

  public destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver?.disconnect();

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onBlur);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('contextmenu', this.onContextMenu);
    dom.removeEventListener('wheel', this.onWheel);

    this.world.dispose();
    this.shadowTexture.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}

export { BIOME_META };
