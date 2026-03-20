import { describe, expect, it } from "vitest";

import {
  parseSheetValues,
  shouldTreatSheetParseAsValidationError,
} from "./sheetsApi";

describe("sheetsApi", () => {
  it("routes Google Sheets values through the shared parser validation", () => {
    const result = parseSheetValues(
      [
        ["word", "meaning", "pronunciation", "example", "translation"],
        ["focus", "attention", "", "Focus on your goal.", "집중하다"],
        ["猫", "cat", "", "A cat appears.", "고양이"],
      ],
      "standard",
    );

    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toMatchObject({
      word: "focus",
    });
    expect(result.errors).toEqual([
      "Row 2: must contain English characters in word",
    ]);
  });

  it("treats all-invalid parsed sheet results as validation failures", () => {
    const result = parseSheetValues(
      [
        ["word", "meaning", "pronunciation", "example", "translation"],
        ["猫", "cat", "", "", "고양이"],
      ],
      "standard",
    );

    expect(result.words).toEqual([]);
    expect(result.errors).toEqual([
      "Row 1: must contain English characters in word",
    ]);
    expect(shouldTreatSheetParseAsValidationError(result)).toBe(true);
  });
});
