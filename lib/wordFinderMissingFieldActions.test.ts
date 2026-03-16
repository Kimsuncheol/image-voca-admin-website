import assert from "node:assert/strict";
import test from "node:test";

import type { WordFinderResult } from "../types/wordFinder.ts";

import {
  applyWordFinderResultUpdates,
  filterSharedWordFinderCandidates,
  getWordFinderFieldValue,
  getWordFinderResultKey,
  isWordFinderFieldMissing,
} from "./wordFinderMissingFieldActions.ts";

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

test("missing-field helpers detect only interactive missing chips", () => {
  const standard = createResult({});
  const collocation = createResult({
    type: "collocation",
    courseId: "COLLOCATIONS",
    courseLabel: "Collocations",
    coursePath: "courses/COLLOCATIONS",
    sourceHref: "/courses/COLLOCATIONS/Day1",
    pronunciation: null,
    imageUrl: null,
  });
  const quote = createResult({
    type: "famousQuote",
    dayId: null,
    primaryText: "Stay hungry, stay foolish.",
    meaning: null,
    secondaryText: "Steve Jobs",
  });

  assert.equal(isWordFinderFieldMissing(standard, "image"), true);
  assert.equal(isWordFinderFieldMissing(standard, "pronunciation"), true);
  assert.equal(isWordFinderFieldMissing(standard, "example"), true);
  assert.equal(isWordFinderFieldMissing(standard, "translation"), true);
  assert.equal(isWordFinderFieldMissing(collocation, "image"), true);
  assert.equal(isWordFinderFieldMissing(collocation, "pronunciation"), false);
  assert.equal(isWordFinderFieldMissing(quote, "example"), false);
  assert.equal(isWordFinderFieldMissing(quote, "translation"), true);
});

test("shared image and pronunciation matching uses normalized word only", () => {
  const current = createResult({
    courseId: "TOEIC",
    primaryText: "wander",
    meaning: "move around without purpose",
  });
  const candidates = [
    createResult({
      id: "same-course",
      imageUrl: "https://example.com/same-course.png",
      pronunciation: "wan-der",
    }),
    createResult({
      id: "other-course-match",
      courseId: "TOEFL_IELTS",
      courseLabel: "TOEFL / IELTS",
      coursePath: "courses/TOEFL_IELTS",
      sourceHref: "/courses/TOEFL_IELTS/Day3",
      dayId: "Day3",
      primaryText: "  WANDER  ",
      meaning: "different sense entirely",
      imageUrl: "https://example.com/shared.png",
      pronunciation: "shared-pronunciation",
    }),
    createResult({
      id: "different-word",
      courseId: "CSAT",
      courseLabel: "CSAT",
      coursePath: "courses/CSAT",
      sourceHref: "/courses/CSAT/Day2",
      dayId: "Day2",
      primaryText: "wanderer",
      imageUrl: "https://example.com/nope.png",
      pronunciation: "nope",
    }),
  ];

  assert.deepEqual(
    filterSharedWordFinderCandidates(current, candidates, "image").map((item) =>
      item.id,
    ),
    ["other-course-match"],
  );
  assert.deepEqual(
    filterSharedWordFinderCandidates(current, candidates, "pronunciation").map(
      (item) => item.id,
    ),
    ["other-course-match"],
  );
});

test("shared example and translation matching uses word plus meaning", () => {
  const current = createResult({
    primaryText: "wander",
    meaning: "to move around without purpose",
  });
  const candidates = [
    createResult({
      id: "same-meaning",
      courseId: "TOEFL_IELTS",
      courseLabel: "TOEFL / IELTS",
      coursePath: "courses/TOEFL_IELTS",
      sourceHref: "/courses/TOEFL_IELTS/Day4",
      dayId: "Day4",
      meaning: "to move around without purpose",
      example: "1. Tourists wander around the city.",
      translation: "1. 관광객들이 도시를 돌아다닌다.",
    }),
    createResult({
      id: "different-meaning",
      courseId: "CSAT",
      courseLabel: "CSAT",
      coursePath: "courses/CSAT",
      sourceHref: "/courses/CSAT/Day8",
      dayId: "Day8",
      meaning: "to speak off-topic",
      example: "1. He tends to wander in conversation.",
      translation: "1. 그는 대화에서 자주 딴길로 샌다.",
    }),
  ];

  assert.deepEqual(
    filterSharedWordFinderCandidates(current, candidates, "example").map(
      (item) => item.id,
    ),
    ["same-meaning"],
  );
  assert.deepEqual(
    filterSharedWordFinderCandidates(current, candidates, "translation").map(
      (item) => item.id,
    ),
    ["same-meaning"],
  );
});

test("famous-quote translation sharing falls back to quote text only", () => {
  const current = createResult({
    id: "quote-current",
    courseId: "FAMOUS_QUOTE",
    courseLabel: "Famous Quote",
    coursePath: "famous_quotes",
    dayId: null,
    sourceHref: "/courses/FAMOUS_QUOTE",
    type: "famousQuote",
    primaryText: "Stay hungry, stay foolish.",
    meaning: null,
    secondaryText: "Steve Jobs",
  });
  const candidates = [
    createResult({
      id: "quote-match",
      courseId: "TOEIC",
      courseLabel: "TOEIC",
      coursePath: "courses/TOEIC",
      sourceHref: "/courses/TOEIC/Day9",
      type: "famousQuote",
      dayId: null,
      primaryText: "Stay hungry, stay foolish.",
      secondaryText: "Different author",
      translation: "늘 갈망하고 우직하게 나아가라.",
      meaning: null,
    }),
    createResult({
      id: "quote-different",
      courseId: "TOEFL_IELTS",
      courseLabel: "TOEFL / IELTS",
      coursePath: "courses/TOEFL_IELTS",
      sourceHref: "/courses/TOEFL_IELTS/Day5",
      type: "famousQuote",
      dayId: null,
      primaryText: "Your time is limited.",
      translation: "당신의 시간은 한정되어 있다.",
      meaning: null,
    }),
  ];

  assert.deepEqual(
    filterSharedWordFinderCandidates(current, candidates, "translation").map(
      (item) => item.id,
    ),
    ["quote-match"],
  );
});

test("applyWordFinderResultUpdates supports single-field copy and multi-field generation results", () => {
  const current = createResult({});
  const sharedCandidate = createResult({
    courseId: "TOEFL_IELTS",
    imageUrl: "https://example.com/shared.png",
    example: "1. Tourists wander around the city.",
    translation: "1. 관광객들이 도시를 돌아다닌다.",
  });

  const afterSharedCopy = applyWordFinderResultUpdates(current, {
    translation: getWordFinderFieldValue(sharedCandidate, "translation"),
  });
  assert.equal(afterSharedCopy.translation, "1. 관광객들이 도시를 돌아다닌다.");
  assert.equal(afterSharedCopy.example, null);

  const afterTranslationGeneration = applyWordFinderResultUpdates(current, {
    example: "1. Tourists wander around the city.",
    translation: "1. 관광객들이 도시를 돌아다닌다.",
  });
  assert.equal(afterTranslationGeneration.example, "1. Tourists wander around the city.");
  assert.equal(
    afterTranslationGeneration.translation,
    "1. 관광객들이 도시를 돌아다닌다.",
  );
});

test("shared candidate filtering preserves multiple matches for explicit admin choice", () => {
  const current = createResult({});
  const matches = filterSharedWordFinderCandidates(
    current,
    [
      createResult({
        id: "shared-1",
        courseId: "TOEFL_IELTS",
        courseLabel: "TOEFL / IELTS",
        coursePath: "courses/TOEFL_IELTS",
        sourceHref: "/courses/TOEFL_IELTS/Day1",
        imageUrl: "https://example.com/1.png",
      }),
      createResult({
        id: "shared-2",
        courseId: "CSAT",
        courseLabel: "CSAT",
        coursePath: "courses/CSAT",
        sourceHref: "/courses/CSAT/Day1",
        imageUrl: "https://example.com/2.png",
      }),
    ],
    "image",
  );

  assert.deepEqual(matches.map((match) => getWordFinderResultKey(match)), [
    "TOEFL_IELTS:Day1:shared-1",
    "CSAT:Day1:shared-2",
  ]);
});
