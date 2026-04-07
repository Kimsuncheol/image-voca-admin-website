import { expect, test } from "vitest";

import { getUploadOptionState } from "./addVocaUploadOptions.ts";

test("shows modal with all options enabled when image and enrich generation are both available", () => {
  const result = getUploadOptionState({
    selectedCourse: "CSAT",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: undefined,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: true,
    isExampleAndTranslationGenerationEnabled: true,
    isFuriganaEnabled: false,
    isPreserveExistingImagesEnabled: true,
    shouldShowModal: true,
    defaultOptions: {
      images: true,
      examples: true,
      translations: true,
      furigana: false,
      preserveExistingImages: true,
    },
  });
});

test("shows modal with only image generation enabled when enrich generation is unavailable", () => {
  const result = getUploadOptionState({
    selectedCourse: "TOEIC",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: false,
    uploadWords: undefined,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: true,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: false,
    isPreserveExistingImagesEnabled: true,
    shouldShowModal: true,
    defaultOptions: {
      images: true,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: true,
    },
  });
});

test("shows modal with only example and translation generation enabled when image generation is unavailable", () => {
  const result = getUploadOptionState({
    selectedCourse: "COLLOCATIONS",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: undefined,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: true,
    isFuriganaEnabled: false,
    isPreserveExistingImagesEnabled: false,
    shouldShowModal: true,
    defaultOptions: {
      images: false,
      examples: true,
      translations: true,
      furigana: false,
      preserveExistingImages: false,
    },
  });
});

test("shows the modal for image-capable courses even when preserve-existing-images is the only option", () => {
  const result = getUploadOptionState({
    selectedCourse: "CSAT",
    imageGenerationEnabled: false,
    enrichGenerationEnabled: false,
    uploadWords: undefined,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: false,
    isPreserveExistingImagesEnabled: true,
    shouldShowModal: true,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: true,
    },
  });
});

test("treats image generation as unavailable for unsupported courses even when the setting is enabled", () => {
  const result = getUploadOptionState({
    selectedCourse: "COLLOCATIONS",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: false,
    uploadWords: undefined,
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: false,
    isPreserveExistingImagesEnabled: false,
    shouldShowModal: false,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    },
  });
});

test("enables furigana-only modal options for JLPT uploads when pronunciation is blank", () => {
  const result = getUploadOptionState({
    selectedCourse: "JLPT_N1",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: [
      {
        word: "猫",
        meaningEnglish: "cat",
        meaningKorean: "고양이",
        pronunciation: "",
        pronunciationRoman: "",
        example: "猫(ねこ)がいる。",
        exampleRoman: "",
        translationEnglish: "There is a cat.",
        translationKorean: "고양이가 있다.",
      },
    ],
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: true,
    isPreserveExistingImagesEnabled: false,
    shouldShowModal: true,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    },
  });
});

test("enables JLPT-style image preservation and furigana options for counters uploads", () => {
  const result = getUploadOptionState({
    selectedCourse: "JLPT_COUNTER",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: [
      {
        word: "本",
        meaningEnglish: "counter for long objects",
        meaningKorean: "긴 물건을 세는 단위",
        pronunciation: "",
        pronunciationRoman: "",
        example: "本(ほん)を三本買った。",
        exampleRoman: "",
        translationEnglish: "I bought three long objects.",
        translationKorean: "긴 물건을 세 개 샀다.",
        imageUrl: "",
      },
    ],
  });

  expect(result).toEqual({
    isImageGenerationEnabled: true,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: true,
    isPreserveExistingImagesEnabled: true,
    shouldShowModal: true,
    defaultOptions: {
      images: true,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: true,
    },
  });
});

test("enables furigana-only modal options when examples lack parenthetical furigana", () => {
  const prefixResult = getUploadOptionState({
    selectedCourse: "JLPT_PREFIX",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: [
      {
        prefix: "再",
        meaningEnglish: "again",
        meaningKorean: "다시",
        pronunciation: "さい",
        pronunciationRoman: "",
        example: "再生する",
        exampleRoman: "",
        translationEnglish: "to regenerate",
        translationKorean: "재생하다",
      },
    ],
  });
  const postfixResult = getUploadOptionState({
    selectedCourse: "JLPT_POSTFIX",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: [
      {
        postfix: "的",
        meaningEnglish: "-like",
        meaningKorean: "-적",
        pronunciation: "てき",
        pronunciationRoman: "",
        example: "科学的",
        exampleRoman: "",
        translationEnglish: "scientific",
        translationKorean: "과학적",
      },
    ],
  });

  expect(prefixResult).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: true,
    isPreserveExistingImagesEnabled: false,
    shouldShowModal: true,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    },
  });
  expect(postfixResult).toEqual(prefixResult);
});

test("disables furigana when JLPT upload rows already have pronunciation and example furigana", () => {
  const result = getUploadOptionState({
    selectedCourse: "JLPT_N1",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: [
      {
        word: "猫",
        meaningEnglish: "cat",
        meaningKorean: "고양이",
        pronunciation: "ねこ",
        pronunciationRoman: "",
        example: "猫(ねこ)がいる。",
        exampleRoman: "",
        translationEnglish: "There is a cat.",
        translationKorean: "고양이가 있다.",
      },
    ],
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: false,
    isPreserveExistingImagesEnabled: false,
    shouldShowModal: false,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    },
  });
});

test("does not treat an empty example by itself as missing example furigana", () => {
  const result = getUploadOptionState({
    selectedCourse: "JLPT_PREFIX",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: [
      {
        prefix: "再",
        meaningEnglish: "again",
        meaningKorean: "다시",
        pronunciation: "さい",
        pronunciationRoman: "",
        example: "",
        exampleRoman: "",
        translationEnglish: "to regenerate",
        translationKorean: "재생하다",
      },
    ],
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: false,
    isPreserveExistingImagesEnabled: false,
    shouldShowModal: false,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    },
  });
});

test("does not treat a hiragana-only example as needing furigana", () => {
  const result = getUploadOptionState({
    selectedCourse: "JLPT_N1",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: [
      {
        word: "猫",
        meaningEnglish: "cat",
        meaningKorean: "고양이",
        pronunciation: "ねこ",
        pronunciationRoman: "",
        example: "ねこがいる。",
        exampleRoman: "",
        translationEnglish: "There is a cat.",
        translationKorean: "고양이가 있다.",
      },
    ],
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: false,
    isPreserveExistingImagesEnabled: false,
    shouldShowModal: false,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    },
  });
});

test("enables furigana when any queued Japanese row needs it", () => {
  const result = getUploadOptionState({
    selectedCourse: "JLPT_N1",
    imageGenerationEnabled: true,
    enrichGenerationEnabled: true,
    uploadWords: [
      {
        word: "猫",
        meaningEnglish: "cat",
        meaningKorean: "고양이",
        pronunciation: "ねこ",
        pronunciationRoman: "",
        example: "猫(ねこ)がいる。",
        exampleRoman: "",
        translationEnglish: "There is a cat.",
        translationKorean: "고양이가 있다.",
      },
      {
        word: "犬",
        meaningEnglish: "dog",
        meaningKorean: "개",
        pronunciation: "いぬ",
        pronunciationRoman: "",
        example: "犬がいる。",
        exampleRoman: "",
        translationEnglish: "There is a dog.",
        translationKorean: "개가 있다.",
      },
    ],
  });

  expect(result).toEqual({
    isImageGenerationEnabled: false,
    isExampleAndTranslationGenerationEnabled: false,
    isFuriganaEnabled: true,
    isPreserveExistingImagesEnabled: false,
    shouldShowModal: true,
    defaultOptions: {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    },
  });
});
