export interface StandardWord {
  id: string;
  word: string;
  meaning: string;
  pronunciation: string;
  example: string;
  translation: string;
}

export interface CollocationWord {
  id: string;
  collocation: string;
  meaning: string;
  explanation: string;
  example: string;
  translation: string;
}

export interface FamousQuoteWord {
  id: string;
  quote: string;
  author: string;
  translation: string;
}

export type Word = StandardWord | CollocationWord | FamousQuoteWord;

export function isCollocationWord(w: Word): w is CollocationWord {
  return 'collocation' in w;
}

export function isFamousQuoteWord(w: Word): w is FamousQuoteWord {
  return 'quote' in w;
}
