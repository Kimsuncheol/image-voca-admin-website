import assert from "node:assert/strict";
import test from "node:test";

import type { WordFinderResult } from "../../types/wordFinder.ts";

import {
  buildPrimaryTextExactMatchIndex,
  compareWordFinderResults,
  matchesExactPrimaryTextQuery,
  matchesMissingField,
  matchesType,
  normalizeWordFinderSearchKey,
} from "./wordFinderSearch.ts";
import {
  getCachedCourseResults,
  invalidateCourseCache,
  setCachedCourseResults,
} from "./wordCache.ts";

function createResult(
  overrides: Partial<WordFinderResult>,
): WordFinderResult {
  return {
    id: "id",
    courseId: "TOEIC",
    courseLabel: "TOEIC",
    coursePath: "courses/TOEIC",
    dayId: "Day1",
    sourceHref: "/courses/TOEIC/Day1",
    type: "standard",
    primaryText: "wander",
    secondaryText: "to move around",
    meaning: "to move around",
    translation: "돌아다니다",
    example: "We wander through the city.",
    pronunciation: "wan-der",
    imageUrl: "https://example.com/wander.png",
    ...overrides,
  };
}

test("exact primaryText matching is case-insensitive and whitespace-normalized", () => {
  const searchKey = normalizeWordFinderSearchKey("  WANDER   ");
  const results = [
    createResult({ id: "exact", primaryText: "wander" }),
    createResult({ id: "spaced", primaryText: "take off" }),
  ];

  assert.equal(matchesExactPrimaryTextQuery(results[0], searchKey), true);
  assert.equal(
    matchesExactPrimaryTextQuery(
      results[1],
      normalizeWordFinderSearchKey("  take   off "),
    ),
    true,
  );
});

test("exact primaryText matching excludes partial and secondary-field matches", () => {
  const searchKey = normalizeWordFinderSearchKey("wander");
  const results = [
    createResult({ id: "exact", primaryText: "wander" }),
    createResult({ id: "partial", primaryText: "wanderer" }),
    createResult({
      id: "secondary-field",
      primaryText: "roam",
      meaning: "wander around",
      secondaryText: "wander around",
      translation: "wander",
      example: "We wander at night.",
    }),
  ];

  const matchedIds = results
    .filter((result) => matchesExactPrimaryTextQuery(result, searchKey))
    .map((result) => result.id);

  assert.deepEqual(matchedIds, ["exact"]);
});

test("filters still narrow exact matches by type, missing field, and course", () => {
  const searchKey = normalizeWordFinderSearchKey("wander");
  const results = [
    createResult({
      id: "kept",
      courseId: "TOEIC",
      type: "standard",
      imageUrl: null,
    }),
    createResult({
      id: "wrong-course",
      courseId: "TOEFL_IELTS",
      courseLabel: "TOEFL / IELTS",
      coursePath: "courses/TOEFL_IELTS",
      sourceHref: "/courses/TOEFL_IELTS/Day1",
      imageUrl: null,
    }),
    createResult({
      id: "wrong-type",
      courseId: "COLLOCATIONS",
      courseLabel: "Collocations",
      coursePath: "courses/COLLOCATIONS",
      sourceHref: "/courses/COLLOCATIONS/Day1",
      type: "collocation",
      imageUrl: null,
      pronunciation: null,
    }),
    createResult({
      id: "has-image",
      imageUrl: "https://example.com/image.png",
    }),
  ];

  const matchedIds = results
    .filter((result) => result.courseId === "TOEIC")
    .filter((result) => matchesExactPrimaryTextQuery(result, searchKey))
    .filter((result) => matchesType(result, "standard"))
    .filter((result) => matchesMissingField(result, "image"))
    .sort(compareWordFinderResults)
    .map((result) => result.id);

  assert.deepEqual(matchedIds, ["kept"]);
});

test("missing-image filtering also matches collocation results", () => {
  const collocation = createResult({
    id: "collocation-missing-image",
    courseId: "COLLOCATIONS",
    courseLabel: "Collocations",
    coursePath: "courses/COLLOCATIONS",
    sourceHref: "/courses/COLLOCATIONS/Day1",
    type: "collocation",
    pronunciation: null,
    imageUrl: null,
  });
  const collocationWithImage = createResult({
    id: "collocation-has-image",
    courseId: "COLLOCATIONS",
    courseLabel: "Collocations",
    coursePath: "courses/COLLOCATIONS",
    sourceHref: "/courses/COLLOCATIONS/Day1",
    type: "collocation",
    pronunciation: null,
    imageUrl: "https://example.com/collocation.png",
  });

  assert.equal(matchesMissingField(collocation, "image"), true);
  assert.equal(matchesMissingField(collocationWithImage, "image"), false);
});

test("browse behavior without a query keeps all results and uses deterministic ordering", () => {
  const results = [
    createResult({
      id: "b",
      courseId: "TOEIC",
      dayId: "Day10",
      primaryText: "zeta",
    }),
    createResult({
      id: "a",
      courseId: "TOEIC",
      dayId: "Day2",
      primaryText: "alpha",
    }),
    createResult({
      id: "c",
      courseId: "TOEFL_IELTS",
      courseLabel: "TOEFL / IELTS",
      coursePath: "courses/TOEFL_IELTS",
      sourceHref: "/courses/TOEFL_IELTS/Day1",
      dayId: "Day1",
      primaryText: "beta",
    }),
  ];

  const orderedIds = results
    .filter((result) => matchesExactPrimaryTextQuery(result, ""))
    .sort(compareWordFinderResults)
    .map((result) => result.id);

  assert.deepEqual(orderedIds, ["c", "a", "b"]);
});

test("exact-match index lookup matches raw filtering and is stored in cache", () => {
  invalidateCourseCache();

  const results = [
    createResult({ id: "first", primaryText: "wander" }),
    createResult({
      id: "second",
      primaryText: "Wander",
      courseId: "TOEFL_IELTS",
      courseLabel: "TOEFL / IELTS",
      coursePath: "courses/TOEFL_IELTS",
      sourceHref: "/courses/TOEFL_IELTS/Day1",
    }),
    createResult({ id: "other", primaryText: "wanderer" }),
  ];
  const searchKey = normalizeWordFinderSearchKey("wander");

  const rawMatchedIds = results
    .filter((result) => matchesExactPrimaryTextQuery(result, searchKey))
    .sort(compareWordFinderResults)
    .map((result) => result.id);

  const directIndexMatchedIds = (
    buildPrimaryTextExactMatchIndex(results).get(searchKey) ?? []
  )
    .slice()
    .sort(compareWordFinderResults)
    .map((result) => result.id);

  setCachedCourseResults("TOEIC", results);
  const cachedMatchedIds =
    (getCachedCourseResults("TOEIC")?.exactPrimaryTextIndex.get(searchKey) ?? [])
      .slice()
      .sort(compareWordFinderResults)
      .map((result) => result.id);

  assert.deepEqual(directIndexMatchedIds, rawMatchedIds);
  assert.deepEqual(cachedMatchedIds, rawMatchedIds);

  invalidateCourseCache();
});
