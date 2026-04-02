import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "./config";
import type { MangaImageItem, ResolvedMangaTarget } from "@/types/manga";

export async function saveMangaImageItems(
  target: ResolvedMangaTarget,
  items: MangaImageItem[],
): Promise<void> {
  const batch = writeBatch(db);
  const dayDocRef = doc(db, target.firestoreDayDocPath);

  batch.set(
    dayDocRef,
    {
      courseId: target.courseId,
      jlptLevel: target.jlptLevel ?? null,
      dayId: target.dayId,
      itemCount: items.length,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  items.forEach((item) => {
    batch.set(doc(db, `${target.firestoreItemsCollectionPath}/${item.id}`), item);
  });

  await batch.commit();
}

function sortMangaItems(items: MangaImageItem[]) {
  return [...items].sort((left, right) => {
    if (left.uploadIndex !== right.uploadIndex) {
      return left.uploadIndex - right.uploadIndex;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

async function listMangaItemsByCollectionPath(
  itemsCollectionPath: string,
): Promise<MangaImageItem[]> {
  const snapshot = await getDocs(collection(db, itemsCollectionPath));
  return sortMangaItems(
    snapshot.docs.map((entry) => ({
      id: entry.id,
      ...entry.data(),
    })) as MangaImageItem[],
  );
}

export async function listMangaItemsByCourseDay({
  courseId,
  dayId,
}: {
  courseId: Exclude<ResolvedMangaTarget["courseId"], "JLPT">;
  dayId: string;
}): Promise<MangaImageItem[]> {
  return listMangaItemsByCollectionPath(`manga/${courseId}/days/${dayId}/items`);
}

export async function listJlptMangaItemsByLevelDay({
  jlptLevel,
  dayId,
}: {
  jlptLevel: NonNullable<ResolvedMangaTarget["jlptLevel"]>;
  dayId: string;
}): Promise<MangaImageItem[]> {
  return listMangaItemsByCollectionPath(
    `manga/JLPT/levels/${jlptLevel}/days/${dayId}/items`,
  );
}
