import { Timestamp } from 'firebase/firestore';

export type AdType = 'image' | 'video';

export interface Ad {
  id: string;
  type: AdType;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  active: boolean;
  createdAt: Timestamp;
  createdBy: string;
}

/** Form data for creating a new ad (no id/createdAt yet). */
export interface AdFormData {
  type: AdType;
  title: string;
  description: string;
  imageFile?: File;
  videoUrl?: string;
}
