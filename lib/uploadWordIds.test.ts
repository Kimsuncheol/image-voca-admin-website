import assert from "node:assert/strict";
import { test } from "vitest";

import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";
import { buildDerivativeAwareWordsForUpload } from "@/services/vocaSaveService";
import type { DerivativePreviewItemResult } from "@/types/vocabulary";

import {
  assignDeterministicUploadIdsForItems,
  assignDeterministicUploadWordIds,
  buildDeterministicUploadWordId,
  normalizeCourseLabelForWordId,
} from "./uploadWordIds";

test("normalizeCourseLabelForWordId converts labels to upper snake case", () => {
  assert.equal(normalizeCourseLabelForWordId("TOEFL / IELTS"), "TOEFL_IELTS");
  assert.equal(normalizeCourseLabelForWordId("Famous Quote"), "FAMOUS_QUOTE");
});

test("assignDeterministicUploadWordIds uses course label and day name", () => {
  const words = assignDeterministicUploadWordIds(
    [
      { word: "abandon", meaning: "to leave", pronunciation: "", example: "", translation: "" },
      { word: "brief", meaning: "short", pronunciation: "", example: "", translation: "" },
    ],
    "TOEIC",
    "Day3",
  );

  assert.deepEqual(
    words.map((word) => word.id),
    ["TOEIC_Day3_1", "TOEIC_Day3_2"],
  );
  assert.equal(buildDeterministicUploadWordId("TOEIC", "Day10", 7), "TOEIC_Day10_7");
});

test("assignDeterministicUploadWordIds recomputes ids when the day changes", () => {
  const baseWords = [
    { collocation: "take off", meaning: "depart", explanation: "", example: "", translation: "" },
  ];

  const day1 = assignDeterministicUploadWordIds(baseWords, "Collocations", "Day1");
  const day4 = assignDeterministicUploadWordIds(baseWords, "Collocations", "Day4");

  assert.equal(day1[0].id, "COLLOCATIONS_Day1_1");
  assert.equal(day4[0].id, "COLLOCATIONS_Day4_1");
});

test("assignDeterministicUploadIdsForItems batches multiple days with stable numbering", () => {
  const result = assignDeterministicUploadIdsForItems(
    [
      {
        dayName: "Day1",
        words: [
          { word: "abandon", meaning: "to leave", pronunciation: "", example: "", translation: "" },
          { word: "brief", meaning: "short", pronunciation: "", example: "", translation: "" },
        ],
      },
      {
        dayName: "Day4",
        words: [
          { word: "care", meaning: "attention", pronunciation: "", example: "", translation: "" },
        ],
      },
    ],
    "standard",
    "TOEFL / IELTS",
  );

  assert.deepEqual(
    result.map((item) =>
      item.words.map(
        (word) =>
          (word as { id?: string }).id,
      ),
    ),
    [
      ["TOEFL_IELTS_Day1_1", "TOEFL_IELTS_Day1_2"],
      ["TOEFL_IELTS_Day4_1"],
    ],
  );
});

test("assignDeterministicUploadIdsForItems preserves non-standard schemas", () => {
  const result = assignDeterministicUploadIdsForItems(
    [
      {
        dayName: "Day1",
        words: [{ quote: "Stay hungry.", author: "Jobs", translation: "배고프게 살아라.", language: "English" }],
      },
    ],
    "famousQuote",
    "Famous Quote",
  );

  assert.deepEqual(result, [
    {
      dayName: "Day1",
      words: [{ quote: "Stay hungry.", author: "Jobs", translation: "배고프게 살아라.", language: "English" }],
    },
  ]);
});

test("assignDeterministicUploadIdsForItems assigns ids for Kanji uploads", () => {
  const result = assignDeterministicUploadIdsForItems(
    [
      {
        dayName: "Day1",
        words: [
          {
            kanji: "一",
            meaning: ["ひと"],
            meaningExample: [{ items: ["一言"] }],
            meaningExampleHurigana: [{ items: ["ひとこと"] }],
            meaningEnglishTranslation: [{ items: ["A single word"] }],
            meaningKoreanTranslation: [{ items: ["한마디 말"] }],
            reading: ["いち"],
            readingExample: [{ items: ["一月"] }],
            readingExampleHurigana: [{ items: ["いちがつ"] }],
            readingEnglishTranslation: [{ items: ["January"] }],
            readingKoreanTranslation: [{ items: ["1월"] }],
            example: ["一月です。"],
            exampleEnglishTranslation: ["It is January."],
            exampleKoreanTranslation: ["1월입니다."],
            exampleHurigana: ["いちがつです。"],
          },
        ],
      },
    ],
    "kanji",
    "Kanji",
  );

  assert.equal((result[0].words[0] as { id?: string }).id, "KANJI_Day1_1");
});

test("derivative selections stay on the base word and receive only original deterministic ids", () => {
  const previewItems: DerivativePreviewItemResult[] = [
    {
      itemId: "item-1",
      dayName: "Day2",
      words: [
        {
          baseWord: "care",
          baseMeaning: "attention",
          candidates: [
            {
              word: "careful",
              meaning: "showing care",
              source: "word-sense",
              selectedByDefault: true,
            },
          ],
        },
      ],
    },
  ];

  const processedItems = buildDerivativeAwareWordsForUpload(
    [
      {
        id: "item-1",
        dayName: "Day2",
        data: {
          words: [
            {
              word: "care",
              meaning: "attention",
              pronunciation: "",
              example: "",
              translation: "",
            },
          ],
        },
      },
    ],
    previewItems,
    { "item-1": { care: { careful: true } } },
  );

  const wordsWithIds = assignDeterministicUploadWordIds(
    processedItems[0].data.words as StandardWordInput[],
    "CSAT",
    processedItems[0].dayName,
  ) as Array<StandardWordInput & { id: string }>;

  assert.deepEqual(
    wordsWithIds.map((word) => word.id),
    ["CSAT_Day2_1"],
  );
  assert.equal(wordsWithIds[0]?.word, "care");
  assert.deepEqual(wordsWithIds[0]?.derivative, [
    { word: "careful", meaning: "showing care" },
  ]);
});

test("batched item generation keeps base-word numbering identical when derivatives are stored inline", () => {
  const previewItems: DerivativePreviewItemResult[] = [
    {
      itemId: "item-1",
      dayName: "Day2",
      words: [
        {
          baseWord: "care",
          baseMeaning: "attention",
          candidates: [
            {
              word: "careful",
              meaning: "showing care",
              source: "word-sense",
              selectedByDefault: true,
            },
          ],
        },
      ],
    },
  ];

  const processedItems = buildDerivativeAwareWordsForUpload(
    [
      {
        id: "item-1",
        dayName: "Day2",
        data: {
          words: [
            {
              word: "care",
              meaning: "attention",
              pronunciation: "",
              example: "",
              translation: "",
            },
          ],
        },
      },
    ],
    previewItems,
    { "item-1": { care: { careful: true } } },
  );

  const batched = assignDeterministicUploadIdsForItems(
    processedItems.map((item) => ({
      dayName: item.dayName,
      words: item.data.words,
    })),
    "standard",
    "CSAT",
  );
  const single = assignDeterministicUploadWordIds(
    processedItems[0].data.words as StandardWordInput[],
    "CSAT",
    processedItems[0].dayName,
  ) as Array<StandardWordInput & { id: string }>;

  assert.deepEqual(batched[0]?.words, single);
  assert.equal(single.length, 1);
  assert.deepEqual(single[0]?.derivative, [
    { word: "careful", meaning: "showing care" },
  ]);
});
