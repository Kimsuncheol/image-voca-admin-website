import { NextRequest, NextResponse } from "next/server";

import { requireSingleListSubcollectionByCoursePath } from "@/lib/courseStorage";
import { normalizeCoursePath } from "@/lib/coursePath";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { invalidateCourseCache } from "@/lib/server/wordCache";

/**
 * POST /api/admin/batch-upload
 *
 * Accepts multiple days in one request and writes them all to Firestore,
 * reducing N individual /api/admin/upload round-trips to a single call.
 *
 * Body:  {
 *   coursePath: string;
 *   days: { dayName: string; words: unknown[] }[];
 *   storageMode?: "day" | "flat" | "singleList" | "collection";
 * }
 * Response: { results: { dayName: string; count: number; error?: string }[] }
 *
 * When `storageMode` is:
 *  - "day": words are written into DayN subcollections
 *  - "flat": words are written directly into the collection root
 *  - "singleList": words are written into the course's fixed named subcollection
 *  - "collection": words are written directly into the provided collection path
 */

interface DayPayload {
  dayName: string;
  words: unknown[];
}

interface FamousQuotePayload {
  quote: string;
  author: string;
  translation: string;
  language?: string;
}

interface NamedWordPayload {
  id: string;
  data: Record<string, unknown>;
}

interface BatchUploadRequestBody {
  coursePath: string;
  days: DayPayload[];
  storageMode?: "day" | "flat" | "singleList" | "collection";
  preserveExistingImages?: boolean;
}

interface BatchUploadCollectionSnapshot {
  empty?: boolean;
  docs: Array<{
    id: string;
    ref: unknown;
    data: () => Record<string, unknown> | undefined;
  }>;
}

interface BatchUploadDaySnapshot {
  empty: boolean;
  docs: Array<{
    id: string;
    ref: unknown;
    data: () => Record<string, unknown> | undefined;
  }>;
}

interface BatchUploadCollectionRef {
  doc: (id?: string) => unknown;
  get: () => Promise<BatchUploadCollectionSnapshot>;
}

interface BatchUploadCourseDocRef {
  collection: (name: string) => {
    doc: (id?: string) => unknown;
    get: () => Promise<BatchUploadDaySnapshot>;
  };
  get: () => Promise<{ data: () => Record<string, unknown> | undefined }>;
  set: (
    data: Record<string, unknown>,
    options: { merge: boolean },
  ) => Promise<unknown>;
}

interface BatchUploadDependencies {
  adminDb: {
    batch: () => {
      set(ref: unknown, data: unknown, options?: unknown): unknown;
      delete(ref: unknown): unknown;
      commit(): Promise<unknown>;
    };
    collection(path: string): BatchUploadCollectionRef;
    doc(path: string): BatchUploadCourseDocRef;
  };
  invalidateCourseCache: () => void;
  verifySessionCookie: (sessionCookie: string) => Promise<void>;
}

function normalizeKeyPart(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildQuoteKey(quote: string, author: string, translation: string): string {
  return `${normalizeKeyPart(quote)}||${normalizeKeyPart(author)}||${normalizeKeyPart(translation)}`;
}

function parseQuotePayload(raw: unknown): FamousQuotePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const quote = item.quote;
  const author = item.author ?? "";
  const translation = item.translation;
  const language = item.language;

  if (typeof quote !== "string" || typeof translation !== "string") return null;
  if (typeof author !== "string") return null;

  const parsed: FamousQuotePayload = {
    quote: quote.trim(),
    author: author.trim(),
    translation: translation.trim(),
  };

  if (!parsed.quote || !parsed.translation) return null;

  if (language === "English" || language === "Japanese") {
    parsed.language = language;
  }

  return parsed;
}

function isValidWordDocumentId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !value.includes("/")
  );
}

function parseNamedWordPayload(raw: unknown): NamedWordPayload | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;
  if (!isValidWordDocumentId(item.id)) return null;

  const { id, ...data } = item;
  return {
    id: id.trim(),
    data,
  };
}

function getFirestoreNestedArrayPath(
  value: unknown,
  path: string,
): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const item = value[index];
      const itemPath = `${path}[${index}]`;
      if (Array.isArray(item)) return itemPath;
      const nestedPath = getFirestoreNestedArrayPath(item, itemPath);
      if (nestedPath) return nestedPath;
    }
    return null;
  }

  if (typeof value !== "object" || value === null) return null;

  for (const [key, childValue] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    const nestedPath = getFirestoreNestedArrayPath(childValue, childPath);
    if (nestedPath) return nestedPath;
  }

  return null;
}

function assertFirestorePayloadHasNoNestedArrays(
  words: NamedWordPayload[],
): void {
  for (const word of words) {
    const nestedPath = getFirestoreNestedArrayPath(word.data, word.id);
    if (nestedPath) {
      throw new Error(
        `Nested arrays are not allowed in Firestore payload at ${nestedPath}. Use grouped objects such as { items: [...] } for nested list fields.`,
      );
    }
  }
}

function hasNonEmptyImageUrl(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getWordIdentity(data: Record<string, unknown>): string | null {
  const candidates = [data.word, data.collocation, data.prefix, data.postfix];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

function mergePreservedImageUrls(
  words: NamedWordPayload[],
  existingDataById: Map<string, Record<string, unknown>>,
): NamedWordPayload[] {
  return words.map((word) => {
    if (hasNonEmptyImageUrl(word.data.imageUrl)) {
      return word;
    }

    const existingData = existingDataById.get(word.id);
    if (!existingData || !hasNonEmptyImageUrl(existingData.imageUrl)) {
      return word;
    }

    const incomingIdentity = getWordIdentity(word.data);
    const existingIdentity = getWordIdentity(existingData);
    if (
      incomingIdentity &&
      existingIdentity &&
      incomingIdentity !== existingIdentity
    ) {
      return word;
    }

    return {
      ...word,
      data: {
        ...word.data,
        imageUrl: existingData.imageUrl,
      },
    };
  });
}

async function authorizeRequest(
  request: NextRequest,
  dependencies: BatchUploadDependencies,
) {
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dependencies.verifySessionCookie(sessionCookie);
    return null;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

async function getExistingQuoteKeys(
  coursePath: string,
  dependencies: BatchUploadDependencies,
): Promise<Set<string>> {
  const existingQuoteKeys = new Set<string>();
  const quoteCollection = dependencies.adminDb.collection(coursePath);
  const existingSnap = await quoteCollection.get();
  existingSnap.docs.forEach((docSnap: { data: () => unknown }) => {
    const existing = parseQuotePayload(docSnap.data());
    if (!existing) return;
    existingQuoteKeys.add(
      buildQuoteKey(existing.quote, existing.author, existing.translation),
    );
  });
  return existingQuoteKeys;
}

async function writeFlatQuotes(
  coursePath: string,
  words: unknown[],
  existingQuoteKeys: Set<string>,
  dependencies: BatchUploadDependencies,
  batchLimit: number,
): Promise<number> {
  const quoteCollection = dependencies.adminDb.collection(coursePath);
  const uniqueQuotes: FamousQuotePayload[] = [];

  for (const raw of words) {
    const parsed = parseQuotePayload(raw);
    if (!parsed) {
      throw new Error("Invalid famous quote payload");
    }

    const key = buildQuoteKey(parsed.quote, parsed.author, parsed.translation);
    if (existingQuoteKeys.has(key)) continue;
    existingQuoteKeys.add(key);
    uniqueQuotes.push(parsed);
  }

  for (let i = 0; i < uniqueQuotes.length; i += batchLimit) {
    const writeBatch = dependencies.adminDb.batch();
    uniqueQuotes.slice(i, i + batchLimit).forEach((quote) => {
      writeBatch.set(quoteCollection.doc(), quote);
    });
    await writeBatch.commit();
  }

  return uniqueQuotes.length;
}

async function writeDayWords(
  targetPath: string,
  subcollectionName: string | null,
  words: unknown[],
  dependencies: BatchUploadDependencies,
  batchLimit: number,
  preserveExistingImages: boolean,
  storageMode: "day" | "singleList" | "collection",
): Promise<number> {
  const parsedWords = words.map((word) => parseNamedWordPayload(word));
  if (parsedWords.some((word) => word === null)) {
    throw new Error("Invalid word payload");
  }

  const namedWords = parsedWords as NamedWordPayload[];
  const seenIds = new Set<string>();
  for (const word of namedWords) {
    if (seenIds.has(word.id)) {
      throw new Error(`Duplicate word id: ${word.id}`);
    }
    seenIds.add(word.id);
  }

  const dayCollection =
    storageMode === "collection"
      ? dependencies.adminDb.collection(targetPath)
      : dependencies.adminDb.doc(targetPath).collection(subcollectionName ?? "");

  const existingSnap = await dayCollection.get();
  const wordsToWrite = preserveExistingImages
    ? mergePreservedImageUrls(
        namedWords,
        new Map(
          existingSnap.docs.map((docSnap) => [docSnap.id, docSnap.data() ?? {}]),
        ),
      )
    : namedWords;

  assertFirestorePayloadHasNoNestedArrays(wordsToWrite);

  if (!existingSnap.empty) {
    for (let i = 0; i < existingSnap.docs.length; i += batchLimit) {
      const deleteBatch = dependencies.adminDb.batch();
      existingSnap.docs
        .slice(i, i + batchLimit)
        .forEach((docSnap: { ref: unknown }) => deleteBatch.delete(docSnap.ref));
      await deleteBatch.commit();
    }
  }

  for (let i = 0; i < namedWords.length; i += batchLimit) {
    const writeBatch = dependencies.adminDb.batch();
    wordsToWrite.slice(i, i + batchLimit).forEach((word) => {
      writeBatch.set(dayCollection.doc(word.id), word.data);
    });
    await writeBatch.commit();
  }

  return wordsToWrite.length;
}

export function createBatchUploadHandler(
  dependencies: BatchUploadDependencies,
) {
  return async function POST(request: NextRequest) {
    const unauthorizedResponse = await authorizeRequest(request, dependencies);
    if (unauthorizedResponse) return unauthorizedResponse;

    let coursePath: string;
    let days: DayPayload[];
    let storageMode: "day" | "flat" | "singleList" | "collection";
    let preserveExistingImages: boolean;
    try {
      ({ coursePath, days, storageMode = "day", preserveExistingImages = false } =
        (await request.json()) as BatchUploadRequestBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const normalizedCoursePath = normalizeCoursePath(coursePath);
    let singleListSubcollectionName: string | null = null;

    if (!normalizedCoursePath) {
      return NextResponse.json(
        { error: "Course path is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(days) || days.length === 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    if (storageMode === "singleList") {
      try {
        singleListSubcollectionName =
          requireSingleListSubcollectionByCoursePath(normalizedCoursePath);
      } catch {
        return NextResponse.json(
          { error: "Invalid single-list course path" },
          { status: 400 },
        );
      }
    }

    const batchLimit = 499;
    const results: { dayName: string; count: number; error?: string }[] = [];
    let maxDayNumber = 0;
    let lastSuccessfulDayName = "";
    let existingQuoteKeys = new Set<string>();

    if (storageMode === "flat") {
      try {
        existingQuoteKeys = await getExistingQuoteKeys(
          normalizedCoursePath,
          dependencies,
        );
      } catch (error) {
        console.error("[batch-upload] Failed to read existing famous quotes:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }
    }

    for (const { dayName, words } of days) {
      if (!dayName || !Array.isArray(words) || words.length === 0) {
        results.push({ dayName: dayName ?? "", count: 0, error: "Invalid data" });
        continue;
      }

      try {
        const count = storageMode === "flat"
          ? await writeFlatQuotes(
              normalizedCoursePath,
              words,
              existingQuoteKeys,
              dependencies,
              batchLimit,
            )
          : storageMode === "collection"
            ? await writeDayWords(
                normalizedCoursePath,
                null,
                words,
                dependencies,
                batchLimit,
                preserveExistingImages,
                "collection",
              )
            : await writeDayWords(
                normalizedCoursePath,
                storageMode === "singleList"
                  ? (singleListSubcollectionName ?? dayName)
                  : dayName,
                words,
                dependencies,
                batchLimit,
                preserveExistingImages,
                storageMode,
              );

        if (storageMode === "day") {
          const dayNumber = parseInt(dayName.replace("Day", ""), 10) || 0;
          maxDayNumber = Math.max(maxDayNumber, dayNumber);
          lastSuccessfulDayName = dayName;
        }

        results.push({ dayName, count });
      } catch (error) {
        console.error(`[batch-upload] Error for ${dayName}:`, error);
        results.push({
          dayName,
          count: 0,
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }

    if (storageMode === "day" && lastSuccessfulDayName) {
      try {
        const courseRef = dependencies.adminDb.doc(normalizedCoursePath);
        const courseSnap = await courseRef.get();
        const currentTotal = Number(courseSnap.data()?.totalDays ?? 0);
        await courseRef.set(
          {
            lastUploadedDayId: lastSuccessfulDayName,
            lastUpdated: new Date().toISOString(),
            totalDays: Math.max(currentTotal, maxDayNumber),
          },
          { merge: true },
        );
      } catch (error) {
        console.error("[batch-upload] Metadata update failed:", error);
      }
    }

    dependencies.invalidateCourseCache();

    return NextResponse.json({ results });
  };
}

export const POST = createBatchUploadHandler({
  adminDb,
  invalidateCourseCache: () => invalidateCourseCache(),
  verifySessionCookie: async (sessionCookie: string) => {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  },
});
