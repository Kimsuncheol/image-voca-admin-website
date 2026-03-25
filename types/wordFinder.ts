import type { CourseId } from "./course";

export type WordFinderType = "standard" | "collocation" | "famousQuote";
export type WordFinderSchemaVariant =
  | "standard"
  | "jlpt"
  | "collocation"
  | "famousQuote"
  | "prefix"
  | "postfix";

export type WordFinderMissingField =
  | "all"
  | "image"
  | "pronunciation"
  | "example"
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
  meaningEnglish?: string | null;
  meaningKorean?: string | null;
  translation: string | null;
  translationEnglish?: string | null;
  translationKorean?: string | null;
  example: string | null;
  pronunciation: string | null;
  pronunciationRoman?: string | null;
  exampleRoman?: string | null;
  imageUrl: string | null;
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
    | "translation"
    | "translationEnglish"
    | "translationKorean"
  >
>;

export interface WordFinderResponse {
  ok: true;
  results: WordFinderResult[];
  total: number;
  limited: boolean;
}
