import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './config';
import type { Day } from '@/types/course';
import type { Word } from '@/types/word';

export async function getCourseDays(coursePath: string): Promise<Day[]> {
  console.log('[Firestore] getCourseDays called with path:', JSON.stringify(coursePath));
  const courseRef = doc(db, coursePath);
  const daysRef = collection(courseRef, 'days');
  const q = query(daysRef, orderBy('name'));
  const snapshot = await getDocs(q);
  console.log('[Firestore] getCourseDays snapshot size:', snapshot.size);
  const result = snapshot.docs.map((d) => ({
    id: d.id,
    name: d.data().name || d.id,
    wordCount: d.data().wordCount,
  }));
  console.log('[Firestore] getCourseDays result:', result);
  return result;
}

export async function getDayWords(coursePath: string, dayId: string): Promise<Word[]> {
  console.log('[Firestore] getDayWords called with path:', JSON.stringify(coursePath), 'dayId:', dayId);
  const dayRef = doc(db, coursePath, 'days', dayId);
  const wordsRef = collection(dayRef, 'words');
  const snapshot = await getDocs(wordsRef);
  console.log('[Firestore] getDayWords snapshot size:', snapshot.size);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as Word[];
}

export async function addWordsToDay(
  coursePath: string,
  dayId: string,
  words: Omit<Word, 'id'>[]
): Promise<void> {
  const dayRef = doc(db, coursePath, 'days', dayId);
  const wordsRef = collection(dayRef, 'words');
  const batch = writeBatch(db);

  for (const word of words) {
    const wordDoc = doc(wordsRef);
    batch.set(wordDoc, word);
  }

  await batch.commit();

  // Update word count on the day document
  await setDoc(dayRef, { name: dayId, wordCount: words.length }, { merge: true });
}

export async function createDay(coursePath: string, dayName: string): Promise<string> {
  const courseRef = doc(db, coursePath);
  const daysRef = collection(courseRef, 'days');
  const dayDoc = doc(daysRef);
  await setDoc(dayDoc, { name: dayName, wordCount: 0 });
  return dayDoc.id;
}
