import "server-only";

import { filterAdjectiveCandidates } from "@/lib/word-derivation/filterAdjectiveCandidates";
import {
  isSingleTokenWord,
  mergeDerivativeSource,
  normalizeVocabularyWord,
} from "@/lib/word-derivation/shared";
import {
  getAdjectiveCandidatesFromAI,
  getDerivativeMeaningFromAI,
} from "@/services/AIDerivativeService";
import {
  getAdjectiveDefinitionFromWordnik,
  getRelatedDerivativeWordsFromWordnik,
  type WordnikAdjectiveDefinition,
} from "@/services/wordnikService";
import type {
  DerivativeCandidate,
  DerivativePreviewItemResult,
  DerivativePreviewRequestItem,
  DerivativePreviewWordResult,
  DerivativeSource,
} from "@/types/vocabulary";

interface DiscoveryCache {
  previewByBaseWord: Map<string, Promise<DerivativePreviewWordResult>>;
  definitionByWord: Map<string, Promise<WordnikAdjectiveDefinition | null>>;
}

function getOrCreateDefinitionPromise(
  cache: DiscoveryCache,
  word: string,
): Promise<WordnikAdjectiveDefinition | null> {
  const normalizedWord = normalizeVocabularyWord(word);
  const existing = cache.definitionByWord.get(normalizedWord);
  if (existing) return existing;

  const next = getAdjectiveDefinitionFromWordnik(normalizedWord).catch(
    () => null,
  );
  cache.definitionByWord.set(normalizedWord, next);
  return next;
}

async function buildCandidate(
  cache: DiscoveryCache,
  baseWord: string,
  baseMeaning: string,
  candidateWord: string,
  source: DerivativeSource,
): Promise<DerivativeCandidate | null> {
  const normalizedCandidate = normalizeVocabularyWord(candidateWord);
  if (!normalizedCandidate) return null;

  const definition = await getOrCreateDefinitionPromise(cache, normalizedCandidate);
  let meaning = definition?.text ?? "";

  if (!meaning) {
    meaning = await getDerivativeMeaningFromAI(
      baseWord,
      normalizedCandidate,
      baseMeaning,
    );
  }

  if (!meaning) return null;

  return {
    word: normalizedCandidate,
    meaning,
    source,
    selectedByDefault: true,
    attribution: definition?.attribution,
  };
}

function mergeCandidates(
  target: Map<string, DerivativeCandidate>,
  incoming: DerivativeCandidate[],
) {
  for (const candidate of incoming) {
    const existing = target.get(candidate.word);
    if (!existing) {
      target.set(candidate.word, candidate);
      continue;
    }

    target.set(candidate.word, {
      ...existing,
      meaning: existing.meaning || candidate.meaning,
      source: mergeDerivativeSource(existing.source, candidate.source),
      attribution: existing.attribution || candidate.attribution,
      selectedByDefault: existing.selectedByDefault || candidate.selectedByDefault,
    });
  }
}

async function hydrateCandidates(
  cache: DiscoveryCache,
  baseWord: string,
  baseMeaning: string,
  candidateWords: string[],
  source: DerivativeSource,
): Promise<DerivativeCandidate[]> {
  const settled = await Promise.allSettled(
    candidateWords.map((candidateWord) =>
      buildCandidate(cache, baseWord, baseMeaning, candidateWord, source),
    ),
  );

  return settled
    .filter(
      (result): result is PromiseFulfilledResult<DerivativeCandidate | null> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((value): value is DerivativeCandidate => value !== null);
}

async function discoverForWord(
  cache: DiscoveryCache,
  baseWord: string,
  baseMeaning: string,
): Promise<DerivativePreviewWordResult> {
  const errors: string[] = [];
  const normalizedBaseWord = normalizeVocabularyWord(baseWord);

  if (!normalizedBaseWord || !isSingleTokenWord(normalizedBaseWord)) {
    return {
      baseWord,
      baseMeaning,
      candidates: [],
    };
  }

  const candidateMap = new Map<string, DerivativeCandidate>();

  try {
    const wordnikRelatedWords = await getRelatedDerivativeWordsFromWordnik(
      normalizedBaseWord,
    );
    const filteredWordnikCandidates = filterAdjectiveCandidates(
      normalizedBaseWord,
      wordnikRelatedWords,
    ).slice(0, 8);
    const hydratedWordnikCandidates = await hydrateCandidates(
      cache,
      normalizedBaseWord,
      baseMeaning,
      filteredWordnikCandidates,
      "wordnik",
    );
    mergeCandidates(candidateMap, hydratedWordnikCandidates);
  } catch (error) {
    console.error("[derivatives] Wordnik lookup failed:", error);
    errors.push("Wordnik lookup failed");
  }

  if (candidateMap.size === 0) {
    try {
      const openAiCandidates = await getAdjectiveCandidatesFromAI(
        normalizedBaseWord,
        baseMeaning,
      );
      const filteredOpenAiCandidates = filterAdjectiveCandidates(
        normalizedBaseWord,
        openAiCandidates,
      ).slice(0, 8);
      const hydratedOpenAiCandidates = await hydrateCandidates(
        cache,
        normalizedBaseWord,
        baseMeaning,
        filteredOpenAiCandidates,
        "ai",
      );
      mergeCandidates(candidateMap, hydratedOpenAiCandidates);
    } catch (error) {
      console.error("[derivatives] AI derivative fallback failed:", error);
      errors.push("AI fallback failed");
    }
  }

  return {
    baseWord,
    baseMeaning,
    candidates: [...candidateMap.values()].sort((left, right) =>
      left.word.localeCompare(right.word),
    ),
    ...(errors.length > 0 ? { errors } : {}),
  };
}

async function getPreviewForBaseWord(
  cache: DiscoveryCache,
  baseWord: string,
  baseMeaning: string,
): Promise<DerivativePreviewWordResult> {
  const normalizedBaseWord = normalizeVocabularyWord(baseWord);
  const cacheKey = `${normalizedBaseWord}::${baseMeaning.trim().toLowerCase()}`;
  const existing = cache.previewByBaseWord.get(cacheKey);
  if (existing) return existing;

  const next = discoverForWord(cache, baseWord, baseMeaning);
  cache.previewByBaseWord.set(cacheKey, next);
  return next;
}

export async function getAdjectiveDerivativesPreview(
  items: DerivativePreviewRequestItem[],
): Promise<DerivativePreviewItemResult[]> {
  const cache: DiscoveryCache = {
    previewByBaseWord: new Map(),
    definitionByWord: new Map(),
  };

  return Promise.all(
    items.map(async (item) => {
      const words = await Promise.all(
        item.words.map((word) =>
          getPreviewForBaseWord(cache, word.word, word.meaning),
        ),
      );

      return {
        itemId: item.itemId,
        dayName: item.dayName,
        words,
      };
    }),
  );
}
