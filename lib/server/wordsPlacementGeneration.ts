import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";

import { getQuizCourse } from "@/lib/server/quizGeneration";
import {
  generateWordsPlacementChunks,
  type WordPlacementChunk,
} from "@/lib/wordsPlacementChunkGenerator";

type SupportedWordsPlacementCourse =
  | "CSAT"
  | "CSAT_IDIOMS"
  | "TOEIC"
  | "TOEFL_ITELS"
  | "EXTREMELY_ADVANCED"
  | "COLLOCATION";

type RawWordDoc = Record<string, unknown> & { id: string };

export interface WordsPlacementItem {
  wordId: string;
  word: string;
  example: string;
  wordsToPlace: WordPlacementChunk[][];
}

export interface WordsPlacementSkippedItem {
  wordId: string;
  word: string;
  reason: string;
}

export interface WordsPlacementGenerationResult {
  gameType: "words_placement";
  courseId: string;
  dayId: string;
  version: 1;
  items: WordsPlacementItem[];
  skipped: WordsPlacementSkippedItem[];
}

export interface SavedWordsPlacementGameDoc {
  gameType: "words_placement";
  courseId: string;
  dayId: string;
  version: 1;
  items: Array<{
    wordId: string;
    word: string;
    example: string;
    wordsToPlace: Array<{ chunks: WordPlacementChunk[] }>;
  }>;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

const SUPPORTED_COURSES = new Set<string>([
  "CSAT",
  "CSAT_IDIOMS",
  "TOEIC",
  "TOEFL_ITELS",
  "EXTREMELY_ADVANCED",
  "COLLOCATION",
]);

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function normalizeWordsPlacementDay(day: unknown): number | null {
  const dayNumber = Number(day);
  return Number.isInteger(dayNumber) && dayNumber > 0 ? dayNumber : null;
}

export function assertSupportedWordsPlacementCourse(
  course: unknown,
): asserts course is SupportedWordsPlacementCourse {
  if (!hasText(course) || !SUPPORTED_COURSES.has(course)) {
    throw new Error("Words placement supports English day-based courses only.");
  }
}

function resolveTargetText(word: RawWordDoc): string {
  if (hasText(word.word)) return word.word.trim();
  if (hasText(word.collocation)) return word.collocation.trim();
  if (hasText(word.idiom)) return word.idiom.trim();
  return "";
}

export function buildWordsPlacementResult({
  courseId,
  day,
  words,
}: {
  courseId: string;
  day: number;
  words: RawWordDoc[];
}): WordsPlacementGenerationResult {
  const items: WordsPlacementItem[] = [];
  const skipped: WordsPlacementSkippedItem[] = [];

  for (const wordDoc of words) {
    const targetText = resolveTargetText(wordDoc);
    const example = hasText(wordDoc.example) ? wordDoc.example.trim() : "";

    if (!targetText) {
      skipped.push({ wordId: wordDoc.id, word: "", reason: "Missing target text." });
      continue;
    }

    if (!example) {
      skipped.push({
        wordId: wordDoc.id,
        word: targetText,
        reason: "Missing example.",
      });
      continue;
    }

    const wordsToPlace = generateWordsPlacementChunks({
      word: targetText,
      example,
      wordId: wordDoc.id,
    });

    if (wordsToPlace.length === 0) {
      skipped.push({
        wordId: wordDoc.id,
        word: targetText,
        reason: "No matching word form found in example.",
      });
      continue;
    }

    items.push({
      wordId: wordDoc.id,
      word: targetText,
      example,
      wordsToPlace,
    });
  }

  return {
    gameType: "words_placement",
    courseId,
    dayId: `Day${day}`,
    version: 1,
    items,
    skipped,
  };
}

export function toFirestoreWordsPlacementDoc(
  result: WordsPlacementGenerationResult,
): SavedWordsPlacementGameDoc {
  return {
    gameType: result.gameType,
    courseId: result.courseId,
    dayId: result.dayId,
    version: result.version,
    items: result.items.map((item) => ({
      ...item,
      wordsToPlace: item.wordsToPlace.map((chunks) => ({ chunks })),
    })),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function generateWordsPlacementGame({
  db,
  course,
  day,
}: {
  db: Firestore;
  course: unknown;
  day: unknown;
}): Promise<{
  result: WordsPlacementGenerationResult;
  savePath: string;
}> {
  assertSupportedWordsPlacementCourse(course);
  const dayNumber = normalizeWordsPlacementDay(day);
  if (dayNumber === null) throw new Error("Invalid day.");

  const courseConfig = getQuizCourse({ course });
  if (!courseConfig?.path) throw new Error("Unknown course.");

  const dayId = `Day${dayNumber}`;
  const snapshot = await db.collection(`${courseConfig.path}/${dayId}`).get();
  const words = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));

  return {
    result: buildWordsPlacementResult({
      courseId: courseConfig.id,
      day: dayNumber,
      words,
    }),
    savePath: `${courseConfig.path}/${dayId}/${dayId}-game/words_placement/data`,
  };
}
