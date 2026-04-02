import type {
  MangaNoAiUploadPayload,
  MangaNoAiUploadCourseId,
  ResolvedMangaTarget,
} from "@/types/manga";

export interface ResolveMangaTargetInput {
  courseId: MangaNoAiUploadCourseId;
  jlptLevel?: MangaNoAiUploadPayload["jlptLevel"];
  day: number | string;
}

export function normalizeMangaDayId(day: number | string): string {
  const digits =
    typeof day === "number"
      ? day
      : Number.parseInt(String(day).replace(/\D/g, ""), 10);

  if (!Number.isInteger(digits) || digits < 1) {
    throw new Error("Day must be a positive integer.");
  }

  return `Day${digits}`;
}

export function resolveMangaTarget({
  courseId,
  jlptLevel,
  day,
}: ResolveMangaTargetInput): ResolvedMangaTarget {
  const dayId = normalizeMangaDayId(day);

  if (courseId === "JLPT") {
    if (!jlptLevel) {
      throw new Error("JLPT level is required.");
    }

    return {
      courseId,
      jlptLevel,
      dayId,
      firestoreRootDocPath: `manga/JLPT/levels/${jlptLevel}`,
      firestoreDayDocPath: `manga/JLPT/levels/${jlptLevel}/days/${dayId}`,
      firestoreItemsCollectionPath:
        `manga/JLPT/levels/${jlptLevel}/days/${dayId}/items`,
      storagePrefix: `manga/JLPT/${jlptLevel}/${dayId}`,
    };
  }

  return {
    courseId,
    dayId,
    firestoreRootDocPath: `manga/${courseId}`,
    firestoreDayDocPath: `manga/${courseId}/days/${dayId}`,
    firestoreItemsCollectionPath: `manga/${courseId}/days/${dayId}/items`,
    storagePrefix: `manga/${courseId}/${dayId}`,
  };
}
