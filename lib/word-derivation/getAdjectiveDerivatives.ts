import "server-only";

import type { AISettings } from "@/lib/aiSettings";
import {
  DEFAULT_MEANING_LOOKUP_BATCH_SIZE,
  getMeaningLookupBatchCount,
  lookupMeanings,
} from "@/lib/server/naverDictMeaning";
import {
  countBatches,
  runBatches,
} from "@/lib/word-derivation/batching";
import { filterAdjectiveCandidates } from "@/lib/word-derivation/filterAdjectiveCandidates";
import {
  createDerivativeProvider,
  type AdjectiveDefinitionResult,
  type AdjectiveDerivativeProvider,
  type AdjectiveDerivativeDiscoveryInput,
  type BatchedDefinitionResult,
  type BatchedDiscoveryResult,
} from "@/lib/word-derivation/providerAdapters";
import { isSingleTokenWord, normalizeVocabularyWord } from "@/lib/word-derivation/shared";
import type {
  DerivativeCandidate,
  DerivativePreviewItemResult,
  DerivativePreviewRequestItem,
  DerivativePreviewWordResult,
} from "@/types/vocabulary";

type AdjectiveDerivativeApi = AISettings["adjectiveDerivativeApi"];

interface PreviewDependencies {
  resolveProvider?: (
    providerApi: AdjectiveDerivativeApi,
  ) => AdjectiveDerivativeProvider;
  lookupMeaningsBatch?: (
    words: readonly string[],
  ) => Promise<Array<{ word: string; meaning: string | null; error?: string }>>;
  onMetrics?: (metrics: DerivativePreviewMetrics) => void;
}

export interface DerivativePreviewMetrics {
  uniqueBaseWordCount: number;
  uniqueCandidateCount: number;
  discoveryBatchCount: number;
  definitionBatchCount: number;
}

const BASE_DISCOVERY_CONCURRENCY = 6;
const CANDIDATE_DEFINITION_CONCURRENCY = 12;
const DISCOVERY_BATCH_SIZE = 24;
const DISCOVERY_BATCH_CONCURRENCY = 2;
const DEFINITION_BATCH_SIZE = 48;
const DEFINITION_BATCH_CONCURRENCY = 2;

function usesNaverMeanings(providerApi: AdjectiveDerivativeApi): boolean {
  return providerApi === "datamuse" || providerApi === "free-dictionary";
}

function toDiscoveryInputMap(
  items: DerivativePreviewRequestItem[],
): Map<string, AdjectiveDerivativeDiscoveryInput> {
  const uniqueInputs = new Map<string, AdjectiveDerivativeDiscoveryInput>();

  items.forEach((item) => {
    item.words.forEach((word) => {
      const normalizedBaseWord = normalizeVocabularyWord(word.word);
      if (!normalizedBaseWord || !isSingleTokenWord(normalizedBaseWord)) return;
      if (uniqueInputs.has(normalizedBaseWord)) return;

      uniqueInputs.set(normalizedBaseWord, {
        baseWord: normalizedBaseWord,
        baseMeaning: word.meaning,
      });
    });
  });

  return uniqueInputs;
}

function buildFilteredCandidateMap(
  discoveryInputs: Map<string, AdjectiveDerivativeDiscoveryInput>,
  candidatesByWord: Map<string, string[]>,
): Map<string, string[]> {
  const filteredCandidatesByBaseWord = new Map<string, string[]>();

  discoveryInputs.forEach((input, normalizedBaseWord) => {
    const filteredCandidates = filterAdjectiveCandidates(
      normalizedBaseWord,
      candidatesByWord.get(normalizedBaseWord) ?? [],
    ).slice(0, 8);

    filteredCandidatesByBaseWord.set(
      normalizedBaseWord,
      [...filteredCandidates].sort((left, right) => left.localeCompare(right)),
    );
  });

  return filteredCandidatesByBaseWord;
}

function buildCandidateWordSet(
  filteredCandidatesByBaseWord: Map<string, string[]>,
): string[] {
  const uniqueCandidates = new Set<string>();

  filteredCandidatesByBaseWord.forEach((candidates) => {
    candidates.forEach((candidateWord) => {
      const normalizedCandidate = normalizeVocabularyWord(candidateWord);
      if (normalizedCandidate) {
        uniqueCandidates.add(normalizedCandidate);
      }
    });
  });

  return [...uniqueCandidates];
}

function buildWordPreview(
  provider: AdjectiveDerivativeProvider,
  word: DerivativePreviewRequestItem["words"][number],
  filteredCandidatesByBaseWord: Map<string, string[]>,
  definitionsByWord: Map<
    string,
    { meaning: string; attribution?: string } | null
  >,
  discoveryErrorsByWord: Map<string, string[]>,
): DerivativePreviewWordResult {
  const normalizedBaseWord = normalizeVocabularyWord(word.word);

  if (!normalizedBaseWord || !isSingleTokenWord(normalizedBaseWord)) {
    return {
      baseWord: word.word,
      baseMeaning: word.meaning,
      candidates: [],
    };
  }

  const candidates = (filteredCandidatesByBaseWord.get(normalizedBaseWord) ?? [])
    .flatMap((candidateWord): DerivativeCandidate[] => {
      const definition = definitionsByWord.get(
        normalizeVocabularyWord(candidateWord),
      );
      if (!definition?.meaning) return [];

      return [
        {
          word: candidateWord,
          meaning: definition.meaning,
          source: provider.source,
          selectedByDefault: true,
          attribution: definition.attribution,
        },
      ];
    })
    .sort((left, right) => left.word.localeCompare(right.word));

  const errors = discoveryErrorsByWord.get(normalizedBaseWord);

  return {
    baseWord: word.word,
    baseMeaning: word.meaning,
    candidates,
    ...(errors && errors.length > 0 ? { errors } : {}),
  };
}

async function resolveDefinitionsByProvider(
  provider: AdjectiveDerivativeProvider,
  uniqueCandidateWords: string[],
) {
  const results = await runBatches(uniqueCandidateWords, {
    batchSize: DEFINITION_BATCH_SIZE,
    batchConcurrency: DEFINITION_BATCH_CONCURRENCY,
    worker: (batch) =>
      provider.getDefinitionsBatch(batch, {
        concurrency: CANDIDATE_DEFINITION_CONCURRENCY,
      }),
  });

  return mergeDefinitionResults(results);
}

async function resolveDefinitionsWithNaver(
  words: readonly string[],
  lookupMeaningsBatch: NonNullable<PreviewDependencies["lookupMeaningsBatch"]>,
) {
  const items = await lookupMeaningsBatch(words);
  const definitionsByWord = new Map<
    string,
    { meaning: string; attribution?: string } | null
  >();
  const errorsByWord = new Map<string, string[]>();

  items.forEach((item) => {
    const normalizedWord = normalizeVocabularyWord(item.word);
    if (!normalizedWord) return;

    if (item.meaning) {
      definitionsByWord.set(normalizedWord, {
        meaning: item.meaning,
        attribution: "Naver Dict API",
      });
      return;
    }

    definitionsByWord.set(normalizedWord, null);
    if (item.error) {
      errorsByWord.set(normalizedWord, [item.error]);
    }
  });

  words.forEach((word) => {
    const normalizedWord = normalizeVocabularyWord(word);
    if (!normalizedWord || definitionsByWord.has(normalizedWord)) return;
    definitionsByWord.set(normalizedWord, null);
  });

  return {
    definitionsByWord,
    errorsByWord,
  };
}

function mergeErrors(
  target: Map<string, string[]>,
  source: Map<string, string[]>,
) {
  source.forEach((errors, key) => {
    const existing = target.get(key) ?? [];
    target.set(key, [...existing, ...errors]);
  });
}

function mergeDiscoveryResults(
  results: BatchedDiscoveryResult[],
): BatchedDiscoveryResult {
  const candidatesByWord = new Map<string, string[]>();
  const errorsByWord = new Map<string, string[]>();

  results.forEach((result) => {
    result.candidatesByWord.forEach((candidates, key) => {
      candidatesByWord.set(key, candidates);
    });
    mergeErrors(errorsByWord, result.errorsByWord);
  });

  return {
    candidatesByWord,
    errorsByWord,
  };
}

function mergeDefinitionResults(
  results: BatchedDefinitionResult[],
): BatchedDefinitionResult {
  const definitionsByWord = new Map<string, AdjectiveDefinitionResult | null>();
  const errorsByWord = new Map<string, string[]>();

  results.forEach((result) => {
    result.definitionsByWord.forEach((definition, key) => {
      definitionsByWord.set(key, definition);
    });
    mergeErrors(errorsByWord, result.errorsByWord);
  });

  return {
    definitionsByWord,
    errorsByWord,
  };
}

async function discoverCandidatesInBatches(
  provider: AdjectiveDerivativeProvider,
  inputs: readonly AdjectiveDerivativeDiscoveryInput[],
) {
  const results = await runBatches(inputs, {
    batchSize: DISCOVERY_BATCH_SIZE,
    batchConcurrency: DISCOVERY_BATCH_CONCURRENCY,
    worker: (batch) =>
      provider.discoverCandidatesBatch(batch, {
        concurrency: BASE_DISCOVERY_CONCURRENCY,
      }),
  });

  return mergeDiscoveryResults(results);
}

export async function getAdjectiveDerivativesPreview(
  items: DerivativePreviewRequestItem[],
  providerApi: AdjectiveDerivativeApi,
  dependencies: PreviewDependencies = {},
): Promise<DerivativePreviewItemResult[]> {
  const provider =
    dependencies.resolveProvider?.(providerApi) ??
    createDerivativeProvider(providerApi);
  const discoveryInputs = toDiscoveryInputMap(items);
  const discoveryInputList = [...discoveryInputs.values()];
  const discoveryResult = await discoverCandidatesInBatches(
    provider,
    discoveryInputList,
  );
  const filteredCandidatesByBaseWord = buildFilteredCandidateMap(
    discoveryInputs,
    discoveryResult.candidatesByWord,
  );
  const uniqueCandidateWords = buildCandidateWordSet(filteredCandidatesByBaseWord);
  const definitionResult = usesNaverMeanings(providerApi)
    ? await resolveDefinitionsWithNaver(
        uniqueCandidateWords,
        dependencies.lookupMeaningsBatch ?? lookupMeanings,
      )
    : await resolveDefinitionsByProvider(provider, uniqueCandidateWords);

  dependencies.onMetrics?.({
    uniqueBaseWordCount: discoveryInputs.size,
    uniqueCandidateCount: uniqueCandidateWords.length,
    discoveryBatchCount: countBatches(
      discoveryInputList.length,
      DISCOVERY_BATCH_SIZE,
    ),
    definitionBatchCount: usesNaverMeanings(providerApi)
      ? getMeaningLookupBatchCount(
          uniqueCandidateWords,
          DEFAULT_MEANING_LOOKUP_BATCH_SIZE,
        )
      : countBatches(uniqueCandidateWords.length, DEFINITION_BATCH_SIZE),
  });

  return items.map((item) => ({
    itemId: item.itemId,
    dayName: item.dayName,
    words: item.words.map((word) =>
      buildWordPreview(
        provider,
        word,
        filteredCandidatesByBaseWord,
        definitionResult.definitionsByWord,
        discoveryResult.errorsByWord,
      ),
    ),
  }));
}
