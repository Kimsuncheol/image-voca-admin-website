import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import type { AppUser } from '@/types/user';

const USERS_COLLECTION = 'users';

export async function getAllUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  return snapshot.docs.map((d) => ({
    uid: d.id,
    ...d.data(),
  })) as AppUser[];
}

export async function getUserById(uid: string): Promise<AppUser | null> {
  const snapshot = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snapshot.exists()) return null;
  return { uid: snapshot.id, ...snapshot.data() } as AppUser;
}

export async function createOrUpdateUser(
  user: Partial<AppUser> & { uid: string }
): Promise<void> {
  await setDoc(doc(db, USERS_COLLECTION, user.uid), user, { merge: true });
}

export async function deleteUserFromFirestore(uid: string): Promise<void> {
  await deleteDoc(doc(db, USERS_COLLECTION, uid));
}
