import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  PlayerProfileData,
  PlayerClassId,
  createDefaultProfile,
  sanitizeProfileForFirestore,
  VALID_BIOMES,
  normalizeClassId,
  getClassColor,
  DESERT_ARENA_REQUIRED_KILLS,
} from '../game/combatRules';
import {
  FoodId,
  ShipId,
  VALID_ARMOR_IDS,
  VALID_FOOD_IDS,
  VALID_SHIP_IDS,
  VALID_WEAPON_IDS,
} from '../game/inventoryData';
import type { BiomeId } from '../game/worldMath';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export function subscribeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function loadOrCreatePlayerProfile(
  user: User,
  preferredName?: string,
  preferredColor?: string,
  preferredClass: PlayerClassId = 'guardian'
): Promise<{ profile: PlayerProfileData; isNew: boolean }> {
  const path = `users/${user.uid}`;
  const docRef = doc(db, 'users', user.uid);

  let snap;
  try {
    snap = await getDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (snap.exists()) {
    const raw = snap.data();
    const rawBiomes = Array.isArray(raw.discoveredBiomes) ? raw.discoveredBiomes : ['meadow'];
    const biomes = rawBiomes.filter((b): b is BiomeId => VALID_BIOMES.includes(b as BiomeId));
    const loadedClass: PlayerClassId = normalizeClassId(raw.playerClass);

    const rawOwned = (Array.isArray(raw.ownedWeapons) ? raw.ownedWeapons : []).map((w) =>
      w === 'atlantis_greataxe' ? 'poseidon_trident' : w
    );
    if (loadedClass === 'yeti' && !rawOwned.includes('yeti_claws')) {
      rawOwned.push('yeti_claws');
    }
    const ownedWeapons = Array.from(
      new Set([
        'starter_sword',
        ...rawOwned.filter((w): w is string => typeof w === 'string' && VALID_WEAPON_IDS.includes(w)),
      ])
    );
    const ownedArmors = Array.from(
      new Set([
        'cloth_tunic',
        ...(Array.isArray(raw.ownedArmors) ? raw.ownedArmors : []).filter(
          (a): a is string => typeof a === 'string' && VALID_ARMOR_IDS.includes(a)
        ),
      ])
    );
    const ownedShips = Array.from(
      new Set(
        (Array.isArray(raw.ownedShips) ? raw.ownedShips : []).filter(
          (s): s is ShipId => typeof s === 'string' && VALID_SHIP_IDS.includes(s as ShipId)
        )
      )
    );
    const foodInventory: Partial<Record<FoodId, number>> = {};
    if (raw.foodInventory && typeof raw.foodInventory === 'object') {
      for (const fid of VALID_FOOD_IDS) {
        const q = (raw.foodInventory as Record<string, unknown>)[fid];
        if (typeof q === 'number' && q > 0) {
          foodInventory[fid] = Math.min(99, Math.floor(q));
        }
      }
    }

    const rawEqWeapon =
      raw.equippedWeaponId === 'atlantis_greataxe' ? 'poseidon_trident' : raw.equippedWeaponId;

    const loaded: PlayerProfileData = {
      uid: user.uid,
      displayName: typeof raw.displayName === 'string' ? raw.displayName : user.displayName || 'Savaşçı',
      tunicColor:
        typeof raw.tunicColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw.tunicColor)
          ? raw.tunicColor
          : getClassColor(loadedClass),
      playerClass: loadedClass,
      classWeaponUnlocked: Boolean(raw.classWeaponUnlocked),
      yetiRuneUnlocked: Boolean(raw.yetiRuneUnlocked),
      desertArenaProgress:
        typeof raw.desertArenaProgress === 'number'
          ? Math.max(0, Math.min(DESERT_ARENA_REQUIRED_KILLS, Math.round(raw.desertArenaProgress)))
          : 0,
      hasHorse: Boolean(raw.hasHorse),
      level: typeof raw.level === 'number' ? raw.level : 1,
      xp: typeof raw.xp === 'number' ? raw.xp : 0,
      gold: typeof raw.gold === 'number' ? raw.gold : 150,
      swordTier: typeof raw.swordTier === 'number' ? raw.swordTier : 1,
      armorTier: typeof raw.armorTier === 'number' ? raw.armorTier : 1,
      agilityTier: typeof raw.agilityTier === 'number' ? raw.agilityTier : 1,
      pvpKills: typeof raw.pvpKills === 'number' ? raw.pvpKills : 0,
      deaths: typeof raw.deaths === 'number' ? raw.deaths : 0,
      discoveredBiomes: biomes.length > 0 ? biomes : ['meadow'],
      lastX: typeof raw.lastX === 'number' ? raw.lastX : 0,
      lastZ: typeof raw.lastZ === 'number' ? raw.lastZ : 18.5,
      ownedWeapons,
      equippedWeaponId:
        typeof rawEqWeapon === 'string' && ownedWeapons.includes(rawEqWeapon)
          ? rawEqWeapon
          : loadedClass === 'yeti'
          ? 'yeti_claws'
          : 'starter_sword',
      ownedArmors,
      equippedArmorId:
        typeof raw.equippedArmorId === 'string' && ownedArmors.includes(raw.equippedArmorId)
          ? raw.equippedArmorId
          : 'cloth_tunic',
      foodInventory,
      ownedShips,
      activeShipId:
        typeof raw.activeShipId === 'string' && ownedShips.includes(raw.activeShipId as ShipId)
          ? (raw.activeShipId as ShipId)
          : ownedShips[0] || '',
      convoyTier: typeof raw.convoyTier === 'number' ? Math.max(1, Math.min(10, Math.round(raw.convoyTier))) : 1,
    };
    return { profile: loaded, isNew: false };
  }

  const initialName = preferredName || user.displayName || 'Yayla Savaşçısı';
  const defaultProf = createDefaultProfile(
    user.uid,
    initialName,
    preferredColor || getClassColor(preferredClass),
    preferredClass
  );
  const sanitized = sanitizeProfileForFirestore(defaultProf, user.uid);

  try {
    await setDoc(docRef, {
      ...sanitized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return { profile: sanitized, isNew: true };
}

export async function savePlayerProfile(
  uid: string,
  profile: PlayerProfileData
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const path = `users/${uid}`;
  const docRef = doc(db, 'users', uid);
  const clean = sanitizeProfileForFirestore(profile, uid);

  try {
    await updateDoc(docRef, {
      displayName: clean.displayName,
      tunicColor: clean.tunicColor,
      playerClass: clean.playerClass,
      classWeaponUnlocked: clean.classWeaponUnlocked,
      yetiRuneUnlocked: clean.yetiRuneUnlocked,
      desertArenaProgress: clean.desertArenaProgress,
      hasHorse: clean.hasHorse,
      level: clean.level,
      xp: clean.xp,
      gold: clean.gold,
      swordTier: clean.swordTier,
      armorTier: clean.armorTier,
      agilityTier: clean.agilityTier,
      pvpKills: clean.pvpKills,
      deaths: clean.deaths,
      discoveredBiomes: clean.discoveredBiomes,
      ownedWeapons: clean.ownedWeapons,
      equippedWeaponId: clean.equippedWeaponId,
      ownedArmors: clean.ownedArmors,
      equippedArmorId: clean.equippedArmorId,
      foodInventory: clean.foodInventory,
      ownedShips: clean.ownedShips,
      activeShipId: clean.activeShipId,
      convoyTier: clean.convoyTier,
      lastX: clean.lastX,
      lastZ: clean.lastZ,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
