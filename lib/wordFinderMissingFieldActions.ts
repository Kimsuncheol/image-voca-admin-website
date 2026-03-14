import type {
  WordFinderActionField,
  WordFinderResult,
  WordFinderResultFieldUpdates,
} from "../types/wordFinder.ts";

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
      return result.pronunciation;
    case "example":
      return result.example;
    case "translation":
      return result.translation;
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
      return result.type === "standard" && !result.imageUrl;
    case "pronunciation":
      return result.type === "standard" && !result.pronunciation;
    case "example":
      return result.type !== "famousQuote" && !result.example;
    case "translation":
      return !result.translation;
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

  if (typeof updates.meaning === "string" && result.type === "standard") {
    next.secondaryText = updates.meaning;
  }

  return next;
}
