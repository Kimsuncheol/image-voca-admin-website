import type {
  DerivativeBuckets,
  PersistedDerivativeInfo,
} from "@/types/vocabulary";

export interface StandardWord {
  id: string;
  word: string;
  meaning: string;
  synonym?: string;
  pronunciation: string;
  example: string;
  translation: string;
  imageUrl?: string;
  derivatives?: DerivativeBuckets;
  derivativeInfo?: PersistedDerivativeInfo;
  derivative?: { word: string; meaning: string }[];
}

export interface ExtremelyAdvancedWord {
  id: string;
  word: string;
  meaning: string;
  example: string;
  translation: string;
  imageUrl?: string;
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

export interface PrefixWord {
  id: string;
  prefix: string;
  meaningEnglish: string;
  meaningKorean: string;
  pronunciation: string;
  pronunciationRoman: string;
  example: string;
  exampleRoman: string;
  translationEnglish: string;
  translationKorean: string;
}

export interface PostfixWord {
  id: string;
  postfix: string;
  meaningEnglish: string;
  meaningKorean: string;
  pronunciation: string;
  pronunciationRoman: string;
  example: string;
  exampleRoman: string;
  translationEnglish: string;
  translationKorean: string;
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

export interface IdiomWord {
  id: string;
  idiom: string;
  meaning: string;
  example: string;
  translation: string;
  imageUrl?: string;
}

export interface FamousQuoteWord {
  id: string;
  quote: string;
  author: string;
  translation: string;
  language?: 'English' | 'Japanese';
}

export type Word = StandardWord | ExtremelyAdvancedWord | JlptWord | CollocationWord | IdiomWord | FamousQuoteWord | PrefixWord | PostfixWord;

export function isJlptWord(w: Word): w is JlptWord {
  return "word" in w && "meaningEnglish" in w;
}

export function isPrefixWord(w: Word): w is PrefixWord {
  return "prefix" in w;
}

export function isPostfixWord(w: Word): w is PostfixWord {
  return "postfix" in w;
}

export function isCollocationWord(w: Word): w is CollocationWord {
  return "collocation" in w;
}

export function isIdiomWord(w: Word): w is IdiomWord {
  return "idiom" in w;
}

export function isFamousQuoteWord(w: Word): w is FamousQuoteWord {
  return "quote" in w;
}
