import "server-only";

import { FieldValue, type Firestore } from "firebase-admin/firestore";

import { getQuizCourse } from "@/lib/server/quizGeneration";
import {
  generateJapaneseWordsPlacementChunks,
  generateKanjiWordsPlacementChunks,
} from "@/lib/japaneseWordsPlacementChunkGenerator";
import {
  generateWordsPlacementChunks,
  type WordsPlacementGroup,
} from "@/lib/wordsPlacementChunkGenerator";

type SupportedWordsPlacementCourse =
  | "CSAT"
  | "CSAT_IDIOMS"
  | "TOEIC"
  | "TOEFL_ITELS"
  | "EXTREMELY_ADVANCED"
  | "COLLOCATION"
  | "JLPT"
  | "KANJI";

type RawWordDoc = Record<string, unknown> & { id: string };

export interface WordsPlacementItem {
  wordId: string;
  word: string;
  example: string;
  wordsToPlace: WordsPlacementGroup[];
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
    wordsToPlace: WordsPlacementGroup[];
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
  "JLPT",
  "KANJI",
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
    throw new Error("Words placement supports English, JLPT, and Kanji day-based courses only.");
  }
}

function resolveTargetText(word: RawWordDoc): string {
  if (hasText(word.word)) return word.word.trim();
  if (hasText(word.collocation)) return word.collocation.trim();
  if (hasText(word.idiom)) return word.idiom.trim();
  return "";
}

const NUMBERED_TRANSLATION_PATTERN = /^\s*\d+[.)]\s*/;

function normalizeTextField(value: unknown): string {
  return hasText(value) ? value.trim() : "";
}

function splitTranslationLines(value: unknown): Array<{ text: string; numbered: boolean }> {
  if (!hasText(value)) return [];
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => {
      const numbered = NUMBERED_TRANSLATION_PATTERN.test(line);
      return {
        text: line.replace(NUMBERED_TRANSLATION_PATTERN, "").trim(),
        numbered,
      };
    })
    .filter((line) => line.text.length > 0);
}

function resolveIndexedTranslation(value: unknown, index: number, totalGroups: number): string {
  const lines = splitTranslationLines(value);
  const numberedLines = lines.filter((line) => line.numbered);
  if (numberedLines.length >= totalGroups) return numberedLines[index]?.text ?? "";
  if (totalGroups > 1 && lines.length >= totalGroups) return lines[index]?.text ?? "";
  return normalizeTextField(value);
}

function withEnglishTranslations(
  groups: WordsPlacementGroup[],
  wordDoc: RawWordDoc,
): WordsPlacementGroup[] {
  return groups.map((group, index) => ({
    ...group,
    translation: resolveIndexedTranslation(wordDoc.translation, index, groups.length),
  }));
}

function withJlptTranslations(
  groups: WordsPlacementGroup[],
  wordDoc: RawWordDoc,
): WordsPlacementGroup[] {
  return groups.map((group, index) => ({
    ...group,
    translationEnglish: resolveIndexedTranslation(wordDoc.translationEnglish, index, groups.length),
    translationKorean: resolveIndexedTranslation(wordDoc.translationKorean, index, groups.length),
  }));
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => normalizeTextField(item));
  return [];
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
  return buildWordsPlacementResultFromItems({
    courseId,
    day,
    items: words.map((wordDoc) => ({
      wordDoc,
      wordsToPlace: null,
    })),
  });
}

function buildWordsPlacementResultFromItems({
  courseId,
  day,
  items: generatedItems,
}: {
  courseId: string;
  day: number;
  items: Array<{
    wordDoc: RawWordDoc;
    wordsToPlace: WordsPlacementGroup[] | null;
  }>;
}): WordsPlacementGenerationResult {
  const items: WordsPlacementItem[] = [];
  const skipped: WordsPlacementSkippedItem[] = [];

  for (const { wordDoc, wordsToPlace: precomputedWordsToPlace } of generatedItems) {
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

    const wordsToPlace = precomputedWordsToPlace ?? withEnglishTranslations(
      generateWordsPlacementChunks({
        word: targetText,
        example,
        wordId: wordDoc.id,
      }),
      wordDoc,
    );

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

async function buildCourseAwareWordsPlacementResult({
  courseId,
  day,
  words,
}: {
  courseId: string;
  day: number;
  words: RawWordDoc[];
}): Promise<WordsPlacementGenerationResult> {
  if (courseId === "JLPT" || courseId.startsWith("JLPT_")) {
    const items = await Promise.all(
      words.map(async (wordDoc) => {
        const targetText = resolveTargetText(wordDoc);
        const example = hasText(wordDoc.example) ? wordDoc.example.trim() : "";
        return {
          wordDoc,
          wordsToPlace: targetText && example
            ? withJlptTranslations(
                await generateJapaneseWordsPlacementChunks({
                  word: targetText,
                  example,
                  wordId: wordDoc.id,
                }),
                wordDoc,
              )
            : null,
        };
      }),
    );
    return buildWordsPlacementResultFromItems({ courseId, day, items });
  }

  if (courseId === "KANJI") {
    const items = words.map((wordDoc) => {
      const rawExamples = Array.isArray(wordDoc.example)
        ? wordDoc.example
        : [String(wordDoc.example ?? "")];
      const englishTranslations = getStringArray(wordDoc.exampleEnglishTranslation);
      const koreanTranslations = getStringArray(wordDoc.exampleKoreanTranslation);
      const wordsToPlace = rawExamples.flatMap((rawExample, index) =>
        generateKanjiWordsPlacementChunks({
          example: String(rawExample),
          wordId: wordDoc.id,
        }).map((group) => ({
          ...group,
          exampleEnglishTranslation: englishTranslations[index] ?? "",
          exampleKoreanTranslation: koreanTranslations[index] ?? "",
        })),
      );

      return {
        wordDoc: {
          ...wordDoc,
          word: hasText(wordDoc.kanji) ? wordDoc.kanji : wordDoc.word,
          example: Array.isArray(wordDoc.example)
            ? wordDoc.example.join("\n")
            : wordDoc.example,
        },
        wordsToPlace,
      };
    });
    return buildWordsPlacementResultFromItems({ courseId, day, items });
  }

  return buildWordsPlacementResult({ courseId, day, words });
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
      wordsToPlace: item.wordsToPlace,
    })),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function generateWordsPlacementGame({
  db,
  course,
  level,
  day,
}: {
  db: Firestore;
  course: unknown;
  level?: unknown;
  day: unknown;
}): Promise<{
  result: WordsPlacementGenerationResult;
  savePath: string;
}> {
  assertSupportedWordsPlacementCourse(course);
  const dayNumber = normalizeWordsPlacementDay(day);
  if (dayNumber === null) throw new Error("Invalid day.");

  const courseConfig = getQuizCourse({ course, level: course === "JLPT" ? level as string | null : null });
  if (!courseConfig?.path) throw new Error("Unknown course.");

  const dayId = `Day${dayNumber}`;
  const snapshot = await db.collection(`${courseConfig.path}/${dayId}`).get();
  const words = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Record<string, unknown>),
  }));

  return {
    result: await buildCourseAwareWordsPlacementResult({
      courseId: courseConfig.id,
      day: dayNumber,
      words,
    }),
    savePath: `${courseConfig.path}/${dayId}/${dayId}-quiz/words_placement/data`,
  };
}
