import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import type { Ad } from '@/types/ad';

const ADS_COLLECTION = 'advertisement';

export async function addAd(videoUrl: string): Promise<void> {
  await addDoc(collection(db, ADS_COLLECTION), {
    videoUrl,
    publishedAt: serverTimestamp(),
  });
}

export async function deleteAd(id: string): Promise<void> {
  await deleteDoc(doc(db, ADS_COLLECTION, id));
}

export async function deleteExpiredAds(): Promise<void> {
  const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const snapshot = await getDocs(collection(db, ADS_COLLECTION));

  const deletePromises = snapshot.docs
    .filter((d) => {
      const publishedAt = d.data().publishedAt as Timestamp | undefined;
      return publishedAt && publishedAt.toMillis() < sevenDaysAgo.toMillis();
    })
    .map((d) => deleteDoc(d.ref));

  await Promise.all(deletePromises);
}

export function subscribeToAds(callback: (ads: Ad[]) => void): Unsubscribe {
  const q = query(collection(db, ADS_COLLECTION), orderBy('publishedAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const ads: Ad[] = [];

    snapshot.docs.forEach((d) => {
      const data = d.data();
      const publishedAt = data.publishedAt as Timestamp | null;
      if (!publishedAt) return;

      if (publishedAt.toMillis() + sevenDaysMs < now) {
        deleteDoc(d.ref).catch(() => {});
        return;
      }

      ads.push({
        id: d.id,
        videoUrl: data.videoUrl,
        publishedAt,
      });
    });

    callback(ads);
  });
}
