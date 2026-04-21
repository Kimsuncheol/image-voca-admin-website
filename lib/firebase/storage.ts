import { getStorage, ref, getMetadata, getDownloadURL, uploadBytes } from 'firebase/storage';
import app from '@/lib/firebase/config';

export const storage = getStorage(app);

function getSourceBackupExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.trim().toLowerCase();
  if (ext === "xlsx" || ext === "xls" || ext === "tsv") return ext;
  return "csv";
}

/**
 * Returns true if a CSV backup already exists in Storage for the given course+day.
 * Path: csv/{courseId}/{dayName}.csv
 */
export async function checkCsvExists(
  courseId: string,
  dayName: string
): Promise<boolean> {
  try {
    await getMetadata(ref(storage, `csv/${courseId}/${dayName}.csv`));
    return true;
  } catch {
    return false;
  }
}

/**
 * Uploads the original source file to Storage as a backup.
 * Path: csv/{courseId}/{dayName}.{csv|tsv|xlsx|xls}
 * Failure is logged but does not throw — callers should not fail on Storage issues.
 */
export async function uploadCsvBackup(
  file: File,
  courseId: string,
  dayName: string
): Promise<void> {
  const extension = getSourceBackupExtension(file.name);
  const csvRef = ref(storage, `csv/${courseId}/${dayName}.${extension}`);
  await uploadBytes(csvRef, file);
}

export async function uploadWordImage(
  file: File,
  courseId: string,
  dayId: string,
  wordId: string,
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const imageRef = ref(storage, `word-images/${courseId}/${dayId}/${wordId}.${ext}`);
  await uploadBytes(imageRef, file);
  return getDownloadURL(imageRef);
}
