import {
  isSingleTokenWord,
  normalizeVocabularyWord,
} from "@/lib/word-derivation/shared";

const COMMON_ADJECTIVE_SUFFIXES = [
  "able",
  "al",
  "ant",
  "ary",
  "ed",
  "ent",
  "ful",
  "ic",
  "ical",
  "id",
  "ile",
  "ine",
  "ish",
  "ive",
  "less",
  "like",
  "ory",
  "ous",
  "y",
] as const;

function getCommonPrefixLength(left: string, right: string): number {
  const max = Math.min(left.length, right.length);
  let i = 0;
  while (i < max && left[i] === right[i]) i++;
  return i;
}

function looksLikeAdjective(candidate: string): boolean {
  return COMMON_ADJECTIVE_SUFFIXES.some((suffix) =>
    candidate.endsWith(suffix),
  );
}

export function isMorphologicallyPlausibleDerivative(
  baseWord: string,
  candidateWord: string,
): boolean {
  const normalizedBase = normalizeVocabularyWord(baseWord);
  const normalizedCandidate = normalizeVocabularyWord(candidateWord);

  if (!normalizedBase || !normalizedCandidate) return false;
  if (normalizedBase === normalizedCandidate) return false;
  if (!isSingleTokenWord(normalizedCandidate)) return false;

  const commonPrefixLength = getCommonPrefixLength(
    normalizedBase,
    normalizedCandidate,
  );

  if (commonPrefixLength >= 4) return true;

  return commonPrefixLength >= 3 && looksLikeAdjective(normalizedCandidate);
}

export function filterAdjectiveCandidates(
  baseWord: string,
  candidates: string[],
): string[] {
  const uniqueCandidates = new Set<string>();

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeVocabularyWord(candidate);
    if (
      normalizedCandidate &&
      isMorphologicallyPlausibleDerivative(baseWord, normalizedCandidate)
    ) {
      uniqueCandidates.add(normalizedCandidate);
    }
  }

  return [...uniqueCandidates];
}
