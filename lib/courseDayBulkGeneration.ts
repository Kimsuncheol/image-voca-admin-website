import type {
  CourseDayActionableMissingField,
  CourseDayMissingField,
} from "../types/courseDayMissingField.ts";
import type {
  GenerateImagesFailure,
  GenerateImagesSuccessResponse,
  UploadImageGenerationWord,
} from "../types/imageGeneration.ts";
import type {
  WordFinderResult,
  WordFinderResultFieldUpdates,
} from "../types/wordFinder.ts";

export type CourseDayBulkGeneratableField = Extract<
  CourseDayActionableMissingField,
  "pronunciation" | "example" | "translation" | "image"
>;
export type CourseDayBulkPreviewField = Extract<
  CourseDayActionableMissingField,
  "derivative"
>;
export type CourseDayBulkPlannableField =
  | CourseDayBulkGeneratableField
  | CourseDayBulkPreviewField;
export type CourseDayBulkAction =
  | { kind: "generate"; field: CourseDayBulkGeneratableField }
  | { kind: "derivative-preview"; field: CourseDayBulkPreviewField }
  | { kind: "add-furigana"; field: "example" | "exampleHurigana" }
  | { kind: "jlpt-example-correction" };

export type CourseDayBulkSkipReason = "missingMeaning" | "multiWord";

export interface CourseDayBulkSkippedItem {
  result: WordFinderResult;
  reason: CourseDayBulkSkipReason;
}

export interface JlptExampleBatchCorrectionItem {
  id: string;
  translationKorean?: string;
  translationEnglish?: string;
}

export function hasTrimmedText(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isCourseDayBulkGeneratableField(
  field: CourseDayMissingField,
): field is CourseDayBulkGeneratableField {
  return (
    field === "pronunciation" ||
    field === "example" ||
    field === "translation" ||
    field === "image"
  );
}

export function getCourseDayBulkAction(
  field: CourseDayMissingField,
  isJlpt: boolean,
  supportsDerivatives = false,
): CourseDayBulkAction | null {
  if (isJlpt && field === "furigana") {
    return { kind: "add-furigana", field: "example" };
  }

  if (isJlpt && field === "exampleHurigana") {
    return { kind: "add-furigana", field: "exampleHurigana" };
  }

  if (isCourseDayBulkGeneratableField(field)) {
    if (!isJlpt || field === "pronunciation" || field === "image") {
      return { kind: "generate", field };
    }
    return null;
  }

  if (field === "derivative") {
    return supportsDerivatives ? { kind: "derivative-preview", field } : null;
  }

  if (isJlpt && field === "exampleHasKorean") {
    return { kind: "jlpt-example-correction" };
  }

  return null;
}

function isSingleWordEntry(value: string): boolean {
  return !/\s/.test(value.trim());
}

export function planCourseDayBulkGeneration(
  results: WordFinderResult[],
  field: CourseDayBulkPlannableField,
): {
  eligible: WordFinderResult[];
  skipped: CourseDayBulkSkippedItem[];
} {
  const eligible: WordFinderResult[] = [];
  const skipped: CourseDayBulkSkippedItem[] = [];

  results.forEach((result) => {
    if (field === "pronunciation" || field === "derivative") {
      if (!isSingleWordEntry(result.primaryText)) {
        skipped.push({ result, reason: "multiWord" });
        return;
      }
    }

    if (field !== "pronunciation" && !hasTrimmedText(result.meaning)) {
      skipped.push({ result, reason: "missingMeaning" });
      return;
    }

    eligible.push(result);
  });

  return { eligible, skipped };
}

export function createCourseDayGenerateWordFieldRequest(
  result: WordFinderResult,
  field: Extract<CourseDayBulkGeneratableField, "example" | "translation">,
): {
  field: "example" | "translation";
  word: string;
  meaning: string;
  example?: string;
} | null {
  if (!hasTrimmedText(result.meaning)) {
    return null;
  }

  return {
    field,
    word: result.primaryText,
    meaning: result.meaning.trim(),
    ...(field === "translation" && hasTrimmedText(result.example)
      ? { example: result.example.trim() }
      : {}),
  };
}

export function extractCourseDayGenerateWordFieldUpdates(
  field: Extract<CourseDayBulkGeneratableField, "example" | "translation">,
  response: {
    example?: string;
    translation?: string;
  },
): WordFinderResultFieldUpdates | null {
  const updates: WordFinderResultFieldUpdates = {};

  if (field === "example" && hasTrimmedText(response.example)) {
    updates.example = response.example.trim();
  }

  if (field === "translation") {
    if (hasTrimmedText(response.example)) {
      updates.example = response.example.trim();
    }
    if (hasTrimmedText(response.translation)) {
      updates.translation = response.translation.trim();
    }
  }

  return Object.keys(updates).length > 0 ? updates : null;
}

export function createCourseDayImageGenerationWords(
  results: WordFinderResult[],
): UploadImageGenerationWord[] {
  return results.map((result) => ({
    word: result.primaryText,
    meaning: result.meaning ?? "",
    imageUrl: result.imageUrl ?? undefined,
  }));
}

export function createJlptExampleBatchCorrectionItems(
  results: WordFinderResult[],
): JlptExampleBatchCorrectionItem[] {
  return results.map((result) => ({
    id: result.id,
    ...(hasTrimmedText(result.translationKorean)
      ? { translationKorean: result.translationKorean.trim() }
      : {}),
    ...(hasTrimmedText(result.translationKorean) ||
    !hasTrimmedText(result.translationEnglish)
      ? {}
      : { translationEnglish: result.translationEnglish.trim() }),
  }));
}

export function mapCourseDayGeneratedImages(
  results: WordFinderResult[],
  response: GenerateImagesSuccessResponse,
): {
  updates: Array<{ result: WordFinderResult; imageUrl: string }>;
  failures: GenerateImagesFailure[];
} {
  const failedIndexes = new Set(response.failures.map((failure) => failure.index));

  const updates = response.words.flatMap((word, index) => {
    const result = results[index];
    if (!result || failedIndexes.has(index) || !hasTrimmedText(word.imageUrl)) {
      return [];
    }

    return [{ result, imageUrl: word.imageUrl.trim() }];
  });

  return {
    updates,
    failures: response.failures,
  };
}
