import assert from "node:assert/strict";
import test from "node:test";

import { generateImagesForUploadWords } from "./generateImages.ts";

test("generateImagesForUploadWords replaces existing images on success", async () => {
  const result = await generateImagesForUploadWords(
    [
      { word: "abandon", meaning: "to leave behind" },
      {
        word: "brief",
        meaning: "short",
        imageUrl: "https://example.com/brief-old.png",
      },
    ],
    async (word) => ({
      imageUrl: `https://example.com/${word.word}-new.png`,
    }),
    2,
  );

  assert.deepEqual(result.words, [
    {
      word: "abandon",
      meaning: "to leave behind",
      imageUrl: "https://example.com/abandon-new.png",
    },
    {
      word: "brief",
      meaning: "short",
      imageUrl: "https://example.com/brief-new.png",
    },
  ]);
  assert.deepEqual(result.failures, []);
});

test("generateImagesForUploadWords preserves old image on replacement failure", async () => {
  const result = await generateImagesForUploadWords(
    [
      {
        word: "brief",
        meaning: "short",
        imageUrl: "https://example.com/brief-old.png",
      },
      { word: "portable", meaning: "easy to carry" },
    ],
    async () => {
      throw new Error("generation failed");
    },
    2,
  );

  assert.deepEqual(result.words, [
    {
      word: "brief",
      meaning: "short",
      imageUrl: "https://example.com/brief-old.png",
    },
    {
      word: "portable",
      meaning: "easy to carry",
      imageUrl: "",
    },
  ]);

  assert.deepEqual(result.failures, [
    {
      index: 0,
      word: "brief",
      meaning: "short",
      code: "INTERNAL_ERROR",
      error: "Image generation failed.",
    },
    {
      index: 1,
      word: "portable",
      meaning: "easy to carry",
      code: "INTERNAL_ERROR",
      error: "Image generation failed.",
    },
  ]);
});
