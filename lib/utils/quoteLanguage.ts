import {
  isFamousQuoteLanguage,
  type FamousQuoteLanguage,
} from "@/types/famousQuote";

// Hiragana \u3040-\u309F, Katakana \u30A0-\u30FF,
// CJK kanji \u4E00-\u9FFF, Halfwidth katakana \uFF65-\uFF9F
const JAPANESE_REGEX = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F]/;
const ENGLISH_REGEX = /[a-zA-Z]/;

export function containsEnglish(text: string): boolean {
  return ENGLISH_REGEX.test(text);
}

export function containsJapanese(text: string): boolean {
  return JAPANESE_REGEX.test(text);
}

export function textMatchesLanguage(
  text: string,
  language: FamousQuoteLanguage,
): boolean {
  if (language === "English") return containsEnglish(text);
  return containsJapanese(text);
}

export function quoteMatchesLanguage(
  text: string,
  language: FamousQuoteLanguage,
): boolean {
  return textMatchesLanguage(text, language);
}

export function normalizeQuoteLanguage(
  value: unknown,
): FamousQuoteLanguage | null {
  return isFamousQuoteLanguage(value) ? value : null;
}

export function classifyQuoteLanguage(text: string): FamousQuoteLanguage | null {
  const hasEnglish = containsEnglish(text);
  const hasJapanese = containsJapanese(text);

  if (hasEnglish && !hasJapanese) return "English";
  if (hasJapanese && !hasEnglish) return "Japanese";
  return null;
}

export function resolveQuoteLanguage(
  storedLanguage: unknown,
  quote: string,
): FamousQuoteLanguage | null {
  return normalizeQuoteLanguage(storedLanguage) ?? classifyQuoteLanguage(quote);
}
