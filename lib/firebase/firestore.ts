import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { Day } from '@/types/course';
import type { Word } from '@/types/word';

/**
 * Firestore structure:
 *   {coursePath}                   ← course document (has totalDays, lastUploadedDayId, etc.)
 *     /{dayId}                     ← subcollection for each day, e.g. Day1, Day2, ...
 *       /{wordDocId}               ← word documents directly inside each day subcollection
 */

export async function getCourseDays(coursePath: string): Promise<Day[]> {
  console.log('[Firestore] getCourseDays path:', coursePath);

  // The course document has a 'totalDays' field that tells us how many days exist.
  const courseRef = doc(db, coursePath);
  const courseSnap = await getDoc(courseRef);

  if (!courseSnap.exists()) {
    console.warn('[Firestore] Course document not found at:', coursePath);
    return [];
  }

  const data = courseSnap.data();
  const totalDays = (data.totalDays as number) || 0;
  console.log('[Firestore] totalDays:', totalDays);

  // Days are named Day1, Day2, ..., DayN
  return Array.from({ length: totalDays }, (_, i) => ({
    id: `Day${i + 1}`,
    name: `Day ${i + 1}`,
  }));
}

export async function getDayWords(coursePath: string, dayId: string): Promise<Word[]> {
  console.log('[Firestore] getDayWords path:', coursePath, 'dayId:', dayId);

  // Words are documents directly inside the DayN subcollection
  const courseRef = doc(db, coursePath);
  const dayCollection = collection(courseRef, dayId);
  const snapshot = await getDocs(dayCollection);

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
  const courseRef = doc(db, coursePath);
  const dayCollection = collection(courseRef, dayId);
  const batch = writeBatch(db);

  for (const word of words) {
    const wordDoc = doc(dayCollection);
    batch.set(wordDoc, word);
  }

  await batch.commit();

  // Update totalDays and lastUploadedDayId on the course document
  const dayNumber = parseInt(dayId.replace('Day', ''), 10);
  const courseSnap = await getDoc(courseRef);
  const currentTotal = (courseSnap.data()?.totalDays as number) || 0;

  await setDoc(
    courseRef,
    {
      lastUploadedDayId: dayId,
      lastUpdated: new Date().toISOString(),
      totalDays: Math.max(currentTotal, dayNumber),
    },
    { merge: true }
  );
}
