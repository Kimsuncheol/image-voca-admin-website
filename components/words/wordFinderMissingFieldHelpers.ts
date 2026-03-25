import { formatWordFinderLocation, getWordFinderFieldValue } from "@/lib/wordFinderMissingFieldActions";
import { isSupportedImageGenerationCourseId } from "@/types/imageGeneration";
import type { WordFinderActionField, WordFinderResult } from "@/types/wordFinder";

type TFunction = (key: string, options?: Record<string, unknown>) => string;

export function getFieldLabel(field: WordFinderActionField, t: TFunction): string {
  switch (field) {
    case "image":
      return t("courses.image");
    case "pronunciation":
      return t("courses.pronunciation");
    case "example":
      return t("courses.example");
    case "derivative":
      return t("words.derivative");
    case "translation":
      return t("courses.translation");
    default:
      return field;
  }
}

export function getGenerateButtonLabel(field: WordFinderActionField, t: TFunction): string {
  switch (field) {
    case "image":
      return t("words.generateNewImage");
    case "pronunciation":
      return t("words.generatePronunciationAction");
    case "example":
      return t("words.generateNewExamples");
    case "derivative":
      return t("words.generateDerivatives");
    case "translation":
      return t("words.generateNewTranslations");
    default:
      return t("words.generateAction");
  }
}

export function getSharedButtonLabel(field: WordFinderActionField, t: TFunction): string {
  switch (field) {
    case "image":
      return t("words.useSharedImage");
    case "pronunciation":
      return t("words.useSharedPronunciation");
    case "example":
      return t("words.useSharedExamples");
    case "derivative":
      return t("words.useSharedAction");
    case "translation":
      return t("words.useSharedTranslations");
    default:
      return t("words.useSharedAction");
  }
}

export function getGenerateDisabledReason(
  result: WordFinderResult,
  field: WordFinderActionField,
  options: {
    imageGenerationBlockedByPermissions: boolean;
    imageGenerationBlockedBySettings: boolean;
    exampleTranslationBlockedByPermissions: boolean;
    exampleTranslationBlockedBySettings: boolean;
  },
  t: TFunction,
): string | null {
  if (field === "image") {
    if (!result.dayId) return t("words.imageUploadUnavailable");
    if (!result.meaning) return t("words.generateRequiresMeaning");
    if (!isSupportedImageGenerationCourseId(result.courseId)) {
      return t("addVoca.generateImagesUnsupported");
    }
    if (options.imageGenerationBlockedBySettings) {
      return t("courses.imageGenerationDisabled");
    }
    if (options.imageGenerationBlockedByPermissions) {
      return t("courses.imageGenerationPermissionDenied");
    }
    return null;
  }

  if (field === "pronunciation") {
    if (!result.dayId) return t("words.pronunciationUnavailable");
    if (result.primaryText.includes(" ")) {
      return t("words.pronunciationGenerationUnavailableForPhrase");
    }
    return null;
  }

  if (field === "derivative") {
    if (!result.dayId) {
      return t("words.pronunciationUnavailable");
    }
    if (result.primaryText.includes(" ")) {
      return t("words.pronunciationGenerationUnavailableForPhrase");
    }
    if (!result.meaning) {
      return t("words.generateRequiresMeaning");
    }
    return null;
  }

  if (!result.dayId) {
    return t("words.translationGenerationUnavailableForQuote");
  }
  if (!result.meaning) {
    return t("words.generateRequiresMeaning");
  }
  if (options.exampleTranslationBlockedBySettings) {
    return t("courses.enrichGenerationDisabled");
  }
  if (options.exampleTranslationBlockedByPermissions) {
    return t("courses.enrichGenerationPermissionDenied");
  }
  return null;
}

export function getSharedCandidateContent(
  candidate: WordFinderResult,
  field: WordFinderActionField,
  noDayLabel: string,
): { primary: string; secondary: string } {
  if (field === "image") {
    return {
      primary: candidate.primaryText,
      secondary: formatWordFinderLocation(candidate, noDayLabel),
    };
  }

  return {
    primary: getWordFinderFieldValue(candidate, field) ?? "",
    secondary: formatWordFinderLocation(candidate, noDayLabel),
  };
}

export function hasTrimmedText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
