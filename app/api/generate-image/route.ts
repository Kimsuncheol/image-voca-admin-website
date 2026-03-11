import { NextRequest, NextResponse } from "next/server.js";

import { adminAuth } from "@/lib/firebase/admin";
import { generateStoredImage } from "@/lib/server/imageGenerationService";
import { getServerAISettings } from "@/lib/server/aiSettings";
import {
  getImageGenerationDisabledResponse,
  isImageGenerationEnabled,
} from "@/lib/server/aiFeatureGuards";
import {
  buildStickFigurePrompt,
  createGenerateImageError,
  getGenerateImageErrorStatus,
  validateGenerateImageRequestBody,
  type GenerateImageResponse,
  type GenerateImageSuccessResponse,
} from "@/types/imageGeneration";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    return NextResponse.json<GenerateImageResponse>(
      createGenerateImageError("UNAUTHORIZED"),
      { status: 401 },
    );
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return NextResponse.json<GenerateImageResponse>(
      createGenerateImageError("UNAUTHORIZED"),
      { status: 401 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json<GenerateImageResponse>(
      createGenerateImageError("INVALID_JSON"),
      { status: 400 },
    );
  }

  const validated = validateGenerateImageRequestBody(rawBody);
  if (!validated.ok) {
    return NextResponse.json<GenerateImageResponse>(validated.error, {
      status: getGenerateImageErrorStatus(validated.error.code),
    });
  }

  const { word, courseId } = validated.data;
  const prompt = buildStickFigurePrompt(word);
  const settings = await getServerAISettings();
  if (!isImageGenerationEnabled(settings)) {
    const disabledResponse = getImageGenerationDisabledResponse();
    return NextResponse.json<GenerateImageResponse>(disabledResponse.body, {
      status: disabledResponse.status,
    });
  }
  const result = await generateStoredImage(
    { courseId, word, prompt },
    settings.imageModel,
  );
  if (!result.ok) {
    return NextResponse.json<GenerateImageResponse>(result.error, {
      status: getGenerateImageErrorStatus(result.error.code),
    });
  }

  const response: GenerateImageSuccessResponse = {
    ok: true,
    word,
    prompt,
    imageUrl: result.imageUrl,
    storagePath: result.storagePath,
    mimeType: result.mimeType,
  };

  return NextResponse.json<GenerateImageResponse>(response);
}
