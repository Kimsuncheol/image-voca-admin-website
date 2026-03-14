import type { CourseId } from "../types/course.ts";
import type {
  CollocationWord,
  FamousQuoteWord,
  StandardWord,
  Word,
} from "../types/word.ts";
import type {
  CourseDayActionableMissingField,
  CourseDayMissingField,
} from "../types/courseDayMissingField.ts";
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

function hasTrimmedText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

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
  const actionOrder: WordFinderActionField[] = [
    "image",
    "pronunciation",
    "example",
    "translation",
  ];

  const missingActions = getCourseWordMissingFields(word, args).filter(
    (field): field is CourseDayActionableMissingField =>
      field !== "primaryText" && field !== "meaning",
  );

  return actionOrder.filter((field) => missingActions.includes(field));
}

export function isCourseWordFieldMissing(
  word: Word,
  args: {
    isCollocation: boolean;
    isFamousQuote?: boolean;
    showImageUrl?: boolean;
  },
  field: Exclude<CourseDayMissingField, "all">,
): boolean {
  if (args.isFamousQuote) {
    if (field !== "translation") return false;
    const quote = word as FamousQuoteWord;
    return !hasTrimmedText(quote.translation);
  }

  if (args.isCollocation) {
    const collocation = word as CollocationWord;

    switch (field) {
      case "primaryText":
        return !hasTrimmedText(collocation.collocation);
      case "meaning":
        return !hasTrimmedText(collocation.meaning);
      case "example":
        return !hasTrimmedText(collocation.example);
      case "translation":
        return !hasTrimmedText(collocation.translation);
      case "pronunciation":
      case "image":
        return false;
      default:
        return false;
    }
  }

  const standard = word as StandardWord;

  switch (field) {
    case "primaryText":
      return !hasTrimmedText(standard.word);
    case "meaning":
      return !hasTrimmedText(standard.meaning);
    case "pronunciation":
      return !hasTrimmedText(standard.pronunciation);
    case "example":
      return !hasTrimmedText(standard.example);
    case "translation":
      return !hasTrimmedText(standard.translation);
    case "image":
      return Boolean(args.showImageUrl) && !hasTrimmedText(standard.imageUrl);
    default:
      return false;
  }
}

export function getCourseWordMissingFields(
  word: Word,
  args: {
    isCollocation: boolean;
    isFamousQuote?: boolean;
    showImageUrl?: boolean;
  },
): Exclude<CourseDayMissingField, "all">[] {
  const orderedFields: Exclude<CourseDayMissingField, "all">[] = [
    "primaryText",
    "meaning",
    "pronunciation",
    "example",
    "translation",
    "image",
  ];

  return orderedFields.filter((field) =>
    isCourseWordFieldMissing(word, args, field),
  );
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
