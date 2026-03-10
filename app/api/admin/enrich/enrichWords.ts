export interface WordInput {
  word: string;
  meaning: string;
  pronunciation?: string;
  example?: string;
  translation?: string;
}

export interface PersistedWordFields {
  example?: string;
  translation?: string;
}

export interface EnrichmentNeeds {
  needsExample: boolean;
  needsTranslation: boolean;
}

export type EnrichmentGenerator = (
  word: WordInput,
  needs: EnrichmentNeeds,
) => Promise<PersistedWordFields>;

export function isWordInput(value: unknown): value is WordInput {
  if (!value || typeof value !== 'object') return false;
  const word = value as Partial<WordInput>;
  return typeof word.word === 'string' && typeof word.meaning === 'string';
}

export function hasText(value?: string): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeKeyPart(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function buildWordLookupKey(word: string, meaning: string): string {
  return `${normalizeKeyPart(word)}::${normalizeKeyPart(meaning)}`;
}

export function mergeWithExistingWord(
  word: WordInput,
  existing?: PersistedWordFields,
): WordInput {
  if (!existing) return word;

  return {
    ...word,
    example: hasText(word.example)
      ? word.example
      : hasText(existing.example)
        ? existing.example
        : word.example,
    translation: hasText(word.translation)
      ? word.translation
      : hasText(existing.translation)
        ? existing.translation
        : word.translation,
  };
}

export function mergeWordsWithExisting(
  words: WordInput[],
  existingLookup: Map<string, PersistedWordFields>,
): WordInput[] {
  return words.map((word) => {
    const key = buildWordLookupKey(word.word, word.meaning);
    return mergeWithExistingWord(word, existingLookup.get(key));
  });
}

export async function enrichWords(
  words: WordInput[],
  generateEnrichment: EnrichmentGenerator,
  chunkSize = 10,
): Promise<WordInput[]> {
  const enrichOne = async (word: WordInput): Promise<WordInput> => {
    const needsExample = !hasText(word.example);
    const needsTranslation = !hasText(word.translation);
    if (!needsExample && !needsTranslation) return word;

    const generated = await generateEnrichment(word, {
      needsExample,
      needsTranslation,
    });

    return {
      ...word,
      example: hasText(word.example)
        ? word.example
        : generated.example || '',
      translation: hasText(word.translation)
        ? word.translation
        : generated.translation || '',
    };
  };

  const allSettled: PromiseSettledResult<WordInput>[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const batch = words.slice(i, i + chunkSize);
    const results = await Promise.allSettled(batch.map(enrichOne));
    allSettled.push(...results);
  }

  return allSettled.map((result, index) =>
    result.status === 'fulfilled' ? result.value : words[index],
  );
}
