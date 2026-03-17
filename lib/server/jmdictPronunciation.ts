interface JlptPronunciationItem {
  word: string;
  pronunciation: string;
  pronunciationRoman: string;
}

interface ExternalPronunciationPayload {
  items?: unknown;
}

function hasTrimmedText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeItem(raw: unknown): JlptPronunciationItem | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  const word = item.word;
  const pronunciation =
    item.pronunciation ?? item.reading ?? item.kana ?? item.pronunciationKana;
  const pronunciationRoman =
    item.pronunciationRoman ?? item.romaji ?? item.roman ?? item.romanization;

  if (
    !hasTrimmedText(word) ||
    !hasTrimmedText(pronunciation) ||
    !hasTrimmedText(pronunciationRoman)
  ) {
    return null;
  }

  return {
    word: word.trim(),
    pronunciation: pronunciation.trim(),
    pronunciationRoman: pronunciationRoman.trim(),
  };
}

function getAuthHeaders(): HeadersInit {
  const apiKey = process.env.JMDICT_API_KEY?.trim();
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

export async function lookupJlptPronunciations(
  words: string[],
): Promise<JlptPronunciationItem[]> {
  const baseUrl = process.env.JMDICT_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("JMdict API is not configured.");
  }

  const uniqueWords = Array.from(
    new Set(words.map((word) => word.trim()).filter((word) => word.length > 0)),
  );
  if (uniqueWords.length === 0) return [];

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ words: uniqueWords }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch JLPT pronunciation.");
  }

  const payload = (await response.json()) as ExternalPronunciationPayload;
  if (!Array.isArray(payload.items)) {
    throw new Error("Invalid JMdict response.");
  }

  return payload.items
    .map(normalizeItem)
    .filter((item): item is JlptPronunciationItem => Boolean(item));
}
