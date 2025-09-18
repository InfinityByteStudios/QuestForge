import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { getDatabase, ref, set, get } from 'firebase/database';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyCo5hr7ULHLL_0UAAst74g8ePZxkB7OHFQ",
  authDomain: "shared-sign-in.firebaseapp.com",
  databaseURL: "https://shared-sign-in-default-rtdb.firebaseio.com",
  projectId: "shared-sign-in",
  storageBucket: "shared-sign-in.firebasestorage.app",
  messagingSenderId: "332039027753",
  appId: "1:332039027753:web:aa7c6877d543bb90363038",
  measurementId: "G-KK5XVVLMVN"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export const questForgeRef = (path: string) => ref(db, `quest-forge/${path}`);

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signInWithGithub() {
  return signInWithPopup(auth, githubProvider);
}

export async function signInAnon() {
  return signInAnonymously(auth);
}

export async function signOutUser() {
  return signOut(auth);
}

export function onAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

// Cloud save helpers (Realtime Database)
export async function saveUserCharacter(uid: string, characterId: string, snapshot: any) {
  // Store full snapshot under user path and remember last used id
  await set(questForgeRef(`users/${uid}/characters/${characterId}`), snapshot);
  await set(questForgeRef(`users/${uid}/lastCharacterId`), characterId);
}

export async function getUserLastCharacterId(uid: string): Promise<string | null> {
  const snap = await get(questForgeRef(`users/${uid}/lastCharacterId`));
  return snap.exists() ? (snap.val() as string) : null;
}

export async function getUserCharacterSnapshot(uid: string, characterId: string): Promise<any | null> {
  const snap = await get(questForgeRef(`users/${uid}/characters/${characterId}`));
  return snap.exists() ? snap.val() : null;
}
