export type CourseDayMissingField =
  | "all"
  | "primaryText"
  | "meaning"
  | "pronunciation"
  | "example"
  | "exampleHasKorean"
  | "translation"
  | "image";

export type CourseDayActionableMissingField = Exclude<
  CourseDayMissingField,
  "all" | "primaryText" | "meaning"
>;
