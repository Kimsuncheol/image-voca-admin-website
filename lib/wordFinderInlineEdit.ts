import type { WordFinderResult } from "../types/wordFinder.ts";
import type {
  CollocationWord,
  IdiomWord,
  JlptWord,
  PostfixWord,
  PrefixWord,
  StandardWord,
  Word,
} from "../types/word.ts";
import { isCollocationWord, isFamousQuoteWord, isIdiomWord, isJlptWord, isKanjiWord, isPrefixWord, isPostfixWord } from "../types/word.ts";

export type InlineEditableWordFinderField = "primaryText" | "meaning";
export type CourseInlineEditableField =
  | InlineEditableWordFinderField
  | "meaningEnglish"
  | "meaningKorean"
  | "pronunciation"
  | "example"
  | "exampleRoman"
  | "translationEnglish"
  | "translationKorean";
export type EditableWordTextField =
  | "word"
  | "prefix"
  | "postfix"
  | "meaning"
  | "collocation"
  | "idiom"
  | "meaningEnglish"
  | "meaningKorean"
  | "pronunciation"
  | "example"
  | "exampleRoman"
  | "translation"
  | "translationEnglish"
  | "translationKorean";

interface EditableFieldConfig {
  sourceField: EditableWordTextField;
  value: string;
}

interface ResolveCourseInlineEditArgs {
  word: Word;
  isCollocation: boolean;
  isIdiom?: boolean;
  isJlpt?: boolean;
  isFamousQuote?: boolean;
  isPrefix?: boolean;
  isPostfix?: boolean;
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
    sourceField: result.type === "collocation" ? "collocation" : result.type === "idiom" ? "idiom" : "word",
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

  if (args.isPrefix || isPrefixWord(word)) {
    const p = word as PrefixWord;
    switch (field) {
      case "primaryText": return { sourceField: "prefix", value: p.prefix };
      case "meaningEnglish": return { sourceField: "meaningEnglish", value: p.meaningEnglish };
      case "meaningKorean": return { sourceField: "meaningKorean", value: p.meaningKorean };
      case "pronunciation": return { sourceField: "pronunciation", value: p.pronunciation };
      case "example": return { sourceField: "example", value: p.example };
      case "exampleRoman": return { sourceField: "exampleRoman", value: p.exampleRoman };
      case "translationEnglish": return { sourceField: "translationEnglish", value: p.translationEnglish };
      case "translationKorean": return { sourceField: "translationKorean", value: p.translationKorean };
      default: return null;
    }
  }

  if (args.isPostfix || isPostfixWord(word)) {
    const p = word as PostfixWord;
    switch (field) {
      case "primaryText": return { sourceField: "postfix", value: p.postfix };
      case "meaningEnglish": return { sourceField: "meaningEnglish", value: p.meaningEnglish };
      case "meaningKorean": return { sourceField: "meaningKorean", value: p.meaningKorean };
      case "pronunciation": return { sourceField: "pronunciation", value: p.pronunciation };
      case "example": return { sourceField: "example", value: p.example };
      case "exampleRoman": return { sourceField: "exampleRoman", value: p.exampleRoman };
      case "translationEnglish": return { sourceField: "translationEnglish", value: p.translationEnglish };
      case "translationKorean": return { sourceField: "translationKorean", value: p.translationKorean };
      default: return null;
    }
  }

  if (isKanjiWord(word)) {
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
      case "pronunciation":
        return {
          sourceField: "pronunciation",
          value: jlptWord.pronunciation,
        };
      case "example":
        return {
          sourceField: "example",
          value: jlptWord.example,
        };
      case "exampleRoman":
        return {
          sourceField: "exampleRoman",
          value: jlptWord.exampleRoman,
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

  if (args.isIdiom || isIdiomWord(word)) {
    const idiomWord = word as IdiomWord;
    return {
      sourceField: "idiom",
      value: idiomWord.idiom,
    };
  }

  const standardWord = word as StandardWord;
  if (field === "pronunciation") {
    return {
      sourceField: "pronunciation",
      value: standardWord.pronunciation,
    };
  }

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
): Partial<StandardWord> | Partial<JlptWord> | Partial<CollocationWord> | Partial<IdiomWord> | Partial<PrefixWord> | Partial<PostfixWord> | null {
  if (isFamousQuoteWord(word) || isKanjiWord(word)) {
    return null;
  }

  if (isPrefixWord(word)) {
    switch (field) {
      case "primaryText": return { prefix: value };
      case "meaningEnglish": return { meaningEnglish: value };
      case "meaningKorean": return { meaningKorean: value };
      case "pronunciation": return { pronunciation: value };
      case "example": return { example: value };
      case "exampleRoman": return { exampleRoman: value };
      case "translationEnglish": return { translationEnglish: value };
      case "translationKorean": return { translationKorean: value };
      default: return null;
    }
  }

  if (isPostfixWord(word)) {
    switch (field) {
      case "primaryText": return { postfix: value };
      case "meaningEnglish": return { meaningEnglish: value };
      case "meaningKorean": return { meaningKorean: value };
      case "pronunciation": return { pronunciation: value };
      case "example": return { example: value };
      case "exampleRoman": return { exampleRoman: value };
      case "translationEnglish": return { translationEnglish: value };
      case "translationKorean": return { translationKorean: value };
      default: return null;
    }
  }

  if (isJlptWord(word)) {
    switch (field) {
      case "primaryText":
        return { word: value };
      case "meaningEnglish":
        return { meaningEnglish: value };
      case "meaningKorean":
        return { meaningKorean: value };
      case "pronunciation":
        return { pronunciation: value };
      case "example":
        return { example: value };
      case "exampleRoman":
        return { exampleRoman: value };
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

  if (isIdiomWord(word)) {
    return { idiom: value };
  }

  if (field === "pronunciation") {
    return { pronunciation: value };
  }

  return { word: value };
}
