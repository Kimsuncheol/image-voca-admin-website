import "server-only";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  ResponseModality,
} from "firebase/ai";
import { getDownloadURL, getStorage } from "firebase-admin/storage";
import OpenAI from "openai";

import {
  IMAGE_GENERATION_MODEL,
  buildImageStoragePath,
  createGenerateImageError,
  extractInlineImagePart,
  inferGenerateImageErrorCode,
  isManagedGeneratedImagePath,
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

function tryExtractManagedGeneratedImagePath(imageUrl: string): string | null {
  try {
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.hostname !== "firebasestorage.googleapis.com") return null;

    const segments = parsedUrl.pathname.split("/");
    const objectIndex = segments.indexOf("o");
    if (objectIndex === -1) return null;

    const encodedPath = segments.slice(objectIndex + 1).join("/");
    const storagePath = decodeURIComponent(encodedPath);

    return isManagedGeneratedImagePath(storagePath) ? storagePath : null;
  } catch {
    return null;
  }
}

async function uploadImageToStorage(
  imageBuffer: Buffer,
  mimeType: string,
  courseId: ImageGenerationCourseId,
  word: string,
  prompt: string,
): Promise<{ ok: true; imageUrl: string; storagePath: string } | { ok: false; error: GenerateImageErrorResponse }> {
  const uniqueFileId = `${Date.now()}-${crypto.randomUUID()}`;
  const storagePath = buildImageStoragePath(courseId, word, uniqueFileId);
  const file = getStorage().bucket(getStorageBucketName()).file(storagePath);

  try {
    await file.save(imageBuffer, {
      resumable: false,
      metadata: {
        contentType: mimeType,
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
    return { ok: false, error: createGenerateImageError("UPLOAD_FAILED") };
  }

  const imageUrl = await getDownloadURL(file);
  return { ok: true, imageUrl, storagePath };
}

export async function generateStoredImage(
  { courseId, word, prompt }: GenerateStoredImageParams,
  model: "nano-banana2" | "gpt-image-1" = "nano-banana2",
): Promise<GenerateStoredImageResult> {
  if (model === "gpt-image-1") {
    return generateStoredImageWithOpenAI({ courseId, word, prompt });
  }
  return generateStoredImageWithGemini({ courseId, word, prompt });
}

async function generateStoredImageWithGemini({
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

    const uploaded = await uploadImageToStorage(
      Buffer.from(extracted.image.data, "base64"),
      extracted.image.mimeType,
      courseId,
      word,
      prompt,
    );
    if (!uploaded.ok) return uploaded;

    return {
      ok: true,
      prompt,
      imageUrl: uploaded.imageUrl,
      storagePath: uploaded.storagePath,
      mimeType: extracted.image.mimeType,
    };
  } catch (error) {
    console.error("[image-generation/gemini] Image generation failed:", error);
    return {
      ok: false,
      error: createGenerateImageError(inferGenerateImageErrorCode(error)),
    };
  }
}

async function generateStoredImageWithOpenAI({
  courseId,
  word,
  prompt,
}: GenerateStoredImageParams): Promise<GenerateStoredImageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: createGenerateImageError("INTERNAL_ERROR", "OpenAI API key is not configured.") };
  }

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const imageData = response.data?.[0];
    if (!imageData) {
      return { ok: false, error: createGenerateImageError("NO_IMAGE_RETURNED") };
    }
    let imageBuffer: Buffer;
    const mimeType = "image/png";

    if (imageData.b64_json) {
      imageBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData.url) {
      const res = await fetch(imageData.url);
      imageBuffer = Buffer.from(await res.arrayBuffer());
    } else {
      return { ok: false, error: createGenerateImageError("NO_IMAGE_RETURNED") };
    }

    const uploaded = await uploadImageToStorage(imageBuffer, mimeType, courseId, word, prompt);
    if (!uploaded.ok) return uploaded;

    return {
      ok: true,
      prompt,
      imageUrl: uploaded.imageUrl,
      storagePath: uploaded.storagePath,
      mimeType,
    };
  } catch (error) {
    console.error("[image-generation/openai] Image generation failed:", error);
    return {
      ok: false,
      error: createGenerateImageError(inferGenerateImageErrorCode(error)),
    };
  }
}

export async function deleteManagedGeneratedImageByUrl(
  imageUrl: string,
): Promise<void> {
  const storagePath = tryExtractManagedGeneratedImagePath(imageUrl);
  if (!storagePath) return;

  try {
    await getStorage()
      .bucket(getStorageBucketName())
      .file(storagePath)
      .delete({ ignoreNotFound: true });
  } catch (error) {
    console.error("[image-generation] Failed to delete old image:", error);
  }
}
