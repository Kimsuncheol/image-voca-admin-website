import { describe, expect, it } from "vitest";

import { matchesMissingField } from "./wordFinderSearch";
import type { WordFinderResult } from "../../types/wordFinder";

function createResult(
  overrides: Partial<WordFinderResult> = {},
): WordFinderResult {
  return {
    id: "word-1",
    courseId: "TOEIC",
    courseLabel: "TOEIC",
    coursePath: "courses/TOEIC",
    dayId: "Day1",
    sourceHref: "/courses/TOEIC/Day1",
    schemaVariant: "standard",
    type: "standard",
    primaryText: "wander",
    secondaryText: "to move around",
    meaning: "to move around",
    translation: "돌아다니다",
    example: "We wander through the city.",
    pronunciation: "wan-der",
    imageUrl: "https://example.com/wander.png",
    derivative: null,
    ...overrides,
  };
}

describe("wordFinderSearch derivatives", () => {
  it("matches missing derivatives only for supported standard English results", () => {
    expect(matchesMissingField(createResult({ derivative: [] }), "derivative")).toBe(true);
    expect(
      matchesMissingField(
        createResult({
          derivative: [{ word: "wandering", meaning: "moving about" }],
        }),
        "derivative",
      ),
    ).toBe(false);
    expect(
      matchesMissingField(
        createResult({
          courseId: "JLPT",
          courseLabel: "JLPT",
          coursePath: "courses/JLPT",
          schemaVariant: "jlpt",
          derivative: [],
        }),
        "derivative",
      ),
    ).toBe(false);
  });

  it("matches missing exampleHurigana only for JLPT rows with an example", () => {
    expect(
      matchesMissingField(
        createResult({
          courseId: "JLPT",
          courseLabel: "JLPT",
          coursePath: "courses/JLPT",
          schemaVariant: "jlpt",
          example: "猫がいる。",
          exampleHurigana: "",
        }),
        "exampleHurigana",
      ),
    ).toBe(true);

    expect(
      matchesMissingField(
        createResult({
          courseId: "JLPT",
          courseLabel: "JLPT",
          coursePath: "courses/JLPT",
          schemaVariant: "jlpt",
          example: "猫がいる。",
          exampleHurigana: "ねこがいる。",
        }),
        "exampleHurigana",
      ),
    ).toBe(false);
  });
});
