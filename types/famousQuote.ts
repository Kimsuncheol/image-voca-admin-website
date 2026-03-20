export const FAMOUS_QUOTE_FILTER_LANGUAGES = [
  "All",
  "English",
  "Japanese",
] as const;

export const FAMOUS_QUOTE_LANGUAGES = [
  "English",
  "Japanese",
] as const;

export type FamousQuoteFilterLanguage =
  (typeof FAMOUS_QUOTE_FILTER_LANGUAGES)[number];

export type FamousQuoteLanguage = (typeof FAMOUS_QUOTE_LANGUAGES)[number];

export interface FamousQuoteFilterRequest {
  coursePath: string;
  language: FamousQuoteFilterLanguage;
}

export function isFamousQuoteFilterLanguage(
  value: unknown,
): value is FamousQuoteFilterLanguage {
  return FAMOUS_QUOTE_FILTER_LANGUAGES.includes(
    value as FamousQuoteFilterLanguage,
  );
}

export function isFamousQuoteLanguage(
  value: unknown,
): value is FamousQuoteLanguage {
  return FAMOUS_QUOTE_LANGUAGES.includes(value as FamousQuoteLanguage);
}
