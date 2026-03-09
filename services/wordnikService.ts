import "server-only";

export interface WordnikAdjectiveDefinition {
  text: string;
  attribution?: string;
}

interface WordnikRelatedWordsResponse {
  relationshipType?: string;
  words?: string[];
}

interface WordnikDefinitionResponse {
  partOfSpeech?: string;
  text?: string;
  attributionText?: string;
}

const WORDNIK_API_BASE_URL = "https://api.wordnik.com/v4";

function getWordnikApiKey(): string {
  return process.env.WORDNIK_API_KEY ?? "";
}

async function callWordnik<T>(
  pathname: string,
  params: Record<string, string | number | boolean | undefined>,
): Promise<T | null> {
  const apiKey = getWordnikApiKey();
  if (!apiKey) return null;

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    searchParams.set(key, String(value));
  }
  searchParams.set("api_key", apiKey);

  const response = await fetch(
    `${WORDNIK_API_BASE_URL}${pathname}?${searchParams.toString()}`,
    {
      cache: "no-store",
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Wordnik request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getRelatedDerivativeWordsFromWordnik(
  word: string,
): Promise<string[]> {
  const response = await callWordnik<WordnikRelatedWordsResponse[]>(
    `/word.json/${encodeURIComponent(word)}/relatedWords`,
    {
      useCanonical: true,
      relationshipTypes: "derivation",
      limitPerRelationshipType: 20,
    },
  );

  if (!response) return [];

  return response.flatMap((group) => group.words ?? []);
}

export async function getAdjectiveDefinitionFromWordnik(
  word: string,
): Promise<WordnikAdjectiveDefinition | null> {
  const response = await callWordnik<WordnikDefinitionResponse[]>(
    `/word.json/${encodeURIComponent(word)}/definitions`,
    {
      useCanonical: true,
      includeRelated: false,
      sourceDictionaries: "all",
      partOfSpeech: "adjective",
      limit: 5,
    },
  );

  if (!response) return null;

  const definition = response.find(
    (item) =>
      item.partOfSpeech?.toLowerCase() === "adjective" &&
      typeof item.text === "string" &&
      item.text.trim().length > 0,
  );

  if (!definition?.text) return null;

  return {
    text: definition.text.trim(),
    attribution: definition.attributionText?.trim() || undefined,
  };
}
