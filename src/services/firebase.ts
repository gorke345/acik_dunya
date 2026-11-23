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
  createDefaultProfile,
  sanitizeProfileForFirestore,
  VALID_BIOMES,
} from '../game/combatRules';
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
  preferredColor?: string
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
    const loaded: PlayerProfileData = {
      uid: user.uid,
      displayName: typeof raw.displayName === 'string' ? raw.displayName : user.displayName || 'Savaşçı',
      tunicColor: typeof raw.tunicColor === 'string' ? raw.tunicColor : '#c43b3b',
      level: typeof raw.level === 'number' ? raw.level : 1,
      xp: typeof raw.xp === 'number' ? raw.xp : 0,
      gold: typeof raw.gold === 'number' ? raw.gold : 50,
      swordTier: typeof raw.swordTier === 'number' ? raw.swordTier : 1,
      armorTier: typeof raw.armorTier === 'number' ? raw.armorTier : 1,
      agilityTier: typeof raw.agilityTier === 'number' ? raw.agilityTier : 1,
      pvpKills: typeof raw.pvpKills === 'number' ? raw.pvpKills : 0,
      deaths: typeof raw.deaths === 'number' ? raw.deaths : 0,
      discoveredBiomes: biomes.length > 0 ? biomes : ['meadow'],
      lastX: typeof raw.lastX === 'number' ? raw.lastX : 0,
      lastZ: typeof raw.lastZ === 'number' ? raw.lastZ : 18,
    };
    return { profile: loaded, isNew: false };
  }

  const initialName = preferredName || user.displayName || 'Yayla Savaşçısı';
  const defaultProf = createDefaultProfile(user.uid, initialName, preferredColor || '#c43b3b');
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
      level: clean.level,
      xp: clean.xp,
      gold: clean.gold,
      swordTier: clean.swordTier,
      armorTier: clean.armorTier,
      agilityTier: clean.agilityTier,
      pvpKills: clean.pvpKills,
      deaths: clean.deaths,
      discoveredBiomes: clean.discoveredBiomes,
      lastX: clean.lastX,
      lastZ: clean.lastZ,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
