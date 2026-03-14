import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCourseInlineEdit,
  applyWordFinderInlineEdit,
  resolveCourseInlineEditField,
  resolveWordFinderInlineEditField,
} from "./wordFinderInlineEdit.ts";
import type { WordFinderResult } from "../types/wordFinder.ts";

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

test("standard primaryText edits map to the word field", () => {
  const result = resolveWordFinderInlineEditField(createResult(), "primaryText");

  assert.deepEqual(result, {
    sourceField: "word",
    value: "wander",
  });
});

test("collocation primaryText edits map to the collocation field", () => {
  const result = resolveWordFinderInlineEditField(
    createResult({
      type: "collocation",
      primaryText: "take off",
      meaning: "remove",
      secondaryText: "remove clothing",
    }),
    "primaryText",
  );

  assert.deepEqual(result, {
    sourceField: "collocation",
    value: "take off",
  });
});

test("meaning edits map correctly for both standard and collocation rows", () => {
  const standard = resolveWordFinderInlineEditField(createResult(), "meaning");
  const collocation = resolveWordFinderInlineEditField(
    createResult({
      type: "collocation",
      primaryText: "take off",
      meaning: "remove",
      secondaryText: "remove clothing",
    }),
    "meaning",
  );

  assert.deepEqual(standard, {
    sourceField: "meaning",
    value: "to move around",
  });
  assert.deepEqual(collocation, {
    sourceField: "meaning",
    value: "remove",
  });
});

test("famous quote rows are rejected as non-editable", () => {
  const result = resolveWordFinderInlineEditField(
    createResult({
      type: "famousQuote",
      dayId: null,
      primaryText: "Stay hungry, stay foolish.",
      secondaryText: "Steve Jobs",
      meaning: null,
    }),
    "primaryText",
  );

  assert.equal(result, null);
});

test("course word mapping rejects famous quotes and maps word text correctly", () => {
  const standard = resolveCourseInlineEditField({
    word: {
      id: "word-1",
      word: "wander",
      meaning: "to move around",
      pronunciation: "",
      example: "",
      translation: "",
    },
    isCollocation: false,
    field: "primaryText",
  });
  const famousQuote = resolveCourseInlineEditField({
    word: {
      id: "quote-1",
      quote: "Stay hungry, stay foolish.",
      author: "Steve Jobs",
      translation: "",
    },
    isCollocation: false,
    isFamousQuote: true,
    field: "primaryText",
  });

  assert.deepEqual(standard, {
    sourceField: "word",
    value: "wander",
  });
  assert.equal(famousQuote, null);
});

test("inline edit patches update word finder rows and course rows locally", () => {
  const updatedResult = applyWordFinderInlineEdit(
    createResult(),
    "meaning",
    "to roam freely",
  );
  const updatedCourseWord = applyCourseInlineEdit(
    {
      id: "col-1",
      collocation: "take off",
      meaning: "remove",
      explanation: "remove clothing",
      example: "",
      translation: "",
    },
    "primaryText",
    "carry out",
  );

  assert.equal(updatedResult.meaning, "to roam freely");
  assert.equal(updatedResult.secondaryText, "to roam freely");
  assert.deepEqual(updatedCourseWord, {
    collocation: "carry out",
  });
});
