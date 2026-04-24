import type {
  WordFinderMissingField,
  WordFinderResult,
} from "../../types/wordFinder.ts";
import {
  hasDerivativeEntries,
  supportsDerivativeGenerationForResult,
} from "../derivativeGeneration.ts";

export function normalizeWordFinderText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeNullableWordFinderText(value: unknown): string | null {
  const normalized = normalizeWordFinderText(value);
  return normalized === "" ? null : normalized;
}

export function normalizeWordFinderSearchKey(value: unknown): string {
  return normalizeWordFinderText(value).toLowerCase();
}

function getDaySortValue(dayId: string | null): number {
  if (!dayId) return Number.MAX_SAFE_INTEGER;

  const match = dayId.match(/^Day(\d+)$/i);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

export function compareWordFinderResults(
  left: WordFinderResult,
  right: WordFinderResult,
): number {
  const courseDelta = left.courseId.localeCompare(right.courseId);
  if (courseDelta !== 0) return courseDelta;

  const dayDelta = getDaySortValue(left.dayId) - getDaySortValue(right.dayId);
  if (dayDelta !== 0) return dayDelta;

  const primaryDelta = left.primaryText.localeCompare(right.primaryText);
  if (primaryDelta !== 0) return primaryDelta;

  return left.id.localeCompare(right.id);
}

export function buildPrimaryTextExactMatchIndex(
  results: WordFinderResult[],
): Map<string, WordFinderResult[]> {
  const index = new Map<string, WordFinderResult[]>();

  results.forEach((result) => {
    const searchKey = normalizeWordFinderSearchKey(result.primaryText);
    if (!searchKey) return;

    const matches = index.get(searchKey);
    if (matches) {
      matches.push(result);
      return;
    }

    index.set(searchKey, [result]);
  });

  return index;
}

export function matchesExactPrimaryTextQuery(
  result: WordFinderResult,
  searchKey: string,
): boolean {
  if (!searchKey) return true;
  return normalizeWordFinderSearchKey(result.primaryText) === searchKey;
}

export function matchesType(result: WordFinderResult, type: string): boolean {
  return type === "all" || result.type === type;
}

export function matchesMissingField(
  result: WordFinderResult,
  missingField: WordFinderMissingField,
): boolean {
  switch (missingField) {
    case "all":
      return true;
    case "image":
      return result.type !== "famousQuote" && result.type !== "kanji" && !result.imageUrl;
    case "pronunciation":
      return (
        result.type === "standard" &&
        result.schemaVariant !== "extremelyAdvanced" &&
        !result.pronunciation
      );
    case "example":
      return result.type !== "famousQuote" && result.type !== "kanji" && !result.example;
    case "exampleHurigana":
      return (
        result.schemaVariant === "jlpt" &&
        Boolean(result.example) &&
        !result.exampleHurigana
      );
    case "derivative":
      return (
        supportsDerivativeGenerationForResult(result) &&
        !hasDerivativeEntries(result.derivative)
      );
    case "translation":
      return result.type !== "kanji" && !result.translation;
    default:
      return true;
  }
}
