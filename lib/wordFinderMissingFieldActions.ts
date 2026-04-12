import type {
  WordFinderActionField,
  WordFinderResult,
  WordFinderResultFieldUpdates,
} from "../types/wordFinder.ts";
import {
  hasDerivativeEntries,
  supportsDerivativeGenerationForResult,
} from "./derivativeGeneration";

export function normalizeWordFinderComparableText(
  value: string | null | undefined,
): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLowerCase()
    : "";
}

export function getWordFinderResultKey(
  result: Pick<WordFinderResult, "courseId" | "dayId" | "id">,
): string {
  return `${result.courseId}:${result.dayId ?? "root"}:${result.id}`;
}

export function formatWordFinderLocation(
  result: Pick<WordFinderResult, "courseLabel" | "dayId">,
  noDayLabel: string,
): string {
  return result.dayId
    ? `${result.courseLabel} / ${result.dayId}`
    : `${result.courseLabel} / ${noDayLabel}`;
}

export function getWordFinderFieldValue(
  result: WordFinderResult,
  field: WordFinderActionField,
): string | null {
  switch (field) {
    case "image":
      return result.imageUrl;
    case "pronunciation":
      return result.schemaVariant === "jlpt" ||
        result.schemaVariant === "prefix" ||
        result.schemaVariant === "postfix"
        ? [result.pronunciation, result.pronunciationRoman]
            .filter((value): value is string => Boolean(value))
            .join(" / ") || null
        : result.pronunciation;
    case "example":
      return result.example;
    case "exampleHurigana":
      return result.exampleHurigana ?? null;
    case "derivative":
      return hasDerivativeEntries(result.derivative)
        ? result.derivative
            .map((entry) => `${entry.word}: ${entry.meaning}`)
            .join("\n")
        : null;
    case "translation":
      return result.schemaVariant === "jlpt"
        ? [result.translationEnglish, result.translationKorean]
            .filter((value): value is string => Boolean(value))
            .join(" / ") || null
        : result.translation;
    default:
      return null;
  }
}

export function isWordFinderFieldMissing(
  result: WordFinderResult,
  field: WordFinderActionField,
): boolean {
  switch (field) {
    case "image":
      return result.type !== "famousQuote" && !result.imageUrl;
    case "pronunciation":
      if (
        result.type !== "standard" ||
        result.schemaVariant === "extremelyAdvanced"
      ) {
        return false;
      }

      if (
        result.schemaVariant === "jlpt" ||
        result.schemaVariant === "prefix" ||
        result.schemaVariant === "postfix"
      ) {
        return !result.pronunciation || !result.pronunciationRoman;
      }

      return !result.pronunciation;
    case "example":
      return result.type !== "famousQuote" && !result.example;
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
      return result.schemaVariant === "jlpt"
        ? !result.translationEnglish || !result.translationKorean
        : !result.translation;
    default:
      return false;
  }
}

export function filterSharedWordFinderCandidates(
  current: WordFinderResult,
  candidates: WordFinderResult[],
  field: WordFinderActionField,
): WordFinderResult[] {
  const currentKey = getWordFinderResultKey(current);
  const currentPrimaryText = normalizeWordFinderComparableText(current.primaryText);
  const currentMeaning = normalizeWordFinderComparableText(current.meaning);

  return candidates.filter((candidate) => {
    if (getWordFinderResultKey(candidate) === currentKey) return false;
    if (candidate.courseId === current.courseId) return false;
    if (candidate.type !== current.type) return false;

    const candidateValue = getWordFinderFieldValue(candidate, field);
    if (!candidateValue) return false;

    if (
      normalizeWordFinderComparableText(candidate.primaryText) !== currentPrimaryText
    ) {
      return false;
    }

    if (field === "example" || field === "translation") {
      if (current.type === "famousQuote" && field === "translation") {
        return true;
      }

      const candidateMeaning = normalizeWordFinderComparableText(candidate.meaning);
      if (!currentMeaning || !candidateMeaning) return false;
      return candidateMeaning === currentMeaning;
    }

    return true;
  });
}

export function applyWordFinderResultUpdates(
  result: WordFinderResult,
  updates: WordFinderResultFieldUpdates,
): WordFinderResult {
  const next: WordFinderResult = {
    ...result,
    ...updates,
  };

  if (
    typeof updates.meaning === "string" &&
    result.type === "standard" &&
    result.schemaVariant !== "jlpt"
  ) {
    next.secondaryText = updates.meaning;
  }

  if (
    result.schemaVariant === "jlpt" &&
    (typeof updates.translationEnglish === "string" ||
      typeof updates.translationKorean === "string")
  ) {
    next.translation = [
      typeof updates.translationEnglish === "string"
        ? updates.translationEnglish
        : next.translationEnglish,
      typeof updates.translationKorean === "string"
        ? updates.translationKorean
        : next.translationKorean,
    ]
      .filter((value): value is string => Boolean(value))
      .join(" / ");
  }

  if (Array.isArray(updates.derivative)) {
    next.derivative = updates.derivative;
  }

  return next;
}
