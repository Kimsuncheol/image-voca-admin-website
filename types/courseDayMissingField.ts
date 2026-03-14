export type CourseDayMissingField =
  | "all"
  | "primaryText"
  | "meaning"
  | "pronunciation"
  | "example"
  | "translation"
  | "image";

export type CourseDayActionableMissingField = Exclude<
  CourseDayMissingField,
  "all" | "primaryText" | "meaning"
>;
