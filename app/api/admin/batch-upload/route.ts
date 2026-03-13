import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { invalidateCourseCache } from '@/lib/server/wordCache';

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

function normalizeKeyPart(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildQuoteKey(quote: string, author: string, translation: string): string {
  return `${normalizeKeyPart(quote)}||${normalizeKeyPart(author)}||${normalizeKeyPart(translation)}`;
}

function parseQuotePayload(raw: unknown): FamousQuotePayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const quote = item.quote;
  const author = item.author;
  const translation = item.translation;
  if (
    typeof quote !== 'string' ||
    typeof author !== 'string' ||
    typeof translation !== 'string'
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

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let coursePath: string;
  let days: DayPayload[];
  let flat: boolean;
  try {
    ({ coursePath, days, flat = false } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!coursePath || !Array.isArray(days) || days.length === 0) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  const BATCH_LIMIT = 499;
  const results: { dayName: string; count: number; error?: string }[] = [];
  let maxDayNumber = 0;
  let lastSuccessfulDayName = '';
  const existingQuoteKeys = new Set<string>();
  const quoteCollection = flat ? adminDb.collection(coursePath) : null;

  if (flat && quoteCollection) {
    try {
      const existingSnap = await quoteCollection.get();
      existingSnap.docs.forEach((docSnap) => {
        const existing = parseQuotePayload(docSnap.data());
        if (!existing) return;
        existingQuoteKeys.add(
          buildQuoteKey(existing.quote, existing.author, existing.translation)
        );
      });
    } catch (err) {
      console.error('[batch-upload] Failed to read existing famous quotes:', err);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  }

  for (const { dayName, words } of days) {
    if (!dayName || !Array.isArray(words) || words.length === 0) {
      results.push({ dayName: dayName ?? '', count: 0, error: 'Invalid data' });
      continue;
    }

    try {
      if (flat) {
        // ── Flat course (FAMOUS_QUOTE): append mode with deduplication ──
        if (!quoteCollection) throw new Error('Invalid course path');

        const uniqueQuotes: FamousQuotePayload[] = [];
        for (const raw of words) {
          const parsed = parseQuotePayload(raw);
          if (!parsed) {
            throw new Error('Invalid famous quote payload');
          }
          const key = buildQuoteKey(
            parsed.quote,
            parsed.author,
            parsed.translation,
          );
          if (existingQuoteKeys.has(key)) continue;
          existingQuoteKeys.add(key);
          uniqueQuotes.push(parsed);
        }

        for (let i = 0; i < uniqueQuotes.length; i += BATCH_LIMIT) {
          const writeBatch = adminDb.batch();
          uniqueQuotes.slice(i, i + BATCH_LIMIT).forEach((quote) => {
            writeBatch.set(quoteCollection.doc(), quote);
          });
          await writeBatch.commit();
        }

        results.push({ dayName, count: uniqueQuotes.length });
        continue;
      } else {
        // ── Standard course (DayN subcollection pattern) ─────────────────
        const courseRef = adminDb.doc(coursePath);
        const dayCollection = courseRef.collection(dayName);

        // Clear existing docs before inserting to prevent duplicates (chunked)
        const existingSnap = await dayCollection.get();
        if (!existingSnap.empty) {
          for (let i = 0; i < existingSnap.docs.length; i += BATCH_LIMIT) {
            const deleteBatch = adminDb.batch();
            existingSnap.docs
              .slice(i, i + BATCH_LIMIT)
              .forEach((d) => deleteBatch.delete(d.ref));
            await deleteBatch.commit();
          }
        }

        // Write new words in chunked batches
        for (let i = 0; i < words.length; i += BATCH_LIMIT) {
          const writeBatch = adminDb.batch();
          words.slice(i, i + BATCH_LIMIT).forEach((word) => {
            writeBatch.set(dayCollection.doc(), word);
          });
          await writeBatch.commit();
        }

        const dayNumber = parseInt(dayName.replace('Day', ''), 10) || 0;
        maxDayNumber = Math.max(maxDayNumber, dayNumber);
        lastSuccessfulDayName = dayName;
      }

      results.push({ dayName, count: words.length });
    } catch (err) {
      console.error(`[batch-upload] Error for ${dayName}:`, err);
      results.push({
        dayName,
        count: 0,
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  }

  // Update course metadata once for all successfully processed days.
  // Flat courses (FAMOUS_QUOTE) have no DayN structure so totalDays is unused.
  if (!flat && lastSuccessfulDayName) {
    try {
      const courseRef = adminDb.doc(coursePath);
      const courseSnap = await courseRef.get();
      const currentTotal = (courseSnap.data()?.totalDays as number) || 0;
      await courseRef.set(
        {
          lastUploadedDayId: lastSuccessfulDayName,
          lastUpdated: new Date().toISOString(),
          totalDays: Math.max(currentTotal, maxDayNumber),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('[batch-upload] Metadata update failed:', err);
    }
  }

  invalidateCourseCache();

  return NextResponse.json({ results });
}
