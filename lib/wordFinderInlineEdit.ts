import type { WordFinderResult } from "../types/wordFinder.ts";
import type {
  CollocationWord,
  JlptWord,
  StandardWord,
  Word,
} from "../types/word.ts";
import { isCollocationWord, isFamousQuoteWord, isJlptWord } from "../types/word.ts";

export type InlineEditableWordFinderField = "primaryText" | "meaning";
export type CourseInlineEditableField =
  | InlineEditableWordFinderField
  | "meaningEnglish"
  | "meaningKorean"
  | "example"
  | "translationEnglish"
  | "translationKorean";
export type EditableWordTextField =
  | "word"
  | "meaning"
  | "collocation"
  | "meaningEnglish"
  | "meaningKorean"
  | "example"
  | "translationEnglish"
  | "translationKorean";

interface EditableFieldConfig {
  sourceField: EditableWordTextField;
  value: string;
}

interface ResolveCourseInlineEditArgs {
  word: Word;
  isCollocation: boolean;
  isJlpt?: boolean;
  isFamousQuote?: boolean;
  field: CourseInlineEditableField;
}

export function resolveWordFinderInlineEditField(
  result: WordFinderResult,
  field: InlineEditableWordFinderField,
): EditableFieldConfig | null {
  if (result.type === "famousQuote" || result.schemaVariant === "jlpt") {
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

  if (args.isJlpt || isJlptWord(word)) {
    const jlptWord = word as JlptWord;

    switch (field) {
      case "primaryText":
        return {
          sourceField: "word",
          value: jlptWord.word,
        };
      case "meaningEnglish":
        return {
          sourceField: "meaningEnglish",
          value: jlptWord.meaningEnglish,
        };
      case "meaningKorean":
        return {
          sourceField: "meaningKorean",
          value: jlptWord.meaningKorean,
        };
      case "example":
        return {
          sourceField: "example",
          value: jlptWord.example,
        };
      case "translationEnglish":
        return {
          sourceField: "translationEnglish",
          value: jlptWord.translationEnglish,
        };
      case "translationKorean":
        return {
          sourceField: "translationKorean",
          value: jlptWord.translationKorean,
        };
      case "meaning":
        return null;
      default:
        return null;
    }
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
  field: CourseInlineEditableField,
  value: string,
): Partial<StandardWord> | Partial<JlptWord> | Partial<CollocationWord> | null {
  if (isFamousQuoteWord(word)) {
    return null;
  }

  if (isJlptWord(word)) {
    switch (field) {
      case "primaryText":
        return { word: value };
      case "meaningEnglish":
        return { meaningEnglish: value };
      case "meaningKorean":
        return { meaningKorean: value };
      case "example":
        return { example: value };
      case "translationEnglish":
        return { translationEnglish: value };
      case "translationKorean":
        return { translationKorean: value };
      default:
        return null;
    }
  }

  if (field === "meaning") {
    return { meaning: value };
  }

  if (isCollocationWord(word)) {
    return { collocation: value };
  }

  return { word: value };
}
