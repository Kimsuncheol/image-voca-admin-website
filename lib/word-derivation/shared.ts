import type {
  DerivativeBuckets,
  DerivativeSource,
} from "@/types/vocabulary";

export function normalizeVocabularyWord(value: string): string {
  return (value ?? "").trim().toLowerCase().replace(/^[^a-z]+|[^a-z-]+$/g, "");
}

export function isSingleTokenWord(value: string): boolean {
  const normalized = normalizeVocabularyWord(value);
  return /^[a-z]+(?:-[a-z]+)*$/.test(normalized);
}

export function createEmptyDerivativeBuckets(): DerivativeBuckets {
  return {
    adjective: [],
    noun: [],
    verb: [],
    adverb: [],
  };
}

export function mergeDerivativeSource(
  left: DerivativeSource,
  right: DerivativeSource,
): DerivativeSource {
  return left === right ? left : "merged";
}
