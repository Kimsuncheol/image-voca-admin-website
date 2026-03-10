import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";

export type DerivativeKind = "adjective" | "noun" | "verb" | "adverb";

export interface DerivativeBuckets {
  adjective: string[];
  noun: string[];
  verb: string[];
  adverb: string[];
}

export type DerivativeSource = "wordnik" | "openai" | "ai" | "merged";

export interface PersistedDerivativeInfo {
  type: DerivativeKind;
  sourceWords: string[];
  source: DerivativeSource;
}

export interface PersistedStandardWord extends StandardWordInput {
  derivatives?: DerivativeBuckets;
  derivativeInfo?: PersistedDerivativeInfo;
}

export interface DerivativeCandidate {
  word: string;
  meaning: string;
  source: DerivativeSource;
  selectedByDefault: boolean;
  attribution?: string;
}

export interface DerivativePreviewWordResult {
  baseWord: string;
  baseMeaning: string;
  candidates: DerivativeCandidate[];
  errors?: string[];
}

export interface DerivativePreviewItemResult {
  itemId: string;
  dayName: string;
  words: DerivativePreviewWordResult[];
  errors?: string[];
}

export interface DerivativePreviewRequestItem {
  itemId: string;
  dayName: string;
  words: StandardWordInput[];
}

export interface DerivativePreviewResponse {
  items: DerivativePreviewItemResult[];
}
