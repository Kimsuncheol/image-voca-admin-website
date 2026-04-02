import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";

import { storage } from "./storage";
import type { ResolvedMangaTarget } from "@/types/manga";

interface UploadMangaImageArgs {
  file: File;
  imageId: string;
  target: ResolvedMangaTarget;
}

function inferFileExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();
  if (fromName) return fromName;

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/avif") return "avif";
  return "jpg";
}

export async function uploadMangaImage({
  file,
  imageId,
  target,
}: UploadMangaImageArgs): Promise<{ storagePath: string; imageUrl: string }> {
  const ext = inferFileExtension(file);
  const storagePath = `${target.storagePrefix}/${imageId}.${ext}`;
  const uploadRef = ref(storage, storagePath);

  await uploadBytes(uploadRef, file, {
    contentType: file.type || undefined,
  });

  return {
    storagePath,
    imageUrl: await getDownloadURL(uploadRef),
  };
}

export async function deleteMangaImageByStoragePath(
  storagePath: string,
): Promise<void> {
  await deleteObject(ref(storage, storagePath));
}
