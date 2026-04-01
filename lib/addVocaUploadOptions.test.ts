import { expect, test } from "vitest";

import { getUploadOptionState } from "./addVocaUploadOptions.ts";

test("shows modal with all options enabled when image and enrich generation are both available", () => {
  const result = getUploadOptionState({
    selectedCourse: "CSAT",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: true,
    isExampleAndTranslationGenerationEnabled: true,
    isFuriganaEnabled: false,
    shouldShowModal: true,
    defaultOptions: {
      images: true,
      examples: true,
      translations: true,
      furigana: false,
    },
  });
});

test("shows modal with only image generation enabled when enrich generation is unavailable", () => {
  const result = getUploadOptionState({
    selectedCourse: "TOEIC",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: false,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: true,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: false,
    shouldShowModal: true,
    defaultOptions: {
      images: true,
      examples: false,
      translations: false,
      furigana: false,
    },
  });
});

test("shows modal with only example and translation generation enabled when image generation is unavailable", () => {
  const result = getUploadOptionState({
    selectedCourse: "COLLOCATIONS",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: true,
    isFuriganaEnabled: false,
    shouldShowModal: true,
    defaultOptions: {
      images: false,
      examples: true,
      translations: true,
      furigana: false,
    },
  });
});

test("skips the modal when no generation features are available", () => {
  const result = getUploadOptionState({
    selectedCourse: "CSAT",
    imageGenerationEnabled: false,
    enrichGenerationEnabled: false,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: false,
    shouldShowModal: false,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
    },
  });
});

test("treats image generation as unavailable for unsupported courses even when the setting is enabled", () => {
  const result = getUploadOptionState({
    selectedCourse: "COLLOCATIONS",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: false,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: false,
    shouldShowModal: false,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
    },
  });
});

test("enables furigana-only modal options for JLPT uploads", () => {
  const result = getUploadOptionState({
    selectedCourse: "JLPT_N1",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: true,
    shouldShowModal: true,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
    },
  });
});

test("enables furigana-only modal options for prefix and postfix uploads", () => {
  const prefixResult = getUploadOptionState({
    selectedCourse: "JLPT_PREFIX",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
  });
  const postfixResult = getUploadOptionState({
    selectedCourse: "JLPT_POSTFIX",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
  });

  expect(prefixResult).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: true,
    shouldShowModal: true,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
    },
  });
  expect(postfixResult).toEqual(prefixResult);
});
