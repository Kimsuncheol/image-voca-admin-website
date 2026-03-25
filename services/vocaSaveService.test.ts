import assert from "node:assert/strict";
import { test } from "vitest";

import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";
import { buildDerivativeAwareWordsForUpload } from "./vocaSaveService";

test("buildDerivativeAwareWordsForUpload leaves words unchanged when nothing is selected", () => {
  const items = [
    {
      id: "item-1",
      dayName: "Day1",
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
  ];

  const result = buildDerivativeAwareWordsForUpload(
    items,
    [
      {
        itemId: "item-1",
        dayName: "Day1",
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
    ],
    { "item-1": { care: { careful: false } } },
  );

  assert.deepEqual(result, items);
});

test("buildDerivativeAwareWordsForUpload stores selected derivatives on the matching base word only", () => {
  const result = buildDerivativeAwareWordsForUpload(
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
            {
              word: "use",
              meaning: "purpose",
              pronunciation: "",
              example: "",
              translation: "",
            },
          ],
        },
      },
    ],
    [
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
          {
            baseWord: "use",
            baseMeaning: "purpose",
            candidates: [
              {
                word: "useful",
                meaning: "helpful or practical",
                source: "word-sense",
                selectedByDefault: true,
              },
            ],
          },
        ],
      },
    ],
    { "item-1": { care: { careful: true }, use: { useful: false } } },
  );

  assert.equal(result[0]?.data.words.length, 2);
  assert.deepEqual((result[0]?.data.words[0] as StandardWordInput | undefined)?.derivative, [
    { word: "careful", meaning: "showing care" },
  ]);
  assert.equal("derivative" in (result[0]?.data.words[1] ?? {}), false);
});

test("buildDerivativeAwareWordsForUpload does not create shared derivative documents for duplicate candidates", () => {
  const result = buildDerivativeAwareWordsForUpload(
    [
      {
        id: "item-1",
        dayName: "Day3",
        data: {
          words: [
            {
              word: "effect",
              meaning: "result",
              pronunciation: "",
              example: "",
              translation: "",
            },
            {
              word: "efficacy",
              meaning: "effectiveness",
              pronunciation: "",
              example: "",
              translation: "",
            },
          ],
        },
      },
    ],
    [
      {
        itemId: "item-1",
        dayName: "Day3",
        words: [
          {
            baseWord: "effect",
            baseMeaning: "result",
            candidates: [
              {
                word: "effective",
                meaning: "producing the intended result",
                source: "word-sense",
                selectedByDefault: true,
              },
            ],
          },
          {
            baseWord: "efficacy",
            baseMeaning: "effectiveness",
            candidates: [
              {
                word: "effective",
                meaning: "successful in producing a desired result",
                source: "word-sense",
                selectedByDefault: true,
              },
            ],
          },
        ],
      },
    ],
    { "item-1": { effect: { effective: true }, efficacy: { effective: true } } },
  );

  assert.equal(result[0]?.data.words.length, 2);
  assert.equal(
    result[0]?.data.words.filter((word) => word.word === "effective").length,
    0,
  );
  assert.deepEqual((result[0]?.data.words[0] as StandardWordInput | undefined)?.derivative, [
    { word: "effective", meaning: "producing the intended result" },
  ]);
  assert.deepEqual((result[0]?.data.words[1] as StandardWordInput | undefined)?.derivative, [
    { word: "effective", meaning: "successful in producing a desired result" },
  ]);
});
