import type { WordFinderResult } from "../types/wordFinder.ts";
import type {
  CollocationWord,
  StandardWord,
  Word,
} from "../types/word.ts";
import { isCollocationWord, isFamousQuoteWord } from "../types/word.ts";

export type InlineEditableWordFinderField = "primaryText" | "meaning";
export type EditableWordTextField = "word" | "meaning" | "collocation";

interface EditableFieldConfig {
  sourceField: EditableWordTextField;
  value: string;
}

interface ResolveCourseInlineEditArgs {
  word: Word;
  isCollocation: boolean;
  isFamousQuote?: boolean;
  field: InlineEditableWordFinderField;
}

export function resolveWordFinderInlineEditField(
  result: WordFinderResult,
  field: InlineEditableWordFinderField,
): EditableFieldConfig | null {
  if (result.type === "famousQuote") {
    return null;
  }

  if (field === "meaning") {
    return {
      sourceField: "meaning",
      value: result.meaning ?? "",
    };
  }

  return {
    sourceField: result.type === "collocation" ? "collocation" : "word",
    value: result.primaryText,
  };
}

export function resolveCourseInlineEditField(
  args: ResolveCourseInlineEditArgs,
): EditableFieldConfig | null {
  const { word, isCollocation, isFamousQuote, field } = args;
  if (isFamousQuote || isFamousQuoteWord(word)) {
    return null;
  }

  if (field === "meaning") {
    return {
      sourceField: "meaning",
      value: word.meaning,
    };
  }

  if (isCollocation || isCollocationWord(word)) {
    const collocationWord = word as CollocationWord;
    return {
      sourceField: "collocation",
      value: collocationWord.collocation,
    };
  }

  const standardWord = word as StandardWord;
  return {
    sourceField: "word",
    value: standardWord.word,
  };
}

export function applyWordFinderInlineEdit(
  result: WordFinderResult,
  field: InlineEditableWordFinderField,
  value: string,
): WordFinderResult {
  if (field === "meaning") {
    return {
      ...result,
      meaning: value,
      ...(result.type === "standard" ? { secondaryText: value } : {}),
    };
  }

  return {
    ...result,
    primaryText: value,
  };
}

export function applyCourseInlineEdit(
  word: Word,
  field: InlineEditableWordFinderField,
  value: string,
): Partial<StandardWord> | Partial<CollocationWord> | null {
  if (isFamousQuoteWord(word)) {
    return null;
  }

  if (field === "meaning") {
    return { meaning: value };
  }

  if (isCollocationWord(word)) {
    return { collocation: value };
  }

  return { word: value };
}
