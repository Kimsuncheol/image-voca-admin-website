import { describe, expect, it } from "vitest";

import {
  getCourseDayBulkAction,
  planCourseDayBulkGeneration,
} from "./courseDayBulkGeneration";
import type { WordFinderResult } from "../types/wordFinder";

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
    translation: null,
    example: null,
    pronunciation: null,
    imageUrl: null,
    derivative: null,
    ...overrides,
  };
}

describe("courseDayBulkGeneration derivatives", () => {
  it("selects the derivative preview bulk action only for supported pages", () => {
    expect(getCourseDayBulkAction("derivative", false, true)).toEqual({
      kind: "derivative-preview",
      field: "derivative",
    });
    expect(getCourseDayBulkAction("derivative", false, false)).toBeNull();
  });

  it("derivative bulk planning skips multi-word rows and rows without meaning", () => {
    const plan = planCourseDayBulkGeneration(
      [
        createResult({ id: "eligible", primaryText: "care", meaning: "attention" }),
        createResult({ id: "multi-word", primaryText: "take off", meaning: "remove" }),
        createResult({ id: "missing-meaning", primaryText: "use", meaning: null }),
      ],
      "derivative",
    );

    expect(plan.eligible.map((item) => item.id)).toEqual(["eligible"]);
    expect(plan.skipped.map((item) => ({ id: item.result.id, reason: item.reason }))).toEqual([
      { id: "multi-word", reason: "multiWord" },
      { id: "missing-meaning", reason: "missingMeaning" },
    ]);
  });
});
