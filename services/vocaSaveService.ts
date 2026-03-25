import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";
import { normalizeVocabularyWord } from "@/lib/word-derivation/shared";
import type {
  DerivativeCandidate,
  DerivativePreviewItemResult,
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
  TItem extends UploadItemWithWords<StandardWordInput>,
>(
  items: TItem[],
  previewItems: DerivativePreviewItemResult[],
  selections: DerivativeSelectionMap,
): TItem[] {
  const previewByItemId = new Map(
    previewItems.map((itemPreview) => [itemPreview.itemId, itemPreview]),
  );

  return items.map((item) => {
    const originals = item.data.words.map((word) => ({ ...word }));
    const derivativeCandidatesByBaseWord = getCandidateMapForItem(
      previewByItemId.get(item.id),
    );
    const selectionForItem = selections[item.id] ?? {};

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
      originalWord.derivative = selectedDerivativeWords.map((candidate) => ({
        word: candidate.word,
        meaning: candidate.meaning,
      }));
    }

    return {
      ...item,
      data: {
        ...item.data,
        words: originals,
      },
    };
  });
}
