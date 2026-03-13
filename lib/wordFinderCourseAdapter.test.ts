import assert from "node:assert/strict";
import test from "node:test";

import {
  adaptCourseWordToWordFinderResult,
  applyCourseWordResolvedUpdates,
  getWordTableMissingActionField,
} from "./wordFinderCourseAdapter.ts";

test("adapter maps standard word rows for modal usage", () => {
  const result = adaptCourseWordToWordFinderResult({
    word: {
      id: "word-1",
      word: "wander",
      meaning: "to move around",
      pronunciation: "",
      example: "",
      translation: "",
      imageUrl: "",
    },
    courseId: "TOEIC",
    courseLabel: "TOEIC",
    coursePath: "courses/TOEIC",
    dayId: "Day1",
    isCollocation: false,
  });

  assert.equal(result.type, "standard");
  assert.equal(result.primaryText, "wander");
  assert.equal(result.dayId, "Day1");
  assert.equal(result.meaning, "to move around");
});

test("adapter maps collocation and famous-quote rows for modal usage", () => {
  const collocation = adaptCourseWordToWordFinderResult({
    word: {
      id: "col-1",
      collocation: "take off",
      meaning: "to remove",
      explanation: "remove clothing",
      example: "",
      translation: "",
    },
    courseId: "COLLOCATIONS",
    courseLabel: "Collocations",
    coursePath: "courses/COLLOCATIONS",
    dayId: "Day4",
    isCollocation: true,
  });
  const quote = adaptCourseWordToWordFinderResult({
    word: {
      id: "quote-1",
      quote: "Stay hungry, stay foolish.",
      author: "Steve Jobs",
      translation: "",
    },
    courseId: "FAMOUS_QUOTE",
    courseLabel: "Famous Quote",
    coursePath: "famous_quotes",
    isCollocation: false,
    isFamousQuote: true,
  });

  assert.equal(collocation.type, "collocation");
  assert.equal(collocation.primaryText, "take off");
  assert.equal(collocation.secondaryText, "remove clothing");
  assert.equal(quote.type, "famousQuote");
  assert.equal(quote.primaryText, "Stay hungry, stay foolish.");
  assert.equal(quote.secondaryText, "Steve Jobs");
  assert.equal(quote.dayId, null);
});

test("missing action helper exposes correct modal fields by row type", () => {
  const standardFields = getWordTableMissingActionField(
    {
      id: "word-1",
      word: "wander",
      meaning: "to move around",
      pronunciation: "",
      example: "",
      translation: "",
      imageUrl: "",
    },
    { isCollocation: false, showImageUrl: true },
  );
  const collocationFields = getWordTableMissingActionField(
    {
      id: "col-1",
      collocation: "take off",
      meaning: "to remove",
      explanation: "remove clothing",
      example: "",
      translation: "",
    },
    { isCollocation: true },
  );
  const quoteFields = getWordTableMissingActionField(
    {
      id: "quote-1",
      quote: "Stay hungry, stay foolish.",
      author: "Steve Jobs",
      translation: "",
    },
    { isCollocation: false, isFamousQuote: true },
  );

  assert.deepEqual(standardFields, [
    "image",
    "pronunciation",
    "example",
    "translation",
  ]);
  assert.deepEqual(collocationFields, ["example", "translation"]);
  assert.deepEqual(quoteFields, ["translation"]);
});

test("resolved updates map back onto course table rows", () => {
  const standardUpdates = applyCourseWordResolvedUpdates(
    {
      id: "word-1",
      word: "wander",
      meaning: "to move around",
      pronunciation: "",
      example: "",
      translation: "",
      imageUrl: "",
    },
    {
      example: "1. We wander through the park.",
      translation: "1. 우리는 공원을 돌아다닌다.",
      imageUrl: "https://example.com/image.png",
    },
  );
  const quoteUpdates = applyCourseWordResolvedUpdates(
    {
      id: "quote-1",
      quote: "Stay hungry, stay foolish.",
      author: "Steve Jobs",
      translation: "",
    },
    {
      translation: "늘 갈망하고 우직하게 나아가라.",
    },
  );

  assert.deepEqual(standardUpdates, {
    example: "1. We wander through the park.",
    translation: "1. 우리는 공원을 돌아다닌다.",
    imageUrl: "https://example.com/image.png",
  });
  assert.deepEqual(quoteUpdates, {
    translation: "늘 갈망하고 우직하게 나아가라.",
  });
});
