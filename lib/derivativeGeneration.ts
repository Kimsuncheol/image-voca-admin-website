import { supportsDerivativeCourse } from "@/constants/supportedDerivativeCourses";
import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";
import {
  buildDerivativeAwareWordsForUpload,
  type DerivativeSelectionMap,
} from "@/services/vocaSaveService";
import { isSingleTokenWord } from "@/lib/word-derivation/shared";
import type { CourseId } from "@/types/course";
import type { WordFinderResult } from "@/types/wordFinder";
import type {
  DerivativePreviewItemResult,
  DerivativePreviewRequestItem,
  DerivativePreviewResponse,
} from "@/types/vocabulary";

type DerivativeEntry = { word: string; meaning: string };

function hasTrimmedText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasDerivativeEntries(
  value: DerivativeEntry[] | null | undefined,
): value is DerivativeEntry[] {
  return Array.isArray(value) && value.length > 0;
}

export function supportsDerivativeGenerationForResult(
  result: Pick<WordFinderResult, "courseId" | "type" | "schemaVariant">,
): boolean {
  return (
    result.type === "standard" &&
    result.schemaVariant === "standard" &&
    supportsDerivativeCourse(result.courseId)
  );
}

export function isDerivativeGenerationEligibleResult(
  result: Pick<
    WordFinderResult,
    "courseId" | "type" | "schemaVariant" | "primaryText" | "meaning"
  >,
): boolean {
  return (
    supportsDerivativeGenerationForResult(result) &&
    isSingleTokenWord(result.primaryText) &&
    hasTrimmedText(result.meaning)
  );
}

function toStandardWordInput(
  result: Pick<WordFinderResult, "primaryText" | "meaning" | "derivative">,
): StandardWordInput {
  return {
    word: result.primaryText,
    meaning: result.meaning ?? "",
    pronunciation: "",
    example: "",
    translation: "",
    ...(result.derivative ? { derivative: result.derivative } : {}),
  };
}

export function buildDerivativePreviewRequestItems(
  results: Array<
    Pick<
      WordFinderResult,
      "id" | "primaryText" | "meaning" | "derivative"
    >
  >,
  getLabel: (
    result: Pick<
      WordFinderResult,
      "id" | "primaryText" | "meaning" | "derivative"
    >,
  ) => string,
): DerivativePreviewRequestItem[] {
  return results.map((result) => ({
    itemId: result.id,
    dayName: getLabel(result),
    words: [toStandardWordInput(result)],
  }));
}

export function buildDerivativeUpdatesFromPreview(
  results: Array<
    Pick<
      WordFinderResult,
      "id" | "primaryText" | "meaning" | "derivative"
    >
  >,
  previewItems: DerivativePreviewItemResult[],
  selections: DerivativeSelectionMap,
): Array<{ id: string; derivative: DerivativeEntry[] }> {
  const processed = buildDerivativeAwareWordsForUpload(
    results.map((result) => ({
      id: result.id,
      dayName: result.id,
      data: {
        words: [toStandardWordInput(result)],
      },
    })),
    previewItems,
    selections,
  );

  return processed.map((item) => ({
    id: item.id,
    derivative: item.data.words[0]?.derivative ?? [],
  }));
}

export async function requestDerivativePreview(
  courseId: CourseId,
  items: DerivativePreviewRequestItem[],
): Promise<DerivativePreviewResponse> {
  const response = await fetch("/api/admin/derivatives/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId, items }),
  });
  const payload = (await response.json()) as
    | DerivativePreviewResponse
    | { error?: string };

  if (!response.ok || !("items" in payload)) {
    throw new Error(
      ("error" in payload ? payload.error : undefined) ||
        "Derivative preview failed",
    );
  }

  return payload;
}
