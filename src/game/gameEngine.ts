import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  groundHeightAt,
  walkableHeightAt,
  getBiomeAt,
  isInsideSafeZone,
  isInsideHorrorForest,
  isInsideUnderwaterCity,
  isOpenOcean,
  clampToPlayableWorld,
  WATER_LEVEL,
  SAFE_ZONE_CENTER,
  TOWN_FORGE_POS,
  TOWN_STABLE_POS,
  TOWN_TAVERN_POS,
  HARBOR_POS,
  HARBOR_SAILOR_POS,
  HARBOR_SHIP_SPAWN_POS,
  DARK_FOREST_POS,
  MOUNTAIN_CRYSTAL_POS,
  FOREST_TREE_POS,
  DESERT_ARENA_POS,
  VIKING_SHIP_POS,
  PIER_START_X,
  PIER_END_X,
  PIER_Z,
  PIRATE_ISLAND_POS,
  PIRATE_RELIC_POS,
  WIZARD_ISLAND_POS,
  WIZARD_RELIC_POS,
  FLOATING_TOWN_POS,
  WHIRLPOOL_POS,
  WHIRLPOOL_PULL_RADIUS,
  WHIRLPOOL_TELEPORT_RADIUS,
  UNDERWATER_CITY_POS,
  UNDERWATER_RELIC_POS,
  UNDERWATER_EXIT_POS,
  HORROR_FOREST_POS,
  HORROR_RELIC_POS,
  NORTH_POLE_POS,
  YETI_BOSS_POS,
  isInsideNorthPole,
  BiomeId,
  BIOME_META,
} from './worldMath';
import {
  PlayerProfileData,
  WeaponKind,
  getDerivedStats,
  calculateDamage,
  canWalkOnOcean,
  DESERT_ARENA_REQUIRED_KILLS,
} from './combatRules';
import {
  ActiveFoodBuff,
  FOOD_ITEMS,
  FOOD_BY_ID,
  FoodId,
  SHIP_BY_ID,
  ShipId,
  computeActiveFoodBuffs,
} from './inventoryData';
import {
  DESERT_ARENA_TOTAL_WAVES,
  DARK_FOREST_ELF_LEVEL,
  BANDIT_LEVEL,
  BANDIT_ARCHER_COUNT,
  BANDIT_MELEE_COUNT,
  HORSE_SPEED_MULT,
  HORSE_MOUNT_RADIUS,
  CONVOY_MAX_TIER,
  HORROR_FOREST_MIN_LEVEL,
  YETI_BOSS_LEVEL,
  ENEMY_CANNON_COOLDOWN_SEC,
  ENEMY_CANNON_HULL_MULT,
  ENEMY_CANNON_SPEED,
  BOW_MAX_CHARGE_SEC,
  CLASS_ESCAPE_CONFIG,
  ClassEscapeConfig,
  getBowChargeMultiplier,
  getBowArrowSpeed,
  getDesertArenaWaveConfig,
  getConvoyTierConfig,
  getPirateShipCrewSpec,
  evaluateBanditAmbushTick,
  evaluatePirateAmbushTick,
} from './worldEvents';
import { createContactShadowTexture } from './proceduralTextures';
import {
  buildWarriorRig,
  buildHorseRig,
  buildRecurveBowGroup,
  buildPoseidonTridentGroup,
  buildEscapeCannonMesh,
  setBowDrawAmount,
  buildShipModel,
  updateNameTagSprite,
  updateShipHpSprite,
  WarriorRig,
  HorseRig,
  ShipModelRig,
  EnemyArchetype,
  BowDrawParts,
} from './characterModels';
import { buildOpenWorld, BuiltWorld } from './worldBuilder';
import { soundEngine } from './soundEngine';
import {
  WeatherType,
  WEATHER_PRESETS,
  getNextWeather,
  advanceWeatherCycle,
} from './weatherSystem';
import type { RemotePlayerState } from '../services/multiplayer';

export type GameModeState = 'title' | 'playing' | 'paused' | 'gameover';
export type CameraMode = 'third_person' | 'first_person';

export interface MinimapActor {
  id: string;
  x: number;
  z: number;
  kind: 'self' | 'friend' | 'rival' | 'enemy' | 'horse' | 'ship' | 'convoy' | 'pirate_ship';
  label?: string;
}

export type QuestInteractKind =
  | 'mountain_crystal'
  | 'forest_tree'
  | 'desert_arena'
  | 'pirate_relic'
  | 'wizard_relic'
  | 'horror_relic'
  | 'underwater_relic';

export interface NearbyInteractable {
  kind:
    | 'campfire'
    | 'town_forge'
    | 'town_stable'
    | 'town_tavern'
    | 'harbor_sailor'
    | 'underwater_exit'
    | QuestInteractKind;
  label: string;
}

export interface HudBuffEntry {
  foodId: string;
  nameTr: string;
  remainingSec: number;
  accentColor: string;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  biome: BiomeId;
  inSafeZone: boolean;
  nearCampfire: boolean;
  nearbyInteractable: NearbyInteractable | null;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  lightCooldown: number;
  heavyCooldown: number;
  dashCooldown: number;
  weather: WeatherType;
  cameraMode: CameraMode;
  hasHorse: boolean;
  isMounted: boolean;
  horseDistance: number | null;
  hasShip: boolean;
  isSailing: boolean;
  shipHp: number;
  shipMaxHp: number;
  activeShipName: string | null;
  activeBuffs: HudBuffEntry[];
  arenaWave: number;
  arenaWaveTotal: number;
  arenaRemaining: number;
  ambushActive: boolean;
  ambushRemaining: number;
  pirateAmbushActive: boolean;
  pirateRemaining: number;
  convoyTier: number;
  convoyGoldNext: number;
  bowCharge: number;
  bowZooming: boolean;
  isSwimming: boolean;
  escapeNameTr: string;
  escapeCooldownMax: number;
  actors: MinimapActor[];
}

export interface EngineCallbacks {
  onHudSnapshot: (snap: HudSnapshot) => void;
  onBiomeDiscovered: (biome: BiomeId) => void;
  onEnemyDefeated: (enemyName: string, xp: number, gold: number, isDesertArena: boolean) => void;
  onYetiBossDefeated?: () => void;
  onDesertArenaWaveCleared?: (wave: number, completedAll: boolean) => void;
  onConvoySunk?: (tier: number, goldReward: number, xpReward: number, nextTier: number) => void;
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
  onTownStableInteract?: () => void;
  onTownTavernInteract?: () => void;
  onHarborSailorInteract?: () => void;
  onClassQuestInteract?: (source: QuestInteractKind) => void;
  onCombatToast: (text: string, tone: 'hit' | 'danger' | 'reward' | 'info') => void;
  onWeatherChanged?: (weather: WeatherType) => void;
  onCameraModeChanged?: (mode: CameraMode) => void;
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
  isDesertArena?: boolean;
  isBanditAmbush?: boolean;
  isPirateAmbush?: boolean;
  convoyBoatIdx?: number;
  deckOffsetX?: number;
  deckOffsetZ?: number;
  noRespawn?: boolean;
  state: 'patrol' | 'approach' | 'orbit' | 'windup' | 'strike' | 'recover' | 'stunned' | 'ko' | 'respawning';
  stateTimer: number;
  stunTimer: number;
  orbitDir: number;
  chargeDirX: number;
  chargeDirZ: number;
  hitFlashTimer: number;
  walkPhase: number;
  rig: WarriorRig;
}

interface ConvoyShipEntity {
  laneIdx: number;
  laneX: number;
  tier: number;
  hp: number;
  maxHp: number;
  x: number;
  z: number;
  yaw: number;
  dirZ: number; // 1 = South toward Floating Town, -1 = North toward Main Island Harbor
  speed: number;
  rig: ShipModelRig;
  cannonCd: number;
  respawnTimer: number;
  alive: boolean;
}

interface PirateShipEntity {
  x: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  rig: ShipModelRig;
  cannonCd: number;
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

interface ArrowSlot {
  active: boolean;
  fromEnemy: boolean;
  projKind: 'arrow' | 'bomb' | 'arcane' | 'cannonball';
  aoeRadius: number;
  shooterName: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  life: number;
  maxLife: number;
  isHeavy: boolean;
  damage: number;
  isCrit: boolean;
  colorHex: number;
  hitIds: Set<string>;
}

interface RainDropSlot {
  rx: number;
  ry: number;
  rz: number;
  speed: number;
}

// Pre-allocated scratch helpers (Zero GC in render loop)
const _v1 = new THREE.Vector3();
const _dummy = new THREE.Object3D();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _flashColor = new THREE.Color(0xffffff);
const _zeroColor = new THREE.Color(0x000000);
const _arrowColor = new THREE.Color();
const _targetSkyColor = new THREE.Color();
const _targetSunColor = new THREE.Color();
const _targetHemiSky = new THREE.Color();
const _targetHemiGround = new THREE.Color();
const _targetCloudColor = new THREE.Color();

// Fixed camera orientation (looking North from behind/above player)
const FIXED_CAM_YAW = Math.PI;
const FIXED_CAM_PITCH = 0.54;
const FIXED_CAM_DIST_FOOT = 14.2;
const FIXED_CAM_DIST_MOUNTED = 17.2;
const FIXED_CAM_DIST_SHIP = 28.5;

const DASH_ROLL_DURATION = 0.42;
const PARTICLE_POOL_SIZE = 180;
const ARROW_POOL_SIZE = 72;
const RAIN_COUNT = 260;
const RAIN_AREA = 42;
const RAIN_HEIGHT = 24;

export class OpenWorldEngine {
  private container: HTMLDivElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private skyColor: THREE.Color;
  private fog: THREE.FogExp2;
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private world: BuiltWorld;
  private shadowTexture: THREE.Texture;
  private isSoftwareGl: boolean;

  private weather: WeatherType = 'clear';
  private weatherCycleElapsed = 0;
  private weatherAutoCycle = true;
  private rainIntensityCurrent = 0;
  private thunderTimer = 10;
  private rainMesh: THREE.InstancedMesh;
  private rainMaterial: THREE.MeshBasicMaterial;
  private rainDrops: RainDropSlot[] = [];

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
  private pz = 12;
  private pvx = 0;
  private pvy = 0;
  private pvz = 0;
  private pYaw = Math.PI;
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private walkDist = 0;
  private squashX = 1;
  private squashY = 1;

  // Rideable Horse State (400 Gold from Town Stable; F = Mount/Dismount, G = Summon)
  private horseRig: HorseRig;
  private horseSpawned = false;
  private horseX = TOWN_STABLE_POS.x + 3.4;
  private horseY = 1.2;
  private horseZ = TOWN_STABLE_POS.z + 3.4;
  private horseYaw = 0;
  private isMounted = false;
  private horseGallopPhase = 0;

  private hp = 100;
  private maxHp = 100;
  private stamina = 100;
  private maxStamina = 100;
  private lightCd = 0;
  private heavyCd = 0;
  private dashCd = 0;
  private dashTimer = 0;
  private dashDuration = DASH_ROLL_DURATION;
  private dashSpeed = 18;
  private dashStyle: ClassEscapeConfig['style'] = 'shield_ram';
  private dashHitIds = new Set<string>();
  private dashDirX = 0;
  private dashDirZ = -1;
  private escapeCannonMesh: THREE.Group | null = null;
  private escapeCannonTimer = 0;
  private surfWaveMesh: THREE.Mesh;
  private pendingLandingBlast: null | { radius: number; color: number; mult: number; stunSec: number } = null;

  private attackAnimTimer = 0;
  private attackAnimDuration = 0.28;
  private attackIsHeavy = false;
  private attackComboSide = 1;
  private attackWeaponKind: WeaponKind = 'sword';
  private bowDrawing = false;
  private bowCharge = 0;
  private bowZooming = false;
  private isSwimming = false;
  private swimPhase = 0;
  private currentFov = 56;
  private hitFlashTimer = 0;
  private regenTick = 0;

  // Drivable Player Ship State ([B] Board/Disembark, WASD sail, J/K cannons)
  private playerShipRig: ShipModelRig | null = null;
  private playerShipVariant: ShipId | null = null;
  private isSailing = false;
  private shipX = HARBOR_SHIP_SPAWN_POS.x;
  private shipZ = HARBOR_SHIP_SPAWN_POS.z;
  private shipYaw = 0;
  private shipSpeed = 0;
  private shipHp = 1800;
  private shipMaxHp = 1800;

  // 2 Escalating Trade Convoy Ships (Main Harbor <-> Floating Town, Tier 1..10)
  private convoyShips: ConvoyShipEntity[] = [];
  private convoyTier = 1;

  // Open Ocean Pirate Ambush Galleon (20x150, 2x500, 1x1000, 2x100 Cannoneer, 4x100 Archer)
  private pirateAmbushElapsedSec = 0;
  private pirateAmbushActive = false;
  private pirateShip: PirateShipEntity | null = null;

  // Active Timed Food Buffs & Horror Forest Audio/Whirlpool Cooldown
  private activeBuffs: ActiveFoodBuff[] = [];
  private foodRegenAcc = 0;
  private horrorWhisperTimer = 4.5;
  private whirlpoolCooldown = 0;

  // Desert Arena 5-Wave System state
  private arenaWave = 0;
  private arenaNextWaveTimer = 0;
  private arenaWaveEnemiesSpawned = false;

  // Bandit Ambush Event state (every 5 min, 5% chance outside town)
  private ambushElapsedSec = 0;
  private ambushActive = false;

  // Camera Mode State (Fixed Third-Person & First-Person toggle via [C])
  private cameraMode: CameraMode = 'third_person';
  private fpYaw = Math.PI;
  private fpPitch = -0.04;
  private fpDragging = false;
  private fpDragMoved = 0;
  private fpLastMouseX = 0;
  private fpLastMouseY = 0;
  private fpWeaponAnchor: THREE.Group;
  private fpBowParts: BowDrawParts | null = null;
  private fpWeaponDisposables: (THREE.BufferGeometry | THREE.Material)[] = [];
  private trauma = 0;
  private hitstopTimer = 0;
  private titleTime = 0;

  // Input state
  private keysHeld = new Set<string>();
  private justPressed = new Set<string>();

  // Entities, Particles & Arrow/Bomb/Cannon Projectiles
  private enemies: EnemyEntity[] = [];
  private remotes = new Map<string, RemoteEntity>();
  private particles: ParticleSlot[] = [];
  private particleMesh: THREE.InstancedMesh;
  private particleCursor = 0;
  private arrows: ArrowSlot[] = [];
  private arrowMesh: THREE.InstancedMesh;
  private arrowCursor = 0;

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
    const initialPreset = WEATHER_PRESETS[this.weather];
    this.skyColor = new THREE.Color(initialPreset.skyHex);
    this.scene.background = this.skyColor;
    this.fog = new THREE.FogExp2(this.skyColor.getHex(), initialPreset.fogDensity * 0.72);
    this.scene.fog = this.fog;

    // Mandatory Procedural Studio Reflection Environment (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Camera (near=0.1 for crisp first-person weapon viewmodel, far=2600 for expanded Ocean & 4x North Pole)
    this.camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 2600);
    this.scene.add(this.camera);
    this.fpWeaponAnchor = new THREE.Group();
    this.fpWeaponAnchor.visible = false;
    this.camera.add(this.fpWeaponAnchor);

    // Balanced Warm/Cool Outdoor Lighting Rig (1 shadow caster)
    this.hemiLight = new THREE.HemisphereLight(
      new THREE.Color(initialPreset.hemiSkyHex).getHex(),
      new THREE.Color(initialPreset.hemiGroundHex).getHex(),
      initialPreset.hemiIntensity
    );
    this.hemiLight.position.set(0, 95, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffe9c2, 1.58);
    this.sunLight.position.set(48, 76, 40);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 190;
    const d = 48;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight(0x8ec2eb, 0.45);
    rimLight.position.set(-45, 32, -55);
    this.scene.add(rimLight);

    // Build Expanded Open World Terrain, Town, Islands & 4x Kuzey Kutbu
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.world = buildOpenWorld(this.scene, maxAniso);
    this.shadowTexture = createContactShadowTexture();

    // Build Local Player Warrior / Balıkadam / Buz Yetisi
    const initialStats = getDerivedStats(initialProfile);
    this.playerRig = buildWarriorRig({
      tunicColor: initialProfile.tunicColor,
      swordTier: initialProfile.swordTier,
      armorTier: initialProfile.armorTier,
      weaponKind: initialStats.activeWeaponKind,
      playerClass: initialProfile.playerClass,
      isRunicYeti: initialProfile.playerClass === 'yeti' && Boolean(initialProfile.yetiRuneUnlocked),
      shadowTexture: this.shadowTexture,
    });
    this.rebuildFirstPersonWeapon();
    this.scene.add(this.playerRig.root);

    // Build Rideable Horse Rig (hidden until player buys a horse for 400 Gold)
    this.horseRig = buildHorseRig(this.shadowTexture);
    this.horseRig.root.visible = false;
    this.scene.add(this.horseRig.root);

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

    // Balıkadam Tidal Surf Wave Mesh (shown during Gelgit Sörfü escape)
    this.surfWaveMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.55, 2.8, 12, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.15,
        transparent: true,
        opacity: 0.82,
        roughness: 0.14,
      })
    );
    this.surfWaveMesh.rotation.z = Math.PI / 2;
    this.surfWaveMesh.rotation.y = Math.PI / 2;
    this.surfWaveMesh.position.set(0, 0.32, 0.35);
    this.surfWaveMesh.visible = false;
    this.playerRig.root.add(this.surfWaveMesh);

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

    // Pooled Zero-GC Raindrop Streaks
    const rainGeo = new THREE.CylinderGeometry(0.024, 0.018, 1.65, 4);
    this.rainMaterial = new THREE.MeshBasicMaterial({
      color: 0xdceefa,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.rainMesh = new THREE.InstancedMesh(rainGeo, this.rainMaterial, RAIN_COUNT);
    this.rainMesh.frustumCulled = false;
    this.rainMesh.visible = false;
    for (let i = 0; i < RAIN_COUNT; i++) {
      this.rainDrops.push({
        rx: (Math.random() - 0.5) * RAIN_AREA,
        ry: Math.random() * RAIN_HEIGHT,
        rz: (Math.random() - 0.5) * RAIN_AREA,
        speed: 22 + Math.random() * 10,
      });
      _dummy.position.set(0, -999, 0);
      _dummy.rotation.set(0.07, 0, -0.14);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      this.rainMesh.setMatrixAt(i, _dummy.matrix);
    }
    this.rainMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.rainMesh);

    // Pooled Zero-GC 3D Arrow Projectiles (Player Bow + Kara Orman Elves + Bandit Archers)
    const arrowGeo = new THREE.CylinderGeometry(0.036, 0.052, 1.45, 5);
    arrowGeo.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.arrowMesh = new THREE.InstancedMesh(arrowGeo, arrowMat, ARROW_POOL_SIZE);
    this.arrowMesh.frustumCulled = false;
    for (let i = 0; i < ARROW_POOL_SIZE; i++) {
      this.arrows.push({
        active: false,
        fromEnemy: false,
        projKind: 'arrow',
        aoeRadius: 0,
        shooterName: '',
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: 0,
        life: 0,
        maxLife: 1.1,
        isHeavy: false,
        damage: 0,
        isCrit: false,
        colorHex: 0x6effa8,
        hitIds: new Set<string>(),
      });
      _dummy.position.set(0, -999, 0);
      _dummy.scale.setScalar(0.001);
      _dummy.updateMatrix();
      this.arrowMesh.setMatrixAt(i, _dummy.matrix);
      this.arrowMesh.setColorAt(i, new THREE.Color(0x6effa8));
    }
    this.arrowMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.arrowMesh);

    // Spawn Persistent World Challengers (Main Island + 5 Ocean Islands) & 2 Convoy Boats
    this.convoyTier = Math.max(1, Math.min(CONVOY_MAX_TIER, initialProfile.convoyTier || 1));
    this.spawnWorldChallengers();
    this.initConvoyShips(this.convoyTier);

    // Apply initial profile & position in Starter Town
    this.applyProfile(initialProfile, true);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.lastTime = performance.now();
    this.tick();
  }

  private getEnemyBadgeMeta(archetype: EnemyArchetype): { text: string; color: string } {
    switch (archetype) {
      case 'orc_boss':
        return { text: 'ORK ŞEFİ', color: '#ff4238' };
      case 'viking_leader':
        return { text: 'LİDER', color: '#ffd147' };
      case 'viking':
        return { text: 'VİKİNG', color: '#68b8ff' };
      case 'elf_archer':
        return { text: 'ELF OKÇU', color: '#52f2a8' };
      case 'bandit_archer':
        return { text: 'HAYDUT OKÇU', color: '#ff6e42' };
      case 'bandit_melee':
        return { text: 'HAYDUT', color: '#ff5252' };
      case 'arena_gladiator':
        return { text: 'ARENA', color: '#ff8a4c' };
      case 'warden':
        return { text: 'ZİRVE', color: '#f07154' };
      case 'pirate_captain':
        return { text: 'KORSAN KAPTAN', color: '#ff3b30' };
      case 'pirate_first_mate':
        return { text: 'YARD. KAPTAN', color: '#f97316' };
      case 'pirate_cannoneer':
        return { text: 'TOPÇU', color: '#f59e0b' };
      case 'pirate_archer':
        return { text: 'KORSAN OKÇU', color: '#fb923c' };
      case 'pirate_swordsman':
        return { text: 'KORSAN', color: '#ef4444' };
      case 'navy_captain':
        return { text: 'DENİZCİ KAPTAN', color: '#38bdf8' };
      case 'navy_cannoneer':
        return { text: 'DONANMA TOPÇU', color: '#60a5fa' };
      case 'navy_sailor':
        return { text: 'TAYFA', color: '#93c5fd' };
      case 'horror_abomination':
        return { text: 'KABUS LORDU', color: '#f43f5e' };
      case 'horror_reaper':
        return { text: 'KORKU BİÇİCİ', color: '#e11d48' };
      case 'horror_stalker':
        return { text: 'KORKU AVCI', color: '#fb7185' };
      case 'arcane_mage':
        return { text: 'BÜYÜCÜ', color: '#c084fc' };
      case 'sea_guardian':
        return { text: 'ATLANTİS', color: '#22d3ee' };
      case 'polar_yeti':
        return { text: 'KUTUP YETİSİ', color: '#7dd3fc' };
      case 'yeti_boss':
        return { text: 'DEVASA YETİ BOSS', color: '#38bdf8' };
      default:
        return { text: 'RAKİP', color: '#f07154' };
    }
  }

  private createEnemy(spec: {
    id: string;
    name: string;
    archetype: EnemyArchetype;
    level: number;
    x: number;
    z: number;
    tunic: string;
    isDesertArena?: boolean;
    isBanditAmbush?: boolean;
    isPirateAmbush?: boolean;
    convoyBoatIdx?: number;
    deckOffsetX?: number;
    deckOffsetZ?: number;
    overrideY?: number;
    noRespawn?: boolean;
    overrideHp?: number;
    overrideAtk?: number;
    overrideDef?: number;
    overrideXp?: number;
    overrideGold?: number;
  }): EnemyEntity {
    const y = spec.overrideY ?? walkableHeightAt(spec.x, spec.z).y;
    const maxHp =
      spec.overrideHp ??
      (spec.archetype === 'yeti_boss'
        ? 58000
        : spec.archetype === 'polar_yeti'
        ? 14500
        : spec.archetype === 'pirate_captain'
        ? 42000
        : spec.archetype === 'horror_abomination'
        ? 38000
        : spec.archetype === 'horror_reaper'
        ? 29000
        : spec.archetype === 'horror_stalker'
        ? 24000
        : spec.archetype === 'orc_boss'
        ? 26000
        : spec.archetype === 'pirate_first_mate'
        ? 16000
        : spec.archetype === 'navy_captain'
        ? 22000
        : spec.archetype === 'sea_guardian'
        ? 12000
        : spec.archetype === 'arcane_mage'
        ? 7200
        : spec.archetype === 'pirate_swordsman'
        ? 3400
        : spec.archetype === 'pirate_cannoneer' || spec.archetype === 'pirate_archer'
        ? 2000
        : spec.archetype === 'navy_cannoneer' || spec.archetype === 'navy_sailor'
        ? 2200
        : spec.archetype === 'warden'
        ? 240 + spec.level * 30
        : spec.archetype === 'arena_gladiator'
        ? 160 + spec.level * 22
        : spec.archetype === 'elf_archer'
        ? 1250
        : spec.archetype === 'bandit_archer' || spec.archetype === 'bandit_melee'
        ? 5600
        : 100 + spec.level * 16);

    const rig = buildWarriorRig({
      tunicColor: spec.tunic,
      swordTier: Math.min(10, Math.max(1, Math.ceil(spec.level / 25))),
      armorTier: Math.min(10, Math.max(1, Math.ceil(spec.level / 25))),
      displayName: spec.name,
      level: spec.level,
      isEnemy: true,
      enemyType: spec.archetype,
      shadowTexture: this.shadowTexture,
    });
    rig.root.position.set(spec.x, y, spec.z);
    this.scene.add(rig.root);

    const entity: EnemyEntity = {
      id: spec.id,
      name: spec.name,
      archetype: spec.archetype,
      level: spec.level,
      homeX: spec.x,
      homeZ: spec.z,
      x: spec.x,
      y,
      z: spec.z,
      vx: 0,
      vz: 0,
      yaw: spec.archetype === 'viking' || spec.archetype === 'viking_leader' ? Math.PI * 0.5 : 0,
      hp: maxHp,
      maxHp,
      attack:
        spec.overrideAtk ??
        (spec.archetype === 'yeti_boss'
          ? 440
          : spec.archetype === 'polar_yeti'
          ? 245
          : spec.archetype === 'pirate_captain'
          ? 400
          : spec.archetype === 'horror_abomination'
          ? 440
          : spec.archetype === 'horror_reaper'
          ? 360
          : spec.archetype === 'horror_stalker'
          ? 320
          : spec.archetype === 'orc_boss'
          ? 270
          : spec.archetype === 'pirate_first_mate'
          ? 250
          : spec.archetype === 'navy_captain'
          ? 280
          : spec.archetype === 'navy_cannoneer' || spec.archetype === 'pirate_cannoneer'
          ? 52
          : spec.archetype === 'sea_guardian'
          ? 230
          : spec.archetype === 'arcane_mage'
          ? 175
          : spec.archetype === 'pirate_swordsman' || spec.archetype === 'pirate_archer'
          ? 115
          : spec.archetype === 'elf_archer'
          ? 52
          : spec.archetype === 'bandit_archer'
          ? 145
          : spec.archetype === 'bandit_melee'
          ? 165
          : spec.archetype === 'arena_gladiator'
          ? 24 + Math.round(spec.level * 0.72)
          : 15 + spec.level * 2),
      defense:
        spec.overrideDef ??
        (spec.archetype === 'yeti_boss'
          ? 220
          : spec.archetype === 'polar_yeti'
          ? 110
          : spec.archetype === 'pirate_captain' || spec.archetype === 'horror_abomination'
          ? 200
          : spec.archetype === 'horror_reaper' || spec.archetype === 'horror_stalker'
          ? 170
          : spec.archetype === 'orc_boss'
          ? 145
          : spec.archetype === 'bandit_archer' || spec.archetype === 'bandit_melee'
          ? 72
          : spec.archetype === 'elf_archer'
          ? 24
          : Math.round(4 + spec.level * 0.42)),
      // Slower progression XP table (matching steeper XP curve)
      xpReward:
        spec.overrideXp ??
        (spec.archetype === 'yeti_boss'
          ? 45000
          : spec.archetype === 'polar_yeti'
          ? 7200
          : spec.archetype === 'pirate_captain'
          ? 32000
          : spec.archetype === 'horror_abomination'
          ? 28000
          : spec.archetype === 'horror_reaper' || spec.archetype === 'horror_stalker'
          ? 16000
          : spec.archetype === 'orc_boss'
          ? 11000
          : spec.archetype === 'pirate_first_mate' || spec.archetype === 'navy_captain'
          ? 9500
          : spec.archetype === 'sea_guardian'
          ? 6800
          : spec.archetype === 'arcane_mage'
          ? 4200
          : spec.archetype === 'bandit_archer' || spec.archetype === 'bandit_melee'
          ? 2800
          : spec.archetype === 'elf_archer'
          ? 820
          : Math.round(58 + spec.level * 14)),
      goldReward:
        spec.overrideGold ??
        (spec.archetype === 'yeti_boss'
          ? 15000
          : spec.archetype === 'polar_yeti'
          ? 2400
          : spec.archetype === 'pirate_captain'
          ? 12000
          : spec.archetype === 'horror_abomination'
          ? 10000
          : spec.archetype === 'horror_reaper' || spec.archetype === 'horror_stalker'
          ? 5200
          : spec.archetype === 'orc_boss'
          ? 4000
          : spec.archetype === 'pirate_first_mate' || spec.archetype === 'navy_captain'
          ? 3200
          : spec.archetype === 'sea_guardian'
          ? 2600
          : spec.archetype === 'arcane_mage'
          ? 1500
          : spec.archetype === 'bandit_archer' || spec.archetype === 'bandit_melee'
          ? 900
          : spec.archetype === 'elf_archer'
          ? 240
          : Math.round(40 + spec.level * 4)),
      isDesertArena: spec.isDesertArena,
      isBanditAmbush: spec.isBanditAmbush,
      isPirateAmbush: spec.isPirateAmbush,
      convoyBoatIdx: spec.convoyBoatIdx,
      deckOffsetX: spec.deckOffsetX,
      deckOffsetZ: spec.deckOffsetZ,
      noRespawn: spec.noRespawn,
      state: 'patrol',
      stateTimer: 1.2,
      stunTimer: 0,
      orbitDir: Math.random() > 0.5 ? 1 : -1,
      chargeDirX: 0,
      chargeDirZ: 1,
      hitFlashTimer: 0,
      walkPhase: 0,
      rig,
    };

    const badge = this.getEnemyBadgeMeta(spec.archetype);
    updateNameTagSprite(rig, spec.name, spec.level, maxHp, maxHp, badge.text, badge.color);
    this.enemies.push(entity);
    return entity;
  }

  private removeEnemiesMatching(pred: (e: EnemyEntity) => boolean) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (pred(this.enemies[i])) {
        this.scene.remove(this.enemies[i].rig.root);
        this.enemies.splice(i, 1);
      }
    }
  }

  private spawnWorldChallengers() {
    // Starter Meadow / Road Patrols outside town
    this.createEnemy({ id: 'npc-skirm-1', name: 'Çayır Avcısı', archetype: 'skirmisher', level: 2, x: -24, z: -42, tunic: '#3e7c44' });
    this.createEnemy({ id: 'npc-skirm-2', name: 'Vadi İzci', archetype: 'skirmisher', level: 4, x: 46, z: -18, tunic: '#2f7c6f' });
    this.createEnemy({ id: 'npc-skirm-3', name: 'Güney Akıncı', archetype: 'skirmisher', level: 6, x: 12, z: 54, tunic: '#4e6f3a' });

    // Bozdağ Northern Mountain Guardians
    this.createEnemy({ id: 'npc-warden-1', name: 'Bozdağ Muhafızı', archetype: 'warden', level: 25, x: -16, z: -112, tunic: '#54406e' });
    this.createEnemy({ id: 'npc-warden-2', name: 'Zirve Şampiyonu', archetype: 'warden', level: 40, x: 5, z: -146, tunic: '#8c2832' });

    // KARA ORMAN SPECIAL: 6 × Level 50 Ranged Bow Elves!
    const elfOffsets: [number, number, string][] = [
      [-10, -8, 'Kara Orman Elfi'],
      [11, -10, 'Gölge Okçu Elfi'],
      [-15, 9, 'Kara Orman Elfi'],
      [14, 11, 'Kadim Yay Elfi'],
      [0, -18, 'Orman Nöbetçisi Elf'],
      [-4, 17, 'Zümrüt Okçu Elfi'],
    ];
    elfOffsets.forEach(([ox, oz, label], idx) => {
      this.createEnemy({
        id: `npc-elf-${idx + 1}`,
        name: label,
        archetype: 'elf_archer',
        level: DARK_FOREST_ELF_LEVEL,
        x: DARK_FOREST_POS.x + ox,
        z: DARK_FOREST_POS.z + oz,
        tunic: '#1c6e46',
      });
    });

    // SILVER LAKE VIKING LONGSHIP: 3 × Lv100 Vikings + 1 × Lv300 Viking Leader
    this.createEnemy({
      id: 'npc-viking-1',
      name: 'Kuzey Vikingi',
      archetype: 'viking',
      level: 100,
      x: VIKING_SHIP_POS.x + 2.4,
      z: VIKING_SHIP_POS.z - 4.8,
      tunic: '#29578c',
      overrideHp: 3200,
      overrideAtk: 95,
      overrideDef: 48,
      overrideXp: 4500,
      overrideGold: 850,
    });
    this.createEnemy({
      id: 'npc-viking-2',
      name: 'Buz Balta Vikingi',
      archetype: 'viking',
      level: 100,
      x: VIKING_SHIP_POS.x - 2.2,
      z: VIKING_SHIP_POS.z + 4.8,
      tunic: '#326378',
      overrideHp: 3200,
      overrideAtk: 95,
      overrideDef: 48,
      overrideXp: 4500,
      overrideGold: 850,
    });
    this.createEnemy({
      id: 'npc-viking-3',
      name: 'Göl Akıncısı',
      archetype: 'viking',
      level: 100,
      x: PIER_END_X + 7,
      z: PIER_Z,
      tunic: '#3b4e6e',
      overrideHp: 3200,
      overrideAtk: 95,
      overrideDef: 48,
      overrideXp: 4500,
      overrideGold: 850,
    });
    this.createEnemy({
      id: 'npc-viking-leader',
      name: 'Viking Lideri',
      archetype: 'viking_leader',
      level: 300,
      x: VIKING_SHIP_POS.x,
      z: VIKING_SHIP_POS.z + 0.6,
      tunic: '#8c1e26',
      overrideHp: 12500,
      overrideAtk: 220,
      overrideDef: 110,
      overrideXp: 18000,
      overrideGold: 3500,
    });

    // ---- OCEAN ISLAND 1: KORSAN ADASI BUCCANEERS ----
    const pirateIslandUnits: [number, number, string, EnemyArchetype, number][] = [
      [-14, 10, 'Korsan Gözcü', 'pirate_swordsman', 150],
      [15, 12, 'Korsan Nişancı', 'pirate_archer', 140],
      [-12, -16, 'Korsan Topçusu', 'pirate_cannoneer', 160],
      [14, -14, 'Kafatası Korsanı', 'pirate_swordsman', 180],
      [0, 22, 'Koy Yüzbaşısı', 'pirate_first_mate', 260],
    ];
    pirateIslandUnits.forEach(([ox, oz, label, arch, lvl], idx) => {
      this.createEnemy({
        id: `npc-pirate-isl-${idx + 1}`,
        name: label,
        archetype: arch,
        level: lvl,
        x: PIRATE_ISLAND_POS.x + ox,
        z: PIRATE_ISLAND_POS.z + oz,
        tunic: '#7f1d1d',
      });
    });

    // ---- OCEAN ISLAND 2: BÜYÜCÜ ADASI ARCANE MAGES ----
    const wizardUnits: [number, number, string, number][] = [
      [-16, 12, 'Ametist Büyücü', 240],
      [16, 10, 'Yıldız Kahini', 260],
      [-12, -18, 'Rün Muhafızı', 280],
      [14, -16, 'Baş Büyücü Çırağı', 320],
    ];
    wizardUnits.forEach(([ox, oz, label, lvl], idx) => {
      this.createEnemy({
        id: `npc-wiz-${idx + 1}`,
        name: label,
        archetype: 'arcane_mage',
        level: lvl,
        x: WIZARD_ISLAND_POS.x + ox,
        z: WIZARD_ISLAND_POS.z + oz,
        tunic: '#6b21a8',
      });
    });

    // ---- OCEAN ISLAND 4B: SUALTI ŞEHRİ ATLANTİS GUARDIANS ----
    const atlantisUnits: [number, number, string, number][] = [
      [-16, -6, 'Atlantis Mızrakçısı', 420],
      [16, -6, 'Derin Deniz Şövalyesi', 450],
      [-12, -24, 'Mercan Muhafızı', 480],
      [12, -24, 'Poseidon Bekçisi', 550],
    ];
    atlantisUnits.forEach(([ox, oz, label, lvl], idx) => {
      this.createEnemy({
        id: `npc-uw-${idx + 1}`,
        name: label,
        archetype: 'sea_guardian',
        level: lvl,
        x: UNDERWATER_CITY_POS.x + ox,
        z: UNDERWATER_CITY_POS.z + oz,
        tunic: '#0e7490',
      });
    });

    // ---- OCEAN ISLAND 5: SİSLİ KORKU ORMANI (MINIMUM LEVEL 800+ NIGHTMARE MONSTERS!) ----
    const horrorUnits: [number, number, string, EnemyArchetype, number][] = [
      [-16, 14, 'Sisli Korku Avcısı', 'horror_stalker', HORROR_FOREST_MIN_LEVEL],
      [16, 14, 'Gölge Korku Avcısı', 'horror_stalker', 810],
      [-20, -8, 'Kabus Biçici', 'horror_reaper', 850],
      [20, -8, 'Laneti Taşıyan', 'horror_reaper', 860],
      [-10, -24, 'Karanlık Hayalet', 'horror_stalker', 830],
      [10, -24, 'Kanlı Biçici', 'horror_reaper', 880],
      [0, -4, 'Korku Ormanı Lordu', 'horror_abomination', 950],
    ];
    horrorUnits.forEach(([ox, oz, label, arch, lvl], idx) => {
      this.createEnemy({
        id: `npc-horror-${idx + 1}`,
        name: label,
        archetype: arch,
        level: lvl,
        x: HORROR_FOREST_POS.x + ox,
        z: HORROR_FOREST_POS.z + oz,
        tunic: '#1e1b2e',
      });
    });

    // ---- 4× KUZEY KUTBU (NORTH POLE): 5× POLAR YETIS + 1× LV.1000 DEVASA YETİ BOSS! ----
    const polarYetis: [number, number, string, number][] = [
      [-48, 86, 'Buzul Yetisi', 420],
      [52, 80, 'Kar Fırtınası Yetisi', 440],
      [-74, -22, 'Kutup Muhafızı Yeti', 480],
      [76, -18, 'Kadim Buz Yetisi', 500],
      [0, 32, 'Kuzey Geçidi Yetisi', 520],
    ];
    polarYetis.forEach(([ox, oz, label, lvl], idx) => {
      this.createEnemy({
        id: `npc-polar-yeti-${idx + 1}`,
        name: label,
        archetype: 'polar_yeti',
        level: lvl,
        x: NORTH_POLE_POS.x + ox,
        z: NORTH_POLE_POS.z + oz,
        tunic: '#bae6fd',
      });
    });

    // THE LV.1000 GIANT YETI BOSS — Defeating it drops the Yeti Rune (5x Yeti Power + Runic Form!)
    this.createEnemy({
      id: 'npc-yeti-boss',
      name: 'Devasa Kutup Yetisi',
      archetype: 'yeti_boss',
      level: YETI_BOSS_LEVEL,
      x: YETI_BOSS_POS.x,
      z: YETI_BOSS_POS.z,
      tunic: '#38bdf8',
    });
  }

  // ============================================================================
  // 2 ESCALATING CONVOY BOATS (MAIN HARBOR <-> FLOATING TOWN, TIER 1..10)
  // ============================================================================
  public initConvoyShips(tier: number) {
    for (const c of this.convoyShips) {
      this.scene.remove(c.rig.root);
    }
    this.convoyShips = [];
    this.removeEnemiesMatching((e) => e.convoyBoatIdx !== undefined);
    this.convoyTier = Math.max(1, Math.min(CONVOY_MAX_TIER, tier));

    this.spawnConvoyBoatAtLane(0, -30, 315, 1, this.convoyTier);
    this.spawnConvoyBoatAtLane(1, 30, 415, -1, this.convoyTier);
  }

  private spawnConvoyBoatAtLane(
    laneIdx: number,
    laneX: number,
    startZ: number,
    dirZ: number,
    tier: number
  ) {
    const cfg = getConvoyTierConfig(tier);
    const rig = buildShipModel({
      variant: 'convoy',
      scale: cfg.shipScale,
      withHpBar: true,
    });
    const yaw = dirZ > 0 ? 0 : Math.PI;
    rig.root.position.set(laneX, WATER_LEVEL, startZ);
    rig.root.rotation.y = yaw;
    updateShipHpSprite(
      rig,
      `${cfg.nameTr} (Sv.${cfg.tier})`,
      `${cfg.goldReward} ALTIN · ${cfg.crewCount} TAYFA`,
      cfg.hullHp,
      cfg.hullHp,
      '#38bdf8'
    );
    this.scene.add(rig.root);

    const boat: ConvoyShipEntity = {
      laneIdx,
      laneX,
      tier: cfg.tier,
      hp: cfg.hullHp,
      maxHp: cfg.hullHp,
      x: laneX,
      z: startZ,
      yaw,
      dirZ,
      speed: Math.max(5.5, 9.2 - cfg.tier * 0.28),
      rig,
      cannonCd: 2.2,
      respawnTimer: 0,
      alive: true,
    };

    const existingIdx = this.convoyShips.findIndex((b) => b.laneIdx === laneIdx);
    if (existingIdx >= 0) {
      this.scene.remove(this.convoyShips[existingIdx].rig.root);
      this.convoyShips[existingIdx] = boat;
    } else {
      this.convoyShips.push(boat);
    }

    // Spawn visible crew on deck (Tier 1 = 0, Tier 2 = 5, ..., Tier 10 = 1 Navy Captain + 5 Cannoneers + sailors)
    this.removeEnemiesMatching((e) => e.convoyBoatIdx === laneIdx);
    const deckY = WATER_LEVEL + rig.deckY;
    if (cfg.hasNavyCaptain) {
      this.createEnemy({
        id: `convoy-${laneIdx}-navy-captain`,
        name: 'Denizci Kaptanı',
        archetype: 'navy_captain',
        level: cfg.captainLevel || 600,
        x: laneX,
        z: startZ - 3.5 * cfg.shipScale,
        overrideY: deckY,
        tunic: '#1e3a8a',
        convoyBoatIdx: laneIdx,
        deckOffsetX: 0,
        deckOffsetZ: -3.5 * cfg.shipScale,
        noRespawn: true,
      });
    }
    for (let c = 0; c < cfg.cannoneerCount; c++) {
      const side = c % 2 === 0 ? -1 : 1;
      const offX = side * (rig.halfWidth * 0.72);
      const offZ = (Math.floor(c / 2) - 1) * 3.2 * cfg.shipScale;
      this.createEnemy({
        id: `convoy-${laneIdx}-cannoneer-${c + 1}`,
        name: 'Donanma Topçusu',
        archetype: 'navy_cannoneer',
        level: cfg.cannoneerLevel || 250,
        x: laneX + offX,
        z: startZ + offZ,
        overrideY: deckY,
        tunic: '#1d4ed8',
        convoyBoatIdx: laneIdx,
        deckOffsetX: offX,
        deckOffsetZ: offZ,
        noRespawn: true,
      });
    }
    const visibleSailors = Math.min(8, Math.max(0, cfg.crewCount - cfg.cannoneerCount - (cfg.hasNavyCaptain ? 1 : 0)));
    for (let s = 0; s < visibleSailors; s++) {
      const offX = (s % 2 === 0 ? -1 : 1) * (rig.halfWidth * 0.45);
      const offZ = ((s / Math.max(1, visibleSailors - 1)) - 0.5) * rig.halfLength * 1.1;
      this.createEnemy({
        id: `convoy-${laneIdx}-sailor-${s + 1}`,
        name: `Konvoy Tayfası (${cfg.crewCount} Kişi)`,
        archetype: 'navy_sailor',
        level: cfg.crewLevel,
        x: laneX + offX,
        z: startZ + offZ,
        overrideY: deckY,
        tunic: '#2563eb',
        convoyBoatIdx: laneIdx,
        deckOffsetX: offX,
        deckOffsetZ: offZ,
        noRespawn: true,
      });
    }
  }

  private damageConvoyShip(boat: ConvoyShipEntity, dmg: number) {
    if (!boat.alive) return;
    boat.hp = Math.max(0, boat.hp - dmg);
    const cfg = getConvoyTierConfig(boat.tier);
    updateShipHpSprite(
      boat.rig,
      `${cfg.nameTr} (Sv.${cfg.tier})`,
      `${cfg.goldReward} ALTIN · ${cfg.crewCount} TAYFA`,
      boat.hp,
      boat.maxHp,
      '#38bdf8'
    );
    this.spawnBurst(boat.x, WATER_LEVEL + 2.8, boat.z, 12, 0xff9b26, 5.5);

    if (boat.hp <= 0) {
      boat.alive = false;
      boat.rig.root.visible = false;
      boat.respawnTimer = 4.2;
      this.removeEnemiesMatching((e) => e.convoyBoatIdx === boat.laneIdx);
      soundEngine.playBombExplosion();
      this.spawnBurst(boat.x, WATER_LEVEL + 3.2, boat.z, 34, 0xff6b1a, 9.5);
      this.trauma = Math.min(1, this.trauma + 0.5);

      const nextTier = Math.min(CONVOY_MAX_TIER, this.convoyTier + 1);
      this.convoyTier = nextTier;
      this.callbacks.onConvoySunk?.(cfg.tier, cfg.goldReward, cfg.xpReward, nextTier);
      this.callbacks.onCombatToast(
        `${cfg.nameTr} batırıldı! +${cfg.goldReward} Altın! Yüzen Kasaba'dan Sv.${nextTier} filo yola çıkıyor!`,
        'reward'
      );
      this.emitHud();
    }
  }

  // ============================================================================
  // OPEN OCEAN PIRATE SHIP AMBUSH (EXACT 29-PIRATE CREW)
  // 20× Lv150 Swordsmen · 2× Lv500 First Mates · 1× Lv1000 Giant Captain · 2× Lv100 Cannoneers · 4× Lv100 Archers
  // ============================================================================
  public triggerPirateAmbush() {
    this.clearPirateAmbush();
    this.pirateAmbushActive = true;

    const aheadDist = this.isSailing ? 52 : 38;
    const anchorX = this.isSailing
      ? this.shipX + Math.sin(this.shipYaw) * aheadDist
      : isOpenOcean(this.px, this.pz)
      ? this.px + 38
      : HARBOR_SHIP_SPAWN_POS.x + 14;
    const anchorZ = this.isSailing
      ? this.shipZ + Math.cos(this.shipYaw) * aheadDist
      : isOpenOcean(this.px, this.pz)
      ? this.pz + 28
      : HARBOR_SHIP_SPAWN_POS.z + 52;
    const clamped = clampToPlayableWorld(anchorX, anchorZ);

    const rig = buildShipModel({
      variant: 'pirate_galleon',
      scale: 1.12,
      withHpBar: true,
    });
    rig.root.position.set(clamped.x, WATER_LEVEL, clamped.z);
    const yaw = Math.atan2(this.px - clamped.x, this.pz - clamped.z);
    rig.root.rotation.y = yaw;
    const maxHp = 28000;
    updateShipHpSprite(
      rig,
      'KORSAN SAVAŞ KALYONU (29 Korsan)',
      '1000 SV. KAPTAN · 2 YRD · 20 KILIÇ · 2 TOPÇU · 4 OKÇU',
      maxHp,
      maxHp,
      '#ef4444'
    );
    this.scene.add(rig.root);

    this.pirateShip = {
      x: clamped.x,
      z: clamped.z,
      yaw,
      hp: maxHp,
      maxHp,
      rig,
      cannonCd: 2.0,
    };

    const deckY = WATER_LEVEL + rig.deckY;
    const spec = getPirateShipCrewSpec();
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const placeOnDeck = (lx: number, lz: number) => ({
      wx: clamped.x + lx * cosY + lz * sinY,
      wz: clamped.z - lx * sinY + lz * cosY,
    });

    // 1. Giant Lv.1000 Pirate Captain at stern quarterdeck
    const capP = placeOnDeck(0, -6.5);
    this.createEnemy({
      id: 'pirate-raid-captain',
      name: 'Devasa Korsan Kaptanı',
      archetype: 'pirate_captain',
      level: spec.captainLevel,
      x: capP.wx,
      z: capP.wz,
      overrideY: deckY,
      tunic: '#7f1d1d',
      isPirateAmbush: true,
      deckOffsetX: 0,
      deckOffsetZ: -6.5,
      noRespawn: true,
    });

    // 2. 2 × Lv.500 First Mates flanking the captain
    for (let i = 0; i < spec.firstMatesCount; i++) {
      const lx = i === 0 ? -3.4 : 3.4;
      const lz = -3.8;
      const p = placeOnDeck(lx, lz);
      this.createEnemy({
        id: `pirate-raid-mate-${i + 1}`,
        name: 'Yardımcı Korsan Kaptanı',
        archetype: 'pirate_first_mate',
        level: spec.firstMatesLevel,
        x: p.wx,
        z: p.wz,
        overrideY: deckY,
        tunic: '#9a3412',
        isPirateAmbush: true,
        deckOffsetX: lx,
        deckOffsetZ: lz,
        noRespawn: true,
      });
    }

    // 3. 2 × Lv.100 Ranged Cannoneers on port & starboard gunwales
    for (let i = 0; i < spec.cannoneersCount; i++) {
      const lx = i === 0 ? -5.0 : 5.0;
      const lz = 1.5;
      const p = placeOnDeck(lx, lz);
      this.createEnemy({
        id: `pirate-raid-cannoneer-${i + 1}`,
        name: 'Korsan Topçusu',
        archetype: 'pirate_cannoneer',
        level: spec.cannoneersLevel,
        x: p.wx,
        z: p.wz,
        overrideY: deckY,
        tunic: '#78350f',
        isPirateAmbush: true,
        deckOffsetX: lx,
        deckOffsetZ: lz,
        noRespawn: true,
      });
    }

    // 4. 4 × Lv.100 Ranged Pirate Archers on bow & rails
    for (let i = 0; i < spec.archersCount; i++) {
      const lx = i % 2 === 0 ? -4.4 : 4.4;
      const lz = i < 2 ? -1.0 : 5.2;
      const p = placeOnDeck(lx, lz);
      this.createEnemy({
        id: `pirate-raid-archer-${i + 1}`,
        name: 'Korsan Okçusu',
        archetype: 'pirate_archer',
        level: spec.archersLevel,
        x: p.wx,
        z: p.wz,
        overrideY: deckY,
        tunic: '#991b1b',
        isPirateAmbush: true,
        deckOffsetX: lx,
        deckOffsetZ: lz,
        noRespawn: true,
      });
    }

    // 5. 20 × Lv.150 Pirate Swordsmen across the main deck
    for (let i = 0; i < spec.swordsmenCount; i++) {
      const col = (i % 4) - 1.5;
      const row = Math.floor(i / 4) - 2;
      const lx = col * 2.2;
      const lz = row * 2.6 + 1.5;
      const p = placeOnDeck(lx, lz);
      this.createEnemy({
        id: `pirate-raid-sword-${i + 1}`,
        name: 'Kılıçlı Korsan',
        archetype: 'pirate_swordsman',
        level: spec.swordsmenLevel,
        x: p.wx,
        z: p.wz,
        overrideY: deckY,
        tunic: '#450a0a',
        isPirateAmbush: true,
        deckOffsetX: lx,
        deckOffsetZ: lz,
        noRespawn: true,
      });
    }

    soundEngine.playAmbushHorn();
    soundEngine.playCannonFire();
    this.trauma = Math.min(1, this.trauma + 0.55);
    this.callbacks.onCombatToast(
      'KORSAN BASKINI! 20×150Sv Kılıçlı, 2×500Sv Yardımcı, 1000Sv DEV KAPTAN, 2 Topçu, 4 Okçu saldırdı!',
      'danger'
    );
    this.emitHud();
  }

  public clearPirateAmbush() {
    if (this.pirateShip) {
      this.scene.remove(this.pirateShip.rig.root);
      this.pirateShip = null;
    }
    this.removeEnemiesMatching((e) => Boolean(e.isPirateAmbush));
    this.pirateAmbushActive = false;
  }

  // ============================================================================
  // DRIVABLE PLAYER SHIPS (SLOOP / GALLEON) & FOOD BUFFS
  // ============================================================================
  public activateFoodBuff(foodId: FoodId) {
    const food = FOOD_BY_ID[foodId];
    if (!food) return;

    if (food.instantHealPct > 0) {
      const healAmt = Math.ceil(this.maxHp * food.instantHealPct);
      this.hp = Math.min(this.maxHp, this.hp + healAmt);
    }

    const existing = this.activeBuffs.find((b) => b.foodId === foodId);
    if (existing) {
      existing.remainingSec = food.durationSec;
    } else {
      this.activeBuffs.push({
        foodId: food.id,
        remainingSec: food.durationSec,
      });
    }

    // Recompute Max HP immediately with food buffs
    const stats = getDerivedStats(this.profile, this.activeBuffs);
    this.maxHp = stats.maxHp;
    this.hp = Math.min(this.maxHp, this.hp);
    soundEngine.playEatFood();
    this.spawnBurst(this.px, this.py + 1.2, this.pz, 14, 0xfbbf24, 4.2);
    this.callbacks.onCombatToast(`${food.nameTr} yendi! (${food.shortEffectTr})`, 'reward');
    this.emitHud();
  }

  private ensurePlayerShipRig(shipId: ShipId) {
    if (this.playerShipRig && this.playerShipVariant === shipId) return;
    if (this.playerShipRig) {
      this.scene.remove(this.playerShipRig.root);
    }
    const shipSpec = SHIP_BY_ID[shipId];
    this.playerShipRig = buildShipModel({
      variant: shipId,
      scale: 1.0,
    });
    this.playerShipVariant = shipId;
    this.shipMaxHp = shipSpec.maxHp;
    this.shipHp = shipSpec.maxHp;
    this.playerShipRig.root.position.set(this.shipX, WATER_LEVEL, this.shipZ);
    this.playerShipRig.root.rotation.y = this.shipYaw;
    this.scene.add(this.playerShipRig.root);
  }

  public launchFromHarbor(shipId?: ShipId) {
    const activeId = (shipId || this.profile.activeShipId) as ShipId | '';
    if (!activeId || !this.profile.ownedShips.includes(activeId)) {
      this.callbacks.onCombatToast('Önce Liman Denizcisinden bir gemi satın almalısın!', 'info');
      return;
    }
    this.isMounted = false;
    this.ensurePlayerShipRig(activeId);
    this.shipX = HARBOR_SHIP_SPAWN_POS.x;
    this.shipZ = HARBOR_SHIP_SPAWN_POS.z;
    this.shipYaw = 0; // Facing South into open ocean toward Floating Town & Islands
    this.shipSpeed = 0;
    this.isSailing = true;
    this.playerShipRig!.root.visible = true;
    this.playerShipRig!.root.position.set(this.shipX, WATER_LEVEL, this.shipZ);
    this.playerShipRig!.root.rotation.y = this.shipYaw;
    this.px = this.shipX;
    this.pz = this.shipZ;
    this.py = WATER_LEVEL + this.playerShipRig!.deckY;
    this.pYaw = this.shipYaw;
    this.fpYaw = this.shipYaw;
    // Immediately frame behind the ship's stern looking out over the open ocean
    if (this.cameraMode !== 'first_person') {
      const backDist = 30;
      this.camera.position.set(
        this.shipX - Math.sin(this.shipYaw) * backDist,
        WATER_LEVEL + 18.5,
        this.shipZ - Math.cos(this.shipYaw) * backDist
      );
      this.camera.lookAt(
        this.shipX + Math.sin(this.shipYaw) * 18,
        WATER_LEVEL + 3.2,
        this.shipZ + Math.cos(this.shipYaw) * 18
      );
    }
    soundEngine.playShipBell();
    this.callbacks.onCombatToast(
      `${SHIP_BY_ID[activeId].nameTr} ile denize açıldın! [WASD] Sür · [J/K] Top Atışı · [B] Gemiye Bin/İn`,
      'reward'
    );
    this.emitHud();
  }

  public repairPlayerShip() {
    this.shipHp = this.shipMaxHp;
    soundEngine.playUpgradeForge();
    this.callbacks.onCombatToast('Gemi gövdesi tamamen onarıldı!', 'reward');
    this.emitHud();
  }

  public toggleBoardShip() {
    if (this.gameState !== 'playing' || this.hp <= 0) return;
    if (!this.profile.activeShipId || !this.profile.ownedShips.includes(this.profile.activeShipId)) {
      this.callbacks.onCombatToast(
        'Henüz bir gemin yok! Ana Ada Güney Limanındaki Denizciden gemi satın alabilirsin.',
        'info'
      );
      return;
    }
    if (isInsideUnderwaterCity(this.px, this.pz)) {
      this.callbacks.onCombatToast('Sualtı Şehrinde gemi kullanılamaz! Önce Yüzey Portalından çık.', 'info');
      return;
    }

    if (this.isSailing) {
      // Disembark cleanly to nearest shore or harbor
      this.isSailing = false;
      this.shipSpeed = 0;
      // Search around ship in 8 directions for dry land or dock; otherwise place on shore offset
      let bestX = this.shipX;
      let bestZ = this.shipZ;
      let bestY = walkableHeightAt(this.shipX, this.shipZ).y;
      for (let dist = 8; dist <= 26; dist += 6) {
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const tx = this.shipX + Math.cos(ang) * dist;
          const tz = this.shipZ + Math.sin(ang) * dist;
          const surf = walkableHeightAt(tx, tz);
          if (surf.onStructure || surf.y > WATER_LEVEL + 0.35) {
            bestX = tx;
            bestZ = tz;
            bestY = surf.y;
            break;
          }
        }
        if (bestY > WATER_LEVEL + 0.35) break;
      }
      this.px = bestX;
      this.pz = bestZ;
      this.py = Math.max(WATER_LEVEL + 0.2, bestY);
      soundEngine.playJump();
      this.callbacks.onCombatToast('Gemiden indin! Tekrar binmek için [B] tuşuna bas.', 'info');
      this.emitHud();
      return;
    }

    // Board ship if near parked ship, near Harbor, or near ocean coast
    const distHarbor = Math.hypot(this.px - HARBOR_POS.x, this.pz - HARBOR_POS.z);
    const distShip = this.playerShipRig
      ? Math.hypot(this.px - this.shipX, this.pz - this.shipZ)
      : 999;
    const nearCoast = groundHeightAt(this.px, this.pz) < WATER_LEVEL + 3.2;

    if (distHarbor < 42) {
      this.launchFromHarbor(this.profile.activeShipId);
      return;
    }

    if (distShip < 34 || nearCoast) {
      this.isMounted = false;
      this.ensurePlayerShipRig(this.profile.activeShipId);
      if (distShip >= 34) {
        // Summon ship to nearby coastal water
        const outDir = Math.atan2(this.px, this.pz);
        this.shipX = this.px + Math.sin(outDir) * 10;
        this.shipZ = this.pz + Math.cos(outDir) * 10;
        this.shipYaw = outDir;
      }
      this.isSailing = true;
      this.shipSpeed = 0;
      this.playerShipRig!.root.visible = true;
      this.playerShipRig!.root.position.set(this.shipX, WATER_LEVEL, this.shipZ);
      this.playerShipRig!.root.rotation.y = this.shipYaw;
      this.px = this.shipX;
      this.pz = this.shipZ;
      this.py = WATER_LEVEL + this.playerShipRig!.deckY;
      soundEngine.playShipBell();
      this.callbacks.onCombatToast('Geminin dümenine geçtin! [WASD] Sür · [J/K] Top Atışı', 'reward');
      this.emitHud();
    } else {
      this.callbacks.onCombatToast('Gemiye binmek için sahile, limana veya gemine yaklaş!', 'info');
    }
  }

  // ============================================================================
  // DESERT ARENA 5-WAVE SYSTEM (+ FINAL WAVE LV.500 ORC BOSS)
  // ============================================================================
  public startDesertArenaWave(waveNum: number) {
    this.removeEnemiesMatching((e) => Boolean(e.isDesertArena));
    const cfg = getDesertArenaWaveConfig(waveNum);
    this.arenaWave = cfg.wave;
    this.arenaNextWaveTimer = 0;
    this.arenaWaveEnemiesSpawned = true;

    for (let i = 0; i < cfg.regularCount; i++) {
      const a = (i / cfg.regularCount) * Math.PI * 2;
      const rad = 10.5 + (i % 2) * 2.4;
      const ex = DESERT_ARENA_POS.x + Math.cos(a) * rad;
      const ez = DESERT_ARENA_POS.z + Math.sin(a) * rad;
      this.createEnemy({
        id: `arena-w${cfg.wave}-m${i + 1}`,
        name: cfg.wave >= 4 ? 'Çöl Savaş Lordu' : 'Çöl Arena Savaşçısı',
        archetype: 'arena_gladiator',
        level: cfg.regularLevel,
        x: ex,
        z: ez,
        tunic: cfg.wave >= 4 ? '#9e241b' : '#c94c2e',
        isDesertArena: true,
        noRespawn: true,
      });
    }

    if (cfg.hasOrcBoss) {
      this.createEnemy({
        id: 'arena-w5-orc-boss',
        name: 'Çöl Ork Şefi',
        archetype: 'orc_boss',
        level: cfg.orcBossLevel,
        x: DESERT_ARENA_POS.x,
        z: DESERT_ARENA_POS.z - 5.2,
        tunic: '#7d1b18',
        isDesertArena: true,
        noRespawn: true,
      });
    }

    soundEngine.playWaveStart();
    this.spawnBurst(DESERT_ARENA_POS.x, groundHeightAt(DESERT_ARENA_POS.x, DESERT_ARENA_POS.z) + 1.5, DESERT_ARENA_POS.z, 24, 0xff8a3d, 6.5);
    this.callbacks.onCombatToast(
      cfg.hasOrcBoss
        ? `Çöl Arenası FİNAL DALGA 5/5! ${cfg.regularCount}× Sv${cfg.regularLevel} + 500 Sv. Çöl Ork Şefi!`
        : `Çöl Arenası Dalga ${cfg.wave}/5 Başladı! (${cfg.regularCount}× Sv${cfg.regularLevel} Yaratık)`,
      'danger'
    );
    this.emitHud();
  }

  public resetDesertArena() {
    this.removeEnemiesMatching((e) => Boolean(e.isDesertArena));
    this.arenaWave = 0;
    this.arenaNextWaveTimer = 0;
    this.arenaWaveEnemiesSpawned = false;
    this.emitHud();
  }

  // ============================================================================
  // BANDIT AMBUSH EVENT (2× Lv250 RANGED ARCHERS + 3× Lv250 MELEE BANDITS)
  // ============================================================================
  public triggerBanditAmbush() {
    if (isInsideSafeZone(this.px, this.pz)) return;
    this.removeEnemiesMatching((e) => Boolean(e.isBanditAmbush));
    this.ambushActive = true;

    const total = BANDIT_ARCHER_COUNT + BANDIT_MELEE_COUNT;
    for (let i = 0; i < total; i++) {
      const isArcher = i < BANDIT_ARCHER_COUNT;
      const a = (i / total) * Math.PI * 2 + 0.35;
      const dist = isArcher ? 13.5 : 8.5;
      let bx = this.px + Math.cos(a) * dist;
      let bz = this.pz + Math.sin(a) * dist;
      const clamped = clampToPlayableWorld(bx, bz);
      bx = clamped.x;
      bz = clamped.z;
      if (isInsideSafeZone(bx, bz)) {
        bx = this.px + Math.cos(a + Math.PI) * dist;
        bz = this.pz + Math.sin(a + Math.PI) * dist;
      }
      this.createEnemy({
        id: `bandit-ambush-${Date.now()}-${i}`,
        name: isArcher ? 'Haydut Okçusu' : 'Haydut Savaşçısı',
        archetype: isArcher ? 'bandit_archer' : 'bandit_melee',
        level: BANDIT_LEVEL,
        x: bx,
        z: bz,
        tunic: isArcher ? '#7a1f28' : '#3a1a22',
        isBanditAmbush: true,
        noRespawn: true,
      });
    }

    soundEngine.playAmbushHorn();
    this.trauma = Math.min(1, this.trauma + 0.45);
    this.spawnBurst(this.px, this.py + 1.4, this.pz, 20, 0xff4238, 6.0);
    this.callbacks.onCombatToast(
      `HAYDUT PUSUSU! 250 Sv. Haydutlar (${BANDIT_ARCHER_COUNT} Okçu, ${BANDIT_MELEE_COUNT} Yakın Dövüşçü) saldırdı!`,
      'danger'
    );
    this.emitHud();
  }

  // ============================================================================
  // RIDEABLE HORSE CONTROLS (F = MOUNT/DISMOUNT, G = SUMMON HORSE)
  // ============================================================================
  public toggleMountHorse() {
    if (this.gameState !== 'playing' || this.hp <= 0) return;
    if (!this.profile.hasHorse) {
      this.callbacks.onCombatToast(
        "Henüz bir atın yok! Başlangıç Kasabası Ahırı'ndan 400 Altın karşılığı at satın alabilirsin.",
        'info'
      );
      return;
    }

    if (this.isMounted) {
      // Dismount smoothly to the left of the horse
      this.isMounted = false;
      this.horseX = this.px;
      this.horseZ = this.pz;
      this.horseY = walkableHeightAt(this.horseX, this.horseZ).y;
      this.horseYaw = this.pYaw;

      const sideX = this.px - Math.cos(this.pYaw) * 1.9;
      const sideZ = this.pz + Math.sin(this.pYaw) * 1.9;
      const clamped = clampToPlayableWorld(sideX, sideZ);
      this.px = clamped.x;
      this.pz = clamped.z;
      this.py = walkableHeightAt(this.px, this.pz).y;

      this.horseRig.root.position.set(this.horseX, this.horseY, this.horseZ);
      this.horseRig.root.rotation.y = this.horseYaw;
      this.playerRig.bodyGroup.position.y = 0;
      this.playerRig.bodyGroup.rotation.x = 0;
      soundEngine.playJump();
      this.callbacks.onCombatToast('Attan indin — yetenekler tekrar aktif!', 'info');
      this.emitHud();
      return;
    }

    if (!this.horseSpawned) {
      this.summonHorse();
    }
    const dist = Math.hypot(this.px - this.horseX, this.pz - this.horseZ);
    if (dist > HORSE_MOUNT_RADIUS) {
      this.callbacks.onCombatToast(
        'Atından uzaktasın! [G] tuşuna basarak atını yanına çağır.',
        'info'
      );
      return;
    }

    // Mount horse
    this.isMounted = true;
    this.dashTimer = 0;
    this.attackAnimTimer = 0;
    this.px = this.horseX;
    this.pz = this.horseZ;
    this.py = walkableHeightAt(this.px, this.pz).y;
    soundEngine.playHorseWhinny();
    this.spawnBurst(this.px, this.py + 0.6, this.pz, 10, 0xe8c47a, 3.6);
    this.callbacks.onCombatToast(
      'Ata bindin! Hızlı yolculuk aktif (At üstünde yetenek kullanılamaz · [F] İn)',
      'reward'
    );
    this.emitHud();
  }

  public summonHorse() {
    if (this.gameState !== 'playing' || this.hp <= 0) return;
    if (!this.profile.hasHorse) {
      this.callbacks.onCombatToast(
        "Henüz bir atın yok! Başlangıç Kasabası Ahırı'ndan 400 Altın karşılığı at satın al.",
        'info'
      );
      return;
    }
    if (this.isMounted) {
      this.callbacks.onCombatToast('Zaten atının üstündesin!', 'info');
      return;
    }

    const offsetX = -Math.cos(this.pYaw) * 2.5;
    const offsetZ = Math.sin(this.pYaw) * 2.5;
    const clamped = clampToPlayableWorld(this.px + offsetX, this.pz + offsetZ);
    this.horseX = clamped.x;
    this.horseZ = clamped.z;
    this.horseY = Math.max(WATER_LEVEL + 0.1, walkableHeightAt(this.horseX, this.horseZ).y);
    this.horseYaw = this.pYaw;
    this.horseSpawned = true;
    this.horseRig.root.visible = true;
    this.horseRig.root.position.set(this.horseX, this.horseY, this.horseZ);
    this.horseRig.root.rotation.y = this.horseYaw;

    soundEngine.playHorseWhinny();
    this.spawnBurst(this.horseX, this.horseY + 0.9, this.horseZ, 16, 0xf2d179, 4.4);
    this.callbacks.onCombatToast('Atın yanına çağrıldı! Binmek için [F] tuşuna bas.', 'reward');
    this.emitHud();
  }

  private clearFirstPersonWeapon() {
    while (this.fpWeaponAnchor.children.length > 0) {
      this.fpWeaponAnchor.remove(this.fpWeaponAnchor.children[0]);
    }
    for (const d of this.fpWeaponDisposables) {
      d.dispose();
    }
    this.fpWeaponDisposables = [];
  }

  private rebuildFirstPersonWeapon() {
    this.clearFirstPersonWeapon();
    const stats = getDerivedStats(this.profile);
    const kind = stats.activeWeaponKind;
    const grp = new THREE.Group();

    const track = <T extends THREE.BufferGeometry | THREE.Material>(item: T): T => {
      this.fpWeaponDisposables.push(item);
      return item;
    };

    const sleeveMat = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.profile.tunicColor),
        roughness: 0.72,
      })
    );
    const gloveMat = track(
      new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.8 })
    );
    const steelMat = track(
      new THREE.MeshStandardMaterial({ color: 0xdce4ed, metalness: 0.82, roughness: 0.2 })
    );
    const goldMat = track(
      new THREE.MeshStandardMaterial({ color: 0xe6b84c, metalness: 0.72, roughness: 0.28 })
    );
    const woodMat = track(
      new THREE.MeshStandardMaterial({ color: 0x6b4528, roughness: 0.84 })
    );

    // Armored forearm & gloved hand holding weapon
    const forearm = new THREE.Mesh(track(new THREE.CylinderGeometry(0.055, 0.068, 0.36, 8)), sleeveMat);
    forearm.rotation.x = Math.PI * 0.42;
    forearm.position.set(0.02, -0.14, 0.16);
    const gauntlet = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 0.1, 0.12)), gloveMat);
    gauntlet.position.set(0, -0.02, 0.0);
    grp.add(forearm, gauntlet);

    if (kind === 'mace') {
      const crystalMat = track(
        new THREE.MeshStandardMaterial({
          color: 0x5cc4ff,
          emissive: 0x1a74d8,
          emissiveIntensity: 0.9,
          metalness: 0.35,
          roughness: 0.18,
        })
      );
      const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.03, 0.72, 8)), woodMat);
      shaft.position.set(0, 0.28, -0.06);
      shaft.rotation.x = -0.22;
      const head = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.14, 0)), crystalMat);
      head.position.set(0, 0.64, -0.14);
      const collar = new THREE.Mesh(track(new THREE.TorusGeometry(0.075, 0.018, 6, 12)), goldMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 0.5, -0.11);
      grp.add(shaft, head, collar);
    } else if (kind === 'bow') {
      // ANIMATABLE FIRST-PERSON RECURVE LONGBOW pointing straight down -Z toward crosshair!
      const fpBow = buildRecurveBowGroup({
        woodColor: 0x2d7a47,
        emissiveColor: 0x0d3b1e,
        trimColor: 0xf0c75e,
        stringColor: 0xf5fff0,
        arrowGlowColor: 0x62f29b,
        scale: 0.48,
      });
      this.fpBowParts = (fpBow.userData.bowParts as BowDrawParts) || null;
      fpBow.rotation.set(0, Math.PI, -0.08);
      fpBow.position.set(-0.32, -0.14, -0.62);
      this.fpWeaponAnchor.add(fpBow);
      return;
    } else if (kind === 'bomb') {
      const ironMat = track(
        new THREE.MeshStandardMaterial({ color: 0x1e2228, metalness: 0.78, roughness: 0.32 })
      );
      const sparkMat = track(
        new THREE.MeshStandardMaterial({
          color: 0xff9b26,
          emissive: 0xff5500,
          emissiveIntensity: 1.8,
        })
      );
      const bombOrb = new THREE.Mesh(track(new THREE.SphereGeometry(0.14, 12, 10)), ironMat);
      bombOrb.position.set(0, 0.14, -0.14);
      const fuseSpark = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.06, 0)), sparkMat);
      fuseSpark.position.set(0, 0.32, -0.14);
      grp.add(bombOrb, fuseSpark);
    } else if (kind === 'staff') {
      const crystalMat = track(
        new THREE.MeshStandardMaterial({
          color: 0xd8b4fe,
          emissive: 0x9333ea,
          emissiveIntensity: 1.5,
          roughness: 0.15,
        })
      );
      const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.022, 0.026, 0.95, 8)), woodMat);
      shaft.position.set(0, 0.3, -0.12);
      shaft.rotation.x = -0.22;
      const orb = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.12, 1)), crystalMat);
      orb.position.set(0, 0.82, -0.24);
      const halo = new THREE.Mesh(track(new THREE.TorusGeometry(0.16, 0.016, 6, 14)), goldMat);
      halo.position.set(0, 0.82, -0.24);
      grp.add(shaft, orb, halo);
    } else if (kind === 'daggers') {
      const dagMat = track(
        new THREE.MeshStandardMaterial({
          color: 0x2dd4bf,
          emissive: 0x0f766e,
          emissiveIntensity: 0.95,
          metalness: 0.88,
          roughness: 0.18,
        })
      );
      const bladeR = new THREE.Mesh(track(new THREE.BoxGeometry(0.04, 0.48, 0.015)), dagMat);
      bladeR.position.set(0, 0.28, -0.12);
      bladeR.rotation.x = -0.35;
      const bladeL = bladeR.clone();
      bladeL.position.set(-0.76, 0.24, -0.12);
      bladeL.rotation.z = 0.24;
      grp.add(bladeR, bladeL);
    } else if (kind === 'trident') {
      // POSEIDON'UN MIZRAĞI (First-Person Golden-Aquamarine Trident!)
      const fpTrident = buildPoseidonTridentGroup(0.45);
      fpTrident.rotation.x = -Math.PI * 0.38;
      fpTrident.position.set(0, 0.08, -0.35);
      grp.add(fpTrident);
    } else if (kind === 'yeti_claws') {
      // YETI / RUNIC YETI MASSIVE FROST CLAWS IN FIRST PERSON!
      const isRunic = Boolean(this.profile.yetiRuneUnlocked);
      const furMat = track(
        new THREE.MeshStandardMaterial({
          color: isRunic ? 0xdbeeff : 0xeef6ff,
          emissive: isRunic ? 0x0284c7 : 0x000000,
          emissiveIntensity: isRunic ? 0.35 : 0,
          roughness: 0.88,
        })
      );
      const clawMat = track(
        new THREE.MeshStandardMaterial({
          color: isRunic ? 0x38bdf8 : 0x7dd3fc,
          emissive: isRunic ? 0x0ea5e9 : 0x0369a1,
          emissiveIntensity: isRunic ? 1.8 : 0.7,
          roughness: 0.18,
          metalness: 0.3,
        })
      );
      for (const side of [0, -0.8]) {
        const paw = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 0.16, 0.24)), furMat);
        paw.position.set(side, 0.02, -0.08);
        grp.add(paw);
        for (const cx of [-0.06, 0, 0.06]) {
          const claw = new THREE.Mesh(track(new THREE.ConeGeometry(0.025, 0.22, 5)), clawMat);
          claw.rotation.x = -Math.PI * 0.42;
          claw.position.set(side + cx, 0.06, -0.26);
          grp.add(claw);
        }
      }
    } else if (kind === 'spear') {
      const crimsonMat = track(
        new THREE.MeshStandardMaterial({
          color: 0xff5a45,
          emissive: 0xb82218,
          emissiveIntensity: 0.65,
          metalness: 0.55,
          roughness: 0.25,
        })
      );
      const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.02, 0.024, 1.35, 8)), woodMat);
      shaft.rotation.x = -Math.PI * 0.38;
      shaft.position.set(0, 0.18, -0.45);
      const spearTip = new THREE.Mesh(track(new THREE.ConeGeometry(0.055, 0.32, 4)), crimsonMat);
      spearTip.rotation.x = -Math.PI * 0.38;
      spearTip.position.set(0, 0.45, -1.08);
      const ring = new THREE.Mesh(track(new THREE.CylinderGeometry(0.038, 0.038, 0.06, 8)), goldMat);
      ring.rotation.x = -Math.PI * 0.38;
      ring.position.set(0, 0.37, -0.92);
      grp.add(shaft, spearTip, ring);
    } else {
      const handle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.02, 0.022, 0.18, 8)), woodMat);
      handle.position.set(0, 0.02, -0.02);
      const guard = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 0.028, 0.04)), goldMat);
      guard.position.set(0, 0.12, -0.04);
      const blade = new THREE.Mesh(track(new THREE.BoxGeometry(0.044, 0.56, 0.016)), steelMat);
      blade.position.set(0, 0.41, -0.09);
      blade.rotation.x = -0.15;
      const tip = new THREE.Mesh(track(new THREE.ConeGeometry(0.032, 0.11, 4)), steelMat);
      tip.position.set(0, 0.74, -0.14);
      tip.rotation.x = -0.15;
      grp.add(handle, guard, blade, tip);
    }

    this.fpBowParts = null;
    grp.position.set(0.42, -0.36, -0.62);
    grp.rotation.set(-0.24, -0.16, 0.22);
    this.fpWeaponAnchor.add(grp);
  }

  public setCameraMode(mode: CameraMode) {
    if (this.cameraMode === mode) return;
    this.cameraMode = mode;
    this.fpDragging = false;
    if (mode === 'first_person') {
      this.fpYaw = this.pYaw;
      this.fpPitch = -0.04;
      this.camera.fov = 72;
      this.camera.updateProjectionMatrix();
      this.playerRig.root.visible = this.gameState !== 'playing';
      this.fpWeaponAnchor.visible = this.gameState === 'playing';
    } else {
      this.camera.fov = 56;
      this.camera.updateProjectionMatrix();
      this.playerRig.root.visible = true;
      this.fpWeaponAnchor.visible = false;
      if (document.pointerLockElement === this.renderer.domElement) {
        try {
          document.exitPointerLock?.();
        } catch {
          // ignore
        }
      }
    }
    this.callbacks.onCameraModeChanged?.(mode);
    this.emitHud();
  }

  public toggleCameraMode(): CameraMode {
    const next: CameraMode =
      this.cameraMode === 'third_person' ? 'first_person' : 'third_person';
    this.setCameraMode(next);
    return next;
  }

  public getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  public setGameState(next: GameModeState) {
    this.gameState = next;
    this.keysHeld.clear();
    this.justPressed.clear();
    this.fpDragging = false;
    const isFpPlaying = next === 'playing' && this.cameraMode === 'first_person';
    this.playerRig.root.visible = !isFpPlaying;
    this.fpWeaponAnchor.visible = isFpPlaying;
    if (next !== 'playing' && document.pointerLockElement === this.renderer.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // ignore
      }
    }
    soundEngine.setWeatherAmbience(this.weather, next === 'playing');
  }

  public setWeather(next: WeatherType, resetTimer = true) {
    const changed = this.weather !== next;
    this.weather = next;
    if (resetTimer) {
      this.weatherCycleElapsed = 0;
    }
    if (next === 'rainy') {
      this.thunderTimer = 6 + Math.random() * 8;
    }
    soundEngine.setWeatherAmbience(next, this.gameState === 'playing');
    if (changed) {
      this.callbacks.onWeatherChanged?.(next);
    }
    this.emitHud();
  }

  public cycleWeather(): WeatherType {
    const next = getNextWeather(this.weather);
    this.setWeather(next, true);
    return next;
  }

  public getWeather(): WeatherType {
    return this.weather;
  }

  public setPvpSettings(pvpEnabled: boolean, partyCode: string) {
    this.pvpEnabled = pvpEnabled;
    this.partyCode = partyCode.trim().toUpperCase();
  }

  public applyProfile(next: PlayerProfileData, teleportToSaved = false) {
    const prevSword = this.profile.swordTier;
    const prevArmor = this.profile.armorTier;
    const prevColor = this.profile.tunicColor;
    const prevClass = this.profile.playerClass;
    const prevUnlocked = this.profile.classWeaponUnlocked;
    const prevWeaponId = this.profile.equippedWeaponId;
    const prevArmorId = this.profile.equippedArmorId;
    const prevHorse = this.profile.hasHorse;
    const prevYetiRune = Boolean(this.profile.yetiRuneUnlocked);
    this.profile = next;

    const stats = getDerivedStats(next, this.activeBuffs);
    const hpRatio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = stats.maxHp;
    this.hp = Math.min(this.maxHp, Math.max(1, Math.round(hpRatio * this.maxHp)));
    this.maxStamina = stats.maxStamina;
    this.stamina = Math.min(this.maxStamina, this.stamina);

    if (
      prevSword !== next.swordTier ||
      prevArmor !== next.armorTier ||
      prevColor !== next.tunicColor ||
      prevClass !== next.playerClass ||
      prevUnlocked !== next.classWeaponUnlocked ||
      prevWeaponId !== next.equippedWeaponId ||
      prevArmorId !== next.equippedArmorId ||
      prevYetiRune !== Boolean(next.yetiRuneUnlocked)
    ) {
      this.scene.remove(this.playerRig.root);
      this.playerRig = buildWarriorRig({
        tunicColor: next.tunicColor,
        swordTier: next.swordTier,
        armorTier: next.armorTier,
        weaponKind: stats.activeWeaponKind,
        playerClass: next.playerClass,
        isRunicYeti: next.playerClass === 'yeti' && Boolean(next.yetiRuneUnlocked),
        shadowTexture: this.shadowTexture,
      });
      this.playerRig.root.add(this.slashArcMesh);
      this.playerRig.root.add(this.surfWaveMesh);
      this.playerRig.root.visible = !(this.gameState === 'playing' && this.cameraMode === 'first_person');
      this.scene.add(this.playerRig.root);
      this.rebuildFirstPersonWeapon();
    }

    if (next.activeShipId && next.ownedShips.includes(next.activeShipId)) {
      if (this.playerShipVariant && this.playerShipVariant !== next.activeShipId) {
        this.ensurePlayerShipRig(next.activeShipId);
      }
    }

    // Spawn horse automatically beside player when freshly purchased or loaded with horse
    if (next.hasHorse && (!prevHorse || !this.horseSpawned)) {
      this.horseSpawned = true;
      this.horseRig.root.visible = true;
      this.horseX = this.px - 2.6;
      this.horseZ = this.pz + 0.6;
      this.horseY = Math.max(WATER_LEVEL + 0.1, walkableHeightAt(this.horseX, this.horseZ).y);
      this.horseYaw = this.pYaw;
      this.horseRig.root.position.set(this.horseX, this.horseY, this.horseZ);
      this.horseRig.root.rotation.y = this.horseYaw;
    } else if (!next.hasHorse) {
      this.isMounted = false;
      this.horseSpawned = false;
      this.horseRig.root.visible = false;
    }

    if (teleportToSaved) {
      const clamped = clampToPlayableWorld(next.lastX, next.lastZ);
      const surf = walkableHeightAt(clamped.x, clamped.z);
      if (!surf.onStructure && surf.y < WATER_LEVEL + 0.2) {
        this.px = SAFE_ZONE_CENTER.x;
        this.pz = SAFE_ZONE_CENTER.z + 12;
      } else {
        this.px = clamped.x;
        this.pz = clamped.z;
      }
      this.py = Math.max(WATER_LEVEL + 0.1, walkableHeightAt(this.px, this.pz).y);
      this.pvy = 0;
      this.pvx = 0;
      this.pvz = 0;
      this.pYaw = Math.PI;
      this.hp = this.maxHp;
      this.stamina = this.maxStamina;
      this.playerRig.root.position.set(this.px, this.py, this.pz);
      this.playerRig.root.rotation.y = this.pYaw;
      if (next.hasHorse) {
        this.horseX = this.px - 2.8;
        this.horseZ = this.pz;
        this.horseY = Math.max(WATER_LEVEL + 0.1, walkableHeightAt(this.horseX, this.horseZ).y);
        this.horseRig.root.position.set(this.horseX, this.horseY, this.horseZ);
      }
    }
    this.emitHud();
  }

  public teleportTo(x: number, z: number, facingYaw = Math.PI) {
    const clamped = clampToPlayableWorld(x, z);
    const surf = walkableHeightAt(clamped.x, clamped.z);
    this.px = clamped.x;
    this.pz = clamped.z;
    this.py = Math.max(WATER_LEVEL + 0.1, surf.y);
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pYaw = facingYaw;
    this.fpYaw = facingYaw;
    this.fpPitch = -0.04;
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.pYaw;
    if (this.isMounted) {
      this.horseX = this.px;
      this.horseY = this.py;
      this.horseZ = this.pz;
      this.horseRig.root.position.set(this.horseX, this.horseY, this.horseZ);
    }
    if (this.cameraMode === 'first_person') {
      const eyeH = this.isMounted ? 2.48 : 1.64;
      this.camera.position.set(this.px, this.py + eyeH, this.pz);
      this.camera.lookAt(
        this.px + Math.sin(this.fpYaw) * 10,
        this.py + eyeH + Math.sin(this.fpPitch) * 10,
        this.pz + Math.cos(this.fpYaw) * 10
      );
    } else {
      // Snap fixed third-person camera immediately on teleport
      const horizDist = Math.cos(FIXED_CAM_PITCH) * (this.isMounted ? FIXED_CAM_DIST_MOUNTED : FIXED_CAM_DIST_FOOT);
      const vertDist = Math.sin(FIXED_CAM_PITCH) * (this.isMounted ? FIXED_CAM_DIST_MOUNTED : FIXED_CAM_DIST_FOOT) + 2.4;
      this.camera.position.set(
        this.px - Math.sin(FIXED_CAM_YAW) * horizDist,
        this.py + vertDist,
        this.pz - Math.cos(FIXED_CAM_YAW) * horizDist
      );
      this.camera.lookAt(this.px, this.py + 2.4, this.pz);
    }
    this.emitHud();
  }

  public respawnAtSanctuary() {
    this.isMounted = false;
    this.isSailing = false;
    this.shipSpeed = 0;
    this.px = SAFE_ZONE_CENTER.x;
    this.pz = SAFE_ZONE_CENTER.z + 10;
    this.py = groundHeightAt(this.px, this.pz);
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pYaw = Math.PI;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.hitFlashTimer = 0;
    this.playerRig.bodyGroup.position.y = 0;
    this.playerRig.bodyGroup.rotation.x = 0;
    this.resetDesertArena();
    this.removeEnemiesMatching((e) => Boolean(e.isBanditAmbush));
    this.ambushActive = false;
    this.clearPirateAmbush();
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
        this.partyCode.length > 0 && p.partyCode.toUpperCase() === this.partyCode;
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
      weaponKind: p.weaponKind || 'sword',
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
    this.spawnBurst(
      ent.curX,
      ent.curY + 1.2,
      ent.curZ,
      heavy ? 14 : 6,
      heavy ? 0xffaa44 : 0xfff0b3,
      3.8
    );
  }

  public applyIncomingPvpHit(
    damage: number,
    knockX: number,
    knockZ: number,
    attackerName: string,
    isHeavy: boolean
  ) {
    if (this.gameState !== 'playing' || this.hp <= 0) return;
    if (this.dashTimer > 0.06) {
      this.callbacks.onCombatToast('Yuvarlanarak sıyrıldın!', 'info');
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

  private applyEnemyDamage(
    enemy: EnemyEntity,
    dmg: number,
    isCrit: boolean,
    heavy: boolean,
    knockDirX: number,
    knockDirZ: number,
    stunDurationSec: number
  ) {
    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.hitFlashTimer = 0.14;
    const knock = heavy ? 7.8 : 3.8;
    enemy.vx += knockDirX * knock;
    enemy.vz += knockDirZ * knock;

    let didStun = false;
    if (stunDurationSec > 0 && enemy.hp > 0) {
      enemy.stunTimer = Math.max(enemy.stunTimer, stunDurationSec);
      enemy.state = 'stunned';
      if (enemy.rig.telegraphRing) enemy.rig.telegraphRing.visible = false;
      didStun = true;
    }

    const burstColor = didStun ? 0x5cd0ff : isCrit ? 0xffe45c : 0xff7043;
    this.spawnBurst(enemy.x, enemy.y + 1.25, enemy.z, heavy ? 20 : 10, burstColor, 5.4);
    const badge = this.getEnemyBadgeMeta(enemy.archetype);
    updateNameTagSprite(enemy.rig, enemy.name, enemy.level, enemy.hp, enemy.maxHp, badge.text, badge.color);

    if (enemy.hp <= 0) {
      enemy.state = 'ko';
      enemy.stateTimer = 0.45;
      enemy.stunTimer = 0;
      if (enemy.rig.telegraphRing) enemy.rig.telegraphRing.visible = false;
      if (enemy.rig.stunRing) enemy.rig.stunRing.visible = false;
      this.spawnBurst(enemy.x, enemy.y + 1.3, enemy.z, 26, 0xffd54f, 6.2);
      this.callbacks.onEnemyDefeated(
        enemy.name,
        enemy.xpReward,
        enemy.goldReward,
        Boolean(enemy.isDesertArena)
      );
      if (enemy.archetype === 'yeti_boss') {
        soundEngine.playRunicAwaken();
        this.spawnBurst(enemy.x, enemy.y + 2.5, enemy.z, 45, 0x38bdf8, 10.5);
        this.spawnBurst(this.px, this.py + 1.5, this.pz, 36, 0x7dd3fc, 8.5);
        this.trauma = Math.min(1, this.trauma + 0.65);
        this.callbacks.onYetiBossDefeated?.();
      }
      this.checkWaveAndAmbushCompletion();
    } else if (didStun) {
      this.callbacks.onCombatToast(
        `${enemy.name}: -${dmg} · SERSEMLETİLDİ! (${stunDurationSec.toFixed(1)}s)`,
        'info'
      );
    } else {
      this.callbacks.onCombatToast(
        `${enemy.name}: -${dmg}${isCrit ? ' KRİTİK!' : ''}`,
        'hit'
      );
    }
  }

  private checkWaveAndAmbushCompletion() {
    // Check Desert Arena Wave completion
    if (this.arenaWave > 0 && this.arenaWaveEnemiesSpawned) {
      const aliveArena = this.enemies.filter(
        (e) => e.isDesertArena && e.state !== 'ko' && e.state !== 'respawning'
      ).length;
      if (aliveArena === 0) {
        this.arenaWaveEnemiesSpawned = false;
        const clearedWave = this.arenaWave;
        if (clearedWave >= DESERT_ARENA_TOTAL_WAVES) {
          this.arenaWave = 0;
          this.callbacks.onDesertArenaWaveCleared?.(clearedWave, true);
          this.callbacks.onCombatToast(
            'Çöl Arenası 5/5 Dalga Tamamlandı! 500 Sv. Çöl Ork Şefi yenildi!',
            'reward'
          );
        } else {
          this.callbacks.onDesertArenaWaveCleared?.(clearedWave, false);
          this.arenaNextWaveTimer = 2.6;
          this.callbacks.onCombatToast(
            `Dalga ${clearedWave}/5 Temizlendi! Dalga ${clearedWave + 1} yaklaşıyor...`,
            'reward'
          );
        }
      }
    }

    // Check Bandit Ambush completion
    if (this.ambushActive) {
      const aliveBandits = this.enemies.filter(
        (e) => e.isBanditAmbush && e.state !== 'ko' && e.state !== 'respawning'
      ).length;
      if (aliveBandits === 0) {
        this.ambushActive = false;
        this.callbacks.onCombatToast('Haydut pususunu püskürttün! Yol güvende.', 'reward');
      }
    }

    // Check Pirate Ambush completion (all 29 pirates defeated)
    if (this.pirateAmbushActive) {
      const alivePirates = this.enemies.filter(
        (e) => e.isPirateAmbush && e.state !== 'ko' && e.state !== 'respawning'
      ).length;
      if (alivePirates === 0) {
        this.clearPirateAmbush();
        const shipGold = getPirateShipCrewSpec().shipGoldReward;
        this.callbacks.onEnemyDefeated('Korsan Savaş Kalyonu', 4500, shipGold, false);
        this.callbacks.onCombatToast(
          `Korsan gemisi batırıldı! +${shipGold} Altın ganimet kazandın!`,
          'reward'
        );
      }
    }
  }

  public setConvoyTierForTest(tier: number) {
    this.convoyTier = Math.max(1, Math.min(CONVOY_MAX_TIER, Math.floor(tier)));
    for (let i = 0; i < this.convoyShips.length; i++) {
      this.spawnConvoyBoatAtLane(i, i === 0 ? -30 : 30, i === 0 ? 310 : 420, i === 0 ? 1 : -1, this.convoyTier);
    }
    this.emitHud();
  }

  private spawnArrow(opts: {
    fromEnemy: boolean;
    shooterName: string;
    x: number;
    y: number;
    z: number;
    dirX: number;
    dirZ: number;
    speed: number;
    isHeavy: boolean;
    damage: number;
    isCrit: boolean;
    colorHex: number;
    projKind?: 'arrow' | 'bomb' | 'arcane' | 'cannonball';
    aoeRadius?: number;
    vy?: number;
    maxLife?: number;
  }) {
    const idx = this.arrowCursor;
    const slot = this.arrows[idx];
    this.arrowCursor = (this.arrowCursor + 1) % ARROW_POOL_SIZE;
    slot.active = true;
    slot.fromEnemy = opts.fromEnemy;
    slot.projKind = opts.projKind || 'arrow';
    slot.aoeRadius = opts.aoeRadius || 0;
    slot.shooterName = opts.shooterName;
    slot.x = opts.x;
    slot.y = opts.y;
    slot.z = opts.z;
    slot.vx = opts.dirX * opts.speed;
    slot.vy = opts.vy !== undefined ? opts.vy : slot.projKind === 'bomb' ? 7.5 : slot.projKind === 'cannonball' ? 3.2 : 0.35;
    slot.vz = opts.dirZ * opts.speed;
    slot.yaw = Math.atan2(opts.dirX, opts.dirZ);
    slot.life = 0;
    slot.maxLife = opts.maxLife !== undefined ? opts.maxLife : slot.projKind === 'cannonball' ? 2.4 : opts.fromEnemy ? 1.45 : 1.05;
    slot.isHeavy = opts.isHeavy;
    slot.damage = opts.damage;
    slot.isCrit = opts.isCrit;
    slot.colorHex = opts.colorHex;
    slot.hitIds.clear();
    _arrowColor.setHex(opts.colorHex);
    this.arrowMesh.setColorAt(idx, _arrowColor);
    if (this.arrowMesh.instanceColor) {
      this.arrowMesh.instanceColor.needsUpdate = true;
    }
  }

  public triggerLocalAttack(heavy: boolean) {
    if (this.gameState !== 'playing' || this.hp <= 0) return;
    if (this.isMounted) {
      this.callbacks.onCombatToast(
        'At üstündeyken yetenek kullanılamaz! İnmek için [F] tuşuna bas.',
        'info'
      );
      return;
    }

    const aggBuffs = computeActiveFoodBuffs(this.activeBuffs);
    const stats = getDerivedStats(this.profile, this.activeBuffs);
    const cdMult = stats.cooldownMult;

    // SHIP CANNON COMBAT MODE (while sailing on the ocean!)
    if (this.isSailing && this.playerShipRig && this.playerShipVariant) {
      const shipSpec = SHIP_BY_ID[this.playerShipVariant];
      if (heavy) {
        if (this.heavyCd > 0) return;
        this.heavyCd = 2.1 * cdMult;
      } else {
        if (this.lightCd > 0) return;
        this.lightCd = 0.55 * cdMult;
      }

      const baseYaw = this.cameraMode === 'first_person' ? this.fpYaw : this.shipYaw;
      let aimX = Math.sin(baseYaw);
      let aimZ = Math.cos(baseYaw);

      // Soft auto-aim toward closest convoy ship or pirate ship within 95m
      let bestTargetDist = 96;
      for (const cs of this.convoyShips) {
        if (!cs.alive) continue;
        const d = Math.hypot(cs.x - this.shipX, cs.z - this.shipZ);
        if (d < bestTargetDist) {
          bestTargetDist = d;
          aimX = (cs.x - this.shipX) / Math.max(d, 0.1);
          aimZ = (cs.z - this.shipZ) / Math.max(d, 0.1);
        }
      }
      if (this.pirateShip) {
        const d = Math.hypot(this.pirateShip.x - this.shipX, this.pirateShip.z - this.shipZ);
        if (d < bestTargetDist) {
          bestTargetDist = d;
          aimX = (this.pirateShip.x - this.shipX) / Math.max(d, 0.1);
          aimZ = (this.pirateShip.z - this.shipZ) / Math.max(d, 0.1);
        }
      }

      const fireAngle = Math.atan2(aimX, aimZ);
      const spreads = heavy ? [-0.18, 0, 0.18] : [0];
      const cannonDmg = Math.round(
        (shipSpec.cannonDamage + stats.attackPower * 1.4) * aggBuffs.navalMult * (heavy ? 1.25 : 1.0)
      );

      soundEngine.playCannonFire();
      this.trauma = Math.min(1, this.trauma + (heavy ? 0.32 : 0.16));
      this.spawnBurst(
        this.shipX + aimX * 4.5,
        WATER_LEVEL + this.playerShipRig.deckY + 0.9,
        this.shipZ + aimZ * 4.5,
        heavy ? 18 : 10,
        0xffa73d,
        6.5
      );

      for (const offset of spreads) {
        const a = fireAngle + offset;
        this.spawnArrow({
          fromEnemy: false,
          shooterName: this.profile.displayName,
          x: this.shipX + Math.sin(a) * 4.2,
          y: WATER_LEVEL + this.playerShipRig.deckY + 0.85,
          z: this.shipZ + Math.cos(a) * 4.2,
          dirX: Math.sin(a),
          dirZ: Math.cos(a),
          speed: 58,
          isHeavy: heavy,
          damage: cannonDmg,
          isCrit: Math.random() < stats.critChance,
          colorHex: 0xff8c2e,
          projKind: 'cannonball',
          aoeRadius: heavy ? 6.5 : 4.2,
          vy: 2.2,
          maxLife: 2.2,
        });
      }
      return;
    }

    const wk = stats.activeWeaponKind;
    this.attackWeaponKind = wk;
    this.attackComboSide *= -1;
    if (heavy) {
      if (this.heavyCd > 0 || this.stamina < 24) return;
      this.heavyCd = (wk === 'daggers' ? 1.7 : 2.2) * cdMult;
      this.stamina -= 24;
      this.attackAnimDuration = wk === 'trident' || wk === 'spear' ? 0.38 : 0.44;
      this.attackAnimTimer = this.attackAnimDuration;
      this.attackIsHeavy = true;
    } else {
      if (this.lightCd > 0 || this.stamina < 6) return;
      this.lightCd =
        (wk === 'daggers'
          ? 0.24
          : wk === 'bow' || wk === 'staff'
          ? 0.32
          : wk === 'bomb'
          ? 0.46
          : 0.36) * cdMult;
      this.stamina -= 6;
      this.attackAnimDuration = wk === 'daggers' ? 0.22 : wk === 'spear' || wk === 'trident' ? 0.26 : 0.3;
      this.attackAnimTimer = this.attackAnimDuration;
      this.attackIsHeavy = false;
    }

    this.callbacks.onLocalAttackBroadcast(heavy);

    let fx = Math.sin(this.pYaw);
    let fz = Math.cos(this.pYaw);

    // RANGED WEAPONS: BOW (Charged Draw + Zoom!), BOMBER (Explosive AoE Bombs), MAGE (Arcane Star Bolts)
    if (stats.rangedEnabled || wk === 'bow' || wk === 'bomb' || wk === 'staff') {
      let bestScore = -1;
      for (const e of this.enemies) {
        if (e.state === 'ko' || e.state === 'respawning') continue;
        const dx = e.x - this.px;
        const dz = e.z - this.pz;
        const d = Math.hypot(dx, dz);
        if (d < 1.0 || d > 58) continue;
        const dot = (dx / d) * fx + (dz / d) * fz;
        if (dot > (this.bowZooming ? 0.88 : 0.7)) {
          const score = dot * 10 - d * 0.1;
          if (score > bestScore) {
            bestScore = score;
            fx = dx / d;
            fz = dz / d;
            if (this.cameraMode !== 'first_person') {
              this.pYaw = Math.atan2(fx, fz);
            }
          }
        }
      }

      const baseAngle = Math.atan2(fx, fz);
      if (wk === 'bomb') {
        soundEngine.playCannonFire();
        if (this.cameraMode !== 'first_person') {
          this.spawnBurst(this.px + fx * 0.9, this.py + 1.4, this.pz + fz * 0.9, heavy ? 12 : 6, 0xff7a2f, 4.0);
        }
        const spreads = heavy ? [-0.22, 0, 0.22] : [0];
        for (const offset of spreads) {
          const a = baseAngle + offset;
          this.spawnArrow({
            fromEnemy: false,
            shooterName: this.profile.displayName,
            x: this.px + Math.sin(a) * (this.cameraMode === 'first_person' ? 1.85 : 0.95),
            y: this.py + 1.55,
            z: this.pz + Math.cos(a) * (this.cameraMode === 'first_person' ? 1.85 : 0.95),
            dirX: Math.sin(a),
            dirZ: Math.cos(a),
            speed: heavy ? 28 : 24,
            isHeavy: heavy,
            damage: heavy ? stats.attackPower * 1.55 : stats.attackPower * 1.18,
            isCrit: Math.random() < stats.critChance,
            colorHex: 0xff6b2b,
            projKind: 'bomb',
            aoeRadius: heavy ? 7.8 : 5.6,
            vy: 6.2,
            maxLife: 1.5,
          });
        }
        return;
      }

      if (wk === 'staff') {
        soundEngine.playArcaneCast(heavy);
        if (this.cameraMode !== 'first_person') {
          this.spawnBurst(this.px + fx * 0.9, this.py + 1.5, this.pz + fz * 0.9, heavy ? 14 : 7, 0xc084fc, 4.5);
        }
        const spreads = heavy ? [-0.26, -0.13, 0, 0.13, 0.26] : [0];
        for (const offset of spreads) {
          const a = baseAngle + offset;
          this.spawnArrow({
            fromEnemy: false,
            shooterName: this.profile.displayName,
            x: this.px + Math.sin(a) * 0.95,
            y: this.py + 1.48,
            z: this.pz + Math.cos(a) * 0.95,
            dirX: Math.sin(a),
            dirZ: Math.cos(a),
            speed: heavy ? 46 : 40,
            isHeavy: heavy,
            damage: heavy ? stats.attackPower * 1.32 : stats.attackPower * 1.12,
            isCrit: Math.random() < stats.critChance,
            colorHex: 0xc084fc,
            projKind: 'arcane',
            aoeRadius: heavy ? 4.8 : 2.6,
            vy: 0.15,
            maxLife: 1.25,
          });
        }
        return;
      }

      // CHARGED RECURVE BOW VOLLEY (Quick or Heavy fan shot; hold-release uses fireChargedBowArrow)
      this.fireBowVolley(baseAngle, heavy ? 0.72 : 0.25, heavy, stats);
      return;
    }

    // MELEE MODE (Sword / Crystal Mace / Legendary Desert Spear / Poseidon's Trident / Yeti Claws / Daggers)
    const isMace = wk === 'mace';
    const isSpear = wk === 'spear';
    const isTrident = wk === 'trident';
    const isDaggers = wk === 'daggers';
    const isYetiClaws = wk === 'yeti_claws';
    const isRunic = this.profile.playerClass === 'yeti' && Boolean(this.profile.yetiRuneUnlocked);

    this.slashArcTimer = heavy ? 0.32 : 0.2;
    const arcScale = isYetiClaws
      ? heavy ? 2.35 : 1.7
      : isTrident
      ? heavy ? 2.2 : 1.6
      : isSpear
      ? heavy ? 1.95 : 1.45
      : isDaggers
      ? heavy ? 1.35 : 0.95
      : heavy ? 1.52 : 1.1;
    this.slashArcMesh.scale.setScalar(arcScale);
    const arcColor = isMace
      ? heavy ? 0x4fc3ff : 0x8ee2ff
      : isSpear
      ? heavy ? 0xff4526 : 0xff8a4c
      : isDaggers
      ? heavy ? 0x22d3ee : 0x67e8f9
      : isTrident
      ? heavy ? 0x06b6d4 : 0x67e8f9
      : isYetiClaws
      ? isRunic ? 0x38bdf8 : 0xbbe8ff
      : heavy ? 0xffae42 : 0xfff1bf;
    (this.slashArcMesh.material as THREE.MeshBasicMaterial).color.setHex(arcColor);
    soundEngine.playSlash(heavy || isTrident || isYetiClaws);

    // Expressive weapon impact burst (aquatic surge for Trident, icy claw burst for Yeti)
    if (isTrident) {
      this.spawnBurst(this.px + fx * 2.0, this.py + 1.25, this.pz + fz * 2.0, heavy ? 16 : 8, 0x22d3ee, 5.2);
    } else if (isYetiClaws) {
      this.spawnBurst(this.px + fx * 1.8, this.py + 1.4, this.pz + fz * 1.8, heavy ? 18 : 10, isRunic ? 0x38bdf8 : 0xe0f2fe, 5.8);
    }

    const lunge = isDaggers
      ? heavy ? 7.5 : 4.2
      : isSpear || isTrident
      ? heavy ? 7.4 : 4.2
      : isYetiClaws
      ? heavy ? 6.4 : 3.4
      : heavy ? 5.2 : 2.6;
    this.pvx += fx * lunge;
    this.pvz += fz * lunge;

    const reach = heavy ? stats.meleeReach + 1.35 : stats.meleeReach;
    const stunSec = heavy ? stats.stunHeavySec : stats.stunLightSec;
    let landedAny = false;
    let stunnedAny = false;
    let totalDealt = 0;

    for (const enemy of this.enemies) {
      if (enemy.state === 'ko' || enemy.state === 'respawning') continue;
      const dx = enemy.x - this.px;
      const dz = enemy.z - this.pz;
      const dist = Math.hypot(dx, dz);
      if (dist > reach) continue;

      if (!heavy && dist > 1.1) {
        const dot = (dx / dist) * fx + (dz / dist) * fz;
        if (dot < (isSpear || isTrident ? 0.25 : 0.12)) continue;
      }

      const isCrit = Math.random() < stats.critChance;
      const mult = heavy ? (isTrident || isYetiClaws ? 1.98 : isSpear ? 1.85 : 1.72) : 1.08;
      const dmg = calculateDamage(stats.attackPower, enemy.defense, mult, isCrit);
      const invD = dist > 0.01 ? 1 / dist : 1;
      this.applyEnemyDamage(enemy, dmg, isCrit, heavy, dx * invD, dz * invD, stunSec);
      totalDealt += dmg;
      landedAny = true;
      if (stunSec > 0) stunnedAny = true;
    }

    // Melee attacks can also damage nearby Convoy Ships if player is right beside them
    for (const cs of this.convoyShips) {
      if (!cs.alive) continue;
      const d = Math.hypot(cs.x - this.px, cs.z - this.pz);
      if (d <= reach + 7.5) {
        const dmg = Math.round(stats.attackPower * (heavy ? 1.7 : 1.0));
        this.damageConvoyShip(cs, dmg);
        landedAny = true;
      }
    }

    if (landedAny) {
      if (stats.lifestealPct > 0 && totalDealt > 0) {
        this.hp = Math.min(this.maxHp, this.hp + Math.ceil(totalDealt * stats.lifestealPct));
      }
      if (stunnedAny) {
        soundEngine.playStunImpact();
      } else {
        soundEngine.playHit(heavy, false);
      }
      this.hitstopTimer = heavy ? 0.06 : 0.035;
      this.trauma = Math.min(1, this.trauma + (heavy ? 0.42 : 0.2));
    }
  }

  private fireBowVolley(
    baseAngle: number,
    charge01: number,
    heavy: boolean,
    stats: ReturnType<typeof getDerivedStats>
  ) {
    const clamped = Math.max(0, Math.min(1, charge01));
    const chargeMult = getBowChargeMultiplier(clamped);
    const arrowSpeed = getBowArrowSpeed(clamped) * (heavy ? 1.06 : 1.0);
    const fx = Math.sin(baseAngle);
    const fz = Math.cos(baseAngle);

    soundEngine.playBowShot(heavy || clamped >= 0.72);
    if (this.cameraMode !== 'first_person') {
      this.spawnBurst(
        this.px + fx * 0.85,
        this.py + 1.42,
        this.pz + fz * 0.85,
        clamped >= 0.85 ? 14 : heavy ? 10 : 6,
        clamped >= 0.85 ? 0xfef08a : 0x62f29b,
        3.6
      );
    }

    const spreads = heavy ? [-0.14, 0, 0.14] : [0];
    for (const offset of spreads) {
      const a = baseAngle + offset;
      const isCrit = clamped >= 0.9 || Math.random() < stats.critChance + clamped * 0.25;
      const rawPower = stats.attackPower * (heavy ? 1.28 : 1.0) * chargeMult;
      const muzzleDist = this.cameraMode === 'first_person' ? 1.85 : 0.95;
      const pitchVy =
        this.cameraMode === 'first_person'
          ? Math.sin(this.fpPitch) * arrowSpeed
          : 0.65 + (1 - clamped) * 0.9;
      this.spawnArrow({
        fromEnemy: false,
        shooterName: this.profile.displayName,
        x: this.px + Math.sin(a) * muzzleDist,
        y: this.py + 1.46,
        z: this.pz + Math.cos(a) * muzzleDist,
        dirX: Math.sin(a),
        dirZ: Math.cos(a),
        speed: arrowSpeed,
        isHeavy: heavy || clamped >= 0.8,
        damage: rawPower,
        isCrit,
        colorHex: clamped >= 0.85 ? 0xfef08a : 0x6effa8,
        projKind: 'arrow',
        vy: pitchVy,
        maxLife: 1.55,
      });
    }
  }

  private startBowDraw() {
    if (this.gameState !== 'playing' || this.hp <= 0 || this.isMounted || this.isSailing) return;
    if (this.lightCd > 0) return;
    if (!this.bowDrawing) {
      this.bowDrawing = true;
      this.bowCharge = 0.08;
      soundEngine.playBowDraw();
      this.emitHud();
    }
  }

  private releaseBowDraw() {
    if (!this.bowDrawing) return;
    const charge = this.bowCharge;
    this.bowDrawing = false;
    this.bowCharge = 0;
    if (this.playerRig.bowParts) setBowDrawAmount(this.playerRig.bowParts, 0);
    if (this.fpBowParts) setBowDrawAmount(this.fpBowParts, 0);

    if (this.gameState !== 'playing' || this.hp <= 0 || this.isMounted || this.isSailing) {
      this.emitHud();
      return;
    }

    const stats = getDerivedStats(this.profile, this.activeBuffs);
    const aggBuffs = computeActiveFoodBuffs(this.activeBuffs);
    const cdMult = Math.max(0.55, aggBuffs.cooldownMult);
    this.lightCd = 0.28 * cdMult;
    this.attackWeaponKind = 'bow';
    this.attackAnimDuration = 0.24;
    this.attackAnimTimer = 0.24;
    this.attackIsHeavy = charge >= 0.8;
    this.callbacks.onLocalAttackBroadcast(charge >= 0.8);

    let fx = Math.sin(this.pYaw);
    let fz = Math.cos(this.pYaw);
    let bestScore = -1;
    for (const e of this.enemies) {
      if (e.state === 'ko' || e.state === 'respawning') continue;
      const dx = e.x - this.px;
      const dz = e.z - this.pz;
      const d = Math.hypot(dx, dz);
      if (d < 1.0 || d > 72) continue;
      const dot = (dx / d) * fx + (dz / d) * fz;
      if (dot > (this.bowZooming ? 0.9 : 0.72)) {
        const score = dot * 10 - d * 0.08;
        if (score > bestScore) {
          bestScore = score;
          fx = dx / d;
          fz = dz / d;
          if (this.cameraMode !== 'first_person') {
            this.pYaw = Math.atan2(fx, fz);
          }
        }
      }
    }
    this.fireBowVolley(Math.atan2(fx, fz), charge, false, stats);
    this.emitHud();
  }

  public getNearbyInteractable(): NearbyInteractable | null {
    const dTavern = Math.hypot(this.px - TOWN_TAVERN_POS.x, this.pz - TOWN_TAVERN_POS.z);
    if (dTavern <= 8.5) {
      return { kind: 'town_tavern', label: '[E] Kasaba Yemekhanesi — 10 Özel Yemek' };
    }

    const dForge = Math.hypot(this.px - TOWN_FORGE_POS.x, this.pz - TOWN_FORGE_POS.z);
    if (dForge <= 7.5) {
      return { kind: 'town_forge', label: '[E] Kasaba Demircisi — Silah & Zırh Yükselt' };
    }

    const dStable = Math.hypot(this.px - TOWN_STABLE_POS.x, this.pz - TOWN_STABLE_POS.z);
    if (dStable <= 8.0) {
      return {
        kind: 'town_stable',
        label: this.profile.hasHorse
          ? '[E] Kasaba Ahırı — Atın Hazır ([F] Bin · [G] Çağır)'
          : '[E] Kasaba Ahırı — Binek Atı Satın Al (400 Altın)',
      };
    }

    const dSailor = Math.hypot(this.px - HARBOR_SAILOR_POS.x, this.pz - HARBOR_SAILOR_POS.z);
    if (dSailor <= 11.5) {
      return {
        kind: 'harbor_sailor',
        label: '[E] Liman Denizcisi — 2 Gemi Satın Al & Denize Açıl',
      };
    }

    const dCamp = Math.hypot(this.px - SAFE_ZONE_CENTER.x, this.pz - SAFE_ZONE_CENTER.z);
    if (dCamp <= 7.8) {
      return { kind: 'campfire', label: '[E] Kasaba Meydanı — İyileşme & Yükseltme' };
    }

    const dCrystal = Math.hypot(this.px - MOUNTAIN_CRYSTAL_POS.x, this.pz - MOUNTAIN_CRYSTAL_POS.z);
    if (dCrystal <= 10.5) {
      return {
        kind: 'mountain_crystal',
        label: '[E] Dağ Kristalini Al — Kristal Gürz',
      };
    }

    const dTree = Math.hypot(this.px - FOREST_TREE_POS.x, this.pz - FOREST_TREE_POS.z);
    if (dTree <= 10.5) {
      return {
        kind: 'forest_tree',
        label: '[E] Kadim Ağaçtan Yayı Al — Orman Yayı',
      };
    }

    const dArena = Math.hypot(this.px - DESERT_ARENA_POS.x, this.pz - (DESERT_ARENA_POS.z - 13.2));
    if (dArena <= 10.5) {
      const done = this.profile.desertArenaProgress >= DESERT_ARENA_REQUIRED_KILLS;
      return {
        kind: 'desert_arena',
        label:
          this.arenaWave > 0
            ? `[E] Çöl Arenası Dalga ${this.arenaWave}/${DESERT_ARENA_TOTAL_WAVES} Devam Ediyor`
            : done && !this.profile.ownedWeapons.includes('desert_spear')
            ? '[E] Efsanevi Çöl Mızrağını Al!'
            : `[E] Çöl Arenası Dalgalarını Başlat (5 Dalga + 500 Sv. Ork)`,
      };
    }

    const dPirateRelic = Math.hypot(this.px - PIRATE_RELIC_POS.x, this.pz - PIRATE_RELIC_POS.z);
    if (dPirateRelic <= 10.5) {
      return { kind: 'pirate_relic', label: '[E] Korsan Barut Bombasını Al (Bombacı Silahı)' };
    }

    const dWizardRelic = Math.hypot(this.px - WIZARD_RELIC_POS.x, this.pz - WIZARD_RELIC_POS.z);
    if (dWizardRelic <= 10.5) {
      return { kind: 'wizard_relic', label: '[E] Yıldız Büyü Asasını Al (Büyücü Silahı)' };
    }

    const dHorrorRelic = Math.hypot(this.px - HORROR_RELIC_POS.x, this.pz - HORROR_RELIC_POS.z);
    if (dHorrorRelic <= 11.5) {
      return { kind: 'horror_relic', label: '[E] Kabus Çift Hançerini Al (Gölge Suikastçı)' };
    }

    const dUnderwaterRelic = Math.hypot(
      this.px - UNDERWATER_RELIC_POS.x,
      this.pz - UNDERWATER_RELIC_POS.z
    );
    if (dUnderwaterRelic <= 12.0) {
      return { kind: 'underwater_relic', label: "[E] Poseidon'un Mızrağını Al (Balıkadam Silahı)" };
    }

    const dUnderwaterExit = Math.hypot(
      this.px - UNDERWATER_EXIT_POS.x,
      this.pz - UNDERWATER_EXIT_POS.z
    );
    if (dUnderwaterExit <= 10.5) {
      return { kind: 'underwater_exit', label: '[E] Yüzey Portalı — Ana Ada Limanına Dön' };
    }

    return null;
  }

  public triggerContextInteract() {
    if (this.gameState !== 'playing') return;
    const nearby = this.getNearbyInteractable();
    if (!nearby) return;
    if (nearby.kind === 'campfire' || nearby.kind === 'town_forge') {
      this.callbacks.onCampfireInteract();
    } else if (nearby.kind === 'town_tavern') {
      this.callbacks.onTownTavernInteract?.();
    } else if (nearby.kind === 'harbor_sailor') {
      this.callbacks.onHarborSailorInteract?.();
    } else if (nearby.kind === 'underwater_exit') {
      this.whirlpoolCooldown = 6;
      this.teleportTo(HARBOR_POS.x, HARBOR_POS.z - 6, Math.PI);
      soundEngine.playWhirlpoolSuck();
      this.callbacks.onCombatToast('Sualtı Şehrinden Ana Ada Limanına ışınlandın!', 'info');
    } else if (nearby.kind === 'town_stable') {
      if (this.callbacks.onTownStableInteract) {
        this.callbacks.onTownStableInteract();
      } else {
        this.callbacks.onCampfireInteract();
      }
    } else if (nearby.kind === 'desert_arena') {
      const done = this.profile.desertArenaProgress >= DESERT_ARENA_REQUIRED_KILLS;
      if (this.arenaWave === 0 && !done) {
        this.startDesertArenaWave(1);
      } else if (this.arenaWave === 0 && done && !this.profile.ownedWeapons.includes('desert_spear')) {
        this.callbacks.onClassQuestInteract?.('desert_arena');
      } else if (this.arenaWave === 0) {
        this.startDesertArenaWave(1);
      } else {
        this.callbacks.onClassQuestInteract?.('desert_arena');
      }
    } else {
      this.callbacks.onClassQuestInteract?.(nearby.kind);
    }
  }

  // CLASS-SPECIFIC UNIQUE ESCAPE ABILITIES (Shift) FOR ALL 8 CLASSES!
  public triggerDash() {
    if (this.gameState !== 'playing' || this.hp <= 0) return;
    if (this.isMounted) {
      this.callbacks.onCombatToast(
        'At üstündeyken kaçış yeteneği kullanılamaz! İnmek için [F] tuşuna bas.',
        'info'
      );
      return;
    }
    const cfg = CLASS_ESCAPE_CONFIG[this.profile.playerClass] || CLASS_ESCAPE_CONFIG.guardian;
    if (this.dashCd > 0 || this.stamina < cfg.staminaCost) return;

    this.stamina -= cfg.staminaCost;
    this.dashCd = cfg.cooldownSec;
    this.dashStyle = cfg.style;
    this.dashDuration = cfg.durationSec;
    this.dashTimer = cfg.durationSec;
    this.dashSpeed = cfg.horizontalSpeed;
    this.dashHitIds.clear();
    this.dashDirX = Math.sin(this.pYaw);
    this.dashDirZ = Math.cos(this.pYaw);
    this.pendingLandingBlast = null;

    const colorNum = parseInt(cfg.accentColor.replace('#', ''), 16);

    if (cfg.style === 'cannon_launch') {
      // BOMBACI: Spawns a 3D Cannon behind player & blasts sky-high super far!
      if (this.escapeCannonMesh) {
        this.scene.remove(this.escapeCannonMesh);
      }
      this.escapeCannonMesh = buildEscapeCannonMesh();
      this.escapeCannonMesh.position.set(this.px, this.py, this.pz);
      this.escapeCannonMesh.rotation.y = this.pYaw;
      this.scene.add(this.escapeCannonMesh);
      this.escapeCannonTimer = 2.6;

      this.pvy = cfg.verticalBoost;
      this.grounded = false;
      this.pendingLandingBlast = { radius: 8.5, color: 0xff6b2b, mult: 1.45, stunSec: 1.2 };
      soundEngine.playCannonLaunch();
      this.spawnBurst(this.px, this.py + 1.0, this.pz, 28, 0xff7b29, 8.2);
      this.spawnBurst(this.px, this.py + 1.2, this.pz, 18, 0xfef08a, 5.5);
      this.trauma = Math.min(1, this.trauma + 0.45);
      this.callbacks.onCombatToast('TOP FIRLATIŞI! Topun içine atlayıp göğe fırladın!', 'info');
    } else if (cfg.style === 'arcane_blink') {
      // BÜYÜCÜ: Instant 23m Arcane Star Blink Teleport!
      const startX = this.px;
      const startZ = this.pz;
      this.spawnBurst(startX, this.py + 1.3, startZ, 26, 0xc084fc, 6.2);
      const fishmanAllowed = canWalkOnOcean(this.profile.playerClass);
      let destX = this.px;
      let destZ = this.pz;
      for (let step = 1; step <= 12; step++) {
        const tx = startX + this.dashDirX * ((cfg.teleportDist * step) / 12);
        const tz = startZ + this.dashDirZ * ((cfg.teleportDist * step) / 12);
        const c = clampToPlayableWorld(tx, tz);
        const surf = walkableHeightAt(c.x, c.z);
        if (!fishmanAllowed && !surf.onStructure && surf.y < WATER_LEVEL - 1.35 && isOpenOcean(c.x, c.z)) {
          break;
        }
        destX = c.x;
        destZ = c.z;
      }
      this.px = destX;
      this.pz = destZ;
      this.py = Math.max(WATER_LEVEL - 0.15, walkableHeightAt(destX, destZ).y) + 0.25;
      this.pvx = this.dashDirX * 8;
      this.pvz = this.dashDirZ * 8;
      soundEngine.playArcaneCast(true);
      this.spawnBurst(this.px, this.py + 1.3, this.pz, 30, 0xd8b4fe, 6.8);
      this.callbacks.onCombatToast('YILDIZ IŞINLANMASI!', 'info');
    } else if (cfg.style === 'tidal_surf') {
      // BALIKADAM: Summons a foaming 3D Tidal Wave to surf swiftly across land & ocean!
      this.surfWaveMesh.visible = true;
      soundEngine.playWaveSurf();
      this.spawnBurst(this.px, this.py + 0.5, this.pz, 24, 0x38bdf8, 5.8);
      this.callbacks.onCombatToast('GELGİT SÖRFÜ! Dalganın üstünde süzülüyorsun!', 'info');
    } else if (cfg.style === 'frost_leap') {
      // BUZ YETİSİ: Colossal Glacial Leap + Frost/Runic Landing Slam!
      const isRunic = Boolean(this.profile.yetiRuneUnlocked);
      this.pvy = cfg.verticalBoost;
      this.grounded = false;
      this.pendingLandingBlast = {
        radius: isRunic ? 11.5 : 8.2,
        color: isRunic ? 0x38bdf8 : 0xbae6fd,
        mult: isRunic ? 1.8 : 1.35,
        stunSec: isRunic ? 2.2 : 1.4,
      };
      soundEngine.playYetiRoar();
      this.spawnBurst(this.px, this.py + 0.8, this.pz, 26, isRunic ? 0x38bdf8 : 0xe0f2fe, 6.8);
      this.callbacks.onCombatToast(
        isRunic ? 'RÜNİK BUZ SIÇRAYIŞI!' : 'BUZUL SIÇRAYIŞI!',
        'info'
      );
    } else if (cfg.style === 'shadow_vanish') {
      // GÖLGE SUİKASTÇI: Vanishes into dark teal smoke & dashes swiftly!
      soundEngine.playRollWhoosh();
      this.spawnBurst(this.px, this.py + 1.1, this.pz, 24, 0x14b8a6, 5.2);
      this.callbacks.onCombatToast('GÖLGE SİSİ! Düşmanlardan görünmez sıyrıldın!', 'info');
    } else if (cfg.style === 'wind_vault') {
      // ORMAN OKÇUSU: High Acrobatic Wind Vault!
      this.pvy = cfg.verticalBoost;
      this.grounded = false;
      soundEngine.playRollWhoosh();
      this.spawnBurst(this.px, this.py + 0.6, this.pz, 20, 0x34d399, 5.2);
    } else if (cfg.style === 'flame_lunge') {
      // ÇÖL MIZRAKÇISI: Blazing Flame Spear Lunge!
      soundEngine.playSlash(true);
      this.spawnBurst(this.px, this.py + 1.0, this.pz, 22, 0xf97316, 6.0);
    } else {
      // KALE MUHAFIZI: Blue Crystal Shield Ram!
      soundEngine.playStunImpact();
      this.spawnBurst(this.px, this.py + 1.0, this.pz, 22, colorNum, 5.5);
    }

    this.squashX = 1.12;
    this.squashY = 0.78;
    this.emitHud();
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
      const idx = this.particleCursor;
      const slot = this.particles[idx];
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
      this.particleMesh.setColorAt(idx, slot.color);
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  private isTypingInForm(e: KeyboardEvent): boolean {
    const tag = (e.target as HTMLElement | null)?.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  private isUsingBow(): boolean {
    return !this.isSailing && !this.isMounted && getDerivedStats(this.profile, this.activeBuffs).activeWeaponKind === 'bow';
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.isTypingInForm(e)) return;
    const code = e.code;
    const wasHeld = this.keysHeld.has(code);
    if (!wasHeld) {
      this.justPressed.add(code);
    }
    this.keysHeld.add(code);

    if (this.gameState === 'playing') {
      if (
        code === 'Space' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight'
      ) {
        e.preventDefault();
      }
      if (code === 'Space') {
        this.jumpBufferTimer = 0.13;
      } else if (code === 'KeyJ') {
        if (this.isUsingBow()) {
          if (!wasHeld) this.startBowDraw();
        } else {
          this.triggerLocalAttack(false);
        }
      } else if (code === 'KeyK') {
        this.triggerLocalAttack(true);
      } else if (code === 'ShiftLeft' || code === 'ShiftRight') {
        this.triggerDash();
      } else if (code === 'KeyE') {
        this.triggerContextInteract();
      } else if (code === 'KeyF') {
        this.toggleMountHorse();
      } else if (code === 'KeyG') {
        this.summonHorse();
      } else if (code === 'KeyB') {
        this.toggleBoardShip();
      } else if (code === 'KeyC') {
        this.toggleCameraMode();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keysHeld.delete(e.code);
    if (e.code === 'KeyJ' && this.bowDrawing) {
      this.releaseBowDraw();
    }
    if (e.code === 'Space' && this.pvy > 2.2) {
      this.pvy *= 0.48;
    }
  };

  private onBlur = () => {
    this.keysHeld.clear();
    this.justPressed.clear();
    this.fpDragging = false;
    this.bowDrawing = false;
    this.bowZooming = false;
    this.bowCharge = 0;
  };

  private onPointerDown = (e: PointerEvent) => {
    if (this.gameState !== 'playing') return;
    const usingBow = this.isUsingBow();

    if (this.cameraMode === 'first_person') {
      if (e.button === 0) {
        if (document.pointerLockElement !== this.renderer.domElement) {
          try {
            const p = this.renderer.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
            if (p && typeof p.catch === 'function') p.catch(() => {});
          } catch {
            // Pointer lock may be blocked in sandboxed iframes
          }
        }
        if (usingBow) {
          this.startBowDraw();
        } else {
          this.triggerLocalAttack(false);
        }
      } else if (e.button === 2) {
        if (usingBow) {
          this.bowZooming = true;
          this.emitHud();
        }
        this.fpDragging = true;
        this.fpDragMoved = 0;
        this.fpLastMouseX = e.clientX;
        this.fpLastMouseY = e.clientY;
      }
      return;
    }

    // Third-Person Controls: With Bow -> LMB draws & releases charged arrow, RMB (Mouse2) zooms camera in!
    if (usingBow) {
      if (e.button === 0) {
        this.startBowDraw();
      } else if (e.button === 2) {
        this.bowZooming = true;
        this.emitHud();
      }
      return;
    }

    if (e.button === 2) {
      this.triggerLocalAttack(true);
    } else if (e.button === 0) {
      this.triggerLocalAttack(false);
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (this.gameState !== 'playing' || this.cameraMode !== 'first_person') return;
    const sensMult = this.bowZooming ? 0.55 : 1.0;
    if (document.pointerLockElement === this.renderer.domElement) {
      this.fpYaw -= e.movementX * 0.0028 * sensMult;
      this.fpPitch = Math.max(-0.62, Math.min(0.68, this.fpPitch - e.movementY * 0.0024 * sensMult));
    } else if (this.fpDragging) {
      const dx = e.clientX - this.fpLastMouseX;
      const dy = e.clientY - this.fpLastMouseY;
      this.fpLastMouseX = e.clientX;
      this.fpLastMouseY = e.clientY;
      this.fpDragMoved += Math.hypot(dx, dy);
      this.fpYaw -= dx * 0.0055 * sensMult;
      this.fpPitch = Math.max(-0.62, Math.min(0.68, this.fpPitch - dy * 0.0045 * sensMult));
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (e.button === 0 && this.bowDrawing) {
      this.releaseBowDraw();
    }
    if (e.button === 2) {
      if (this.bowZooming) {
        this.bowZooming = false;
        this.emitHud();
      }
      if (this.fpDragging) {
        if (!this.isUsingBow() && this.fpDragMoved < 6 && this.gameState === 'playing') {
          this.triggerLocalAttack(true);
        }
        this.fpDragging = false;
      }
    }
  };

  private onContextMenu = (e: MouseEvent) => {
    if (this.gameState === 'playing') {
      e.preventDefault();
    }
  };

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('visibilitychange', this.onBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    dom.addEventListener('contextmenu', this.onContextMenu);

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
        this.updateWorldEvents(dt);
        this.updateProjectiles(dt);
        this.updateEnemies(dt);
        this.updateRemotes(dt);
        this.updateHitFlashesAndVfx(dt);
      }
      this.updateGameplayCamera(dt);
    } else {
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

  private updateWorldEvents(dt: number) {
    const inTown = isInsideSafeZone(this.px, this.pz);

    // 0. Tick Active Food Buffs & Food HP Regen
    if (this.activeBuffs.length > 0) {
      let expiredAny = false;
      for (let i = this.activeBuffs.length - 1; i >= 0; i--) {
        this.activeBuffs[i].remainingSec -= dt;
        if (this.activeBuffs[i].remainingSec <= 0) {
          this.activeBuffs.splice(i, 1);
          expiredAny = true;
        }
      }
      const agg = computeActiveFoodBuffs(this.activeBuffs);
      if (expiredAny) {
        const stats = getDerivedStats(this.profile, this.activeBuffs);
        this.maxHp = stats.maxHp;
        this.hp = Math.min(this.maxHp, this.hp);
      }
      if (agg.regenPctPerSec > 0 && this.hp > 0 && this.hp < this.maxHp) {
        this.foodRegenAcc += this.maxHp * agg.regenPctPerSec * dt;
        if (this.foodRegenAcc >= 1) {
          const heal = Math.floor(this.foodRegenAcc);
          this.foodRegenAcc -= heal;
          this.hp = Math.min(this.maxHp, this.hp + heal);
        }
      }
    }

    // 1. Desert Arena Auto-Start & Wave-to-Wave Progression
    const distArena = Math.hypot(this.px - DESERT_ARENA_POS.x, this.pz - DESERT_ARENA_POS.z);
    if (this.arenaWave === 0 && distArena < 15.5) {
      this.startDesertArenaWave(1);
    } else if (this.arenaWave > 0) {
      if (distArena > 48) {
        this.resetDesertArena();
        this.callbacks.onCombatToast('Çöl Arenası alanından ayrıldın — dalgalar sıfırlandı.', 'info');
      } else if (this.arenaNextWaveTimer > 0) {
        this.arenaNextWaveTimer -= dt;
        if (this.arenaNextWaveTimer <= 0 && this.arenaWave < DESERT_ARENA_TOTAL_WAVES) {
          this.startDesertArenaWave(this.arenaWave + 1);
        }
      }
    }

    // 2. Bandit Ambush Timer (Every 5 minutes, 5% chance, ONLY outside Starter Town & on Main Island!)
    if (!this.ambushActive && !this.isSailing && this.hp > 0 && !isOpenOcean(this.px, this.pz)) {
      const tickRes = evaluateBanditAmbushTick(this.ambushElapsedSec, dt, inTown);
      this.ambushElapsedSec = tickRes.nextElapsedSec;
      if (tickRes.triggered) {
        this.triggerBanditAmbush();
      }
    } else if (this.ambushActive && inTown) {
      this.removeEnemiesMatching((e) => Boolean(e.isBanditAmbush));
      this.ambushActive = false;
      this.callbacks.onCombatToast('Başlangıç Kasabası muhafızları haydutları uzaklaştırdı!', 'info');
    }

    // 3. Escalating Trade Convoy Boats (Main Harbor z=256 <-> Floating Town z=472)
    const nowSec = performance.now() * 0.001;
    for (const cs of this.convoyShips) {
      if (!cs.alive) {
        cs.respawnTimer -= dt;
        if (cs.respawnTimer <= 0) {
          // Spawn the new larger escalated ship from Floating Town heading North
          this.spawnConvoyBoatAtLane(cs.laneIdx, cs.laneX, 468, -1, this.convoyTier);
          const cfg = getConvoyTierConfig(this.convoyTier);
          this.callbacks.onCombatToast(
            `Yüzen Kasabadan yeni Konvoy Gemisi (Sv.${cfg.tier}, ${cfg.crewCount} Tayfa, ${cfg.goldReward} Altın) yola çıktı!`,
            'info'
          );
        }
        continue;
      }

      cs.z += cs.dirZ * cs.speed * dt;
      if (cs.z >= 472) {
        cs.z = 472;
        cs.dirZ = -1;
      } else if (cs.z <= 256) {
        cs.z = 256;
        cs.dirZ = 1;
      }
      cs.yaw = cs.dirZ > 0 ? 0 : Math.PI;
      cs.rig.root.position.set(cs.x, WATER_LEVEL + Math.sin(nowSec * 1.8 + cs.laneIdx) * 0.14, cs.z);
      cs.rig.root.rotation.y = cs.yaw;
      cs.rig.root.rotation.z = Math.sin(nowSec * 1.5 + cs.laneIdx) * 0.035;

      // Sync deck crew positions to moving convoy ship
      const cosY = Math.cos(cs.yaw);
      const sinY = Math.sin(cs.yaw);
      const deckY = WATER_LEVEL + cs.rig.deckY;
      for (const e of this.enemies) {
        if (e.convoyBoatIdx === cs.laneIdx && e.state !== 'ko' && e.state !== 'respawning') {
          const lx = e.deckOffsetX || 0;
          const lz = e.deckOffsetZ || 0;
          e.homeX = cs.x + lx * cosY + lz * sinY;
          e.homeZ = cs.z - lx * sinY + lz * cosY;
          e.x = e.homeX;
          e.z = e.homeZ;
          e.y = deckY;
          e.rig.root.position.set(e.x, e.y, e.z);
        }
      }

      // Weakened Navy Cannoneers fire slower, lighter cannonballs at the player's ship!
      const cfg = getConvoyTierConfig(cs.tier);
      if (cfg.cannoneerCount > 0 && this.hp > 0) {
        cs.cannonCd = Math.max(0, cs.cannonCd - dt);
        const distP = Math.hypot(this.px - cs.x, this.pz - cs.z);
        if (distP < 82 && cs.cannonCd <= 0) {
          cs.cannonCd = ENEMY_CANNON_COOLDOWN_SEC;
          soundEngine.playCannonFire();
          const shots = Math.min(2, cfg.cannoneerCount);
          for (let s = 0; s < shots; s++) {
            const spread = (s - (shots - 1) * 0.5) * 0.14;
            const ang = Math.atan2(this.px - cs.x, this.pz - cs.z) + spread;
            this.spawnArrow({
              fromEnemy: true,
              shooterName: 'Donanma Topçusu',
              x: cs.x + Math.sin(ang) * 4.5,
              y: deckY + 1.2,
              z: cs.z + Math.cos(ang) * 4.5,
              dirX: Math.sin(ang),
              dirZ: Math.cos(ang),
              speed: ENEMY_CANNON_SPEED,
              isHeavy: false,
              damage: cfg.cannonDamage,
              isCrit: false,
              colorHex: 0xff6b35,
              projKind: 'cannonball',
              aoeRadius: 3.2,
              vy: 2.0,
              maxLife: 2.4,
            });
          }
        }
      }
    }

    // 4. Low-Chance Open-Ocean Pirate Ship Ambush (Weakened Cannoneers)
    const inOpenSea = isOpenOcean(this.px, this.pz) && this.isSailing;
    if (!this.pirateAmbushActive && this.hp > 0) {
      const pTick = evaluatePirateAmbushTick(this.pirateAmbushElapsedSec, dt, inOpenSea);
      this.pirateAmbushElapsedSec = pTick.nextElapsedSec;
      if (pTick.triggered) {
        this.triggerPirateAmbush();
      }
    } else if (this.pirateShip) {
      this.pirateShip.rig.root.position.y = WATER_LEVEL + Math.sin(nowSec * 1.4) * 0.18;
      this.pirateShip.rig.root.rotation.z = Math.sin(nowSec * 1.2) * 0.04;
      this.pirateShip.cannonCd = Math.max(0, this.pirateShip.cannonCd - dt);
      const distPirate = Math.hypot(this.px - this.pirateShip.x, this.pz - this.pirateShip.z);
      if (distPirate < 90 && this.pirateShip.cannonCd <= 0 && this.hp > 0) {
        this.pirateShip.cannonCd = ENEMY_CANNON_COOLDOWN_SEC + 0.6;
        const ang = Math.atan2(this.px - this.pirateShip.x, this.pz - this.pirateShip.z);
        const pirateSpec = getPirateShipCrewSpec();
        soundEngine.playCannonFire();
        for (const offset of [-0.12, 0.12]) {
          this.spawnArrow({
            fromEnemy: true,
            shooterName: 'Korsan Topçusu',
            x: this.pirateShip.x + Math.sin(ang + offset) * 6.5,
            y: WATER_LEVEL + this.pirateShip.rig.deckY + 1.2,
            z: this.pirateShip.z + Math.cos(ang + offset) * 6.5,
            dirX: Math.sin(ang + offset),
            dirZ: Math.cos(ang + offset),
            speed: ENEMY_CANNON_SPEED,
            isHeavy: false,
            damage: pirateSpec.cannoneerDamage,
            isCrit: false,
            colorHex: 0xff4526,
            projKind: 'cannonball',
            aoeRadius: 3.4,
            vy: 2.2,
            maxLife: 2.4,
          });
        }
      }
    }

    // 5. Giant Ocean Whirlpool -> Swallows Player into Underwater City Atlantis!
    if (this.whirlpoolCooldown > 0) {
      this.whirlpoolCooldown = Math.max(0, this.whirlpoolCooldown - dt);
    } else {
      const dxW = WHIRLPOOL_POS.x - this.px;
      const dzW = WHIRLPOOL_POS.z - this.pz;
      const distW = Math.hypot(dxW, dzW);
      if (distW < WHIRLPOOL_PULL_RADIUS) {
        const pullStrength = (1 - distW / WHIRLPOOL_PULL_RADIUS) * 14 * dt;
        const nx = dxW / Math.max(distW, 0.1);
        const nz = dzW / Math.max(distW, 0.1);
        // Spiral inward pull
        const pullX = (nx - nz * 0.45) * pullStrength;
        const pullZ = (nz + nx * 0.45) * pullStrength;
        if (this.isSailing) {
          this.shipX += pullX;
          this.shipZ += pullZ;
        } else {
          this.px += pullX;
          this.pz += pullZ;
        }
        if (distW <= WHIRLPOOL_TELEPORT_RADIUS) {
          this.whirlpoolCooldown = 6.0;
          this.isSailing = false;
          this.isMounted = false;
          this.shipSpeed = 0;
          soundEngine.playWhirlpoolSuck();
          this.teleportTo(UNDERWATER_CITY_POS.x, UNDERWATER_CITY_POS.z + 32, Math.PI);
          this.callbacks.onCombatToast(
            'DEV GİRDAP SENİ YUTTU! Sualtı Şehri Atlantis\'e ulaştın!',
            'reward'
          );
        }
      }
    }

    // 6. Misty Horror Forest Procedural Eerie Whispers
    if (isInsideHorrorForest(this.px, this.pz)) {
      this.horrorWhisperTimer -= dt;
      if (this.horrorWhisperTimer <= 0) {
        this.horrorWhisperTimer = 7.5 + Math.random() * 5.5;
        soundEngine.playHorrorWhisper();
      }
    }
  }

  private updateAmbientWorld(dt: number, elapsed: number) {
    if (this.gameState === 'playing') {
      const cycle = advanceWeatherCycle(
        this.weather,
        this.weatherCycleElapsed,
        dt,
        this.weatherAutoCycle
      );
      this.weatherCycleElapsed = cycle.nextElapsed;
      if (cycle.changed) {
        this.setWeather(cycle.weather, false);
      }
    }

    const preset = WEATHER_PRESETS[this.weather];
    const k = 1 - Math.exp(-2.6 * dt);

    const inHorror = this.gameState === 'playing' && isInsideHorrorForest(this.px, this.pz);
    const inAtlantis = this.gameState === 'playing' && isInsideUnderwaterCity(this.px, this.pz);
    const inNorthPole = this.gameState === 'playing' && isInsideNorthPole(this.px, this.pz);

    if (inHorror) {
      _targetSkyColor.set('#14101f');
      _targetSunColor.set('#5a4e78');
      _targetHemiSky.set('#3d3254');
      _targetHemiGround.set('#12101a');
    } else if (inAtlantis) {
      _targetSkyColor.set('#073242');
      _targetSunColor.set('#5be0ff');
      _targetHemiSky.set('#1f8fa8');
      _targetHemiGround.set('#07232e');
    } else if (inNorthPole) {
      _targetSkyColor.set('#89c2e8');
      _targetSunColor.set('#e8f7ff');
      _targetHemiSky.set('#a8dcf7');
      _targetHemiGround.set('#5e86a3');
    } else {
      _targetSkyColor.set(preset.skyHex);
      _targetSunColor.set(preset.sunHex);
      _targetHemiSky.set(preset.hemiSkyHex);
      _targetHemiGround.set(preset.hemiGroundHex);
    }

    this.skyColor.lerp(_targetSkyColor, k);
    this.fog.color.copy(this.skyColor);
    const targetFog = inHorror
      ? 0.018
      : inAtlantis
      ? 0.0085
      : inNorthPole
      ? 0.0014
      : preset.fogDensity * 0.34;
    this.fog.density += (targetFog - this.fog.density) * k;

    this.sunLight.color.lerp(_targetSunColor, k);
    const targetSunI = inHorror ? 0.52 : inAtlantis ? 1.15 : inNorthPole ? 1.55 : preset.sunIntensity;
    this.sunLight.intensity += (targetSunI - this.sunLight.intensity) * k;

    this.hemiLight.color.lerp(_targetHemiSky, k);
    this.hemiLight.groundColor.lerp(_targetHemiGround, k);
    const targetHemiI = inHorror ? 0.48 : inAtlantis ? 0.92 : inNorthPole ? 1.1 : preset.hemiIntensity;
    this.hemiLight.intensity += (targetHemiI - this.hemiLight.intensity) * k;

    _targetCloudColor.set(preset.cloudHex);
    this.world.cloudMaterial.color.lerp(_targetCloudColor, k);
    this.world.cloudMaterial.opacity +=
      (preset.cloudOpacity - this.world.cloudMaterial.opacity) * k;

    const rainK =
      preset.rainIntensity < this.rainIntensityCurrent ? 1 - Math.exp(-6.5 * dt) : k;
    this.rainIntensityCurrent += (preset.rainIntensity - this.rainIntensityCurrent) * rainK;

    if (this.rainIntensityCurrent > 0.03 && !inAtlantis) {
      this.rainMesh.visible = true;
      this.rainMaterial.opacity = 0.58 * this.rainIntensityCurrent;
      const anchorX = this.gameState === 'title' ? this.camera.position.x : this.px;
      const anchorY = this.gameState === 'title' ? Math.max(0, this.camera.position.y - 10) : this.py;
      const anchorZ = this.gameState === 'title' ? this.camera.position.z - 12 : this.pz;
      const halfArea = RAIN_AREA * 0.5;

      for (let i = 0; i < RAIN_COUNT; i++) {
        const drop = this.rainDrops[i];
        drop.ry -= drop.speed * dt;
        drop.rx += 3.2 * dt;
        if (drop.ry < 0) {
          drop.ry += RAIN_HEIGHT;
          drop.rx = (Math.random() - 0.5) * RAIN_AREA;
          drop.rz = (Math.random() - 0.5) * RAIN_AREA;
        }
        if (drop.rx > halfArea) drop.rx -= RAIN_AREA;

        _dummy.position.set(anchorX + drop.rx, anchorY + drop.ry, anchorZ + drop.rz);
        _dummy.rotation.set(0.07, 0, -0.14);
        _dummy.scale.set(1, 0.85 + 0.35 * this.rainIntensityCurrent, 1);
        _dummy.updateMatrix();
        this.rainMesh.setMatrixAt(i, _dummy.matrix);
      }
      this.rainMesh.instanceMatrix.needsUpdate = true;
    } else if (this.rainMesh.visible) {
      this.rainMesh.visible = false;
    }

    if (this.gameState === 'playing' && this.weather === 'rainy' && !inAtlantis) {
      this.thunderTimer -= dt;
      if (this.thunderTimer <= 0) {
        this.thunderTimer = 14 + Math.random() * 12;
        soundEngine.playDistantThunder();
      }
    }

    const cloudSpeed = preset.cloudSpeedMult;
    this.world.cloudsGroup.children.forEach((cloud, i) => {
      cloud.position.x += dt * cloudSpeed * (0.8 + (i % 3) * 0.35);
      if (cloud.position.x > 1300) cloud.position.x = -1300;
    });

    // Smooth living ocean waves + shimmering Northern Aurora Borealis!
    this.world.oceanWaveMap.offset.x = (elapsed * 0.018) % 1;
    this.world.oceanWaveMap.offset.y = (elapsed * 0.012) % 1;
    this.world.oceanWaveBump.offset.x = (-elapsed * 0.014) % 1;
    this.world.oceanWaveBump.offset.y = (elapsed * 0.016) % 1;

    this.world.northPoleAurora.rotation.y = elapsed * 0.07;
    this.world.northPoleAurora.children.forEach((rib, idx) => {
      rib.position.y = idx * 9 + Math.sin(elapsed * 0.9 + idx * 1.4) * 3.5;
    });

    if (this.playerRig.runicHalo) {
      this.playerRig.runicHalo.rotation.y = elapsed * 1.65;
      this.playerRig.runicHalo.position.y = 2.0 + Math.sin(elapsed * 2.6) * 0.14;
    }

    const flicker = 0.92 + Math.sin(elapsed * 13) * 0.1 + Math.cos(elapsed * 21) * 0.06;
    this.world.campfireFlame.scale.set(flicker, 0.85 + Math.sin(elapsed * 16) * 0.2, flicker);
    this.world.campfireLight.intensity = 4.6 + Math.sin(elapsed * 12) * 0.7;

    this.world.summitCrystal.rotation.y += dt * 1.1;
    this.world.summitCrystal.position.y = 4.1 + Math.sin(elapsed * 2.2) * 0.35;

    this.world.forestTreeRelic.rotation.y += dt * 1.35;
    this.world.forestTreeRelic.position.y = 2.5 + Math.sin(elapsed * 2.5 + 1.0) * 0.25;

    this.world.desertSpearRelic.rotation.y += dt * 0.9;

    // Animate Ocean Archipelago Landmarks
    this.world.whirlpoolGroup.rotation.y += dt * 1.55;
    this.world.pirateRelic.rotation.y += dt * 1.25;
    this.world.wizardRelic.rotation.y += dt * 1.4;
    this.world.horrorRelic.rotation.y += dt * 1.5;
    this.world.underwaterRelic.rotation.y += dt * 1.15;
    this.world.underwaterExitPortal.rotation.z += dt * 1.8;
    this.world.lighthouseBeacon.rotation.y += dt * 2.2;

    this.world.harborDisplayShips.forEach((ship, idx) => {
      ship.root.position.y = WATER_LEVEL + Math.sin(elapsed * 1.8 + idx * 1.7) * 0.12;
      ship.root.rotation.z = Math.sin(elapsed * 1.4 + idx) * 0.03;
    });

    this.world.underwaterBubbles.forEach((b, idx) => {
      b.position.y += dt * (2.2 + (idx % 3) * 0.7);
      if (b.position.y > 42) b.position.y = 1.5;
    });

    const sailWave = this.weather === 'rainy' ? 0.12 : 0.05;
    this.world.vikingSailMesh.scale.z = 1 + Math.sin(elapsed * 2.2) * sailWave;

    const swayAmp = this.weather === 'rainy' ? 0.32 : 0.18;
    const swayFreq = this.weather === 'rainy' ? 5.2 : 3.1;
    this.world.bannerMeshes.forEach((b) => {
      b.rotation.y = Math.sin(elapsed * swayFreq) * swayAmp;
    });

    this.world.waterMesh.position.y = WATER_LEVEL + Math.sin(elapsed * 1.6) * 0.04;
  }

  private updateTitleFlyover(dt: number) {
    this.titleTime += dt;
    // Panoramic showcase orbiting the Central Starter Town, Kara Orman, Bozdağ & Desert horizon
    const angle = this.titleTime * 0.08 + 0.38;
    const cx = Math.sin(angle) * 46;
    const cz = 18 + Math.cos(angle) * 44;
    const cy = 24 + Math.sin(this.titleTime * 0.24) * 2.5;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(0, 7.5, -14);

    this.playerRig.cloak.rotation.x = 0.15 + Math.sin(this.titleTime * 2.4) * 0.05;
  }

  private updatePlayer(dt: number) {
    const aggBuffs = computeActiveFoodBuffs(this.activeBuffs);
    const stats = getDerivedStats(this.profile, this.activeBuffs);

    this.lightCd = Math.max(0, this.lightCd - dt);
    this.heavyCd = Math.max(0, this.heavyCd - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);

    const regenRate = isInsideSafeZone(this.px, this.pz) ? 36 : 22;
    this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * dt);

    if (isInsideSafeZone(this.px, this.pz) && this.hp > 0 && this.hp < this.maxHp) {
      this.regenTick += dt;
      if (this.regenTick >= 0.45) {
        this.regenTick = 0;
        this.hp = Math.min(this.maxHp, this.hp + Math.ceil(this.maxHp * 0.05));
      }
    }

    // DRIVABLE OCEAN SHIP SAILING CONTROLLER
    if (this.isSailing && this.playerShipRig && this.playerShipVariant) {
      const shipSpec = SHIP_BY_ID[this.playerShipVariant];
      const maxShipSpeed = shipSpec.speed * aggBuffs.navalMult;
      let throttle = 0;
      let steer = 0;
      if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) throttle += 1;
      if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) throttle -= 0.55;
      if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) steer += 1;
      if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) steer -= 1;

      this.shipYaw += steer * 1.55 * dt;
      const targetSpd = throttle * maxShipSpeed;
      this.shipSpeed = THREE.MathUtils.lerp(this.shipSpeed, targetSpd, 1 - Math.exp(-3.4 * dt));

      const nx = this.shipX + Math.sin(this.shipYaw) * this.shipSpeed * dt;
      const nz = this.shipZ + Math.cos(this.shipYaw) * this.shipSpeed * dt;
      const clampedShip = clampToPlayableWorld(nx, nz);

      // Keep ship off dry land shores while sailing smoothly near harbors & islands
      const targetLandY = groundHeightAt(clampedShip.x, clampedShip.z);
      if (targetLandY < WATER_LEVEL + 0.15) {
        this.shipX = clampedShip.x;
        this.shipZ = clampedShip.z;
      } else {
        this.shipSpeed *= -0.25;
      }

      const tWave = performance.now() * 0.001;
      const waveBob = Math.sin(tWave * 2.1) * 0.16;
      this.playerShipRig.root.position.set(this.shipX, WATER_LEVEL + waveBob, this.shipZ);
      this.playerShipRig.root.rotation.y = this.shipYaw;
      this.playerShipRig.root.rotation.z = Math.sin(tWave * 1.6) * 0.045 - steer * 0.06;

      this.px = this.shipX;
      this.pz = this.shipZ;
      this.py = WATER_LEVEL + this.playerShipRig.deckY + waveBob;
      this.pYaw = this.shipYaw;
      if (this.cameraMode !== 'first_person') {
        this.fpYaw = this.shipYaw;
      }

      // Position captain standing proudly at the helm
      const helmBackX = -Math.sin(this.shipYaw) * 2.2;
      const helmBackZ = -Math.cos(this.shipYaw) * 2.2;
      this.playerRig.root.position.set(this.px + helmBackX, this.py, this.pz + helmBackZ);
      this.playerRig.root.rotation.y = this.shipYaw;
      this.playerRig.bodyGroup.position.y = 0;
      this.playerRig.bodyGroup.rotation.x = 0;
      this.playerRig.leftLeg.rotation.x = 0;
      this.playerRig.rightLeg.rotation.x = 0;
      this.playerRig.leftArm.rotation.x = -0.35;
      this.playerRig.rightArm.rotation.x = -0.35;
      this.playerRig.cloak.rotation.x = 0.25 + Math.min(0.6, Math.abs(this.shipSpeed) * 0.025);

      if (Math.abs(this.shipSpeed) > 3 && Math.random() < 0.35) {
        this.spawnBurst(
          this.shipX - Math.sin(this.shipYaw) * 5.2,
          WATER_LEVEL + 0.15,
          this.shipZ - Math.cos(this.shipYaw) * 5.2,
          1,
          0xdbf4ff,
          2.2
        );
      }

      this.sunLight.position.set(this.px + 42, this.py + 66, this.pz + 36);
      this.sunLight.target.position.set(this.px, this.py, this.pz);
      this.sunLight.target.updateMatrixWorld();

      const curBiome = getBiomeAt(this.px, this.pz);
      if (!this.profile.discoveredBiomes.includes(curBiome)) {
        this.callbacks.onBiomeDiscovered(curBiome);
      }

      this.hudEmitAcc += dt;
      if (this.hudEmitAcc >= 0.1) {
        this.hudEmitAcc = 0;
        this.emitHud();
      }
      return;
    }

    // WASD controls: First-Person looks along fpYaw (Q/Arrows turn); Third-Person uses fixed FIXED_CAM_YAW
    let inputForward = 0;
    let inputRight = 0;
    if (this.cameraMode === 'first_person') {
      if (this.keysHeld.has('KeyW')) inputForward += 1;
      if (this.keysHeld.has('KeyS')) inputForward -= 1;
      if (this.keysHeld.has('KeyD')) inputRight += 1;
      if (this.keysHeld.has('KeyA')) inputRight -= 1;
      if (this.keysHeld.has('ArrowLeft') || this.keysHeld.has('KeyQ')) this.fpYaw += 2.2 * dt;
      if (this.keysHeld.has('ArrowRight')) this.fpYaw -= 2.2 * dt;
      if (this.keysHeld.has('ArrowUp')) {
        this.fpPitch = Math.min(0.68, this.fpPitch + 1.35 * dt);
      }
      if (this.keysHeld.has('ArrowDown')) {
        this.fpPitch = Math.max(-0.62, this.fpPitch - 1.35 * dt);
      }
    } else {
      if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) inputForward += 1;
      if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) inputForward -= 1;
      if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) inputRight += 1;
      if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) inputRight -= 1;
    }

    const activeCamYaw = this.cameraMode === 'first_person' ? this.fpYaw : FIXED_CAM_YAW;
    const camForwardX = Math.sin(activeCamYaw);
    const camForwardZ = Math.cos(activeCamYaw);
    const camRightX = -camForwardZ;
    const camRightZ = camForwardX;

    let moveX = camForwardX * inputForward + camRightX * inputRight;
    let moveZ = camForwardZ * inputForward + camRightZ * inputRight;
    const inputLen = Math.hypot(moveX, moveZ);
    if (inputLen > 0.01) {
      moveX /= inputLen;
      moveZ /= inputLen;
    }

    // Clean up Bombacı Escape Cannon after launch
    if (this.escapeCannonTimer > 0) {
      this.escapeCannonTimer -= dt;
      if (this.escapeCannonTimer <= 0 && this.escapeCannonMesh) {
        this.scene.remove(this.escapeCannonMesh);
        this.escapeCannonMesh = null;
      }
    }

    // Interactive Bow Draw Charge Ramp (faster while zooming with Mouse2!)
    if (this.bowDrawing) {
      if (!this.isUsingBow()) {
        this.bowDrawing = false;
        this.bowCharge = 0;
      } else {
        const chargeRate = (this.bowZooming ? 1.35 : 1.0) / BOW_MAX_CHARGE_SEC;
        this.bowCharge = Math.min(1, this.bowCharge + dt * chargeRate);
        if (this.playerRig.bowParts) setBowDrawAmount(this.playerRig.bowParts, this.bowCharge);
        if (this.fpBowParts) setBowDrawAmount(this.fpBowParts, this.bowCharge);
      }
    } else if (this.bowCharge > 0) {
      this.bowCharge = Math.max(0, this.bowCharge - dt * 5);
      if (this.playerRig.bowParts) setBowDrawAmount(this.playerRig.bowParts, this.bowCharge);
      if (this.fpBowParts) setBowDrawAmount(this.fpBowParts, this.bowCharge);
    }

    const curSurf = walkableHeightAt(this.px, this.pz);
    const fishmanOceanWalker = canWalkOnOcean(this.profile.playerClass);
    const inDeepOceanWater = !curSurf.onStructure && curSurf.y < WATER_LEVEL - 0.85 && isOpenOcean(this.px, this.pz);
    const wadingInLake = !curSurf.onStructure && curSurf.y < WATER_LEVEL - 0.15;
    this.isSwimming = fishmanOceanWalker && inDeepOceanWater && !this.isMounted && !this.isSailing;

    const bowSlowMult = this.bowDrawing || this.bowZooming ? 0.56 : 1.0;
    const activeMoveSpeed =
      (this.isMounted ? stats.moveSpeed * HORSE_SPEED_MULT : stats.moveSpeed) *
      (this.isSwimming ? 1.38 : wadingInLake && !fishmanOceanWalker ? 0.78 : 1.0) *
      bowSlowMult;

    // Apply Class-Specific Escape Movement OR Normal/Mounted Locomotion
    if (this.dashTimer > 0 && !this.isMounted) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      if (this.dashStyle !== 'arcane_blink') {
        this.pvx = this.dashDirX * this.dashSpeed;
        this.pvz = this.dashDirZ * this.dashSpeed;
      }

      // Active trail particles & path-hit effects per escape ability
      if (this.dashStyle === 'cannon_launch') {
        if (Math.random() < 0.85) {
          this.spawnBurst(this.px, this.py + 0.6, this.pz, 2, 0xff7b29, 3.2);
          this.spawnBurst(this.px, this.py + 0.5, this.pz, 1, 0x94a3b8, 2.0);
        }
      } else if (this.dashStyle === 'tidal_surf') {
        this.surfWaveMesh.visible = true;
        if (Math.random() < 0.7) {
          this.spawnBurst(this.px, this.py + 0.2, this.pz, 2, 0x7dd3fc, 2.6);
        }
      } else if (this.dashStyle === 'flame_lunge' || this.dashStyle === 'shield_ram') {
        const hitColor = this.dashStyle === 'flame_lunge' ? 0xf97316 : 0x38bdf8;
        if (Math.random() < 0.65) {
          this.spawnBurst(this.px, this.py + 0.8, this.pz, 1, hitColor, 2.4);
        }
        for (const enemy of this.enemies) {
          if (enemy.state === 'ko' || enemy.state === 'respawning' || this.dashHitIds.has(enemy.id)) continue;
          const d = Math.hypot(enemy.x - this.px, enemy.z - this.pz);
          if (d <= 3.6) {
            this.dashHitIds.add(enemy.id);
            const dmg = calculateDamage(stats.attackPower, enemy.defense, 1.15, false);
            this.applyEnemyDamage(
              enemy,
              dmg,
              false,
              true,
              this.dashDirX,
              this.dashDirZ,
              this.dashStyle === 'shield_ram' ? 1.5 : 0
            );
          }
        }
      } else if (this.dashStyle === 'shadow_vanish') {
        if (Math.random() < 0.65) {
          this.spawnBurst(this.px, this.py + 0.8, this.pz, 1, 0x14b8a6, 2.2);
        }
      } else if (Math.random() < 0.5) {
        this.spawnBurst(this.px, this.py + 0.25, this.pz, 1, 0xbae6fd, 2.0);
      }
      if (this.dashTimer <= 0) {
        this.surfWaveMesh.visible = false;
      }
    } else {
      this.surfWaveMesh.visible = false;
      const targetVx = moveX * activeMoveSpeed;
      const targetVz = moveZ * activeMoveSpeed;
      const damp = 1 - Math.exp(-(this.isMounted ? 8.5 : this.isSwimming ? 7.5 : 12) * dt);
      this.pvx = THREE.MathUtils.lerp(this.pvx, targetVx, damp);
      this.pvz = THREE.MathUtils.lerp(this.pvz, targetVz, damp);
    }

    if (this.cameraMode === 'first_person') {
      this.pYaw = this.fpYaw;
    } else if (inputLen > 0.05) {
      const targetYaw = Math.atan2(moveX, moveZ);
      let diff = targetYaw - this.pYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.pYaw += diff * (1 - Math.exp(-(this.isMounted ? 10 : 14) * dt));
    }

    // Horizontal step + obstacle push-out
    let nextX = this.px + this.pvx * dt;
    let nextZ = this.pz + this.pvz * dt;

    if ((wadingInLake || this.isSwimming) && inputLen > 0.1 && Math.random() < (this.isSwimming ? 0.55 : 0.25)) {
      this.spawnBurst(this.px, WATER_LEVEL + 0.1, this.pz, this.isSwimming ? 2 : 1, 0x8cd7f7, 2.0);
    }

    const colPad = this.isMounted ? 0.9 : 0.55;
    for (const col of this.world.collidables) {
      const dx = nextX - col.x;
      const dz = nextZ - col.z;
      const minD = col.radius + colPad;
      const distSq = dx * dx + dz * dz;
      if (distSq < minD * minD && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const push = minD - dist;
        nextX += (dx / dist) * push;
        nextZ += (dz / dist) * push;
      }
    }

    const clamped = clampToPlayableWorld(nextX, nextZ);
    const nextSurf = walkableHeightAt(clamped.x, clamped.z);
    // Balıkadam can freely walk & swim across the entire open ocean! Other classes are blocked on foot unless airborne via Cannon Launch
    const canTraverseOceanNow =
      fishmanOceanWalker || (this.dashTimer > 0 && this.dashStyle === 'cannon_launch' && !this.grounded);
    const blockedByDeepOcean =
      !canTraverseOceanNow &&
      !nextSurf.onStructure &&
      nextSurf.y < WATER_LEVEL - 1.35 &&
      isOpenOcean(clamped.x, clamped.z);
    const finalX = blockedByDeepOcean ? this.px : clamped.x;
    const finalZ = blockedByDeepOcean ? this.pz : clamped.z;
    const stepDist = Math.hypot(finalX - this.px, finalZ - this.pz);
    this.px = finalX;
    this.pz = finalZ;

    // Vertical physics: Balıkadam glides & swims buoyantly at WATER_LEVEL!
    const rawWalkY = walkableHeightAt(this.px, this.pz).y;
    const floorY = this.isSwimming
      ? WATER_LEVEL - 0.14
      : Math.max(WATER_LEVEL - 0.42, rawWalkY);
    if (this.grounded) {
      this.coyoteTimer = 0.1;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.pvy = this.isMounted ? 11.4 : this.isSwimming ? 11.2 : 10.6;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.squashX = 0.85;
      this.squashY = 1.18;
      soundEngine.playJump();
      this.spawnBurst(this.px, floorY + 0.12, this.pz, 6, this.isSwimming ? 0x7dd3fc : 0xd4cbb8, 2.6);
    }

    this.pvy -= 26.5 * dt;
    this.py += this.pvy * dt;

    if (this.py <= floorY) {
      if (!this.grounded && this.pvy < -4.5) {
        this.squashX = 1.22;
        this.squashY = 0.78;
        this.spawnBurst(this.px, floorY + 0.1, this.pz, 6, this.isSwimming ? 0x7dd3fc : 0xc8bfa8, 2.4);

        // Trigger Landing Blast for Bombacı Cannon Launch or Buz Yetisi Frost Leap!
        if (this.pendingLandingBlast) {
          const blast = this.pendingLandingBlast;
          this.pendingLandingBlast = null;
          this.spawnBurst(this.px, floorY + 0.4, this.pz, 32, blast.color, 8.2);
          this.trauma = Math.min(1, this.trauma + 0.5);
          soundEngine.playBombExplosion();
          for (const enemy of this.enemies) {
            if (enemy.state === 'ko' || enemy.state === 'respawning') continue;
            const dx = enemy.x - this.px;
            const dz = enemy.z - this.pz;
            const d = Math.hypot(dx, dz);
            if (d <= blast.radius) {
              const dmg = calculateDamage(stats.attackPower, enemy.defense, blast.mult, false);
              const inv = d > 0.1 ? 1 / d : 1;
              this.applyEnemyDamage(enemy, dmg, false, true, dx * inv, dz * inv, blast.stunSec);
            }
          }
        }
      }
      this.py = floorY;
      this.pvy = 0;
      this.grounded = true;
    } else if (this.py > floorY + 0.15) {
      this.grounded = false;
    }

    const squashDamp = 1 - Math.exp(-14 * dt);
    this.squashX = THREE.MathUtils.lerp(this.squashX, 1, squashDamp);
    this.squashY = THREE.MathUtils.lerp(this.squashY, 1, squashDamp);

    const horizSpeed = Math.hypot(this.pvx, this.pvz);

    if (this.isMounted && this.horseSpawned) {
      // Mounted Horse Gallop Animation + Seated Rider Pose
      this.horseX = this.px;
      this.horseY = this.py;
      this.horseZ = this.pz;
      this.horseYaw = this.pYaw;

      if (this.grounded) {
        this.horseGallopPhase += stepDist * 1.55;
      }
      const g = this.grounded && horizSpeed > 0.45 ? Math.sin(this.horseGallopPhase) : 0;
      const gOpp = this.grounded && horizSpeed > 0.45 ? Math.sin(this.horseGallopPhase + 1.1) : 0;
      this.horseRig.legs[0].rotation.x = g * 0.72;
      this.horseRig.legs[1].rotation.x = -g * 0.72;
      this.horseRig.legs[2].rotation.x = -gOpp * 0.72;
      this.horseRig.legs[3].rotation.x = gOpp * 0.72;
      this.horseRig.neckHead.rotation.x = Math.sin(this.horseGallopPhase * 2) * (horizSpeed > 0.5 ? 0.08 : 0.02);
      this.horseRig.tail.rotation.x = -0.32 - Math.min(0.5, horizSpeed * 0.04) + Math.sin(this.horseGallopPhase) * 0.12;
      const gallopBob = horizSpeed > 0.5 && this.grounded ? Math.abs(Math.sin(this.horseGallopPhase)) * 0.16 : 0;
      this.horseRig.bodyGroup.position.y = gallopBob;

      this.horseRig.root.position.set(this.horseX, this.horseY, this.horseZ);
      this.horseRig.root.rotation.y = this.horseYaw;

      this.playerRig.root.position.set(this.px, this.py + this.horseRig.saddleY - 0.62 + gallopBob, this.pz);
      this.playerRig.root.rotation.y = this.pYaw;
      this.playerRig.bodyGroup.visible = true;
      this.playerRig.bodyGroup.position.y = 0;
      this.playerRig.bodyGroup.rotation.set(0.08, 0, 0);
      this.playerRig.bodyGroup.scale.set(1, 1, 1);
      this.playerRig.leftLeg.rotation.x = -0.58;
      this.playerRig.rightLeg.rotation.x = -0.58;
      this.playerRig.leftArm.rotation.set(-0.52, 0, 0);
      this.playerRig.rightArm.rotation.set(-0.52, 0, 0);
      this.playerRig.cloak.rotation.x = 0.25 + Math.min(0.8, horizSpeed * 0.05);
    } else {
      // On-Foot / Ocean Swimming / Expressive Class Escape & Weapon-Specific Attack Animations
      this.playerRig.bodyGroup.visible =
        !(this.dashTimer > 0 && this.dashStyle === 'shadow_vanish');

      if (this.dashTimer > 0) {
        const progress = 1 - this.dashTimer / Math.max(0.1, this.dashDuration);
        if (this.dashStyle === 'cannon_launch') {
          // Spinning human cannonball trajectory!
          this.playerRig.bodyGroup.position.y = 0.35;
          this.playerRig.bodyGroup.rotation.set(progress * Math.PI * 6, 0, 0);
          this.playerRig.leftLeg.rotation.x = -1.2;
          this.playerRig.rightLeg.rotation.x = -1.2;
          this.playerRig.leftArm.rotation.set(-1.4, 0, 0);
          this.playerRig.rightArm.rotation.set(-1.4, 0, 0);
        } else if (this.dashStyle === 'tidal_surf') {
          // Balanced surfing stance on top of the aquamarine wave!
          this.playerRig.bodyGroup.position.y = 0.65 + Math.sin(progress * Math.PI * 4) * 0.08;
          this.playerRig.bodyGroup.rotation.set(-0.1, 0.35, 0.14);
          this.playerRig.leftLeg.rotation.x = -0.35;
          this.playerRig.rightLeg.rotation.x = 0.35;
          this.playerRig.leftArm.rotation.set(-0.4, 0, -0.75);
          this.playerRig.rightArm.rotation.set(-0.4, 0, 0.75);
        } else if (this.dashStyle === 'frost_leap') {
          // Hulking Yeti airborne slam pose!
          this.playerRig.bodyGroup.position.y = 0.2;
          this.playerRig.bodyGroup.rotation.set(0.32, 0, 0);
          this.playerRig.leftArm.rotation.set(-2.3, 0, -0.35);
          this.playerRig.rightArm.rotation.set(-2.3, 0, 0.35);
          this.playerRig.leftLeg.rotation.x = -0.5;
          this.playerRig.rightLeg.rotation.x = 0.35;
        } else if (this.dashStyle === 'flame_lunge' || this.dashStyle === 'shield_ram') {
          // Aggressive forward charging spear/shield lunge!
          this.playerRig.bodyGroup.position.y = -0.1;
          this.playerRig.bodyGroup.rotation.set(0.38, 0, 0);
          this.playerRig.rightArm.rotation.set(-1.55, 0, 0);
          this.playerRig.leftArm.rotation.set(-0.7, 0.4, 0);
        } else {
          // Acrobatic forward crouch & somersault roll
          const crouchDip = Math.sin(progress * Math.PI) * 0.44;
          this.playerRig.bodyGroup.position.y = -crouchDip;
          this.playerRig.bodyGroup.rotation.set(progress * Math.PI * 2, 0, 0);
          this.playerRig.leftLeg.rotation.x = -0.95;
          this.playerRig.rightLeg.rotation.x = -0.95;
          this.playerRig.leftArm.rotation.set(-1.15, 0, 0);
          this.playerRig.rightArm.rotation.set(-1.15, 0, 0);
        }
        this.playerRig.cloak.rotation.x = 0.9;
      } else if (this.isSwimming && horizSpeed > 1.8 && this.grounded) {
        // BALIKADAM FLUID OCEAN SWIMMING ANIMATION!
        this.swimPhase += dt * 7.8;
        const s = Math.sin(this.swimPhase);
        this.playerRig.bodyGroup.position.y = -0.15 + Math.sin(this.swimPhase * 0.5) * 0.08;
        this.playerRig.bodyGroup.rotation.set(1.08, Math.sin(this.swimPhase) * 0.16, 0);
        this.playerRig.leftLeg.rotation.x = s * 0.72;
        this.playerRig.rightLeg.rotation.x = -s * 0.72;
        this.playerRig.leftArm.rotation.set(-2.2 + s * 0.9, 0, -0.35);
        this.playerRig.rightArm.rotation.set(-2.2 - s * 0.9, 0, 0.35);
        this.playerRig.cloak.rotation.x = 1.15;
      } else {
        this.playerRig.bodyGroup.position.y = THREE.MathUtils.lerp(
          this.playerRig.bodyGroup.position.y,
          this.isSwimming ? Math.sin(performance.now() * 0.004) * 0.08 : 0,
          1 - Math.exp(-14 * dt)
        );
        this.playerRig.bodyGroup.rotation.x = THREE.MathUtils.lerp(
          this.playerRig.bodyGroup.rotation.x,
          0,
          1 - Math.exp(-14 * dt)
        );
        this.playerRig.bodyGroup.rotation.z = THREE.MathUtils.lerp(
          this.playerRig.bodyGroup.rotation.z,
          0,
          1 - Math.exp(-14 * dt)
        );

        if (this.grounded) {
          this.walkDist += stepDist * 2.15;
        }
        const stride = this.grounded && horizSpeed > 0.4 ? Math.sin(this.walkDist) : 0;
        this.playerRig.leftLeg.rotation.x = stride * 0.65;
        this.playerRig.rightLeg.rotation.x = -stride * 0.65;
        this.playerRig.cloak.rotation.x =
          0.16 + Math.min(0.65, horizSpeed * 0.065) + Math.sin(this.walkDist * 0.8) * 0.06;

        // BOW DRAW STANCE vs WEAPON-SPECIFIC EXPRESSIVE ATTACK ANIMATIONS!
        if (this.bowDrawing) {
          this.playerRig.bodyGroup.rotation.y = THREE.MathUtils.lerp(
            this.playerRig.bodyGroup.rotation.y,
            -0.48,
            1 - Math.exp(-12 * dt)
          );
          this.playerRig.rightArm.rotation.set(-1.55, 0.2, 0);
          this.playerRig.leftArm.rotation.set(-1.45 - this.bowCharge * 0.35, -0.55 - this.bowCharge * 0.3, 0);
        } else if (this.attackAnimTimer > 0) {
          const dur = Math.max(0.12, this.attackAnimDuration);
          const p = Math.max(0, Math.min(1, 1 - this.attackAnimTimer / dur));
          const wk = this.attackWeaponKind;
          const side = this.attackComboSide;

          if (wk === 'sword') {
            // TRUE SWEEPING SWORD SLASH ARC (diagonal horizontal cleave + torso follow-through!)
            const sweep = -1.55 + p * 3.1;
            this.playerRig.bodyGroup.rotation.y = side * (-0.55 + p * 1.1);
            this.playerRig.rightArm.rotation.set(
              -1.42 + Math.sin(p * Math.PI) * 0.35,
              side * sweep,
              side * (0.65 - p * 1.2)
            );
            this.playerRig.leftArm.rotation.set(-0.4, -side * 0.3, 0);
          } else if (wk === 'spear' || wk === 'trident') {
            // FORWARD THRUSTING LUNGE JAB (shaft drives straight ahead!)
            const thrust = Math.sin(p * Math.PI);
            this.playerRig.bodyGroup.rotation.y = -0.35 + thrust * 0.62;
            this.playerRig.bodyGroup.rotation.x = thrust * 0.22;
            this.playerRig.rightArm.rotation.set(-1.55 - thrust * 0.25, 0.12, 0);
            this.playerRig.leftArm.rotation.set(-1.1 * thrust, 0.35, 0);
          } else if (wk === 'mace') {
            // HEAVY OVERHEAD VERTICAL CRYSTAL MACE SMASH!
            const slam = p < 0.38 ? -2.95 * (p / 0.38) : -2.95 + ((p - 0.38) / 0.62) * 3.65;
            this.playerRig.bodyGroup.rotation.x = p > 0.38 ? (p - 0.38) * 0.48 : -0.18;
            this.playerRig.bodyGroup.rotation.y = 0;
            this.playerRig.rightArm.rotation.set(slam, 0, 0);
            this.playerRig.leftArm.rotation.set(slam * 0.55, 0.3, 0);
          } else if (wk === 'daggers') {
            // RAPID ALTERNATING TWIN DAGGER X-SLASH!
            const slash = -1.6 + p * 3.0;
            this.playerRig.bodyGroup.rotation.y = side * (-0.4 + p * 0.8);
            if (side > 0) {
              this.playerRig.rightArm.rotation.set(-1.3, slash, 0.55);
              this.playerRig.leftArm.rotation.set(-0.5, 0, 0);
            } else {
              this.playerRig.leftArm.rotation.set(-1.3, -slash, -0.55);
              this.playerRig.rightArm.rotation.set(-0.5, 0, 0);
            }
          } else if (wk === 'yeti_claws') {
            // SAVAGE YETI CLAW SWIPE / DOUBLE FROST SLAM!
            if (this.attackIsHeavy) {
              const slam = -2.6 + p * 3.4;
              this.playerRig.bodyGroup.rotation.x = p * 0.35;
              this.playerRig.leftArm.rotation.set(slam, -0.35, -0.25);
              this.playerRig.rightArm.rotation.set(slam, 0.35, 0.25);
            } else {
              const swipe = -1.5 + p * 2.9;
              this.playerRig.bodyGroup.rotation.y = side * (-0.5 + p * 1.0);
              if (side > 0) {
                this.playerRig.rightArm.rotation.set(-1.35, swipe, 0.45);
                this.playerRig.leftArm.rotation.set(-0.35, 0, -0.2);
              } else {
                this.playerRig.leftArm.rotation.set(-1.35, -swipe, -0.45);
                this.playerRig.rightArm.rotation.set(-0.35, 0, 0.2);
              }
            }
          } else if (wk === 'staff') {
            const lift = Math.sin(p * Math.PI);
            this.playerRig.rightArm.rotation.set(-2.25 * lift, 0, 0.15 * lift);
            this.playerRig.leftArm.rotation.set(-0.8 * lift, 0, -0.3 * lift);
          } else if (wk === 'bomb') {
            const throwPitch = -2.7 + p * 3.2;
            this.playerRig.rightArm.rotation.set(throwPitch, 0, 0);
            this.playerRig.leftArm.rotation.set(-0.4, 0, 0);
          } else {
            this.playerRig.rightArm.rotation.set(-1.45, 0, 0);
            this.playerRig.leftArm.rotation.set(-1.1, -0.4, 0);
          }
        } else {
          this.playerRig.bodyGroup.rotation.y = THREE.MathUtils.lerp(
            this.playerRig.bodyGroup.rotation.y,
            0,
            1 - Math.exp(-14 * dt)
          );
          this.playerRig.leftArm.rotation.set(-stride * 0.48, 0, 0);
          this.playerRig.rightArm.rotation.set(stride * 0.45, 0, 0);
        }
      }

      this.playerRig.root.position.set(this.px, this.py, this.pz);
      this.playerRig.root.rotation.y = this.pYaw;
      this.playerRig.bodyGroup.scale.set(this.squashX, this.squashY, this.squashX);

      // Gentle idle animation on parked horse
      if (this.horseSpawned) {
        this.horseRig.bodyGroup.position.y = 0;
        this.horseRig.legs.forEach((leg) => (leg.rotation.x = 0));
        this.horseRig.neckHead.rotation.x = Math.sin(performance.now() * 0.002) * 0.05;
        this.horseRig.tail.rotation.x = -0.3 + Math.sin(performance.now() * 0.003) * 0.08;
      }
    }

    // Keep shadow frustum centered near player
    this.sunLight.position.set(this.px + 42, this.py + 66, this.pz + 36);
    this.sunLight.target.position.set(this.px, this.py, this.pz);
    this.sunLight.target.updateMatrixWorld();

    // Biome Discovery
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

  private updateProjectiles(dt: number) {
    let anyActive = false;
    const stats = getDerivedStats(this.profile, this.activeBuffs);
    const playerInSafe = isInsideSafeZone(this.px, this.pz);

    const triggerAoeBlast = (a: ArrowSlot) => {
      if (a.aoeRadius <= 0) return;
      const blastColor = a.projKind === 'arcane' ? 0xc084fc : 0xff7b29;
      this.spawnBurst(a.x, a.y + 0.4, a.z, a.projKind === 'cannonball' ? 24 : 18, blastColor, 7.5);
      if (a.projKind === 'bomb' || a.projKind === 'cannonball') {
        soundEngine.playBombExplosion();
      }
      if (!a.fromEnemy) {
        for (const enemy of this.enemies) {
          if (enemy.state === 'ko' || enemy.state === 'respawning' || a.hitIds.has(enemy.id)) continue;
          const d = Math.hypot(enemy.x - a.x, enemy.z - a.z);
          if (d <= a.aoeRadius) {
            a.hitIds.add(enemy.id);
            const dmg = calculateDamage(a.damage * 0.9, enemy.defense, 1.0, a.isCrit);
            const inv = d > 0.1 ? 1 / d : 1;
            this.applyEnemyDamage(enemy, dmg, a.isCrit, true, (enemy.x - a.x) * inv, (enemy.z - a.z) * inv, 0);
          }
        }
      }
    };

    for (let i = 0; i < ARROW_POOL_SIZE; i++) {
      const a = this.arrows[i];
      if (!a.active) continue;
      anyActive = true;
      a.life += dt;
      const grav = a.projKind === 'bomb' ? 14.5 : a.projKind === 'cannonball' ? 3.8 : 1.8;
      a.vy -= grav * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.z += a.vz * dt;

      const hitGroundY = Math.max(WATER_LEVEL - 0.2, walkableHeightAt(a.x, a.z).y);
      let terminate = a.life >= a.maxLife || a.y < hitGroundY;
      let exploded = false;

      if (!terminate) {
        if (a.fromEnemy) {
          const hitDist = this.isSailing ? 6.5 : 1.35;
          const distP = Math.hypot(this.px - a.x, this.pz - a.z);
          if (!playerInSafe && this.hp > 0 && distP <= hitDist && Math.abs(a.y - (this.py + 1.25)) <= (this.isSailing ? 4.2 : 1.8)) {
            terminate = true;
            if (this.isSailing && a.projKind === 'cannonball') {
              // Weakened Enemy Navy/Pirate Cannonball damages player's ship hull!
              const shipDmg = Math.max(12, Math.round(a.damage * ENEMY_CANNON_HULL_MULT));
              this.shipHp = Math.max(0, this.shipHp - shipDmg);
              this.trauma = Math.min(1, this.trauma + 0.24);
              soundEngine.playBombExplosion();
              this.spawnBurst(this.shipX, WATER_LEVEL + 2.4, this.shipZ, 12, 0xff7b29, 5.2);
              this.callbacks.onCombatToast(
                `${a.shooterName} top atışı gemine vurdu: -${shipDmg} Gemi Canı`,
                'danger'
              );
              if (this.shipHp <= 0) {
                this.isSailing = false;
                this.shipSpeed = 0;
                this.shipHp = Math.round(this.shipMaxHp * 0.5);
                this.teleportTo(HARBOR_POS.x, HARBOR_POS.z - 6, Math.PI);
                this.callbacks.onCombatToast(
                  'Gemin battı! Ana Ada Limanına çekildin — Denizciden ücretsiz onarabilirsin.',
                  'danger'
                );
              }
              this.emitHud();
            } else if (this.dashTimer > 0.06) {
              this.callbacks.onCombatToast('Atıştan yuvarlanarak sıyrıldın!', 'info');
            } else {
              const dmg = calculateDamage(a.damage, stats.defense, 1.0, false);
              this.hp = Math.max(0, this.hp - dmg);
              this.hitFlashTimer = 0.14;
              this.trauma = Math.min(1, this.trauma + 0.28);
              soundEngine.playHurt();
              this.spawnBurst(this.px, this.py + 1.2, this.pz, 10, a.colorHex, 4.2);
              this.callbacks.onCombatToast(`${a.shooterName}: -${dmg} hasar!`, 'danger');
              if (this.hp <= 0) {
                this.callbacks.onPlayerDefeated(a.shooterName);
              }
              this.emitHud();
            }
          }
        } else {
          // 1. Check Player Projectiles hitting Trade Convoy Ships
          for (const cs of this.convoyShips) {
            if (!cs.alive) continue;
            const dBoat = Math.hypot(cs.x - a.x, cs.z - a.z);
            if (dBoat <= 7.8) {
              this.damageConvoyShip(cs, Math.round(a.damage));
              triggerAoeBlast(a);
              exploded = true;
              terminate = true;
              break;
            }
          }

          // 2. Check Player Projectiles hitting Pirate Ship Hull
          if (!terminate && this.pirateShip) {
            const dPirate = Math.hypot(this.pirateShip.x - a.x, this.pirateShip.z - a.z);
            if (dPirate <= 10.5 && a.projKind === 'cannonball') {
              this.pirateShip.hp = Math.max(0, this.pirateShip.hp - Math.round(a.damage));
              updateShipHpSprite(
                this.pirateShip.rig,
                'KORSAN SAVAŞ KALYONU (29 Korsan)',
                '1000 SV. KAPTAN · 2 YRD · 20 KILIÇ',
                this.pirateShip.hp,
                this.pirateShip.maxHp,
                '#ef4444'
              );
              triggerAoeBlast(a);
              exploded = true;
              terminate = true;
              if (this.pirateShip.hp <= 0) {
                // Heavy hull breach damages all remaining deck pirates!
                for (const e of this.enemies) {
                  if (e.isPirateAmbush && e.state !== 'ko' && e.state !== 'respawning') {
                    this.applyEnemyDamage(e, Math.round(e.maxHp * 0.6), true, true, 0, 1, 0);
                  }
                }
                this.callbacks.onCombatToast('Korsan Kalyonu gövdesi yarıldı! Mürettebat ağır hasar aldı!', 'reward');
              }
            }
          }

          // 3. Check Player Projectiles hitting Enemies
          if (!terminate) {
            for (const enemy of this.enemies) {
              if (enemy.state === 'ko' || enemy.state === 'respawning' || a.hitIds.has(enemy.id)) {
                continue;
              }
              const hitRadius =
                enemy.archetype === 'yeti_boss'
                  ? 3.6
                  : enemy.archetype === 'orc_boss' || enemy.archetype === 'pirate_captain' || enemy.archetype === 'horror_abomination'
                  ? 2.4
                  : enemy.archetype === 'polar_yeti' || enemy.archetype === 'viking_leader' || enemy.archetype === 'navy_captain'
                  ? 2.0
                  : 1.35;
              const dist = Math.hypot(enemy.x - a.x, enemy.z - a.z);
              if (dist <= hitRadius && Math.abs(a.y - (enemy.y + 1.4)) <= 2.4) {
                a.hitIds.add(enemy.id);
                const dmg = calculateDamage(a.damage, enemy.defense, 1.0, a.isCrit);
                const spd = Math.hypot(a.vx, a.vz) || 1;
                this.applyEnemyDamage(enemy, dmg, a.isCrit, a.isHeavy, a.vx / spd, a.vz / spd, 0);
                if (stats.lifestealPct > 0) {
                  this.hp = Math.min(this.maxHp, this.hp + Math.ceil(dmg * stats.lifestealPct));
                }
                if (a.aoeRadius > 0) {
                  triggerAoeBlast(a);
                  exploded = true;
                  terminate = true;
                  break;
                }
                soundEngine.playHit(a.isHeavy, a.isCrit);
                if (!a.isHeavy) {
                  terminate = true;
                  break;
                }
              }
            }
          }
        }
      }

      if (terminate) {
        if (!exploded && a.aoeRadius > 0) {
          triggerAoeBlast(a);
        }
        a.active = false;
        _dummy.position.set(0, -999, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.arrowMesh.setMatrixAt(i, _dummy.matrix);
      } else {
        _dummy.position.set(a.x, a.y, a.z);
        _dummy.rotation.set(0, a.yaw, 0);
        if (a.projKind === 'cannonball') {
          _dummy.scale.set(4.2, 4.2, 1.0);
        } else if (a.projKind === 'bomb') {
          _dummy.scale.set(3.2, 3.2, 0.85);
        } else if (a.projKind === 'arcane') {
          _dummy.scale.set(2.2, 2.2, 1.8);
        } else {
          _dummy.scale.set(a.isHeavy ? 1.35 : 1.05, a.isHeavy ? 1.35 : 1.05, 1.25);
        }
        _dummy.updateMatrix();
        this.arrowMesh.setMatrixAt(i, _dummy.matrix);
      }
    }
    if (anyActive) {
      this.arrowMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateEnemies(dt: number) {
    const playerInSafe = isInsideSafeZone(this.px, this.pz);
    const stats = getDerivedStats(this.profile);

    let activeAttackers = 0;
    for (const e of this.enemies) {
      if (e.state === 'windup' || e.state === 'strike') activeAttackers++;
    }

    for (let idx = this.enemies.length - 1; idx >= 0; idx--) {
      const e = this.enemies[idx];

      if (e.state === 'respawning') {
        e.stateTimer -= dt;
        if (e.stateTimer <= 0) {
          e.x = e.homeX;
          e.z = e.homeZ;
          e.y = walkableHeightAt(e.x, e.z).y;
          e.hp = e.maxHp;
          e.stunTimer = 0;
          e.state = 'patrol';
          e.rig.root.visible = true;
          e.rig.bodyGroup.rotation.x = 0;
          if (e.rig.stunRing) e.rig.stunRing.visible = false;
          const badge = this.getEnemyBadgeMeta(e.archetype);
          updateNameTagSprite(e.rig, e.name, e.level, e.hp, e.maxHp, badge.text, badge.color);
        }
        continue;
      }

      if (e.state === 'ko') {
        e.stateTimer -= dt;
        e.rig.bodyGroup.rotation.x = THREE.MathUtils.lerp(
          e.rig.bodyGroup.rotation.x,
          -Math.PI * 0.48,
          1 - Math.exp(-10 * dt)
        );
        if (e.stateTimer <= 0) {
          if (e.noRespawn) {
            this.scene.remove(e.rig.root);
            this.enemies.splice(idx, 1);
            continue;
          }
          e.state = 'respawning';
          e.stateTimer = e.archetype === 'viking_leader' ? 30 : 18;
          e.rig.root.visible = false;
        }
        continue;
      }

      if (e.state === 'stunned') {
        e.stunTimer -= dt;
        e.vx *= Math.exp(-10 * dt);
        e.vz *= Math.exp(-10 * dt);
        if (e.rig.telegraphRing) e.rig.telegraphRing.visible = false;
        if (e.rig.stunRing) {
          e.rig.stunRing.visible = true;
          e.rig.stunRing.rotation.y += dt * 6.5;
        }
        e.rig.bodyGroup.rotation.z = Math.sin(e.stunTimer * 18) * 0.08;
        if (e.stunTimer <= 0) {
          e.stunTimer = 0;
          e.state = 'approach';
          e.rig.bodyGroup.rotation.z = 0;
          if (e.rig.stunRing) e.rig.stunRing.visible = false;
        }
        e.rig.root.position.set(e.x, e.y, e.z);
        continue;
      }
      if (e.rig.stunRing && e.rig.stunRing.visible) {
        e.rig.stunRing.visible = false;
      }

      const dxToP = this.px - e.x;
      const dzToP = this.pz - e.z;
      const distToP = Math.hypot(dxToP, dzToP);
      const distHome = Math.hypot(e.x - e.homeX, e.z - e.homeZ);

      const isRangedEnemy =
        e.archetype === 'elf_archer' ||
        e.archetype === 'bandit_archer' ||
        e.archetype === 'pirate_archer' ||
        e.archetype === 'pirate_cannoneer' ||
        e.archetype === 'navy_cannoneer' ||
        e.archetype === 'arcane_mage';
      const isCannoneer = e.archetype === 'pirate_cannoneer' || e.archetype === 'navy_cannoneer';
      const isShipDeckCrew = e.convoyBoatIdx !== undefined || Boolean(e.isPirateAmbush);
      const isHeavyBoss =
        e.archetype === 'warden' ||
        e.archetype === 'viking_leader' ||
        e.archetype === 'orc_boss' ||
        e.archetype === 'pirate_captain' ||
        e.archetype === 'pirate_first_mate' ||
        e.archetype === 'navy_captain' ||
        e.archetype === 'horror_abomination';
      const isChargeType = e.archetype === 'lancer' || e.archetype === 'arena_gladiator';
      const isVikingUnit = e.archetype === 'viking' || e.archetype === 'viking_leader';

      const aggroRange = isCannoneer
        ? 75
        : e.isBanditAmbush || e.isDesertArena || e.isPirateAmbush
        ? 50
        : isRangedEnemy
        ? 34
        : isVikingUnit
        ? 15
        : isChargeType
        ? 22
        : isHeavyBoss
        ? 24
        : 18;
      const leashRange = isShipDeckCrew ? 16 : e.isBanditAmbush || e.isDesertArena ? 65 : isVikingUnit ? 14 : 42;
      const canAggro = !playerInSafe && this.hp > 0 && distToP < aggroRange && distHome < leashRange;

      if (!canAggro && e.state !== 'patrol' && e.state !== 'windup' && e.state !== 'strike') {
        e.state = 'patrol';
      }

      const baseSpeed = isRangedEnemy
        ? 5.6
        : e.archetype === 'bandit_melee'
        ? 6.5
        : e.archetype === 'skirmisher'
        ? 6.1
        : isChargeType
        ? 5.8
        : e.archetype === 'orc_boss'
        ? 4.6
        : e.archetype === 'viking'
        ? 4.8
        : 4.2;

      if (e.state === 'patrol') {
        if (canAggro) {
          e.state = 'approach';
        } else {
          const hx = e.homeX - e.x;
          const hz = e.homeZ - e.z;
          const hd = Math.hypot(hx, hz);
          if (hd > 2.0) {
            e.vx = THREE.MathUtils.lerp(e.vx, (hx / hd) * 3.0, 1 - Math.exp(-6 * dt));
            e.vz = THREE.MathUtils.lerp(e.vz, (hz / hd) * 3.0, 1 - Math.exp(-6 * dt));
            e.yaw = Math.atan2(hx, hz);
          } else {
            e.vx *= Math.exp(-8 * dt);
            e.vz *= Math.exp(-8 * dt);
          }
        }
      } else if (e.state === 'approach') {
        const inv = distToP > 0.01 ? 1 / distToP : 1;
        e.yaw = Math.atan2(dxToP, dzToP);

        if (isRangedEnemy) {
          // Kara Orman Elf & Bandit Archer: keep 10–25m range, kite back if too close, fire arrows!
          if (distToP < 8.5) {
            // Kite away slightly while aiming
            e.vx = THREE.MathUtils.lerp(e.vx, -dxToP * inv * baseSpeed * 0.85, 1 - Math.exp(-6 * dt));
            e.vz = THREE.MathUtils.lerp(e.vz, -dzToP * inv * baseSpeed * 0.85, 1 - Math.exp(-6 * dt));
          } else if (distToP <= 25 && activeAttackers < 3) {
            e.state = 'windup';
            e.stateTimer = 0.62;
            e.chargeDirX = dxToP * inv;
            e.chargeDirZ = dzToP * inv;
            activeAttackers++;
          } else {
            e.vx = THREE.MathUtils.lerp(e.vx, dxToP * inv * baseSpeed, 1 - Math.exp(-6 * dt));
            e.vz = THREE.MathUtils.lerp(e.vz, dzToP * inv * baseSpeed, 1 - Math.exp(-6 * dt));
          }
        } else if (e.archetype === 'skirmisher' || e.archetype === 'bandit_melee') {
          if (distToP < 5.2) {
            e.state = 'orbit';
            e.stateTimer = 0.85 + Math.random() * 0.6;
          } else {
            e.vx = THREE.MathUtils.lerp(e.vx, dxToP * inv * baseSpeed, 1 - Math.exp(-7 * dt));
            e.vz = THREE.MathUtils.lerp(e.vz, dzToP * inv * baseSpeed, 1 - Math.exp(-7 * dt));
          }
        } else if (isChargeType) {
          if (distToP < 12.5 && distToP > 3.2 && activeAttackers < 3) {
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
          const engageDist = e.archetype === 'orc_boss' ? 5.6 : e.archetype === 'viking_leader' ? 4.8 : 4.0;
          if (distToP < engageDist && activeAttackers < 3) {
            e.state = 'windup';
            e.stateTimer = isHeavyBoss ? 0.68 : 0.52;
            activeAttackers++;
            soundEngine.playTelegraphWarning();
          } else {
            e.vx = THREE.MathUtils.lerp(e.vx, dxToP * inv * baseSpeed, 1 - Math.exp(-5 * dt));
            e.vz = THREE.MathUtils.lerp(e.vz, dzToP * inv * baseSpeed, 1 - Math.exp(-5 * dt));
          }
        }
      } else if (e.state === 'orbit') {
        const inv = distToP > 0.01 ? 1 / distToP : 1;
        e.yaw = Math.atan2(dxToP, dzToP);
        const tangentX = -dzToP * inv * e.orbitDir;
        const tangentZ = dxToP * inv * e.orbitDir;
        e.vx = THREE.MathUtils.lerp(e.vx, tangentX * baseSpeed * 0.9, 1 - Math.exp(-7 * dt));
        e.vz = THREE.MathUtils.lerp(e.vz, tangentZ * baseSpeed * 0.9, 1 - Math.exp(-7 * dt));
        e.stateTimer -= dt;
        if (e.stateTimer <= 0 && activeAttackers < 3) {
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
        e.yaw = Math.atan2(dxToP, dzToP);
        e.rig.rightArm.rotation.x = isRangedEnemy ? -1.45 : -2.4;

        if (e.rig.telegraphRing) {
          e.rig.telegraphRing.visible = true;
          const pulse = 0.55 + (1 - Math.max(0, e.stateTimer / 0.68)) * 0.45;
          e.rig.telegraphRing.scale.setScalar(pulse);
          (e.rig.telegraphRing.material as THREE.MeshBasicMaterial).opacity = 0.65;
        }

        if (e.stateTimer <= 0) {
          e.state = 'strike';
          e.stateTimer = isRangedEnemy ? 0.25 : isChargeType ? 0.34 : 0.24;

          if (isRangedEnemy) {
            const inv = distToP > 0.01 ? 1 / distToP : 1;
            const isCanon = e.archetype === 'pirate_cannoneer' || e.archetype === 'navy_cannoneer';
            const isMage = e.archetype === 'arcane_mage';
            if (isCanon) {
              soundEngine.playCannonFire();
            } else if (isMage) {
              soundEngine.playArcaneCast(false);
            } else {
              soundEngine.playBowShot(false);
            }
            this.spawnArrow({
              fromEnemy: true,
              shooterName: e.name,
              x: e.x + dxToP * inv * 0.9,
              y: e.y + 1.45,
              z: e.z + dzToP * inv * 0.9,
              dirX: dxToP * inv,
              dirZ: dzToP * inv,
              speed: isCanon ? 42 : isMage ? 34 : e.archetype === 'bandit_archer' ? 32 : 28,
              isHeavy: isCanon,
              damage: e.attack,
              isCrit: false,
              colorHex: isCanon ? 0xff6b2b : isMage ? 0xc084fc : e.archetype === 'bandit_archer' ? 0xff5238 : 0x52f2a8,
              projKind: isCanon ? 'cannonball' : isMage ? 'arcane' : 'arrow',
              aoeRadius: isCanon ? 4.2 : 0,
            });
          } else {
            if (isChargeType) {
              e.vx = e.chargeDirX * 15.5;
              e.vz = e.chargeDirZ * 15.5;
            } else if (e.archetype === 'skirmisher' || e.archetype === 'bandit_melee') {
              e.vx = e.chargeDirX * 11.2;
              e.vz = e.chargeDirZ * 11.2;
            }
            soundEngine.playSlash(isHeavyBoss || e.archetype === 'viking');

            const hitRadius =
              e.archetype === 'orc_boss'
                ? 6.0
                : e.archetype === 'viking_leader'
                ? 5.2
                : isHeavyBoss
                ? 4.5
                : e.archetype === 'viking' || e.archetype === 'bandit_melee'
                ? 3.4
                : 2.8;
            if (!playerInSafe && distToP <= hitRadius && this.dashTimer <= 0.06 && this.hp > 0) {
              const dmg = calculateDamage(e.attack, stats.defense, isHeavyBoss ? 1.35 : 1.0, false);
              this.hp = Math.max(0, this.hp - dmg);
              this.hitFlashTimer = 0.14;
              this.trauma = Math.min(1, this.trauma + (isHeavyBoss ? 0.55 : 0.3));
              this.hitstopTimer = isHeavyBoss ? 0.055 : 0.03;
              const inv = distToP > 0.01 ? 1 / distToP : 1;
              this.pvx += dxToP * inv * (isHeavyBoss ? 8.5 : 4.5);
              this.pvz += dzToP * inv * (isHeavyBoss ? 8.5 : 4.5);
              soundEngine.playHurt();
              if (this.cameraMode !== 'first_person') {
                this.spawnBurst(this.px, this.py + 1.1, this.pz, 14, 0xff5252, 4.8);
              }
              this.callbacks.onCombatToast(`${e.name} -${dmg} hasar!`, 'danger');
              if (this.hp <= 0) {
                this.callbacks.onPlayerDefeated(e.name);
              }
              this.emitHud();
            } else if (isHeavyBoss) {
              this.spawnBurst(e.x, e.y + 0.3, e.z, 16, 0xd4a45a, 5.2);
            }
          }
        }
      } else if (e.state === 'strike') {
        e.stateTimer -= dt;
        e.rig.rightArm.rotation.x = isRangedEnemy ? -1.1 : 0.9;
        if (e.rig.telegraphRing) e.rig.telegraphRing.visible = false;
        if (e.stateTimer <= 0) {
          e.state = 'recover';
          e.stateTimer = isRangedEnemy ? 1.35 : isHeavyBoss ? 1.05 : 0.72;
        }
      } else if (e.state === 'recover') {
        e.vx *= Math.exp(-8 * dt);
        e.vz *= Math.exp(-8 * dt);
        e.stateTimer -= dt;
        e.rig.rightArm.rotation.x = THREE.MathUtils.lerp(
          e.rig.rightArm.rotation.x,
          0,
          1 - Math.exp(-10 * dt)
        );
        if (e.stateTimer <= 0) {
          e.state = 'approach';
        }
      }

      let nx = e.x + e.vx * dt;
      let nz = e.z + e.vz * dt;
      // Keep enemies at clean melee separation so they never clip inside the player / FP camera
      const sepX = nx - this.px;
      const sepZ = nz - this.pz;
      const sepDist = Math.hypot(sepX, sepZ);
      const minEnemyPlayerSep = isHeavyBoss ? 2.45 : 1.85;
      if (sepDist < minEnemyPlayerSep && sepDist > 0.001) {
        const push = minEnemyPlayerSep / sepDist;
        nx = this.px + sepX * push;
        nz = this.pz + sepZ * push;
      }
      if (isShipDeckCrew) {
        // Keep ship crews anchored on their ship deck
        e.vx = 0;
        e.vz = 0;
      } else {
        const eSurf = walkableHeightAt(nx, nz);
        if (!isInsideSafeZone(nx, nz) && (eSurf.onStructure || eSurf.y > WATER_LEVEL - 0.1)) {
          e.x = nx;
          e.z = nz;
        }
        e.y = walkableHeightAt(e.x, e.z).y;
      }

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
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer = Math.max(0, this.hitFlashTimer - dt);
      const on = this.hitFlashTimer > 0;
      for (const m of this.playerRig.hitFlashMaterials) {
        m.emissive.copy(on ? _flashColor : _zeroColor);
        m.emissiveIntensity = on ? 0.65 : 0;
      }
    }

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

  // GAMEPLAY CAMERA: supports Fixed Third-Person, First-Person [C], AND Bow Mouse2 Sniper Zoom!
  private updateGameplayCamera(dt: number) {
    // Smooth Camera FOV Zoom when holding Mouse2 (RMB) or full-drawing Bow
    const baseFov = this.cameraMode === 'first_person' ? 72 : 56;
    const zoomTargetFov = this.bowZooming
      ? this.cameraMode === 'first_person'
        ? 38
        : 33
      : this.bowDrawing
      ? baseFov - this.bowCharge * 8
      : baseFov;
    if (Math.abs(this.currentFov - zoomTargetFov) > 0.05) {
      this.currentFov = THREE.MathUtils.lerp(this.currentFov, zoomTargetFov, 1 - Math.exp(-10 * dt));
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }

    if (this.cameraMode === 'first_person') {
      const speedH = Math.hypot(this.pvx, this.pvz);
      const bob =
        this.grounded && speedH > 0.4
          ? Math.sin(this.walkDist * (this.isMounted ? 1.5 : 2.2)) * (this.bowZooming ? 0.015 : 0.055)
          : 0;
      const rolling = this.dashTimer > 0 && !this.isMounted;
      const rollProgress = rolling ? 1 - this.dashTimer / Math.max(0.1, this.dashDuration) : 0;
      const eyeH = this.isSailing ? 2.55 : this.isMounted ? 2.98 : rolling ? 0.92 : this.playerRig.isYetiModel ? 2.25 : 1.66;
      const forwardOffset = this.isSailing ? 0.6 : this.isMounted ? 0.34 : 0.06;

      this.camera.position.set(
        this.px + Math.sin(this.fpYaw) * forwardOffset,
        this.py + eyeH + bob,
        this.pz + Math.cos(this.fpYaw) * forwardOffset
      );

      const pitchWithRoll = this.fpPitch - (rolling ? Math.sin(rollProgress * Math.PI) * 0.42 : 0);
      const cosP = Math.cos(pitchWithRoll);
      _camTarget.set(
        this.camera.position.x + Math.sin(this.fpYaw) * cosP * 12,
        this.camera.position.y + Math.sin(pitchWithRoll) * 12,
        this.camera.position.z + Math.cos(this.fpYaw) * cosP * 12
      );

      if (this.trauma > 0) {
        const shake = this.trauma * this.trauma;
        _v1.set(
          (Math.random() * 2 - 1) * shake * 0.35,
          (Math.random() * 2 - 1) * shake * 0.3,
          (Math.random() * 2 - 1) * shake * 0.35
        );
        _camTarget.add(_v1);
        this.trauma = Math.max(0, this.trauma - dt * 2.1);
      }

      this.camera.lookAt(_camTarget);

      // Animate First-Person Weapon Viewmodel (expressive per weapon + bow draw & zoom centering!)
      this.fpWeaponAnchor.visible = this.gameState === 'playing' && !this.isMounted && !this.isSailing;
      const swayX = Math.cos(this.walkDist * 1.1) * (speedH > 0.4 ? (this.bowZooming ? 0.005 : 0.022) : 0.004);
      const swayY = Math.abs(Math.sin(this.walkDist * 1.1)) * (speedH > 0.4 ? (this.bowZooming ? -0.006 : -0.025) : 0);

      if (this.bowDrawing || this.bowZooming) {
        const aimShiftX = this.bowZooming ? 0.14 : 0.06;
        const pullBackZ = this.bowCharge * 0.12;
        this.fpWeaponAnchor.position.set(swayX + aimShiftX, swayY + 0.03, pullBackZ);
        this.fpWeaponAnchor.rotation.set(0, 0, this.bowZooming ? 0.04 : 0);
      } else if (this.attackAnimTimer > 0 && !this.isMounted && !this.isSailing) {
        const atkDur = Math.max(0.12, this.attackAnimDuration);
        const p = Math.max(0, Math.min(1, 1 - this.attackAnimTimer / atkDur));
        const swing = Math.sin(p * Math.PI);
        const curKind = this.attackWeaponKind;
        if (curKind === 'bow') {
          this.fpWeaponAnchor.position.set(swayX, swayY + swing * 0.025, swing * 0.11);
          this.fpWeaponAnchor.rotation.set(swing * 0.09, 0, 0);
        } else if (curKind === 'spear' || curKind === 'trident') {
          // Crisp forward thrust lunge!
          this.fpWeaponAnchor.position.set(swayX, swayY + swing * 0.04, -swing * 0.48);
          this.fpWeaponAnchor.rotation.set(-swing * 0.14, 0, 0);
        } else if (curKind === 'sword') {
          // Wide diagonal sweeping slash across viewport!
          const side = this.attackComboSide;
          this.fpWeaponAnchor.position.set(
            swayX + side * (0.28 - p * 0.62),
            swayY + 0.08 - swing * 0.16,
            -swing * 0.28
          );
          this.fpWeaponAnchor.rotation.set(-swing * 0.65, side * (-0.4 + p * 1.35), side * (0.5 - p * 1.1));
        } else {
          this.fpWeaponAnchor.position.set(swayX - swing * 0.16, swayY - swing * 0.06, -swing * 0.24);
          this.fpWeaponAnchor.rotation.set(
            -swing * (this.attackIsHeavy ? 1.05 : 0.78),
            swing * 0.45,
            swing * 0.32
          );
        }
      } else {
        this.fpWeaponAnchor.position.set(swayX, swayY, 0);
        this.fpWeaponAnchor.rotation.set(0, 0, 0);
      }
      return;
    }

    // Elevated panoramic naval follow camera when sailing so sails never block the ocean horizon
    if (this.isSailing) {
      const backDist = 30;
      const height = 18.5;
      _camDesired.set(
        this.shipX - Math.sin(this.shipYaw) * backDist,
        WATER_LEVEL + height,
        this.shipZ - Math.cos(this.shipYaw) * backDist
      );
      const damp = 1 - Math.exp(-7 * dt);
      this.camera.position.lerp(_camDesired, damp);
      _camTarget.set(
        this.shipX + Math.sin(this.shipYaw) * 18,
        WATER_LEVEL + 3.2,
        this.shipZ + Math.cos(this.shipYaw) * 18
      );
      if (this.trauma > 0) {
        const shake = this.trauma * this.trauma;
        _v1.set(
          (Math.random() * 2 - 1) * shake * 0.45,
          (Math.random() * 2 - 1) * shake * 0.35,
          (Math.random() * 2 - 1) * shake * 0.45
        );
        _camTarget.add(_v1);
        this.trauma = Math.max(0, this.trauma - dt * 2.1);
      }
      this.camera.lookAt(_camTarget);
      return;
    }

    // Over-the-shoulder Bow Zoom Camera when holding Mouse2 (RMB) in Third-Person!
    if (this.bowZooming) {
      const aimX = Math.sin(this.pYaw);
      const aimZ = Math.cos(this.pYaw);
      const rightX = -aimZ;
      const rightZ = aimX;
      _camDesired.set(
        this.px - aimX * 6.2 + rightX * 1.45,
        this.py + 3.1,
        this.pz - aimZ * 6.2 + rightZ * 1.45
      );
      this.camera.position.lerp(_camDesired, 1 - Math.exp(-12 * dt));
      _camTarget.set(
        this.px + aimX * 24,
        this.py + 1.85,
        this.pz + aimZ * 24
      );
      this.camera.lookAt(_camTarget);
      return;
    }

    const camDist = this.isMounted
      ? FIXED_CAM_DIST_MOUNTED
      : this.playerRig.isYetiModel
      ? FIXED_CAM_DIST_FOOT + 2.4
      : FIXED_CAM_DIST_FOOT;
    const horizDist = Math.cos(FIXED_CAM_PITCH) * camDist;
    const vertDist = Math.sin(FIXED_CAM_PITCH) * camDist + 2.4;

    _camDesired.set(
      this.px - Math.sin(FIXED_CAM_YAW) * horizDist,
      this.py + vertDist,
      this.pz - Math.cos(FIXED_CAM_YAW) * horizDist
    );

    const groundUnderCam = Math.max(WATER_LEVEL + 2.0, groundHeightAt(_camDesired.x, _camDesired.z) + 1.5);
    if (_camDesired.y < groundUnderCam) {
      _camDesired.y = groundUnderCam;
    }

    const damp = 1 - Math.exp(-10 * dt);
    this.camera.position.lerp(_camDesired, damp);

    _camTarget.set(this.px, this.py + (this.isMounted ? 2.6 : 1.9), this.pz);

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
    const actors: MinimapActor[] = [{ id: 'self', x: this.px, z: this.pz, kind: 'self' }];
    if (this.profile.hasHorse && this.horseSpawned && !this.isMounted) {
      actors.push({ id: 'horse', x: this.horseX, z: this.horseZ, kind: 'horse' });
    }
    if (this.playerShipRig && !this.isSailing) {
      actors.push({ id: 'player-ship', x: this.shipX, z: this.shipZ, kind: 'ship' });
    }
    for (const cs of this.convoyShips) {
      if (cs.alive) {
        actors.push({ id: `convoy-${cs.laneIdx}`, x: cs.x, z: cs.z, kind: 'convoy' });
      }
    }
    if (this.pirateShip) {
      actors.push({ id: 'pirate-ship', x: this.pirateShip.x, z: this.pirateShip.z, kind: 'pirate_ship' });
    }
    for (const r of this.remotes.values()) {
      const isAlly =
        this.partyCode.length > 0 && r.state.partyCode.toUpperCase() === this.partyCode;
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
    const nearbyInteractable = this.getNearbyInteractable();
    const arenaRemaining = this.enemies.filter(
      (e) => e.isDesertArena && e.state !== 'ko' && e.state !== 'respawning'
    ).length;
    const ambushRemaining = this.enemies.filter(
      (e) => e.isBanditAmbush && e.state !== 'ko' && e.state !== 'respawning'
    ).length;
    const pirateRemaining = this.enemies.filter(
      (e) => e.isPirateAmbush && e.state !== 'ko' && e.state !== 'respawning'
    ).length;

    const hudBuffs: HudBuffEntry[] = [];
    for (const b of this.activeBuffs) {
      const f = FOOD_BY_ID[b.foodId];
      if (f) {
        hudBuffs.push({
          foodId: f.id,
          nameTr: f.nameTr,
          remainingSec: b.remainingSec,
          accentColor: f.colorHex,
        });
      }
    }

    const activeShipSpec = this.profile.activeShipId
      ? SHIP_BY_ID[this.profile.activeShipId as ShipId]
      : null;
    const convoyCfg = getConvoyTierConfig(this.convoyTier);

    this.callbacks.onHudSnapshot({
      hp: Math.round(this.hp),
      maxHp: Math.round(this.maxHp),
      stamina: Math.round(this.stamina),
      maxStamina: Math.round(this.maxStamina),
      biome: getBiomeAt(this.px, this.pz),
      inSafeZone: isInsideSafeZone(this.px, this.pz),
      nearCampfire: distCamp <= 9.5,
      nearbyInteractable,
      playerX: Math.round(this.px),
      playerZ: Math.round(this.pz),
      playerYaw: this.pYaw,
      lightCooldown: this.lightCd,
      heavyCooldown: this.heavyCd,
      dashCooldown: this.dashCd,
      weather: this.weather,
      cameraMode: this.cameraMode,
      hasHorse: this.profile.hasHorse,
      isMounted: this.isMounted,
      horseDistance:
        this.profile.hasHorse && this.horseSpawned
          ? Math.round(Math.hypot(this.px - this.horseX, this.pz - this.horseZ))
          : null,
      hasShip: this.profile.ownedShips.length > 0,
      isSailing: this.isSailing,
      shipHp: Math.round(this.shipHp),
      shipMaxHp: Math.round(this.shipMaxHp),
      activeShipName: activeShipSpec ? activeShipSpec.nameTr : null,
      activeBuffs: hudBuffs,
      arenaWave: this.arenaWave,
      arenaWaveTotal: DESERT_ARENA_TOTAL_WAVES,
      arenaRemaining,
      ambushActive: this.ambushActive && ambushRemaining > 0,
      ambushRemaining,
      pirateAmbushActive: this.pirateAmbushActive && pirateRemaining > 0,
      pirateRemaining,
      convoyTier: this.convoyTier,
      convoyGoldNext: convoyCfg.goldReward,
      bowCharge: this.bowCharge,
      bowZooming: this.bowZooming,
      isSwimming: this.isSwimming,
      escapeNameTr: (CLASS_ESCAPE_CONFIG[this.profile.playerClass] || CLASS_ESCAPE_CONFIG.guardian).nameTr,
      escapeCooldownMax: (CLASS_ESCAPE_CONFIG[this.profile.playerClass] || CLASS_ESCAPE_CONFIG.guardian).cooldownSec,
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
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('visibilitychange', this.onBlur);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    dom.removeEventListener('contextmenu', this.onContextMenu);

    if (document.pointerLockElement === dom) {
      try {
        document.exitPointerLock?.();
      } catch {
        // ignore
      }
    }

    this.clearFirstPersonWeapon();
    soundEngine.setWeatherAmbience('clear', false);
    this.world.dispose();
    this.shadowTexture.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.arrowMesh.geometry.dispose();
    (this.arrowMesh.material as THREE.Material).dispose();
    this.rainMesh.geometry.dispose();
    this.rainMaterial.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}

export { BIOME_META };
