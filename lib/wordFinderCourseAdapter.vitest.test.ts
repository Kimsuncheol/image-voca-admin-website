import { describe, expect, it } from "vitest";

import {
  adaptCourseWordToWordFinderResult,
  getCourseWordMissingFields,
  getWordTableMissingActionField,
  isCourseWordFieldMissing,
} from "./wordFinderCourseAdapter";

describe("wordFinderCourseAdapter derivatives", () => {
  it("maps derivative arrays onto standard Word Finder results", () => {
    const result = adaptCourseWordToWordFinderResult({
      word: {
        id: "word-1",
        word: "use",
        meaning: "purpose",
        pronunciation: "",
        example: "",
        translation: "",
        derivative: [{ word: "useful", meaning: "helpful or practical" }],
      },
      courseId: "TOEIC",
      courseLabel: "TOEIC",
      coursePath: "courses/TOEIC",
      dayId: "Day1",
      isCollocation: false,
    });

    expect(result.derivative).toEqual([
      { word: "useful", meaning: "helpful or practical" },
    ]);
  });

  it("includes derivative as a missing field only for supported standard rows", () => {
    const missingFields = getCourseWordMissingFields(
      {
        id: "word-1",
        word: "care",
        meaning: "attention",
        pronunciation: "",
        example: "",
        translation: "",
      },
      { isCollocation: false, supportsDerivatives: true },
    );

    const unsupportedFields = getCourseWordMissingFields(
      {
        id: "word-1",
        word: "care",
        meaning: "attention",
        pronunciation: "",
        example: "",
        translation: "",
      },
      { isCollocation: false, supportsDerivatives: false },
    );

    expect(missingFields).toContain("derivative");
    expect(unsupportedFields).not.toContain("derivative");
  });

  it("exposes derivative generation as a word-table action only when supported", () => {
    const supportedActions = getWordTableMissingActionField(
      {
        id: "word-1",
        word: "care",
        meaning: "attention",
        pronunciation: "",
        example: "",
        translation: "",
      },
      { isCollocation: false, supportsDerivatives: true },
    );

    const unsupportedActions = getWordTableMissingActionField(
      {
        id: "word-1",
        word: "care",
        meaning: "attention",
        pronunciation: "",
        example: "",
        translation: "",
      },
      { isCollocation: false, supportsDerivatives: false },
    );

    expect(supportedActions).toContain("derivative");
    expect(unsupportedActions).not.toContain("derivative");
  });

  it("treats JLPT examples without parentheses markup as missing furigana", () => {
    expect(
      isCourseWordFieldMissing(
        {
          id: "jlpt-1",
          word: "猫",
          meaningEnglish: "cat",
          meaningKorean: "고양이",
          pronunciation: "ねこ",
          pronunciationRoman: "neko",
          example: "猫が好きです",
          exampleRoman: "",
          translationEnglish: "I like cats.",
          translationKorean: "고양이를 좋아합니다.",
        },
        { isCollocation: false, isJlpt: true },
        "furigana",
      ),
    ).toBe(true);

    expect(
      isCourseWordFieldMissing(
        {
          id: "jlpt-2",
          word: "猫",
          meaningEnglish: "cat",
          meaningKorean: "고양이",
          pronunciation: "ねこ",
          pronunciationRoman: "neko",
          example: "猫(ねこ)が好きです",
          exampleRoman: "",
          translationEnglish: "I like cats.",
          translationKorean: "고양이를 좋아합니다.",
        },
        { isCollocation: false, isJlpt: true },
        "furigana",
      ),
    ).toBe(false);
  });
});
