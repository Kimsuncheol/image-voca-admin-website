import type { CourseId } from "../types/course.ts";
import { shouldIncludeImageUrl } from "../services/standardWordUpload.ts";

export interface UploadOptions {
  images: boolean;
  examples: boolean;
  translations: boolean;
}

export interface StandardUploadOptionState {
  isImageGenerationEnabled: boolean;
  isExampleAndTranslationGenerationEnabled: boolean;
  shouldShowModal: boolean;
  defaultOptions: UploadOptions;
}

export function getStandardUploadOptionState(params: {
  selectedCourse: CourseId | "";
  imageGenerationEnabled: boolean;
  enrichGenerationEnabled: boolean;
}): StandardUploadOptionState {
  const isImageGenerationEnabled =
    shouldIncludeImageUrl(params.selectedCourse) &&
    params.imageGenerationEnabled;
  const isExampleAndTranslationGenerationEnabled =
    params.enrichGenerationEnabled;

  return {
    isImageGenerationEnabled,
    isExampleAndTranslationGenerationEnabled,
    shouldShowModal:
      isImageGenerationEnabled || isExampleAndTranslationGenerationEnabled,
    defaultOptions: {
      images: isImageGenerationEnabled,
      examples: isExampleAndTranslationGenerationEnabled,
      translations: isExampleAndTranslationGenerationEnabled,
    },
  };
}
