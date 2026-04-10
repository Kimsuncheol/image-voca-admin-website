import type {
  ExtremelyAdvancedWordInput,
  JlptWordInput,
  StandardWordInput,
} from "../lib/schemas/vocaSchemas.ts";
import type { CourseId } from "../types/course.ts";

const IMAGE_URL_COURSE_IDS = new Set<CourseId>([
  "CSAT",
  "TOEFL_IELTS",
  "TOEIC",
  "EXTREMELY_ADVANCED",
  "JLPT",
  "JLPT_COUNTER",
]);

export function shouldIncludeImageUrl(courseId: CourseId | ""): boolean {
  return courseId !== "" && IMAGE_URL_COURSE_IDS.has(courseId);
}

type ImageCapableUploadWord =
  | StandardWordInput
  | ExtremelyAdvancedWordInput
  | JlptWordInput;

export function prepareStandardWordsForUpload<T extends ImageCapableUploadWord>(
  words: T[],
  courseId: CourseId | "",
): T[] {
  if (!shouldIncludeImageUrl(courseId)) return words;

  return words.map((word) => ({
    ...word,
    imageUrl:
      typeof word.imageUrl === "string" && word.imageUrl.trim().length > 0
        ? word.imageUrl
        : "",
  })) as T[];
}
