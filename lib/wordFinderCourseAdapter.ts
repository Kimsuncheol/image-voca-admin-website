import type { CourseId } from "../types/course.ts";
import type {
  CollocationWord,
  FamousQuoteWord,
  StandardWord,
  Word,
} from "../types/word.ts";
import type {
  WordFinderActionField,
  WordFinderResult,
  WordFinderResultFieldUpdates,
  WordFinderType,
} from "../types/wordFinder.ts";

interface AdaptCourseWordToWordFinderResultArgs {
  word: Word;
  courseId: CourseId;
  courseLabel: string;
  coursePath: string;
  dayId?: string;
  isCollocation: boolean;
  isFamousQuote?: boolean;
}

export type CourseWordResolvedUpdates = Partial<
  Pick<StandardWord, "pronunciation" | "example" | "translation" | "imageUrl"> &
    Pick<CollocationWord, "example" | "translation"> &
    Pick<FamousQuoteWord, "translation">
>;

function getWordFinderType(
  args: Pick<AdaptCourseWordToWordFinderResultArgs, "isCollocation" | "isFamousQuote">,
): WordFinderType {
  if (args.isFamousQuote) return "famousQuote";
  if (args.isCollocation) return "collocation";
  return "standard";
}

export function adaptCourseWordToWordFinderResult(
  args: AdaptCourseWordToWordFinderResultArgs,
): WordFinderResult {
  const {
    word,
    courseId,
    courseLabel,
    coursePath,
    dayId,
    isCollocation,
    isFamousQuote,
  } = args;
  const type = getWordFinderType({ isCollocation, isFamousQuote });

  if (isFamousQuote) {
    const quote = word as FamousQuoteWord;

    return {
      id: quote.id,
      courseId,
      courseLabel,
      coursePath,
      dayId: null,
      sourceHref: `/courses/${courseId}`,
      type,
      primaryText: quote.quote,
      secondaryText: quote.author,
      meaning: null,
      translation: quote.translation || null,
      example: null,
      pronunciation: null,
      imageUrl: null,
    };
  }

  if (isCollocation) {
    const collocation = word as CollocationWord;

    return {
      id: collocation.id,
      courseId,
      courseLabel,
      coursePath,
      dayId: dayId ?? null,
      sourceHref: `/courses/${courseId}/${dayId ?? ""}`,
      type,
      primaryText: collocation.collocation,
      secondaryText: collocation.explanation || null,
      meaning: collocation.meaning || null,
      translation: collocation.translation || null,
      example: collocation.example || null,
      pronunciation: null,
      imageUrl: null,
    };
  }

  const standard = word as StandardWord;
  return {
    id: standard.id,
    courseId,
    courseLabel,
    coursePath,
    dayId: dayId ?? null,
    sourceHref: `/courses/${courseId}/${dayId ?? ""}`,
    type,
    primaryText: standard.word,
    secondaryText: standard.meaning || null,
    meaning: standard.meaning || null,
    translation: standard.translation || null,
    example: standard.example || null,
    pronunciation: standard.pronunciation || null,
    imageUrl: standard.imageUrl || null,
  };
}

export function getWordTableMissingActionField(
  word: Word,
  args: {
    isCollocation: boolean;
    isFamousQuote?: boolean;
    showImageUrl?: boolean;
  },
): WordFinderActionField[] {
  if (args.isFamousQuote) {
    const quote = word as FamousQuoteWord;
    return quote.translation ? [] : ["translation"];
  }

  if (args.isCollocation) {
    const collocation = word as CollocationWord;
    const fields: WordFinderActionField[] = [];
    if (!collocation.example) fields.push("example");
    if (!collocation.translation) fields.push("translation");
    return fields;
  }

  const standard = word as StandardWord;
  const fields: WordFinderActionField[] = [];
  if (args.showImageUrl && !standard.imageUrl) fields.push("image");
  if (!standard.pronunciation) fields.push("pronunciation");
  if (!standard.example) fields.push("example");
  if (!standard.translation) fields.push("translation");
  return fields;
}

export function applyCourseWordResolvedUpdates(
  word: Word,
  updates: WordFinderResultFieldUpdates,
): CourseWordResolvedUpdates {
  const next: CourseWordResolvedUpdates = {};
  if (typeof updates.pronunciation === "string") {
    next.pronunciation = updates.pronunciation;
  }
  if (typeof updates.example === "string") {
    next.example = updates.example;
  }
  if (typeof updates.translation === "string") {
    next.translation = updates.translation;
  }
  if (typeof updates.imageUrl === "string" && "word" in word) {
    next.imageUrl = updates.imageUrl;
  }
  return next;
}
