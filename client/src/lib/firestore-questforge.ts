import { getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase';

// Important: don't initialize a second Firebase App. Use the already-initialized default app
// (created in client/src/lib/firebase.ts) so that Auth state/credentials are attached to requests.
// The default app is already initialized there via initializeApp(firebaseConfig).

const apps = getApps();
const defaultApp: FirebaseApp | null = apps.length ? apps[0] : null;
if (!defaultApp) {
  // As a safety fallback, do nothing; the real initializer should run from client/src/lib/firebase.ts.
  // Avoid initializeApp here to prevent duplicate apps in the browser runtime.
}

// Use the default initialized Firebase app and pass the databaseId as a string. This makes
// the SDK construct the correct database URL: projects/<projectId>/databases/quest-forge
// and also ensures auth tokens from the default app are used for requests.
export const questForgeDb = defaultApp ? getFirestore(defaultApp, 'quest-forge') : getFirestore();

// Example usage (named DB means no extra 'quest-forge' prefix in paths):
// import { doc, getDoc, setDoc } from 'firebase/firestore';
// const userRef = doc(questForgeDb, `users/${uid}`);
// const charRef = doc(questForgeDb, `users/${uid}/characters/${charId}`);
// await setDoc(charRef, payload, { merge: true });
