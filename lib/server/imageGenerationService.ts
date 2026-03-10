import "server-only";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  ResponseModality,
} from "firebase/ai";
import { getDownloadURL, getStorage } from "firebase-admin/storage";

import {
  IMAGE_GENERATION_MODEL,
  buildImageStoragePath,
  createGenerateImageError,
  extractInlineImagePart,
  inferGenerateImageErrorCode,
  type GenerateImageErrorResponse,
  type ImageGenerationCourseId,
} from "@/types/imageGeneration";

const IMAGE_GENERATION_APP_NAME = "image-generation-route";

interface GenerateStoredImageParams {
  courseId: ImageGenerationCourseId;
  word: string;
  prompt: string;
}

interface GenerateStoredImageSuccess {
  ok: true;
  prompt: string;
  imageUrl: string;
  storagePath: string;
  mimeType: string;
}

interface GenerateStoredImageFailure {
  ok: false;
  error: GenerateImageErrorResponse;
}

export type GenerateStoredImageResult =
  | GenerateStoredImageSuccess
  | GenerateStoredImageFailure;

function getFirebaseAiApp(): FirebaseApp {
  const existingApp = getApps().find(
    (app) => app.name === IMAGE_GENERATION_APP_NAME,
  );
  if (existingApp) return existingApp;

  return initializeApp(
    {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
    IMAGE_GENERATION_APP_NAME,
  );
}

function getImageGenerationModel() {
  const ai = getAI(getFirebaseAiApp(), { backend: new GoogleAIBackend() });
  return getGenerativeModel(ai, {
    model: IMAGE_GENERATION_MODEL,
    generationConfig: {
      responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE],
    },
  });
}

function getStorageBucketName(): string {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error("Firebase Storage bucket is not configured.");
  }

  return bucketName;
}

export async function generateStoredImage({
  courseId,
  word,
  prompt,
}: GenerateStoredImageParams): Promise<GenerateStoredImageResult> {
  try {
    const result = await getImageGenerationModel().generateContent(prompt);
    const extracted = extractInlineImagePart(result.response);

    if (!extracted.ok) {
      return extracted;
    }

    const uniqueFileId = `${Date.now()}-${crypto.randomUUID()}`;
    const storagePath = buildImageStoragePath(courseId, word, uniqueFileId);
    const file = getStorage()
      .bucket(getStorageBucketName())
      .file(storagePath);

    try {
      await file.save(Buffer.from(extracted.image.data, "base64"), {
        resumable: false,
        metadata: {
          contentType: extracted.image.mimeType,
          cacheControl: "public,max-age=31536000,immutable",
          metadata: {
            firebaseStorageDownloadTokens: crypto.randomUUID(),
            courseId,
            originalWord: word,
            prompt,
          },
        },
      });
    } catch (error) {
      console.error("[image-generation] Failed to upload image:", error);
      return {
        ok: false,
        error: createGenerateImageError("UPLOAD_FAILED"),
      };
    }

    const imageUrl = await getDownloadURL(file);
    return {
      ok: true,
      prompt,
      imageUrl,
      storagePath,
      mimeType: extracted.image.mimeType,
    };
  } catch (error) {
    console.error("[image-generation] Image generation failed:", error);
    return {
      ok: false,
      error: createGenerateImageError(inferGenerateImageErrorCode(error)),
    };
  }
}
