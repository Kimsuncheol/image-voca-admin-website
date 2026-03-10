import assert from "node:assert/strict";
import test from "node:test";

import { generateImagesForUploadWords } from "./generateImages.ts";

test("generateImagesForUploadWords preserves order and partial failures", async () => {
  const result = await generateImagesForUploadWords(
    [
      { word: "abandon", meaning: "to leave behind" },
      { word: "portable", meaning: "easy to carry" },
      { word: "brief", meaning: "short", imageUrl: "https://example.com/brief.png" },
    ],
    async (word) => {
      if (word.word === "portable") {
        throw new Error("generation failed");
      }

      return {
        imageUrl: `https://example.com/${word.word}.png`,
      };
    },
    2,
  );

  assert.deepEqual(result.words, [
    {
      word: "abandon",
      meaning: "to leave behind",
      imageUrl: "https://example.com/abandon.png",
    },
    {
      word: "portable",
      meaning: "easy to carry",
      imageUrl: "",
    },
    {
      word: "brief",
      meaning: "short",
      imageUrl: "https://example.com/brief.png",
    },
  ]);

  assert.deepEqual(result.failures, [
    {
      index: 1,
      word: "portable",
      meaning: "easy to carry",
      code: "INTERNAL_ERROR",
      error: "Image generation failed.",
    },
  ]);
});
