import assert from "node:assert/strict";
import { test } from "vitest";

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
    schemaVariant: "standard",
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

test("standard pronunciation edits map to the pronunciation field", () => {
  const word = {
    id: "word-1",
    word: "wander",
    meaning: "to move around",
    pronunciation: "wan-der",
    example: "",
    translation: "",
  };

  assert.deepEqual(
    resolveCourseInlineEditField({
      word,
      isCollocation: false,
      field: "pronunciation",
    }),
    {
      sourceField: "pronunciation",
      value: "wan-der",
    },
  );
  assert.deepEqual(applyCourseInlineEdit(word, "pronunciation", "wahn-der"), {
    pronunciation: "wahn-der",
  });
});

test("JLPT pronunciation edits map to the pronunciation field", () => {
  const word = {
    id: "jlpt-1",
    word: "猫",
    meaningEnglish: "cat",
    meaningKorean: "고양이",
    pronunciation: "ねこ",
    pronunciationRoman: "neko",
    example: "",
    exampleRoman: "",
    translationEnglish: "",
    translationKorean: "",
  };

  assert.deepEqual(
    resolveCourseInlineEditField({
      word,
      isCollocation: false,
      isJlpt: true,
      field: "pronunciation",
    }),
    {
      sourceField: "pronunciation",
      value: "ねこ",
    },
  );
  assert.deepEqual(applyCourseInlineEdit(word, "pronunciation", "ネコ"), {
    pronunciation: "ネコ",
  });
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

// ── Prefix word ──────────────────────────────────────────────────────────────

const prefixWord = {
  id: "px-1",
  prefix: "再-",
  meaningEnglish: "again",
  meaningKorean: "다시",
  pronunciation: "さい",
  pronunciationRoman: "sai",
  example: "再生する",
  exampleRoman: "saisei suru",
  translationEnglish: "to regenerate",
  translationKorean: "재생하다",
};

test("prefix primaryText resolves to sourceField 'prefix'", () => {
  const result = resolveCourseInlineEditField({
    word: prefixWord,
    isCollocation: false,
    isPrefix: true,
    field: "primaryText",
  });

  assert.deepEqual(result, { sourceField: "prefix", value: "再-" });
});

test("prefix meaningEnglish resolves correctly", () => {
  const result = resolveCourseInlineEditField({
    word: prefixWord,
    isCollocation: false,
    isPrefix: true,
    field: "meaningEnglish",
  });

  assert.deepEqual(result, { sourceField: "meaningEnglish", value: "again" });
});

test("prefix pronunciation resolves and applies correctly", () => {
  const result = resolveCourseInlineEditField({
    word: prefixWord,
    isCollocation: false,
    isPrefix: true,
    field: "pronunciation",
  });
  const patch = applyCourseInlineEdit(prefixWord, "pronunciation", "さい-new");

  assert.deepEqual(result, { sourceField: "pronunciation", value: "さい" });
  assert.deepEqual(patch, { pronunciation: "さい-new" });
});

test("prefix word detected by type guard without isPrefix flag", () => {
  const result = resolveCourseInlineEditField({
    word: prefixWord,
    isCollocation: false,
    field: "primaryText",
  });

  assert.deepEqual(result, { sourceField: "prefix", value: "再-" });
});

test("applyCourseInlineEdit maps primaryText to prefix field", () => {
  const patch = applyCourseInlineEdit(prefixWord, "primaryText", "未-");
  assert.deepEqual(patch, { prefix: "未-" });
});

test("applyCourseInlineEdit maps meaningEnglish for prefix", () => {
  const patch = applyCourseInlineEdit(prefixWord, "meaningEnglish", "not yet");
  assert.deepEqual(patch, { meaningEnglish: "not yet" });
});

test("applyCourseInlineEdit maps example for prefix", () => {
  const patch = applyCourseInlineEdit(prefixWord, "example", "未完成");
  assert.deepEqual(patch, { example: "未完成" });
});

// ── Postfix word ─────────────────────────────────────────────────────────────

const postfixWord = {
  id: "pf-1",
  postfix: "-的",
  meaningEnglish: "-like",
  meaningKorean: "-적",
  pronunciation: "てき",
  pronunciationRoman: "teki",
  example: "科学的",
  exampleRoman: "kagakuteki",
  translationEnglish: "scientific",
  translationKorean: "과학적",
};

test("postfix primaryText resolves to sourceField 'postfix'", () => {
  const result = resolveCourseInlineEditField({
    word: postfixWord,
    isCollocation: false,
    isPostfix: true,
    field: "primaryText",
  });

  assert.deepEqual(result, { sourceField: "postfix", value: "-的" });
});

test("postfix word detected by type guard without isPostfix flag", () => {
  const result = resolveCourseInlineEditField({
    word: postfixWord,
    isCollocation: false,
    field: "primaryText",
  });

  assert.deepEqual(result, { sourceField: "postfix", value: "-的" });
});

test("postfix pronunciation resolves and applies correctly", () => {
  const result = resolveCourseInlineEditField({
    word: postfixWord,
    isCollocation: false,
    isPostfix: true,
    field: "pronunciation",
  });
  const patch = applyCourseInlineEdit(postfixWord, "pronunciation", "てき-new");

  assert.deepEqual(result, { sourceField: "pronunciation", value: "てき" });
  assert.deepEqual(patch, { pronunciation: "てき-new" });
});

test("applyCourseInlineEdit maps primaryText to postfix field", () => {
  const patch = applyCourseInlineEdit(postfixWord, "primaryText", "-化");
  assert.deepEqual(patch, { postfix: "-化" });
});

test("applyCourseInlineEdit maps translationKorean for postfix", () => {
  const patch = applyCourseInlineEdit(postfixWord, "translationKorean", "화학적");
  assert.deepEqual(patch, { translationKorean: "화학적" });
});

// ── Mutual exclusion ─────────────────────────────────────────────────────────

test("prefix field is null for unsupported fields", () => {
  const result = resolveCourseInlineEditField({
    word: prefixWord,
    isCollocation: false,
    isPrefix: true,
    field: "meaning",  // prefix uses meaningEnglish/meaningKorean, not meaning
  });

  assert.equal(result, null);
});
