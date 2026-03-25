export type CourseDayMissingField =
  | "all"
  | "primaryText"
  | "meaning"
  | "pronunciation"
  | "example"
  | "exampleHasKorean"
  | "translation"
  | "derivative"
  | "image";

export type CourseDayActionableMissingField = Exclude<
  CourseDayMissingField,
  "all" | "primaryText" | "meaning"
>;
