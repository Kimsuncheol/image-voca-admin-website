import type { CourseId } from "../types/course.ts";
import type {
  CollocationWord,
  ExtremelyAdvancedWord,
  FamousQuoteWord,
  IdiomWord,
  JlptWord,
  PostfixWord,
  PrefixWord,
  StandardWord,
  Word,
} from "../types/word.ts";
import { isIdiomWord, isJlptWord, isPrefixWord, isPostfixWord } from "../types/word.ts";
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
import { hasDerivativeEntries } from "./derivativeGeneration.ts";
import { hasParentheticalFurigana } from "./furigana.ts";

interface AdaptCourseWordToWordFinderResultArgs {
  word: Word;
  courseId: CourseId;
  courseLabel: string;
  coursePath: string;
  dayId?: string;
  isCollocation: boolean;
  isIdiom?: boolean;
  isExtremelyAdvanced?: boolean;
  isJlpt?: boolean;
  isFamousQuote?: boolean;
  isPrefix?: boolean;
  isPostfix?: boolean;
}

export type CourseWordResolvedUpdates = Partial<
  Pick<
    StandardWord,
    "synonym" | "pronunciation" | "example" | "translation" | "imageUrl" | "derivative"
  > &
    Pick<
      JlptWord,
      | "pronunciation"
      | "pronunciationRoman"
      | "example"
      | "exampleRoman"
      | "translationEnglish"
      | "translationKorean"
      | "imageUrl"
    > &
    Pick<
      PrefixWord,
      | "pronunciation"
      | "pronunciationRoman"
      | "example"
      | "exampleRoman"
      | "translationEnglish"
      | "translationKorean"
    > &
    Pick<
      PostfixWord,
      | "pronunciation"
      | "pronunciationRoman"
      | "example"
      | "exampleRoman"
      | "translationEnglish"
      | "translationKorean"
    > &
    Pick<CollocationWord, "example" | "translation" | "imageUrl"> &
    Pick<ExtremelyAdvancedWord, "example" | "translation" | "imageUrl"> &
    Pick<IdiomWord, "example" | "translation" | "imageUrl"> &
    Pick<FamousQuoteWord, "translation">
>;

function hasTrimmedText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function getWordFinderType(
  args: Pick<
    AdaptCourseWordToWordFinderResultArgs,
    "isCollocation" | "isIdiom" | "isFamousQuote"
  >,
): WordFinderType {
  if (args.isFamousQuote) return "famousQuote";
  if (args.isCollocation) return "collocation";
  if (args.isIdiom) return "idiom";
  return "standard";
}

function buildCourseWordSourceHref(
  courseId: CourseId,
  wordId: string,
  dayId?: string,
): string {
  return dayId
    ? `/courses/${courseId}/${dayId}#${wordId}`
    : `/courses/${courseId}#${wordId}`;
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
    isIdiom,
    isExtremelyAdvanced,
    isJlpt,
    isFamousQuote,
    isPrefix,
    isPostfix,
  } = args;
  const type = getWordFinderType({ isCollocation, isIdiom, isFamousQuote });

  if (isFamousQuote) {
    const quote = word as FamousQuoteWord;

    return {
      id: quote.id,
      courseId,
      courseLabel,
      coursePath,
      schemaVariant: "famousQuote",
      dayId: null,
      sourceHref: `/courses/${courseId}#${quote.id}`,
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
      schemaVariant: "collocation",
      dayId: dayId ?? null,
      sourceHref: buildCourseWordSourceHref(courseId, collocation.id, dayId),
      type,
      primaryText: collocation.collocation,
      secondaryText: collocation.explanation || null,
      meaning: collocation.meaning || null,
      translation: collocation.translation || null,
      example: collocation.example || null,
      pronunciation: null,
      imageUrl: collocation.imageUrl || null,
    };
  }

  if (isIdiom) {
    const idiom = word as IdiomWord;

    return {
      id: idiom.id,
      courseId,
      courseLabel,
      coursePath,
      schemaVariant: "idiom",
      dayId: dayId ?? null,
      sourceHref: buildCourseWordSourceHref(courseId, idiom.id, dayId),
      type,
      primaryText: idiom.idiom,
      secondaryText: null,
      meaning: idiom.meaning || null,
      translation: idiom.translation || null,
      example: idiom.example || null,
      pronunciation: null,
      imageUrl: idiom.imageUrl || null,
    };
  }

  if (isExtremelyAdvanced) {
    const advanced = word as ExtremelyAdvancedWord;

    return {
      id: advanced.id,
      courseId,
      courseLabel,
      coursePath,
      schemaVariant: "extremelyAdvanced",
      dayId: dayId ?? null,
      sourceHref: buildCourseWordSourceHref(courseId, advanced.id, dayId),
      type,
      primaryText: advanced.word,
      secondaryText: advanced.meaning || null,
      meaning: advanced.meaning || null,
      translation: advanced.translation || null,
      example: advanced.example || null,
      pronunciation: null,
      imageUrl: advanced.imageUrl || null,
    };
  }

  if (isJlpt || isJlptWord(word)) {
    const jlpt = word as JlptWord;
    const meaningSummary = [jlpt.meaningEnglish, jlpt.meaningKorean]
      .filter(hasTrimmedText)
      .join(" / ");
    const translationSummary = [jlpt.translationEnglish, jlpt.translationKorean]
      .filter(hasTrimmedText)
      .join(" / ");

    return {
      id: jlpt.id,
      courseId,
      courseLabel,
      coursePath,
      schemaVariant: "jlpt",
      dayId: dayId ?? null,
      sourceHref: buildCourseWordSourceHref(courseId, jlpt.id, dayId),
      type,
      primaryText: jlpt.word,
      secondaryText: meaningSummary || null,
      meaning: meaningSummary || null,
      meaningEnglish: jlpt.meaningEnglish || null,
      meaningKorean: jlpt.meaningKorean || null,
      translation: translationSummary || null,
      translationEnglish: jlpt.translationEnglish || null,
      translationKorean: jlpt.translationKorean || null,
      example: jlpt.example || null,
      exampleRoman: jlpt.exampleRoman || null,
      pronunciation: jlpt.pronunciation || null,
      pronunciationRoman: jlpt.pronunciationRoman || null,
      imageUrl: jlpt.imageUrl || null,
    };
  }

  if (isPrefix || isPrefixWord(word)) {
    const p = word as PrefixWord;
    const meaningSummary = [p.meaningEnglish, p.meaningKorean].filter(hasTrimmedText).join(" / ");
    const translationSummary = [p.translationEnglish, p.translationKorean].filter(hasTrimmedText).join(" / ");

    return {
      id: p.id,
      courseId,
      courseLabel,
      coursePath,
      schemaVariant: "prefix",
      dayId: dayId ?? null,
      sourceHref: buildCourseWordSourceHref(courseId, p.id, dayId),
      type,
      primaryText: p.prefix,
      secondaryText: meaningSummary || null,
      meaning: meaningSummary || null,
      meaningEnglish: p.meaningEnglish || null,
      meaningKorean: p.meaningKorean || null,
      translation: translationSummary || null,
      translationEnglish: p.translationEnglish || null,
      translationKorean: p.translationKorean || null,
      example: p.example || null,
      exampleRoman: p.exampleRoman || null,
      pronunciation: p.pronunciation || null,
      pronunciationRoman: p.pronunciationRoman || null,
      imageUrl: null,
      prefix: p.prefix,
    };
  }

  if (isPostfix || isPostfixWord(word)) {
    const p = word as PostfixWord;
    const meaningSummary = [p.meaningEnglish, p.meaningKorean].filter(hasTrimmedText).join(" / ");
    const translationSummary = [p.translationEnglish, p.translationKorean].filter(hasTrimmedText).join(" / ");

    return {
      id: p.id,
      courseId,
      courseLabel,
      coursePath,
      schemaVariant: "postfix",
      dayId: dayId ?? null,
      sourceHref: buildCourseWordSourceHref(courseId, p.id, dayId),
      type,
      primaryText: p.postfix,
      secondaryText: meaningSummary || null,
      meaning: meaningSummary || null,
      meaningEnglish: p.meaningEnglish || null,
      meaningKorean: p.meaningKorean || null,
      translation: translationSummary || null,
      translationEnglish: p.translationEnglish || null,
      translationKorean: p.translationKorean || null,
      example: p.example || null,
      exampleRoman: p.exampleRoman || null,
      pronunciation: p.pronunciation || null,
      pronunciationRoman: p.pronunciationRoman || null,
      imageUrl: null,
      postfix: p.postfix,
    };
  }

  const standard = word as StandardWord;
  return {
    id: standard.id,
    courseId,
    courseLabel,
    coursePath,
    schemaVariant: "standard",
    dayId: dayId ?? null,
    sourceHref: buildCourseWordSourceHref(courseId, standard.id, dayId),
    type,
    primaryText: standard.word,
    secondaryText: standard.meaning || null,
    meaning: standard.meaning || null,
    synonym: standard.synonym || null,
    translation: standard.translation || null,
    example: standard.example || null,
    pronunciation: standard.pronunciation || null,
    imageUrl: standard.imageUrl || null,
    derivative: standard.derivative ?? null,
  };
}

export function getWordTableMissingActionField(
  word: Word,
  args: {
    isCollocation: boolean;
    isIdiom?: boolean;
    isExtremelyAdvanced?: boolean;
    isJlpt?: boolean;
    isFamousQuote?: boolean;
    isPrefix?: boolean;
    isPostfix?: boolean;
    showImageUrl?: boolean;
    supportsDerivatives?: boolean;
  },
): WordFinderActionField[] {
  const actionOrder: WordFinderActionField[] = [
    "image",
    "pronunciation",
    "example",
    "translation",
    "derivative",
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
    isIdiom?: boolean;
    isExtremelyAdvanced?: boolean;
    isJlpt?: boolean;
    isFamousQuote?: boolean;
    isPrefix?: boolean;
    isPostfix?: boolean;
    showImageUrl?: boolean;
    supportsDerivatives?: boolean;
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
      case "image":
        return Boolean(args.showImageUrl) && !hasTrimmedText(collocation.imageUrl);
      case "pronunciation":
      case "derivative":
        return false;
      default:
        return false;
    }
  }

  if (args.isIdiom || isIdiomWord(word)) {
    const idiom = word as IdiomWord;

    switch (field) {
      case "primaryText":
        return !hasTrimmedText(idiom.idiom);
      case "meaning":
        return !hasTrimmedText(idiom.meaning);
      case "example":
        return !hasTrimmedText(idiom.example);
      case "translation":
        return !hasTrimmedText(idiom.translation);
      case "image":
        return Boolean(args.showImageUrl) && !hasTrimmedText(idiom.imageUrl);
      case "pronunciation":
      case "derivative":
        return false;
      default:
        return false;
    }
  }

  if (args.isExtremelyAdvanced) {
    const advanced = word as ExtremelyAdvancedWord;

    switch (field) {
      case "primaryText":
        return !hasTrimmedText(advanced.word);
      case "meaning":
        return !hasTrimmedText(advanced.meaning);
      case "example":
        return !hasTrimmedText(advanced.example);
      case "translation":
        return !hasTrimmedText(advanced.translation);
      case "image":
        return Boolean(args.showImageUrl) && !hasTrimmedText(advanced.imageUrl);
      case "pronunciation":
      case "derivative":
        return false;
      default:
        return false;
    }
  }

  if (args.isJlpt || isJlptWord(word)) {
    const jlpt = word as JlptWord;

    switch (field) {
      case "primaryText":
        return !hasTrimmedText(jlpt.word);
      case "meaning":
        return !hasTrimmedText(jlpt.meaningEnglish) || !hasTrimmedText(jlpt.meaningKorean);
      case "pronunciation":
        return !hasTrimmedText(jlpt.pronunciation);
      case "example":
        return !hasTrimmedText(jlpt.example);
      case "furigana":
        return hasTrimmedText(jlpt.example) && !hasParentheticalFurigana(jlpt.example);
      case "translation":
        return (
          !hasTrimmedText(jlpt.translationEnglish) ||
          !hasTrimmedText(jlpt.translationKorean)
        );
      case "image":
        return Boolean(args.showImageUrl) && !hasTrimmedText(jlpt.imageUrl);
      case "derivative":
        return false;
      default:
        return false;
    }
  }

  if (args.isPrefix || isPrefixWord(word)) {
    const p = word as PrefixWord;
    switch (field) {
      case "primaryText": return !hasTrimmedText(p.prefix);
      case "meaning": return !hasTrimmedText(p.meaningEnglish) || !hasTrimmedText(p.meaningKorean);
      case "pronunciation": return !hasTrimmedText(p.pronunciation);
      case "example": return !hasTrimmedText(p.example);
      case "furigana": return false;
      case "translation": return !hasTrimmedText(p.translationEnglish) || !hasTrimmedText(p.translationKorean);
      case "image":
      case "derivative":
        return false;
      default: return false;
    }
  }

  if (args.isPostfix || isPostfixWord(word)) {
    const p = word as PostfixWord;
    switch (field) {
      case "primaryText": return !hasTrimmedText(p.postfix);
      case "meaning": return !hasTrimmedText(p.meaningEnglish) || !hasTrimmedText(p.meaningKorean);
      case "pronunciation": return !hasTrimmedText(p.pronunciation);
      case "example": return !hasTrimmedText(p.example);
      case "furigana": return false;
      case "translation": return !hasTrimmedText(p.translationEnglish) || !hasTrimmedText(p.translationKorean);
      case "image":
      case "derivative":
        return false;
      default: return false;
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
    case "furigana":
      return false;
    case "translation":
      return !hasTrimmedText(standard.translation);
    case "derivative":
      return (
        Boolean(args.supportsDerivatives) &&
        !hasDerivativeEntries(standard.derivative)
      );
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
    isIdiom?: boolean;
    isExtremelyAdvanced?: boolean;
    isJlpt?: boolean;
    isFamousQuote?: boolean;
    isPrefix?: boolean;
    isPostfix?: boolean;
    showImageUrl?: boolean;
    supportsDerivatives?: boolean;
  },
): Exclude<CourseDayMissingField, "all">[] {
  const orderedFields: Exclude<CourseDayMissingField, "all">[] = [
    "primaryText",
    "meaning",
    "pronunciation",
    "example",
    "furigana",
    "translation",
    "derivative",
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
  if (typeof updates.pronunciationRoman === "string" && (isJlptWord(word) || isPrefixWord(word) || isPostfixWord(word))) {
    next.pronunciationRoman = updates.pronunciationRoman;
  }
  if (typeof updates.example === "string") {
    next.example = updates.example;
  }
  if (typeof updates.exampleRoman === "string" && (isJlptWord(word) || isPrefixWord(word) || isPostfixWord(word))) {
    next.exampleRoman = updates.exampleRoman;
  }
  if (typeof updates.translation === "string") {
    next.translation = updates.translation;
  }
  if (typeof updates.translationEnglish === "string" && (isJlptWord(word) || isPrefixWord(word) || isPostfixWord(word))) {
    next.translationEnglish = updates.translationEnglish;
  }
  if (typeof updates.translationKorean === "string" && (isJlptWord(word) || isPrefixWord(word) || isPostfixWord(word))) {
    next.translationKorean = updates.translationKorean;
  }
  if (typeof updates.imageUrl === "string" && !("quote" in word) && !isPrefixWord(word) && !isPostfixWord(word)) {
    next.imageUrl = updates.imageUrl;
  }
  if (
    Array.isArray(updates.derivative) &&
    !("quote" in word) &&
    !("collocation" in word) &&
    !isJlptWord(word) &&
    !isPrefixWord(word) &&
    !isPostfixWord(word)
  ) {
    next.derivative = updates.derivative;
  }
  return next;
}
