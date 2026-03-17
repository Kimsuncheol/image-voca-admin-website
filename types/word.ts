import type {
  DerivativeBuckets,
  PersistedDerivativeInfo,
} from "@/types/vocabulary";

export interface StandardWord {
  id: string;
  word: string;
  meaning: string;
  pronunciation: string;
  example: string;
  translation: string;
  imageUrl?: string;
  derivatives?: DerivativeBuckets;
  derivativeInfo?: PersistedDerivativeInfo;
}

export interface JlptWord {
  id: string;
  word: string;
  meaningEnglish: string;
  meaningKorean: string;
  pronunciation: string;
  pronunciationRoman: string;
  example: string;
  exampleRoman: string;
  translationEnglish: string;
  translationKorean: string;
  imageUrl?: string;
}

export interface CollocationWord {
  id: string;
  collocation: string;
  meaning: string;
  explanation: string;
  example: string;
  translation: string;
  imageUrl?: string;
}

export interface FamousQuoteWord {
  id: string;
  quote: string;
  author: string;
  translation: string;
}

export type Word = StandardWord | JlptWord | CollocationWord | FamousQuoteWord;

export function isJlptWord(w: Word): w is JlptWord {
  return "meaningEnglish" in w && "meaningKorean" in w;
}

export function isCollocationWord(w: Word): w is CollocationWord {
  return "collocation" in w;
}

export function isFamousQuoteWord(w: Word): w is FamousQuoteWord {
  return "quote" in w;
}
