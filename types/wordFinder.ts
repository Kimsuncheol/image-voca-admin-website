import type { CourseId } from "./course";

export type WordFinderType = "standard" | "collocation" | "famousQuote";

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
  dayId: string | null;
  sourceHref: string;
  type: WordFinderType;
  primaryText: string;
  secondaryText: string | null;
  meaning: string | null;
  translation: string | null;
  example: string | null;
  pronunciation: string | null;
  imageUrl: string | null;
}

export type WordFinderResultFieldUpdates = Partial<
  Pick<
    WordFinderResult,
    "primaryText" | "meaning" | "imageUrl" | "pronunciation" | "example" | "translation"
  >
>;

export interface WordFinderResponse {
  ok: true;
  results: WordFinderResult[];
  total: number;
  limited: boolean;
}
