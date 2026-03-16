import "server-only";

import type { AISettings } from "@/lib/aiSettings";
import { filterAdjectiveCandidates } from "@/lib/word-derivation/filterAdjectiveCandidates";
import { isSingleTokenWord, normalizeVocabularyWord } from "@/lib/word-derivation/shared";
import {
  createDerivativeProvider,
  type AdjectiveDerivativeProvider,
} from "@/lib/word-derivation/providerAdapters";
import type {
  DerivativeCandidate,
  DerivativePreviewItemResult,
  DerivativePreviewRequestItem,
  DerivativePreviewWordResult,
} from "@/types/vocabulary";

type AdjectiveDerivativeApi = AISettings["adjectiveDerivativeApi"];

interface DiscoveryCache {
  previewByBaseWord: Map<string, Promise<DerivativePreviewWordResult>>;
}

interface PreviewDependencies {
  resolveProvider?: (
    providerApi: AdjectiveDerivativeApi,
  ) => AdjectiveDerivativeProvider;
}

async function discoverForWord(
  provider: AdjectiveDerivativeProvider,
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

  try {
    const discoveredCandidates = await provider.discoverCandidates(
      normalizedBaseWord,
      baseMeaning,
    );
    const filteredCandidates = filterAdjectiveCandidates(
      normalizedBaseWord,
      discoveredCandidates,
    ).slice(0, 8);

    const hydrated = await Promise.allSettled(
      filteredCandidates.map((candidateWord) =>
        provider.getDefinition(candidateWord),
      ),
    );

    const candidates = hydrated.flatMap((result, index): DerivativeCandidate[] => {
      if (result.status !== "fulfilled" || !result.value?.meaning) return [];

      return [
        {
          word: filteredCandidates[index],
          meaning: result.value.meaning,
          source: provider.source,
          selectedByDefault: true,
          attribution: result.value.attribution,
        },
      ];
    });

    return {
      baseWord,
      baseMeaning,
      candidates: candidates.sort((left, right) =>
        left.word.localeCompare(right.word),
      ),
      ...(errors.length > 0 ? { errors } : {}),
    };
  } catch (error) {
    console.error(`[derivatives] ${provider.source} lookup failed:`, error);
    errors.push(`${provider.source} lookup failed`);
  }

  return {
    baseWord,
    baseMeaning,
    candidates: [],
    ...(errors.length > 0 ? { errors } : {}),
  };
}

async function getPreviewForBaseWord(
  cache: DiscoveryCache,
  provider: AdjectiveDerivativeProvider,
  baseWord: string,
  baseMeaning: string,
): Promise<DerivativePreviewWordResult> {
  const normalizedBaseWord = normalizeVocabularyWord(baseWord);
  const cacheKey = `${provider.source}::${normalizedBaseWord}::${baseMeaning
    .trim()
    .toLowerCase()}`;
  const existing = cache.previewByBaseWord.get(cacheKey);
  if (existing) return existing;

  const next = discoverForWord(provider, baseWord, baseMeaning);
  cache.previewByBaseWord.set(cacheKey, next);
  return next;
}

export async function getAdjectiveDerivativesPreview(
  items: DerivativePreviewRequestItem[],
  providerApi: AdjectiveDerivativeApi,
  dependencies: PreviewDependencies = {},
): Promise<DerivativePreviewItemResult[]> {
  const cache: DiscoveryCache = {
    previewByBaseWord: new Map(),
  };
  const provider =
    dependencies.resolveProvider?.(providerApi) ??
    createDerivativeProvider(providerApi);

  return Promise.all(
    items.map(async (item) => {
      const words = await Promise.all(
        item.words.map((word) =>
          getPreviewForBaseWord(cache, provider, word.word, word.meaning),
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
