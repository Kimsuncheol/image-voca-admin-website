import { describe, expect, it } from "vitest";

import { normalizeMangaDayId, resolveMangaTarget } from "./mangaPaths";

describe("manga path resolution", () => {
  it("resolves non-JLPT course and day paths", () => {
    expect(
      resolveMangaTarget({
        courseId: "CSAT",
        day: 3,
      }),
    ).toEqual({
      courseId: "CSAT",
      dayId: "Day3",
      firestoreRootDocPath: "manga/CSAT",
      firestoreDayDocPath: "manga/CSAT/days/Day3",
      firestoreItemsCollectionPath: "manga/CSAT/days/Day3/items",
      storagePrefix: "manga/CSAT/Day3",
    });
  });

  it("resolves TOEFL_IELTS and JLPT level hierarchies", () => {
    expect(
      resolveMangaTarget({
        courseId: "TOEFL_IELTS",
        day: 8,
      }).storagePrefix,
    ).toBe("manga/TOEFL_IELTS/Day8");

    expect(
      resolveMangaTarget({
        courseId: "JLPT",
        jlptLevel: "N2",
        day: 5,
      }),
    ).toEqual({
      courseId: "JLPT",
      jlptLevel: "N2",
      dayId: "Day5",
      firestoreRootDocPath: "manga/JLPT/levels/N2",
      firestoreDayDocPath: "manga/JLPT/levels/N2/days/Day5",
      firestoreItemsCollectionPath: "manga/JLPT/levels/N2/days/Day5/items",
      storagePrefix: "manga/JLPT/N2/Day5",
    });
  });

  it("normalizes day ids and rejects missing JLPT levels", () => {
    expect(normalizeMangaDayId("Day14")).toBe("Day14");
    expect(() =>
      resolveMangaTarget({
        courseId: "JLPT",
        day: 5,
      }),
    ).toThrow("JLPT level is required.");
  });
});
