export type KanjiNestedListGroup = {
  items: string[];
};

export const KANJI_NESTED_LIST_FIELDS = [
  "meaningExample",
  "meaningExampleHurigana",
  "meaningEnglishTranslation",
  "meaningKoreanTranslation",
  "readingExample",
  "readingExampleHurigana",
  "readingEnglishTranslation",
  "readingKoreanTranslation",
] as const;

export type KanjiNestedListField = (typeof KANJI_NESTED_LIST_FIELDS)[number];

export const KANJI_ROMANIZE_FIELDS = [
  "meaningKoreanRomanize",
  "readingKoreanRomanize",
] as const;

export type KanjiRomanizeField = (typeof KANJI_ROMANIZE_FIELDS)[number];

export function isKanjiNestedListGroup(value: unknown): value is KanjiNestedListGroup {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { items?: unknown }).items)
  );
}

export function normalizeKanjiNestedListGroups(value: unknown): KanjiNestedListGroup[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((group) => {
      if (Array.isArray(group)) {
        return {
          items: group
            .map((item) => String(item ?? "").trim())
            .filter(Boolean),
        };
      }

      if (isKanjiNestedListGroup(group)) {
        return {
          items: group.items
            .map((item) => String(item ?? "").trim())
            .filter(Boolean),
        };
      }

      const item = String(group ?? "").trim();
      return item ? { items: [item] } : { items: [] };
    })
    .filter((group) => group.items.length > 0);
}

export function normalizeKanjiRomanizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) =>
      String(item ?? "")
        .trim()
        .replace(/[A-Za-z]/, (match) => match.toUpperCase()),
    )
    .filter(Boolean);
}

export function normalizeKanjiWordNestedLists<T extends Record<string, unknown>>(
  word: T,
): T {
  if (typeof word.kanji !== "string") return word;

  const normalized: Record<string, unknown> = { ...word };
  for (const field of KANJI_NESTED_LIST_FIELDS) {
    normalized[field] = normalizeKanjiNestedListGroups(normalized[field]);
  }
  for (const field of KANJI_ROMANIZE_FIELDS) {
    normalized[field] = normalizeKanjiRomanizeList(normalized[field]);
  }
  return normalized as T;
}

export function normalizeKanjiWordsNestedLists<T extends Record<string, unknown>>(
  words: readonly T[],
): T[] {
  return words.map((word) => normalizeKanjiWordNestedLists(word));
}
