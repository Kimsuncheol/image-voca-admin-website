import assert from "node:assert/strict";
import { test } from "vitest";

import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";

import {
  prepareStandardWordsForUpload,
  shouldIncludeImageUrl,
} from "./standardWordUpload";

const baseWords: StandardWordInput[] = [
  {
    word: "abandon",
    meaning: "to leave behind",
    pronunciation: "",
    example: "",
    translation: "",
  },
  {
    word: "portable",
    meaning: "easy to carry",
    pronunciation: "",
    example: "",
    translation: "",
  },
];

test("exam courses include imageUrl", () => {
  assert.equal(shouldIncludeImageUrl("CSAT"), true);
  assert.equal(shouldIncludeImageUrl("TOEFL_IELTS"), true);
  assert.equal(shouldIncludeImageUrl("TOEIC"), true);
});

test("non-exam courses do not include imageUrl", () => {
  assert.equal(shouldIncludeImageUrl("COLLOCATIONS"), false);
  assert.equal(shouldIncludeImageUrl("FAMOUS_QUOTE"), false);
  assert.equal(shouldIncludeImageUrl(""), false);
});

test("prepareStandardWordsForUpload backfills empty imageUrl for exam courses", () => {
  const result = prepareStandardWordsForUpload(baseWords, "TOEIC");

  assert.deepEqual(result, [
    {
      word: "abandon",
      meaning: "to leave behind",
      pronunciation: "",
      example: "",
      translation: "",
      imageUrl: "",
    },
    {
      word: "portable",
      meaning: "easy to carry",
      pronunciation: "",
      example: "",
      translation: "",
      imageUrl: "",
    },
  ]);
});

test("prepareStandardWordsForUpload preserves derivative arrays", () => {
  const derivativeLikeWords = [
    {
      word: "portable",
      meaning: "easy to carry",
      pronunciation: "",
      example: "",
      translation: "",
      derivative: [{ word: "portability", meaning: "the quality of being portable" }],
    },
  ] as unknown as StandardWordInput[];

  const result = prepareStandardWordsForUpload(derivativeLikeWords, "TOEFL_IELTS");

  assert.deepEqual(result, [
    {
      word: "portable",
      meaning: "easy to carry",
      pronunciation: "",
      example: "",
      translation: "",
      derivative: [{ word: "portability", meaning: "the quality of being portable" }],
      imageUrl: "",
    },
  ]);
});

test("prepareStandardWordsForUpload preserves generated imageUrl values", () => {
  const wordsWithImage: StandardWordInput[] = [
    {
      word: "abandon",
      meaning: "to leave behind",
      pronunciation: "",
      example: "",
      translation: "",
      imageUrl: "https://example.com/abandon.png",
    },
  ];

  const result = prepareStandardWordsForUpload(wordsWithImage, "CSAT");

  assert.deepEqual(result, wordsWithImage);
});

test("prepareStandardWordsForUpload leaves non-exam courses unchanged", () => {
  const result = prepareStandardWordsForUpload(baseWords, "COLLOCATIONS");

  assert.equal(result, baseWords);
  assert.equal("imageUrl" in result[0], false);
});
