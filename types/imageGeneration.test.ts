import assert from "node:assert/strict";
import test from "node:test";

import {
  buildUploadStickFigurePrompt,
  buildStickFigurePrompt,
  createGenerateImageError,
  extractInlineImagePart,
  getGenerateImageErrorStatus,
  inferGenerateImageErrorCode,
  normalizeImageGenerationWord,
  validateGenerateImageRequestBody,
} from "./imageGeneration.ts";

test("normalizeImageGenerationWord trims repeated whitespace", () => {
  assert.equal(
    normalizeImageGenerationWord("  stick    figure   "),
    "stick figure",
  );
});

test("validateGenerateImageRequestBody rejects empty words", () => {
  const result = validateGenerateImageRequestBody({
    word: "   ",
    courseId: "CSAT",
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INVALID_WORD");
});

test("validateGenerateImageRequestBody accepts supported courses", () => {
  const result = validateGenerateImageRequestBody({
    word: "portable",
    courseId: "COLLOCATIONS",
  });

  assert.equal(result.ok, true);
});

test("createGenerateImageError supports FEATURE_DISABLED", () => {
  const result = createGenerateImageError("FEATURE_DISABLED");

  assert.deepEqual(result, {
    ok: false,
    code: "FEATURE_DISABLED",
    error: "Image generation is disabled in AI settings.",
  });
  assert.equal(getGenerateImageErrorStatus("FEATURE_DISABLED"), 403);
});

test("createGenerateImageError supports PERMISSION_DENIED", () => {
  const result = createGenerateImageError("PERMISSION_DENIED");

  assert.deepEqual(result, {
    ok: false,
    code: "PERMISSION_DENIED",
    error: "Image generation is disabled for your administrator account.",
  });
  assert.equal(getGenerateImageErrorStatus("PERMISSION_DENIED"), 403);
});

test("buildStickFigurePrompt preserves the required wording", () => {
  const prompt = buildStickFigurePrompt("portable");

  assert.match(
    prompt,
    /Draw a simple, intuitive stick figure illustrating the meaning of the word: portable\./,
  );
  assert.match(
    prompt,
    /The image must be strictly in black and white, with no other colors\./,
  );
  assert.match(prompt, /Show only one clear subject or action/);
  assert.match(
    prompt,
    /using only the minimum objects needed to convey the meaning\./,
  );
  assert.match(
    prompt,
    /Avoid background scene details, extra characters, decorative elements, and crowded compositions\./,
  );
});

test("buildUploadStickFigurePrompt includes word and meaning context", () => {
  const prompt = buildUploadStickFigurePrompt("portable", "easy to carry");

  assert.match(prompt, /English vocabulary word "portable"/);
  assert.match(prompt, /Meaning\/context: "easy to carry"/);
  assert.match(prompt, /Show only one clear subject or action/);
  assert.match(
    prompt,
    /using only the minimum objects needed to convey the meaning\./,
  );
  assert.match(
    prompt,
    /Avoid background scene details, extra characters, decorative elements, and crowded compositions\./,
  );
});

test("extractInlineImagePart returns NO_IMAGE_RETURNED when no image exists", () => {
  const result = extractInlineImagePart({
    inlineDataParts: () => [],
    promptFeedback: undefined,
    candidates: [
      {
        index: 0,
        finishReason: "STOP",
        content: { role: "model", parts: [] },
      },
    ],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.deepEqual(result.error, createGenerateImageError("NO_IMAGE_RETURNED"));
});

test("inferGenerateImageErrorCode maps blocked and upstream failures", () => {
  assert.equal(
    inferGenerateImageErrorCode(
      new Error("Candidate was blocked due to safety."),
    ),
    "MODEL_BLOCKED",
  );
  assert.equal(
    inferGenerateImageErrorCode(new Error("Upstream service unavailable")),
    "INTERNAL_ERROR",
  );
});
