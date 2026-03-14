import assert from "node:assert/strict";
import test from "node:test";

import {
  createCourseDayGenerateWordFieldRequest,
  extractCourseDayGenerateWordFieldUpdates,
  mapCourseDayGeneratedImages,
  planCourseDayBulkGeneration,
} from "./courseDayBulkGeneration.ts";
import type { WordFinderResult } from "../types/wordFinder.ts";

function createResult(
  overrides: Partial<WordFinderResult>,
): WordFinderResult {
  return {
    id: "word-1",
    courseId: "TOEIC",
    courseLabel: "TOEIC",
    coursePath: "courses/TOEIC",
    dayId: "Day1",
    sourceHref: "/courses/TOEIC/Day1",
    type: "standard",
    primaryText: "wander",
    secondaryText: "to move around",
    meaning: "to move around",
    translation: null,
    example: null,
    pronunciation: null,
    imageUrl: null,
    ...overrides,
  };
}

test("pronunciation bulk planning skips multi-word rows", () => {
  const snapshot = [
    createResult({ id: "single-word", primaryText: "wander" }),
    createResult({ id: "phrase", primaryText: "take off" }),
  ];

  const plan = planCourseDayBulkGeneration(snapshot, "pronunciation");

  assert.deepEqual(
    plan.eligible.map((item) => item.id),
    ["single-word"],
  );
  assert.deepEqual(
    plan.skipped.map((item) => ({ id: item.result.id, reason: item.reason })),
    [{ id: "phrase", reason: "multiWord" }],
  );
});

test("example generation request requires meaning", () => {
  assert.equal(
    createCourseDayGenerateWordFieldRequest(
      createResult({ meaning: null }),
      "example",
    ),
    null,
  );

  assert.deepEqual(
    createCourseDayGenerateWordFieldRequest(
      createResult({ primaryText: "wander", meaning: "move around" }),
      "example",
    ),
    {
      field: "example",
      word: "wander",
      meaning: "move around",
    },
  );
});

test("translation generation keeps both translation and example updates", () => {
  const updates = extractCourseDayGenerateWordFieldUpdates("translation", {
    example: "1. Tourists wander around the city.",
    translation: "1. 관광객들이 도시를 돌아다닌다.",
  });

  assert.deepEqual(updates, {
    example: "1. Tourists wander around the city.",
    translation: "1. 관광객들이 도시를 돌아다닌다.",
  });
});

test("image generation response maps successes and failures by index", () => {
  const snapshot = [
    createResult({ id: "word-1" }),
    createResult({ id: "word-2", primaryText: "brief" }),
  ];

  const mapped = mapCourseDayGeneratedImages(snapshot, {
    words: [
      { word: "wander", meaning: "to move around", imageUrl: "https://example.com/1.png" },
      { word: "brief", meaning: "short", imageUrl: "" },
    ],
    failures: [
      {
        index: 1,
        word: "brief",
        meaning: "short",
        code: "INTERNAL_ERROR",
        error: "Image generation failed.",
      },
    ],
  });

  assert.deepEqual(mapped.updates, [
    {
      result: snapshot[0],
      imageUrl: "https://example.com/1.png",
    },
  ]);
  assert.deepEqual(mapped.failures.map((failure) => failure.index), [1]);
});
