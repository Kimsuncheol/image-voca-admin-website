import { fetchNaverDictPayload } from "@/lib/server/naverDict";

export interface MeaningLookupItem {
  word: string;
  meaning: string | null;
  error?: string;
}

function normalizeLookupWord(word: string): string {
  return word.trim().toLowerCase();
}

function hasTrimmedText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function extractCandidateEntries(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    );
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.items)) {
    return record.items.filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object",
    );
  }

  return [record];
}

function extractMeaningFromCandidate(candidate: Record<string, unknown>): string | null {
  const meanings = candidate.meanings;
  if (Array.isArray(meanings)) {
    const firstMeaning = meanings.find(hasTrimmedText);
    if (firstMeaning) {
      return firstMeaning.trim();
    }
  }

  const meaning = candidate.meaning;
  if (hasTrimmedText(meaning)) {
    return meaning.trim();
  }

  return null;
}

export function extractMeaningForWord(
  searchWord: string,
  payload: unknown,
): string | null {
  const normalizedSearchWord = normalizeLookupWord(searchWord);
  const exactCandidate = extractCandidateEntries(payload).find((candidate) => {
    const candidateWord = candidate.word;
    return (
      hasTrimmedText(candidateWord) &&
      normalizeLookupWord(candidateWord) === normalizedSearchWord
    );
  });

  if (!exactCandidate) {
    return null;
  }

  return extractMeaningFromCandidate(exactCandidate);
}

export async function lookupMeaning(word: string): Promise<MeaningLookupItem> {
  const searchParams = new URLSearchParams({
    query: word,
    dict_type: "english",
    search_mode: "simple",
  });

  try {
    const { status, payload } = await fetchNaverDictPayload({
      path: "/dict/search",
      searchParams,
    });

    if (status >= 400) {
      return {
        word,
        meaning: null,
        error: "Lookup failed.",
      };
    }

    return {
      word,
      meaning: extractMeaningForWord(word, payload),
    };
  } catch (error) {
    return {
      word,
      meaning: null,
      error:
        error instanceof Error ? error.message : "Meaning lookup failed.",
    };
  }
}
