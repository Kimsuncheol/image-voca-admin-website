import { NextRequest, NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { invalidateCourseCache } from "@/lib/server/wordCache";

/**
 * POST /api/admin/batch-upload
 *
 * Accepts multiple days in one request and writes them all to Firestore,
 * reducing N individual /api/admin/upload round-trips to a single call.
 *
 * Body:  { coursePath: string; days: { dayName: string; words: unknown[] }[]; flat?: boolean }
 * Response: { results: { dayName: string; count: number; error?: string }[] }
 *
 * When `flat` is true (e.g. FAMOUS_QUOTE), words are written directly into the
 * Firestore collection at `coursePath` rather than into a `DayN` subcollection.
 * In that case `dayName` is a UUID used only for idempotency tracking.
 */

interface DayPayload {
  dayName: string;
  words: unknown[];
}

interface FamousQuotePayload {
  quote: string;
  author: string;
  translation: string;
}

interface NamedWordPayload {
  id: string;
  data: Record<string, unknown>;
}

interface BatchUploadRequestBody {
  coursePath: string;
  days: DayPayload[];
  flat?: boolean;
}

interface BatchUploadCollectionSnapshot {
  docs: Array<{ data: () => unknown }>;
}

interface BatchUploadDaySnapshot {
  empty: boolean;
  docs: Array<{ ref: unknown }>;
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
  const author = item.author;
  const translation = item.translation;
  if (
    typeof quote !== "string" ||
    typeof author !== "string" ||
    typeof translation !== "string"
  ) {
    return null;
  }

  const parsed: FamousQuotePayload = {
    quote: quote.trim(),
    author: author.trim(),
    translation: translation.trim(),
  };

  if (!parsed.quote || !parsed.author || !parsed.translation) return null;
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
  coursePath: string,
  dayName: string,
  words: unknown[],
  dependencies: BatchUploadDependencies,
  batchLimit: number,
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

  const dayCollection = dependencies.adminDb.doc(coursePath).collection(dayName);

  const existingSnap = await dayCollection.get();
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
    namedWords.slice(i, i + batchLimit).forEach((word) => {
      writeBatch.set(dayCollection.doc(word.id), word.data);
    });
    await writeBatch.commit();
  }

  return namedWords.length;
}

export function createBatchUploadHandler(
  dependencies: BatchUploadDependencies,
) {
  return async function POST(request: NextRequest) {
    const unauthorizedResponse = await authorizeRequest(request, dependencies);
    if (unauthorizedResponse) return unauthorizedResponse;

    let coursePath: string;
    let days: DayPayload[];
    let flat: boolean;
    try {
      ({ coursePath, days, flat = false } =
        (await request.json()) as BatchUploadRequestBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!coursePath || !Array.isArray(days) || days.length === 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const batchLimit = 499;
    const results: { dayName: string; count: number; error?: string }[] = [];
    let maxDayNumber = 0;
    let lastSuccessfulDayName = "";
    let existingQuoteKeys = new Set<string>();

    if (flat) {
      try {
        existingQuoteKeys = await getExistingQuoteKeys(coursePath, dependencies);
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
        const count = flat
          ? await writeFlatQuotes(
              coursePath,
              words,
              existingQuoteKeys,
              dependencies,
              batchLimit,
            )
          : await writeDayWords(
              coursePath,
              dayName,
              words,
              dependencies,
              batchLimit,
            );

        if (!flat) {
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

    if (!flat && lastSuccessfulDayName) {
      try {
        const courseRef = dependencies.adminDb.doc(coursePath);
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
