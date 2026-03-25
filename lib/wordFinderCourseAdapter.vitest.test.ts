import { describe, expect, it } from "vitest";

import {
  adaptCourseWordToWordFinderResult,
  getCourseWordMissingFields,
  getWordTableMissingActionField,
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
});
