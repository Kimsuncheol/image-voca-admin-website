import { getStorage, ref, getMetadata, uploadBytes } from 'firebase/storage';
import app from '@/lib/firebase/config';

export const storage = getStorage(app);

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
 * Uploads the original CSV file to Storage as a backup.
 * Path: csv/{courseId}/{dayName}.csv
 * Failure is logged but does not throw — callers should not fail on Storage issues.
 */
export async function uploadCsvBackup(
  file: File,
  courseId: string,
  dayName: string
): Promise<void> {
  const csvRef = ref(storage, `csv/${courseId}/${dayName}.csv`);
  await uploadBytes(csvRef, file);
}
