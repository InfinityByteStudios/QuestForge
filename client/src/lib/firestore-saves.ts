import { doc, getDoc, setDoc } from 'firebase/firestore';
import { questForgeDb } from './firestore-questforge';

export async function saveUserCharacterFirestore(uid: string, characterId: string, snapshot: any) {
  // Save character under users/{uid}/characters/{characterId}
  const charRef = doc(questForgeDb, `users/${uid}/characters/${characterId}`);
  await setDoc(charRef, snapshot, { merge: true });
  // Save lastCharacterId on the parent user doc
  const userRef = doc(questForgeDb, `users/${uid}`);
  await setDoc(userRef, { lastCharacterId: characterId }, { merge: true });
}

export async function getUserLastCharacterIdFirestore(uid: string): Promise<string | null> {
  const userRef = doc(questForgeDb, `users/${uid}`);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return data?.lastCharacterId ?? null;
}

export async function getUserCharacterSnapshotFirestore(uid: string, characterId: string): Promise<any | null> {
  const charRef = doc(questForgeDb, `users/${uid}/characters/${characterId}`);
  const snap = await getDoc(charRef);
  return snap.exists() ? snap.data() : null;
}
