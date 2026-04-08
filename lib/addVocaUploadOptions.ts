import type { CourseId } from "../types/course.ts";
import { shouldIncludeImageUrl } from "../services/standardWordUpload.ts";
import { hasKanji, hasParentheticalFurigana } from "./furigana.ts";
import type {
  JlptWordInput,
  PostfixWordInput,
  PrefixWordInput,
} from "./schemas/vocaSchemas.ts";
import {
  isJlptCourse,
  isPostfixCourse,
  isPrefixCourse,
} from "../types/course.ts";

export interface UploadOptions {
  images: boolean;
  examples: boolean;
  translations: boolean;
  furigana: boolean;
  preserveExistingImages: boolean;
}

export interface UploadOptionState {
  isImageGenerationEnabled: boolean;
  isExampleAndTranslationGenerationEnabled: boolean;
  isFuriganaEnabled: boolean;
  isPreserveExistingImagesEnabled: boolean;
  shouldShowModal: boolean;
  defaultOptions: UploadOptions;
}

type FuriganaUploadWord = JlptWordInput | PrefixWordInput | PostfixWordInput;

function supportsUploadFurigana(courseId: CourseId | ""): boolean {
  return (
    courseId !== "" &&
    (isJlptCourse(courseId) ||
      isPrefixCourse(courseId) ||
      isPostfixCourse(courseId))
  );
}

function hasTrimmedText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function wordNeedsFurigana(word: FuriganaUploadWord): boolean {
  if (!hasTrimmedText(word.pronunciation)) {
    return true;
  }

  return (
    hasTrimmedText(word.example) &&
    hasKanji(word.example) &&
    !hasParentheticalFurigana(word.example)
  );
}

export function getUploadOptionState(params: {
  selectedCourse: CourseId | "";
  imageGenerationEnabled: boolean;
  enrichGenerationEnabled: boolean;
  uploadWords?: FuriganaUploadWord[];
  hasAnyImageUrl?: boolean;
}): UploadOptionState {
  const isImageGenerationEnabled =
    shouldIncludeImageUrl(params.selectedCourse) &&
    params.imageGenerationEnabled;
  const isPreserveExistingImagesEnabled = params.hasAnyImageUrl ?? false;
  const isExampleAndTranslationGenerationEnabled =
    params.enrichGenerationEnabled &&
    params.selectedCourse !== "" &&
    !isJlptCourse(params.selectedCourse) &&
    !isPrefixCourse(params.selectedCourse) &&
    !isPostfixCourse(params.selectedCourse);
  const isFuriganaEnabled =
    supportsUploadFurigana(params.selectedCourse) &&
    (params.uploadWords?.some(wordNeedsFurigana) ?? false);

  return {
    isImageGenerationEnabled,
    isExampleAndTranslationGenerationEnabled,
    isFuriganaEnabled,
    isPreserveExistingImagesEnabled,
    shouldShowModal:
      isImageGenerationEnabled ||
      isExampleAndTranslationGenerationEnabled ||
      isFuriganaEnabled ||
      isPreserveExistingImagesEnabled,
    defaultOptions: {
      images: isImageGenerationEnabled,
      examples: isExampleAndTranslationGenerationEnabled,
      translations: isExampleAndTranslationGenerationEnabled,
      furigana: false,
      preserveExistingImages: isPreserveExistingImagesEnabled,
    },
  };
}
