import { saveMangaImageItems } from "@/lib/firebase/mangaFirestore";
import {
  deleteMangaImageByStoragePath,
  uploadMangaImage,
} from "@/lib/firebase/mangaStorage";
import { resolveMangaTarget } from "@/lib/mangaPaths";
import type {
  MangaImageItem,
  MangaNoAiUploadPayload,
} from "@/types/manga";

export async function persistMangaUploadBatch(
  payload: MangaNoAiUploadPayload,
): Promise<MangaImageItem[]> {
  const target = resolveMangaTarget(payload);
  const batchId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const uploadedFiles: MangaImageItem[] = [];

  try {
    for (const [uploadIndex, file] of payload.files.entries()) {
      const imageId = crypto.randomUUID();
      const uploaded = await uploadMangaImage({
        file,
        imageId,
        target,
      });

      uploadedFiles.push({
        id: imageId,
        batchId,
        courseId: payload.courseId,
        jlptLevel:
          payload.courseId === "JLPT" ? payload.jlptLevel ?? undefined : undefined,
        dayId: target.dayId,
        createdAt,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadIndex,
        storagePath: uploaded.storagePath,
        imageUrl: uploaded.imageUrl,
      });
    }

    await saveMangaImageItems(target, uploadedFiles);
    return uploadedFiles;
  } catch (error) {
    await Promise.allSettled(
      uploadedFiles.map((item) => deleteMangaImageByStoragePath(item.storagePath)),
    );

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Failed to upload manga batch.");
  }
}
