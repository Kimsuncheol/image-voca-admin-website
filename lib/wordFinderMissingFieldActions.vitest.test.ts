import { describe, expect, it } from "vitest";

import {
  getWordFinderFieldValue,
  isWordFinderFieldMissing,
} from "./wordFinderMissingFieldActions";
import type { WordFinderResult } from "../types/wordFinder";

function createJlptResult(
  overrides: Partial<WordFinderResult> = {},
): WordFinderResult {
  return {
    id: "jlpt-1",
    courseId: "JLPT",
    courseLabel: "JLPT",
    coursePath: "courses/JLPT",
    schemaVariant: "jlpt",
    dayId: "Day1",
    sourceHref: "/courses/JLPT/Day1",
    type: "standard",
    primaryText: "猫",
    secondaryText: "cat / 고양이",
    meaning: "cat / 고양이",
    meaningEnglish: "cat",
    meaningKorean: "고양이",
    translation: "There is a cat. / 고양이가 있다.",
    translationEnglish: "There is a cat.",
    translationKorean: "고양이가 있다.",
    example: "猫がいる。",
    pronunciation: "ねこ",
    pronunciationRoman: "neko",
    imageUrl: null,
    ...overrides,
  };
}

function createStandardResult(
  overrides: Partial<WordFinderResult> = {},
): WordFinderResult {
  return {
    id: "toeic-1",
    courseId: "TOEIC",
    courseLabel: "TOEIC",
    coursePath: "courses/TOEIC",
    schemaVariant: "standard",
    dayId: "Day1",
    sourceHref: "/courses/TOEIC/Day1",
    type: "standard",
    primaryText: "wander",
    secondaryText: "to move around",
    meaning: "to move around",
    translation: "돌아다니다",
    example: "We wander through the city.",
    pronunciation: "wan-der",
    imageUrl: null,
    derivative: null,
    ...overrides,
  };
}

describe("wordFinderMissingFieldActions JLPT", () => {
  it("treats pronunciation and translation as composite fields", () => {
    const missing = createJlptResult({
      pronunciationRoman: null,
      translationKorean: "",
    });

    expect(isWordFinderFieldMissing(missing, "pronunciation")).toBe(true);
    expect(isWordFinderFieldMissing(missing, "translation")).toBe(true);
  });

  it("formats composite pronunciation text for shared usage", () => {
    const result = createJlptResult();

    expect(getWordFinderFieldValue(result, "pronunciation")).toBe("ねこ / neko");
    expect(getWordFinderFieldValue(result, "translation")).toBe(
      "There is a cat. / 고양이가 있다.",
    );
  });

  it("treats exampleHurigana as missing only when the example exists without it", () => {
    const missing = createJlptResult({ exampleHurigana: "" });
    const present = createJlptResult({ exampleHurigana: "ねこがいる。" });

    expect(isWordFinderFieldMissing(missing, "exampleHurigana")).toBe(true);
    expect(isWordFinderFieldMissing(present, "exampleHurigana")).toBe(false);
    expect(getWordFinderFieldValue(present, "exampleHurigana")).toBe("ねこがいる。");
  });

  it("uses imageUrl missing state for JLPT rows", () => {
    const missing = createJlptResult({ imageUrl: null });
    const present = createJlptResult({ imageUrl: "https://example.com/jlpt.png" });

    expect(isWordFinderFieldMissing(missing, "image")).toBe(true);
    expect(isWordFinderFieldMissing(present, "image")).toBe(false);
    expect(getWordFinderFieldValue(present, "image")).toBe(
      "https://example.com/jlpt.png",
    );
  });

  it("treats derivatives as a supported standard-only missing field", () => {
    const missing = createStandardResult({ derivative: [] });
    const present = createStandardResult({
      derivative: [{ word: "wandering", meaning: "moving around" }],
    });
    const unsupported = createStandardResult({
      courseId: "JLPT",
      courseLabel: "JLPT",
      coursePath: "courses/JLPT",
      schemaVariant: "jlpt",
      derivative: null,
    });

    expect(isWordFinderFieldMissing(missing, "derivative")).toBe(true);
    expect(isWordFinderFieldMissing(present, "derivative")).toBe(false);
    expect(isWordFinderFieldMissing(unsupported, "derivative")).toBe(false);
    expect(getWordFinderFieldValue(present, "derivative")).toContain("wandering");
  });
});
