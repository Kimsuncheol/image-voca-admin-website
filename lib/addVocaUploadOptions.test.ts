import assert from "node:assert/strict";
import test from "node:test";

import { getStandardUploadOptionState } from "./addVocaUploadOptions.ts";

test("shows modal with all options enabled when image and enrich generation are both available", () => {
  const result = getStandardUploadOptionState({
    selectedCourse: "CSAT",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
  });

  assert.deepEqual(result, {
    isImageGenerationEnabled: true,
    isExampleAndTranslationGenerationEnabled: true,
    shouldShowModal: true,
    defaultOptions: {
      images: true,
      examples: true,
      translations: true,
    },
  });
});

test("shows modal with only image generation enabled when enrich generation is unavailable", () => {
  const result = getStandardUploadOptionState({
    selectedCourse: "TOEIC",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: false,
  });

  assert.deepEqual(result, {
    isImageGenerationEnabled: true,
    isExampleAndTranslationGenerationEnabled: false,
    shouldShowModal: true,
    defaultOptions: {
      images: true,
      examples: false,
      translations: false,
    },
  });
});

test("shows modal with only example and translation generation enabled when image generation is unavailable", () => {
  const result = getStandardUploadOptionState({
    selectedCourse: "COLLOCATIONS",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
  });

  assert.deepEqual(result, {
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: true,
    shouldShowModal: true,
    defaultOptions: {
      images: false,
      examples: true,
      translations: true,
    },
  });
});

test("skips the modal when both generation features are unavailable", () => {
  const result = getStandardUploadOptionState({
    selectedCourse: "CSAT",
    imageGenerationEnabled: false,
    enrichGenerationEnabled: false,
  });

  assert.deepEqual(result, {
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    shouldShowModal: false,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
    },
  });
});

test("treats image generation as unavailable for unsupported courses even when the setting is enabled", () => {
  const result = getStandardUploadOptionState({
    selectedCourse: "COLLOCATIONS",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: false,
  });

  assert.deepEqual(result, {
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    shouldShowModal: false,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
    },
  });
});
