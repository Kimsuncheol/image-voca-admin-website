import "server-only";

import type { AISettings } from "@/lib/aiSettings";
import { filterAdjectiveCandidates } from "@/lib/word-derivation/filterAdjectiveCandidates";
import {
  createDerivativeProvider,
  type AdjectiveDerivativeProvider,
  type AdjectiveDerivativeDiscoveryInput,
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
  onMetrics?: (metrics: DerivativePreviewMetrics) => void;
}

export interface DerivativePreviewMetrics {
  uniqueBaseWordCount: number;
  uniqueCandidateCount: number;
}

const BASE_DISCOVERY_CONCURRENCY = 6;
const CANDIDATE_DEFINITION_CONCURRENCY = 12;

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

export async function getAdjectiveDerivativesPreview(
  items: DerivativePreviewRequestItem[],
  providerApi: AdjectiveDerivativeApi,
  dependencies: PreviewDependencies = {},
): Promise<DerivativePreviewItemResult[]> {
  const provider =
    dependencies.resolveProvider?.(providerApi) ??
    createDerivativeProvider(providerApi);
  const discoveryInputs = toDiscoveryInputMap(items);
  const discoveryResult = await provider.discoverCandidatesBatch(
    [...discoveryInputs.values()],
    { concurrency: BASE_DISCOVERY_CONCURRENCY },
  );
  const filteredCandidatesByBaseWord = buildFilteredCandidateMap(
    discoveryInputs,
    discoveryResult.candidatesByWord,
  );
  const uniqueCandidateWords = buildCandidateWordSet(filteredCandidatesByBaseWord);
  const definitionResult = await provider.getDefinitionsBatch(
    uniqueCandidateWords,
    { concurrency: CANDIDATE_DEFINITION_CONCURRENCY },
  );

  dependencies.onMetrics?.({
    uniqueBaseWordCount: discoveryInputs.size,
    uniqueCandidateCount: uniqueCandidateWords.length,
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
