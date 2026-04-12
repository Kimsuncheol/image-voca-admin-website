import type { CourseId } from "./course";

export type WordFinderType = "standard" | "collocation" | "idiom" | "famousQuote";
export type WordFinderSchemaVariant =
  | "standard"
  | "extremelyAdvanced"
  | "jlpt"
  | "collocation"
  | "idiom"
  | "famousQuote"
  | "prefix"
  | "postfix";

export type WordFinderMissingField =
  | "all"
  | "image"
  | "pronunciation"
  | "example"
  | "exampleHurigana"
  | "derivative"
  | "translation";

export type WordFinderActionField = Exclude<WordFinderMissingField, "all">;

export interface WordFinderResult {
  id: string;
  courseId: CourseId;
  courseLabel: string;
  coursePath: string;
  schemaVariant: WordFinderSchemaVariant;
  dayId: string | null;
  sourceHref: string;
  type: WordFinderType;
  primaryText: string;
  secondaryText: string | null;
  meaning: string | null;
  synonym?: string | null;
  meaningEnglish?: string | null;
  meaningKorean?: string | null;
  translation: string | null;
  translationEnglish?: string | null;
  translationKorean?: string | null;
  example: string | null;
  pronunciation: string | null;
  pronunciationRoman?: string | null;
  exampleRoman?: string | null;
  exampleHurigana?: string | null;
  imageUrl: string | null;
  derivative?: Array<{ word: string; meaning: string }> | null;
  prefix?: string | null;
  postfix?: string | null;
}

export type WordFinderResultFieldUpdates = Partial<
  Pick<
    WordFinderResult,
    | "primaryText"
    | "meaning"
    | "imageUrl"
    | "pronunciation"
    | "pronunciationRoman"
    | "example"
    | "exampleRoman"
    | "exampleHurigana"
    | "translation"
    | "translationEnglish"
    | "translationKorean"
    | "derivative"
  >
>;

export interface WordFinderResponse {
  ok: true;
  results: WordFinderResult[];
  total: number;
  limited: boolean;
}
