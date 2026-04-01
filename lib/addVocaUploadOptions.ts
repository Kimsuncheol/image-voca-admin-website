import type { CourseId } from "../types/course.ts";
import { shouldIncludeImageUrl } from "../services/standardWordUpload.ts";
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
}

export interface UploadOptionState {
  isImageGenerationEnabled: boolean;
  isExampleAndTranslationGenerationEnabled: boolean;
  isFuriganaEnabled: boolean;
  shouldShowModal: boolean;
  defaultOptions: UploadOptions;
}

function supportsUploadFurigana(courseId: CourseId | ""): boolean {
  return (
    courseId !== "" &&
    (isJlptCourse(courseId) ||
      isPrefixCourse(courseId) ||
      isPostfixCourse(courseId))
  );
}

export function getUploadOptionState(params: {
  selectedCourse: CourseId | "";
  imageGenerationEnabled: boolean;
  enrichGenerationEnabled: boolean;
}): UploadOptionState {
  const isImageGenerationEnabled =
    shouldIncludeImageUrl(params.selectedCourse) &&
    params.imageGenerationEnabled;
  const isExampleAndTranslationGenerationEnabled =
    params.enrichGenerationEnabled &&
    params.selectedCourse !== "" &&
    !isJlptCourse(params.selectedCourse) &&
    !isPrefixCourse(params.selectedCourse) &&
    !isPostfixCourse(params.selectedCourse);
  const isFuriganaEnabled = supportsUploadFurigana(params.selectedCourse);

  return {
    isImageGenerationEnabled,
    isExampleAndTranslationGenerationEnabled,
    isFuriganaEnabled,
    shouldShowModal:
      isImageGenerationEnabled ||
      isExampleAndTranslationGenerationEnabled ||
      isFuriganaEnabled,
    defaultOptions: {
      images: isImageGenerationEnabled,
      examples: isExampleAndTranslationGenerationEnabled,
      translations: isExampleAndTranslationGenerationEnabled,
      furigana: false,
    },
  };
}
