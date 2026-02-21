import { Timestamp } from 'firebase/firestore';

export interface Ad {
  id: string;
  videoUrl: string;
  publishedAt: Timestamp;
}

export function isExpired(ad: Ad): boolean {
  const expiryMs = ad.publishedAt.toMillis() + 7 * 24 * 60 * 60 * 1000;
  return Date.now() > expiryMs;
}

export function getExpiryDate(ad: Ad): Date {
  return new Date(ad.publishedAt.toMillis() + 7 * 24 * 60 * 60 * 1000);
}
