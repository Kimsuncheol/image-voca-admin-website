import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";
import {
  createEmptyDerivativeBuckets,
  mergeDerivativeSource,
  normalizeVocabularyWord,
} from "@/lib/word-derivation/shared";
import type {
  DerivativeCandidate,
  DerivativePreviewItemResult,
  DerivativeSource,
  PersistedStandardWord,
} from "@/types/vocabulary";

export interface UploadItemWithWords<TWord = StandardWordInput> {
  id: string;
  dayName: string;
  data: {
    words: TWord[];
  };
}

export type DerivativeSelectionMap = Record<
  string,
  Record<string, Record<string, boolean>>
>;

function getCandidateMapForItem(
  itemPreview: DerivativePreviewItemResult | undefined,
): Map<string, Map<string, DerivativeCandidate>> {
  const byBaseWord = new Map<string, Map<string, DerivativeCandidate>>();

  if (!itemPreview) return byBaseWord;

  for (const wordPreview of itemPreview.words) {
    const baseWordKey = normalizeVocabularyWord(wordPreview.baseWord);
    byBaseWord.set(
      baseWordKey,
      new Map(
        wordPreview.candidates.map((candidate) => [
          normalizeVocabularyWord(candidate.word),
          candidate,
        ]),
      ),
    );
  }

  return byBaseWord;
}

export function buildDerivativeAwareWordsForUpload<
  TItem extends UploadItemWithWords,
>(items: TItem[], previewItems: DerivativePreviewItemResult[], selections: DerivativeSelectionMap): TItem[] {
  const previewByItemId = new Map(
    previewItems.map((itemPreview) => [itemPreview.itemId, itemPreview]),
  );

  return items.map((item) => {
    const originals = item.data.words.map(
      (word) => ({ ...word }) as PersistedStandardWord,
    );
    const originalWordSet = new Set(
      originals.map((word) => normalizeVocabularyWord(word.word)),
    );
    const derivativeCandidatesByBaseWord = getCandidateMapForItem(
      previewByItemId.get(item.id),
    );
    const selectionForItem = selections[item.id] ?? {};

    const derivativeWordMap = new Map<string, PersistedStandardWord>();

    for (const originalWord of originals) {
      const baseWordKey = normalizeVocabularyWord(originalWord.word);
      const candidateMap = derivativeCandidatesByBaseWord.get(baseWordKey);
      const selectionForBaseWord = selectionForItem[baseWordKey] ?? {};

      const selectedDerivativeWords = candidateMap
        ? [...candidateMap.entries()]
            .filter(([candidateWord]) => selectionForBaseWord[candidateWord])
            .map(([, candidate]) => candidate)
        : [];

      if (selectedDerivativeWords.length === 0) continue;

      originalWord.derivatives = createEmptyDerivativeBuckets();
      originalWord.derivatives.adjective = selectedDerivativeWords.map(
        (candidate) => candidate.word,
      );

      for (const candidate of selectedDerivativeWords) {
        const normalizedCandidateWord = normalizeVocabularyWord(candidate.word);
        if (!normalizedCandidateWord || originalWordSet.has(normalizedCandidateWord)) {
          continue;
        }

        const existingDerivativeWord = derivativeWordMap.get(
          normalizedCandidateWord,
        );

        if (!existingDerivativeWord) {
          derivativeWordMap.set(normalizedCandidateWord, {
            word: candidate.word,
            meaning: candidate.meaning,
            pronunciation: "",
            example: "",
            translation: "",
            derivativeInfo: {
              type: "adjective",
              sourceWords: [originalWord.word],
              source: candidate.source,
            },
          });
          continue;
        }

        const sourceWords = new Set(
          existingDerivativeWord.derivativeInfo?.sourceWords ?? [],
        );
        sourceWords.add(originalWord.word);

        const mergedSource: DerivativeSource = mergeDerivativeSource(
          existingDerivativeWord.derivativeInfo?.source ?? candidate.source,
          candidate.source,
        );

        derivativeWordMap.set(normalizedCandidateWord, {
          ...existingDerivativeWord,
          meaning: existingDerivativeWord.meaning || candidate.meaning,
          derivativeInfo: {
            type: "adjective",
            sourceWords: [...sourceWords],
            source: mergedSource,
          },
        });
      }
    }

    return {
      ...item,
      data: {
        ...item.data,
        words: [...originals, ...derivativeWordMap.values()],
      },
    };
  });
}
