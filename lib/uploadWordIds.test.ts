import assert from "node:assert/strict";
import test from "node:test";

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
        words: [{ quote: "Stay hungry.", author: "Jobs", translation: "배고프게 살아라." }],
      },
    ],
    "famousQuote",
    "Famous Quote",
  );

  assert.deepEqual(result, [
    {
      dayName: "Day1",
      words: [{ quote: "Stay hungry.", author: "Jobs", translation: "배고프게 살아라." }],
    },
  ]);
});

test("derivative-expanded uploads receive sequential deterministic ids", () => {
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

  const expandedItems = buildDerivativeAwareWordsForUpload(
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
    expandedItems[0].data.words,
    "CSAT",
    expandedItems[0].dayName,
  );

  assert.deepEqual(
    wordsWithIds.map((word) => word.id),
    ["CSAT_Day2_1", "CSAT_Day2_2"],
  );
  assert.deepEqual(
    wordsWithIds.map((word) => word.word),
    ["care", "careful"],
  );
});

test("batched item generation keeps derivative-expanded numbering identical to single-item generation", () => {
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

  const expandedItems = buildDerivativeAwareWordsForUpload(
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
    expandedItems.map((item) => ({
      dayName: item.dayName,
      words: item.data.words,
    })),
    "standard",
    "CSAT",
  );
  const single = assignDeterministicUploadWordIds(
    expandedItems[0].data.words,
    "CSAT",
    expandedItems[0].dayName,
  );

  assert.deepEqual(batched[0]?.words, single);
});
