import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";
import type { CourseId } from "@/types/course";

const IMAGE_URL_COURSE_IDS = new Set<CourseId>([
  "CSAT",
  "IELTS",
  "TOEFL",
  "TOEIC",
]);

export function shouldIncludeImageUrl(courseId: CourseId | ""): boolean {
  return courseId !== "" && IMAGE_URL_COURSE_IDS.has(courseId);
}

export function prepareStandardWordsForUpload(
  words: StandardWordInput[],
  courseId: CourseId | "",
): StandardWordInput[] {
  if (!shouldIncludeImageUrl(courseId)) return words;

  return words.map((word) => ({
    ...word,
    imageUrl:
      typeof word.imageUrl === "string" && word.imageUrl.trim().length > 0
        ? word.imageUrl
        : "",
  }));
}
