import type { EnhancedGenerateContentResponse, InlineDataPart } from "firebase/ai";

import type { CourseId } from "./course";

export type ImageGenerationCourseId = Extract<
  CourseId,
  | "CSAT"
  | "TOEFL_IELTS"
  | "TOEIC"
  | "JLPT"
  | "JLPT_COUNTER"
  | "JLPT_N1"
  | "JLPT_N2"
  | "JLPT_N3"
  | "JLPT_N4"
  | "JLPT_N5"
  | "COLLOCATIONS"
>;

export const IMAGE_GENERATION_MODEL = "gemini-3.1-flash-image-preview";

export const SUPPORTED_IMAGE_GENERATION_COURSE_IDS = [
  "CSAT",
  "TOEFL_IELTS",
  "TOEIC",
  "JLPT",
  "JLPT_COUNTER",
  "JLPT_N1",
  "JLPT_N2",
  "JLPT_N3",
  "JLPT_N4",
  "JLPT_N5",
  "COLLOCATIONS",
] as const satisfies readonly ImageGenerationCourseId[];

export type GenerateImageErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_JSON"
  | "INVALID_WORD"
  | "UNSUPPORTED_COURSE"
  | "FEATURE_DISABLED"
  | "PERMISSION_DENIED"
  | "MODEL_BLOCKED"
  | "NO_IMAGE_RETURNED"
  | "UPLOAD_FAILED"
  | "INTERNAL_ERROR";

export interface GenerateImageRequestBody {
  word: string;
  courseId: ImageGenerationCourseId;
}

export interface UploadImageGenerationWord {
  word: string;
  meaning: string;
  pronunciation?: string;
  example?: string;
  translation?: string;
  imageUrl?: string;
  [key: string]: unknown;
}

export interface GenerateImagesRequestBody {
  courseId: ImageGenerationCourseId;
  words: UploadImageGenerationWord[];
}

export interface GenerateImageSuccessResponse {
  ok: true;
  word: string;
  prompt: string;
  imageUrl: string;
  storagePath: string;
  mimeType: string;
}

export interface GenerateImageErrorResponse {
  ok: false;
  code: GenerateImageErrorCode;
  error: string;
}

export type GenerateImageResponse =
  | GenerateImageSuccessResponse
  | GenerateImageErrorResponse;

export interface GenerateImagesFailure {
  index: number;
  word: string;
  meaning: string;
  code: GenerateImageErrorCode;
  error: string;
}

export interface GenerateImagesSuccessResponse {
  words: UploadImageGenerationWord[];
  failures: GenerateImagesFailure[];
}

export interface ExtractedInlineImage {
  mimeType: string;
  data: string;
}

export function normalizeImageGenerationWord(word: string): string {
  return word.trim().replace(/\s+/g, " ");
}

export function normalizeImageGenerationMeaning(meaning: string): string {
  return meaning.trim().replace(/\s+/g, " ");
}

export function sanitizeWordForStorage(word: string): string {
  const normalized = normalizeImageGenerationWord(word).toLowerCase();
  const sanitized = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "word";
}

export function isSupportedImageGenerationCourseId(
  courseId: string,
): courseId is ImageGenerationCourseId {
  return SUPPORTED_IMAGE_GENERATION_COURSE_IDS.includes(
    courseId as ImageGenerationCourseId,
  );
}

export function buildStickFigurePrompt(word: string): string {
  return `Draw a simple, intuitive stick figure illustrating the meaning of the word: ${word}. Show only one clear subject or action, using only the minimum objects needed to convey the meaning. Avoid background scene details, extra characters, decorative elements, and crowded compositions. The image must be strictly in black and white, with no other colors. Use a pure white background, black outlines only, no gray, no shading, no text, no letters, no labels, and keep the drawing minimal and easy to understand.`;
}

export function buildUploadStickFigurePrompt(
  word: string,
  meaning: string,
): string {
  return `Draw a simple, intuitive stick figure illustrating the meaning of the English vocabulary word "${word}". Meaning/context: "${meaning}". Show only one clear subject or action, using only the minimum objects needed to convey the meaning. Avoid background scene details, extra characters, decorative elements, and crowded compositions. The image must be strictly in black and white, with no other colors. Use a pure white background, black outlines only, no gray, no shading, no text, no letters, no labels, and keep the drawing minimal and easy to understand.`;
}

export function buildImageStoragePath(
  courseId: ImageGenerationCourseId,
  word: string,
  timestamp: number | string = Date.now(),
): string {
  return `vocabulary-images/${courseId}/${sanitizeWordForStorage(word)}/${timestamp}.png`;
}

export function createGenerateImageError(
  code: GenerateImageErrorCode,
  error?: string,
): GenerateImageErrorResponse {
  return {
    ok: false,
    code,
    error: error ?? getGenerateImageErrorMessage(code),
  };
}

export function getGenerateImageErrorMessage(
  code: GenerateImageErrorCode,
): string {
  switch (code) {
    case "UNAUTHORIZED":
      return "Unauthorized";
    case "INVALID_JSON":
      return "Invalid JSON.";
    case "INVALID_WORD":
      return "Please enter an English word.";
    case "UNSUPPORTED_COURSE":
      return "Image generation is only supported for CSAT, TOEFL/IELTS, TOEIC, JLPT, and COLLOCATIONS.";
    case "FEATURE_DISABLED":
      return "Image generation is disabled in AI settings.";
    case "PERMISSION_DENIED":
      return "Image generation is disabled for your administrator account.";
    case "MODEL_BLOCKED":
      return "The model blocked this prompt. Try a simpler word.";
    case "NO_IMAGE_RETURNED":
      return "The model did not return an image.";
    case "UPLOAD_FAILED":
      return "The generated image could not be saved.";
    case "INTERNAL_ERROR":
    default:
      return "Image generation failed.";
  }
}

export function getGenerateImageErrorStatus(
  code: GenerateImageErrorCode,
): number {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "INVALID_JSON":
    case "INVALID_WORD":
    case "UNSUPPORTED_COURSE":
      return 400;
    case "FEATURE_DISABLED":
    case "PERMISSION_DENIED":
      return 403;
    case "MODEL_BLOCKED":
      return 422;
    case "NO_IMAGE_RETURNED":
      return 502;
    case "UPLOAD_FAILED":
    case "INTERNAL_ERROR":
    default:
      return 500;
  }
}

export function validateGenerateImageRequestBody(
  body: unknown,
):
  | { ok: true; data: GenerateImageRequestBody }
  | { ok: false; error: GenerateImageErrorResponse } {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      error: createGenerateImageError("INVALID_JSON"),
    };
  }

  const { word, courseId } = body as Record<string, unknown>;
  const normalizedWord =
    typeof word === "string" ? normalizeImageGenerationWord(word) : "";

  if (!normalizedWord) {
    return {
      ok: false,
      error: createGenerateImageError("INVALID_WORD"),
    };
  }

  if (
    typeof courseId !== "string" ||
    !isSupportedImageGenerationCourseId(courseId)
  ) {
    return {
      ok: false,
      error: createGenerateImageError("UNSUPPORTED_COURSE"),
    };
  }

  return {
    ok: true,
    data: {
      word: normalizedWord,
      courseId,
    },
  };
}

export function isUploadImageGenerationWord(
  value: unknown,
): value is UploadImageGenerationWord {
  if (!value || typeof value !== "object") return false;
  const word = value as Partial<UploadImageGenerationWord>;
  return (
    typeof word.word === "string" &&
    normalizeImageGenerationWord(word.word).length > 0 &&
    typeof word.meaning === "string" &&
    normalizeImageGenerationMeaning(word.meaning).length > 0
  );
}

export function hasImageUrl(value?: string): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isManagedGeneratedImagePath(path: string): boolean {
  return path.startsWith("vocabulary-images/");
}

export function inferGenerateImageErrorCode(
  error: unknown,
  fallback: GenerateImageErrorCode = "INTERNAL_ERROR",
): GenerateImageErrorCode {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    const code = error.code.toUpperCase();
    if (code.includes("UNAUTHORIZED")) return "UNAUTHORIZED";
    if (
      code.includes("MODEL_BLOCKED") ||
      code.includes("SAFETY") ||
      code.includes("BLOCKLIST") ||
      code.includes("PROHIBITED_CONTENT")
    ) {
      return "MODEL_BLOCKED";
    }
  }

  const message =
    error instanceof Error
      ? `${error.name} ${error.message}`.toLowerCase()
      : String(error).toLowerCase();

  if (
    message.includes("blocked") ||
    message.includes("safety") ||
    message.includes("blocklist") ||
    message.includes("prohibited content")
  ) {
    return "MODEL_BLOCKED";
  }

  return fallback;
}

export function extractInlineImagePart(
  response: Pick<
    EnhancedGenerateContentResponse,
    "inlineDataParts" | "promptFeedback" | "candidates"
  >,
):
  | { ok: true; image: ExtractedInlineImage }
  | { ok: false; error: GenerateImageErrorResponse } {
  try {
    const inlineDataParts = response.inlineDataParts();
    const imagePart = inlineDataParts?.find(isImageInlineDataPart);

    if (imagePart) {
      return {
        ok: true,
        image: {
          mimeType: imagePart.inlineData.mimeType,
          data: imagePart.inlineData.data,
        },
      };
    }
  } catch (error) {
    return {
      ok: false,
      error: createGenerateImageError(
        inferGenerateImageErrorCode(error, "MODEL_BLOCKED"),
      ),
    };
  }

  const wasBlocked =
    Boolean(response.promptFeedback?.blockReason) ||
    response.candidates?.some((candidate) => {
      const finishReason = candidate.finishReason ?? "";
      return (
        finishReason === "SAFETY" ||
        finishReason === "BLOCKLIST" ||
        finishReason === "PROHIBITED_CONTENT"
      );
    }) === true;

  return {
    ok: false,
    error: createGenerateImageError(
      wasBlocked ? "MODEL_BLOCKED" : "NO_IMAGE_RETURNED",
    ),
  };
}

function isImageInlineDataPart(part: InlineDataPart): boolean {
  return (
    typeof part.inlineData?.mimeType === "string" &&
    part.inlineData.mimeType.startsWith("image/") &&
    typeof part.inlineData.data === "string" &&
    part.inlineData.data.length > 0
  );
}
