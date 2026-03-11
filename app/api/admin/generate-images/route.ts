import { NextRequest, NextResponse } from "next/server.js";

import { adminAuth } from "@/lib/firebase/admin";
import {
  deleteManagedGeneratedImageByUrl,
  generateStoredImage,
} from "@/lib/server/imageGenerationService";
import { getServerAISettings } from "@/lib/server/aiSettings";
import {
  getImageGenerationDisabledResponse,
  isImageGenerationEnabled,
} from "@/lib/server/aiFeatureGuards";
import {
  buildUploadStickFigurePrompt,
  hasImageUrl,
  isSupportedImageGenerationCourseId,
  isUploadImageGenerationWord,
  normalizeImageGenerationMeaning,
  normalizeImageGenerationWord,
  type GenerateImagesRequestBody,
  type GenerateImagesSuccessResponse,
} from "@/types/imageGeneration";

import { generateImagesForUploadWords } from "./generateImages";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: GenerateImagesRequestBody;
  try {
    body = (await request.json()) as GenerateImagesRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body ||
    typeof body.courseId !== "string" ||
    !isSupportedImageGenerationCourseId(body.courseId) ||
    !Array.isArray(body.words) ||
    !body.words.every(isUploadImageGenerationWord)
  ) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const settings = await getServerAISettings();
  if (!isImageGenerationEnabled(settings)) {
    const disabledResponse = getImageGenerationDisabledResponse();
    return NextResponse.json(disabledResponse.body, {
      status: disabledResponse.status,
    });
  }

  const result = await generateImagesForUploadWords(
    body.words,
    async (word) => {
      const normalizedWord = normalizeImageGenerationWord(word.word);
      const normalizedMeaning = normalizeImageGenerationMeaning(word.meaning);
      const generated = await generateStoredImage(
        {
          courseId: body.courseId,
          word: normalizedWord,
          prompt: buildUploadStickFigurePrompt(normalizedWord, normalizedMeaning),
        },
        settings.imageModel,
      );

      if (!generated.ok) {
        throw generated.error;
      }

      if (hasImageUrl(word.imageUrl) && word.imageUrl !== generated.imageUrl) {
        void deleteManagedGeneratedImageByUrl(word.imageUrl);
      }

      return { imageUrl: generated.imageUrl };
    },
    2,
  );

  return NextResponse.json({
    words: result.words,
    failures: result.failures,
  } satisfies GenerateImagesSuccessResponse);
}
