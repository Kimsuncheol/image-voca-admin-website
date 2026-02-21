import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db } from './config';
import { storage } from './storage';
import type { Ad, AdFormData } from '@/types/ad';

const ADS_COLLECTION = 'advertisement';

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** Fetch every advertisement, newest first. */
export async function getAllAds(): Promise<Ad[]> {
  const q = query(collection(db, ADS_COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type ?? 'video',
      title: data.title ?? '',
      description: data.description ?? '',
      imageUrl: data.imageUrl,
      videoUrl: data.videoUrl,
      active: data.active ?? true,
      createdAt: data.createdAt ?? data.publishedAt ?? Timestamp.now(),
      createdBy: data.createdBy ?? '',
    } as Ad;
  });
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/** Create a new advertisement. Uploads image to Storage if provided. */
export async function createAd(formData: AdFormData, userId: string): Promise<void> {
  const docData: Record<string, unknown> = {
    type: formData.type,
    title: formData.title,
    description: formData.description,
    active: true,
    createdAt: serverTimestamp(),
    createdBy: userId,
  };

  if (formData.type === 'video') {
    docData.videoUrl = formData.videoUrl ?? '';
  }

  // Create doc first to get an ID for the Storage path
  const docRef = await addDoc(collection(db, ADS_COLLECTION), docData);

  // If image type, upload the file and update the doc with the URL
  if (formData.type === 'image' && formData.imageFile) {
    const storagePath = `ads/${docRef.id}/image.jpg`;
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, formData.imageFile);
    const downloadUrl = await getDownloadURL(storageRef);
    await updateDoc(docRef, { imageUrl: downloadUrl });
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/** Toggle an advertisement's active status. */
export async function toggleAdStatus(adId: string, active: boolean): Promise<void> {
  const adRef = doc(db, ADS_COLLECTION, adId);
  await updateDoc(adRef, { active });
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

/** Delete an advertisement. Best-effort cleanup of Storage image. */
export async function deleteAd(adId: string): Promise<void> {
  // Try to delete image from Storage (non-critical)
  try {
    const storageRef = ref(storage, `ads/${adId}/image.jpg`);
    await deleteObject(storageRef);
  } catch {
    // Image may not exist (video ad) — ignore
  }

  await deleteDoc(doc(db, ADS_COLLECTION, adId));
}
