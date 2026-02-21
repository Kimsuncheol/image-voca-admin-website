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
  const courseRef = doc(db, coursePath);
  const daysRef = collection(courseRef, 'days');
  const q = query(daysRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    name: d.data().name || d.id,
    wordCount: d.data().wordCount,
  }));
}

export async function getDayWords(coursePath: string, dayId: string): Promise<Word[]> {
  const dayRef = doc(db, coursePath, 'days', dayId);
  const wordsRef = collection(dayRef, 'words');
  const snapshot = await getDocs(wordsRef);
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
