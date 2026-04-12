export type CourseDayMissingField =
  | "all"
  | "primaryText"
  | "meaning"
  | "pronunciation"
  | "example"
  | "furigana"
  | "exampleHasKorean"
  | "exampleHurigana"
  | "translation"
  | "derivative"
  | "image";

export type CourseDayActionableMissingField = Exclude<
  CourseDayMissingField,
  "all" | "primaryText" | "meaning"
>;
