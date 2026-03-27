import { fetchNaverDictPayload } from "@/lib/server/naverDict";
import {
  countBatches,
  runBatches,
} from "@/lib/word-derivation/batching";

export interface MeaningLookupItem {
  word: string;
  meaning: string | null;
  error?: string;
}

interface LookupMeaningsOptions {
  batchSize?: number;
  batchConcurrency?: number;
}

export const DEFAULT_MEANING_LOOKUP_BATCH_SIZE = 24;
const DEFAULT_MEANING_LOOKUP_BATCH_CONCURRENCY = 2;

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

export async function lookupMeanings(
  words: readonly string[],
  options: LookupMeaningsOptions = {},
): Promise<MeaningLookupItem[]> {
  const uniqueWords = Array.from(
    new Set(
      words
        .map((word) => word.trim())
        .filter((word) => word.length > 0),
    ),
  );

  if (uniqueWords.length === 0) {
    return [];
  }

  const batchSize = options.batchSize ?? DEFAULT_MEANING_LOOKUP_BATCH_SIZE;
  const batchConcurrency =
    options.batchConcurrency ?? DEFAULT_MEANING_LOOKUP_BATCH_CONCURRENCY;

  const batches = await runBatches(uniqueWords, {
    batchSize,
    batchConcurrency,
    worker: async (batch) => Promise.all(batch.map((word) => lookupMeaning(word))),
  });

  return batches.flat();
}

export function getMeaningLookupBatchCount(
  words: readonly string[],
  batchSize = DEFAULT_MEANING_LOOKUP_BATCH_SIZE,
): number {
  const uniqueWords = Array.from(
    new Set(
      words
        .map((word) => word.trim())
        .filter((word) => word.length > 0),
    ),
  );

  return countBatches(uniqueWords.length, batchSize);
}
