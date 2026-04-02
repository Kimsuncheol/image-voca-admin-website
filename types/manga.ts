export type MangaNoAiUploadCourseId =
  | "CSAT"
  | "TOEFL_IELTS"
  | "TOEIC"
  | "JLPT"
  | "COLLOCATIONS";

export type MangaNoAiUploadJlptLevel = "N1" | "N2" | "N3" | "N4" | "N5";

export interface MangaNoAiUploadPayload {
  files: File[];
  courseId: MangaNoAiUploadCourseId;
  jlptLevel?: MangaNoAiUploadJlptLevel;
  day: number;
}

export interface ResolvedMangaTarget {
  courseId: MangaNoAiUploadCourseId;
  jlptLevel?: MangaNoAiUploadJlptLevel;
  dayId: string;
  firestoreRootDocPath: string;
  firestoreDayDocPath: string;
  firestoreItemsCollectionPath: string;
  storagePrefix: string;
}

export interface MangaStoredUpload {
  id: string;
  storagePath: string;
  imageUrl: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadIndex: number;
}

export interface MangaImageItem extends MangaStoredUpload {
  courseId: MangaNoAiUploadCourseId;
  jlptLevel?: MangaNoAiUploadJlptLevel;
  dayId: string;
  batchId: string;
  createdAt: string;
}
