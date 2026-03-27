import "server-only";

import type { AISettings } from "@/lib/aiSettings";
import { mapWithConcurrencyLimit } from "@/lib/word-derivation/batching";
import { normalizeVocabularyWord } from "@/lib/word-derivation/shared";
import type { DerivativeSource } from "@/types/vocabulary";

type AdjectiveDerivativeApi = AISettings["adjectiveDerivativeApi"];

export interface AdjectiveDefinitionResult {
  meaning: string;
  attribution?: string;
}

export interface AdjectiveDerivativeDiscoveryInput {
  baseWord: string;
  baseMeaning: string;
}

export interface BatchedDiscoveryResult {
  candidatesByWord: Map<string, string[]>;
  errorsByWord: Map<string, string[]>;
}

export interface BatchedDefinitionResult {
  definitionsByWord: Map<string, AdjectiveDefinitionResult | null>;
  errorsByWord: Map<string, string[]>;
}

export interface BatchExecutionOptions {
  concurrency?: number;
}

export interface AdjectiveDerivativeProvider {
  source: DerivativeSource;
  discoverCandidatesBatch: (
    inputs: readonly AdjectiveDerivativeDiscoveryInput[],
    options?: BatchExecutionOptions,
  ) => Promise<BatchedDiscoveryResult>;
  getDefinitionsBatch: (
    words: readonly string[],
    options?: BatchExecutionOptions,
  ) => Promise<BatchedDefinitionResult>;
}

interface ProviderOptions {
  fetchImpl?: typeof fetch;
  apiKey?: string;
  baseUrl?: string;
}

const DATAMUSE_API_URL = "https://api.datamuse.com/words";
const FREE_DICTIONARY_API_URL =
  "https://api.dictionaryapi.dev/api/v2/entries/en";
const DEFAULT_WORD_SENSE_API_URL =
  "https://dictionary-api.cambridge.org/api/v1/dictionaries/british-english/entries";
const COMMON_ADJECTIVE_SUFFIXES = [
  "able",
  "al",
  "an",
  "ant",
  "ary",
  "ed",
  "ent",
  "ful",
  "ic",
  "ical",
  "id",
  "ile",
  "ine",
  "ish",
  "ive",
  "less",
  "like",
  "ory",
  "ous",
  "y",
] as const;
const DEFAULT_DISCOVERY_CONCURRENCY = 6;
const DEFAULT_DEFINITION_CONCURRENCY = 12;

interface DatamuseItem {
  word?: string;
  tags?: string[];
  defs?: string[];
}

interface FreeDictionaryMeaning {
  partOfSpeech?: string;
  definitions?: Array<{ definition?: string }>;
}

interface FreeDictionaryEntry {
  meanings?: FreeDictionaryMeaning[];
  sourceUrls?: string[];
}

function normalizeCandidateWord(value: string): string {
  return normalizeVocabularyWord(value);
}

function uniqueStrings(values: Iterable<string>): string[] {
  return [...new Set([...values].filter(Boolean))];
}

function trimDefinition(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseDatamuseDefinition(item: DatamuseItem): string {
  const directDef = item.defs?.find(Boolean);
  if (!directDef) return "";

  const tabIndex = directDef.indexOf("\t");
  return trimDefinition(
    tabIndex >= 0 ? directDef.slice(tabIndex + 1) : directDef,
  );
}

function hasAdjectiveTag(tags: string[] | undefined): boolean {
  return Boolean(tags?.some((tag) => tag === "adj"));
}

function buildHeuristicAdjectiveCandidates(baseWord: string): string[] {
  const normalizedBaseWord = normalizeCandidateWord(baseWord);
  if (!normalizedBaseWord) return [];

  const stems = new Set<string>([normalizedBaseWord]);
  if (normalizedBaseWord.endsWith("e")) {
    stems.add(normalizedBaseWord.slice(0, -1));
  }
  if (normalizedBaseWord.endsWith("y")) {
    stems.add(`${normalizedBaseWord.slice(0, -1)}i`);
  }
  if (normalizedBaseWord.endsWith("ion")) {
    stems.add(normalizedBaseWord.slice(0, -3));
  }

  const candidates = new Set<string>();
  stems.forEach((stem) => {
    COMMON_ADJECTIVE_SUFFIXES.forEach((suffix) => {
      candidates.add(`${stem}${suffix}`);
    });
  });

  return uniqueStrings(candidates).filter(
    (candidate) => candidate !== normalizedBaseWord,
  );
}

function createDefinitionCache() {
  return new Map<string, Promise<AdjectiveDefinitionResult | null>>();
}

function createCandidateCache() {
  return new Map<string, Promise<string[]>>();
}

function appendError(
  target: Map<string, string[]>,
  key: string,
  message: string,
): void {
  const existing = target.get(key) ?? [];
  target.set(key, [...existing, message]);
}

async function runDiscoveryBatch(
  inputs: readonly AdjectiveDerivativeDiscoveryInput[],
  concurrency: number,
  worker: (input: AdjectiveDerivativeDiscoveryInput) => Promise<string[]>,
): Promise<BatchedDiscoveryResult> {
  const candidatesByWord = new Map<string, string[]>();
  const errorsByWord = new Map<string, string[]>();

  await mapWithConcurrencyLimit(inputs, concurrency, async (input) => {
    const normalizedBaseWord = normalizeCandidateWord(input.baseWord);
    if (!normalizedBaseWord) {
      candidatesByWord.set(input.baseWord, []);
      return null;
    }

    try {
      candidatesByWord.set(
        normalizedBaseWord,
        uniqueStrings(await worker(input)),
      );
    } catch (error) {
      appendError(
        errorsByWord,
        normalizedBaseWord,
        error instanceof Error ? error.message : String(error),
      );
      candidatesByWord.set(normalizedBaseWord, []);
    }

    return null;
  });

  return {
    candidatesByWord,
    errorsByWord,
  };
}

async function runDefinitionBatch(
  words: readonly string[],
  concurrency: number,
  worker: (word: string) => Promise<AdjectiveDefinitionResult | null>,
): Promise<BatchedDefinitionResult> {
  const definitionsByWord = new Map<string, AdjectiveDefinitionResult | null>();
  const errorsByWord = new Map<string, string[]>();

  await mapWithConcurrencyLimit(words, concurrency, async (word) => {
    const normalizedWord = normalizeCandidateWord(word);
    if (!normalizedWord) return null;

    try {
      definitionsByWord.set(normalizedWord, await worker(normalizedWord));
    } catch (error) {
      appendError(
        errorsByWord,
        normalizedWord,
        error instanceof Error ? error.message : String(error),
      );
      definitionsByWord.set(normalizedWord, null);
    }

    return null;
  });

  return {
    definitionsByWord,
    errorsByWord,
  };
}

export function createDatamuseDerivativeProvider(
  options: ProviderOptions = {},
): AdjectiveDerivativeProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const definitionCache = createDefinitionCache();
  const candidateCache = createCandidateCache();

  async function lookupWord(
    word: string,
  ): Promise<AdjectiveDefinitionResult | null> {
    const normalizedWord = normalizeCandidateWord(word);
    if (!normalizedWord) return null;

    const existing = definitionCache.get(normalizedWord);
    if (existing) return existing;

    const next = (async () => {
      const searchParams = new URLSearchParams({
        sp: normalizedWord,
        md: "dp",
        max: "10",
      });
      const response = await fetchImpl(
        `${DATAMUSE_API_URL}?${searchParams.toString()}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );
      if (!response.ok) {
        throw new Error(`Datamuse request failed with ${response.status}`);
      }

      const payload = (await response.json()) as DatamuseItem[];
      const exactMatch = payload.find(
        (item) => normalizeCandidateWord(item.word ?? "") === normalizedWord,
      );
      if (!exactMatch || !hasAdjectiveTag(exactMatch.tags)) return null;

      const meaning = parseDatamuseDefinition(exactMatch);
      if (!meaning) return null;

      return {
        meaning,
        attribution: "Datamuse",
      };
    })();

    definitionCache.set(normalizedWord, next);
    return next;
  }

  async function discoverCandidatesForBaseWord(
    input: AdjectiveDerivativeDiscoveryInput,
  ): Promise<string[]> {
    const normalizedBaseWord = normalizeCandidateWord(input.baseWord);
    if (!normalizedBaseWord) return [];

    const existing = candidateCache.get(normalizedBaseWord);
    if (existing) return existing;

    const next = (async () => {
      const discovered = new Set<string>(
        buildHeuristicAdjectiveCandidates(normalizedBaseWord),
      );
      const searchParams = new URLSearchParams({
        sp: `${normalizedBaseWord}*`,
        md: "dp",
        max: "30",
      });
      const response = await fetchImpl(
        `${DATAMUSE_API_URL}?${searchParams.toString()}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );
      if (!response.ok) {
        throw new Error(`Datamuse request failed with ${response.status}`);
      }

      const payload = (await response.json()) as DatamuseItem[];
      payload
        .filter((item) => hasAdjectiveTag(item.tags))
        .forEach((item) => {
          const normalizedWord = normalizeCandidateWord(item.word ?? "");
          if (normalizedWord) {
            discovered.add(normalizedWord);
          }
        });

      return uniqueStrings(discovered);
    })();

    candidateCache.set(normalizedBaseWord, next);
    return next;
  }

  return {
    source: "datamuse",
    discoverCandidatesBatch(inputs, options) {
      return runDiscoveryBatch(
        inputs,
        options?.concurrency ?? DEFAULT_DISCOVERY_CONCURRENCY,
        discoverCandidatesForBaseWord,
      );
    },
    getDefinitionsBatch(words, options) {
      return runDefinitionBatch(
        words,
        options?.concurrency ?? DEFAULT_DEFINITION_CONCURRENCY,
        lookupWord,
      );
    },
  };
}

export function createFreeDictionaryDerivativeProvider(
  options: ProviderOptions = {},
): AdjectiveDerivativeProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const definitionCache = createDefinitionCache();
  const candidateCache = createCandidateCache();

  async function lookupWord(
    word: string,
  ): Promise<AdjectiveDefinitionResult | null> {
    const normalizedWord = normalizeCandidateWord(word);
    if (!normalizedWord) return null;

    const existing = definitionCache.get(normalizedWord);
    if (existing) return existing;

    const next = (async () => {
      const response = await fetchImpl(
        `${FREE_DICTIONARY_API_URL}/${encodeURIComponent(normalizedWord)}`,
        {
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      );

      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Free Dictionary request failed with ${response.status}`);
      }

      const payload = (await response.json()) as FreeDictionaryEntry[];
      for (const entry of payload) {
        for (const meaning of entry.meanings ?? []) {
          if (meaning.partOfSpeech?.toLowerCase() !== "adjective") continue;
          const definition = trimDefinition(
            meaning.definitions?.find((item) => trimDefinition(item.definition))
              ?.definition,
          );
          if (!definition) continue;

          return {
            meaning: definition,
            attribution: entry.sourceUrls?.[0] ?? "Free Dictionary API",
          };
        }
      }

      return null;
    })();

    definitionCache.set(normalizedWord, next);
    return next;
  }

  async function discoverCandidatesForBaseWord(
    input: AdjectiveDerivativeDiscoveryInput,
  ): Promise<string[]> {
    const normalizedBaseWord = normalizeCandidateWord(input.baseWord);
    if (!normalizedBaseWord) return [];

    const existing = candidateCache.get(normalizedBaseWord);
    if (existing) return existing;

    const next = Promise.resolve(
      buildHeuristicAdjectiveCandidates(normalizedBaseWord),
    );
    candidateCache.set(normalizedBaseWord, next);
    return next;
  }

  return {
    source: "free-dictionary",
    discoverCandidatesBatch(inputs, options) {
      return runDiscoveryBatch(
        inputs,
        options?.concurrency ?? DEFAULT_DISCOVERY_CONCURRENCY,
        discoverCandidatesForBaseWord,
      );
    },
    getDefinitionsBatch(words, options) {
      return runDefinitionBatch(
        words,
        options?.concurrency ?? DEFAULT_DEFINITION_CONCURRENCY,
        lookupWord,
      );
    },
  };
}

function collectGenericAdjectiveDefinitions(value: unknown): string[] {
  const definitions: string[] = [];

  function visit(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (!node || typeof node !== "object") return;

    const record = node as Record<string, unknown>;
    const partOfSpeech =
      typeof record.partOfSpeech === "string"
        ? record.partOfSpeech
        : typeof record.pos === "string"
          ? record.pos
          : typeof record.lexicalCategory === "string"
            ? record.lexicalCategory
            : "";
    const definition =
      typeof record.definition === "string"
        ? record.definition
        : typeof record.text === "string"
          ? record.text
          : typeof record.def === "string"
            ? record.def
            : typeof record.meaning === "string"
              ? record.meaning
              : "";

    if (
      partOfSpeech.toLowerCase() === "adjective" &&
      trimDefinition(definition)
    ) {
      definitions.push(trimDefinition(definition));
    }

    Object.values(record).forEach(visit);
  }

  visit(value);
  return definitions;
}

export function createWordSenseDerivativeProvider(
  options: ProviderOptions = {},
): AdjectiveDerivativeProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  const apiKey = options.apiKey ?? process.env.WORD_SENSE_API_KEY ?? "";
  const baseUrl =
    options.baseUrl ?? process.env.WORD_SENSE_API_URL ?? DEFAULT_WORD_SENSE_API_URL;
  const definitionCache = createDefinitionCache();
  const candidateCache = createCandidateCache();

  async function lookupWord(
    word: string,
  ): Promise<AdjectiveDefinitionResult | null> {
    const normalizedWord = normalizeCandidateWord(word);
    if (!normalizedWord || !apiKey) return null;

    const existing = definitionCache.get(normalizedWord);
    if (existing) return existing;

    const next = (async () => {
      const response = await fetchImpl(
        `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(normalizedWord)}`,
        {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${apiKey}`,
            "X-API-Key": apiKey,
            apikey: apiKey,
          },
        },
      );

      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Word Sense request failed with ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      const definitions = collectGenericAdjectiveDefinitions(payload);
      if (definitions.length === 0) return null;

      return {
        meaning: definitions[0],
        attribution: "Word Sense API",
      };
    })();

    definitionCache.set(normalizedWord, next);
    return next;
  }

  async function discoverCandidatesForBaseWord(
    input: AdjectiveDerivativeDiscoveryInput,
  ): Promise<string[]> {
    const normalizedBaseWord = normalizeCandidateWord(input.baseWord);
    if (!normalizedBaseWord) return [];

    const existing = candidateCache.get(normalizedBaseWord);
    if (existing) return existing;

    const next = Promise.resolve(
      buildHeuristicAdjectiveCandidates(normalizedBaseWord),
    );
    candidateCache.set(normalizedBaseWord, next);
    return next;
  }

  return {
    source: "word-sense",
    discoverCandidatesBatch(inputs, options) {
      return runDiscoveryBatch(
        inputs,
        options?.concurrency ?? DEFAULT_DISCOVERY_CONCURRENCY,
        discoverCandidatesForBaseWord,
      );
    },
    getDefinitionsBatch(words, options) {
      return runDefinitionBatch(
        words,
        options?.concurrency ?? DEFAULT_DEFINITION_CONCURRENCY,
        lookupWord,
      );
    },
  };
}

export function createDerivativeProvider(
  providerApi: AdjectiveDerivativeApi,
): AdjectiveDerivativeProvider {
  if (providerApi === "datamuse") {
    return createDatamuseDerivativeProvider();
  }

  if (providerApi === "free-dictionary") {
    return createFreeDictionaryDerivativeProvider();
  }

  return createWordSenseDerivativeProvider();
}

export { mapWithConcurrencyLimit };
