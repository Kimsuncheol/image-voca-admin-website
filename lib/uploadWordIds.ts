import type {
  CollocationWordInput,
  FamousQuoteWordInput,
  StandardWordInput,
} from "@/lib/schemas/vocaSchemas";
import type { SchemaType } from "@/lib/utils/csvParser";

type UploadWordWithOptionalId = StandardWordInput | CollocationWordInput;
type UploadParseWord =
  | StandardWordInput
  | CollocationWordInput
  | FamousQuoteWordInput;

export function normalizeCourseLabelForWordId(label: string): string {
  return label
    .trim()
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();
}

export function buildDeterministicUploadWordId(
  courseLabel: string,
  dayName: string,
  rowIndex: number,
): string {
  const normalizedCourseLabel = normalizeCourseLabelForWordId(courseLabel);
  const normalizedDayName = dayName.trim().replace(/\s+/g, "");
  return `${normalizedCourseLabel}_${normalizedDayName}_${rowIndex}`;
}

export function assignDeterministicUploadWordIds<T extends UploadWordWithOptionalId>(
  words: readonly T[],
  courseLabel: string,
  dayName: string,
): Array<T & { id: string }> {
  return words.map((word, index) => ({
    ...word,
    id: buildDeterministicUploadWordId(courseLabel, dayName, index + 1),
  }));
}

export function assignDeterministicUploadIdsForSchema<
  T extends UploadParseWord,
>(
  words: readonly T[],
  schemaType: SchemaType,
  courseLabel: string,
  dayName: string,
): T[] {
  if (schemaType === "standard" || schemaType === "collocation") {
    return assignDeterministicUploadWordIds(
      words as readonly UploadWordWithOptionalId[],
      courseLabel,
      dayName,
    ) as T[];
  }

  return [...words];
}
