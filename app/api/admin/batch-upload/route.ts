import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

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

  for (const { dayName, words } of days) {
    if (!dayName || !Array.isArray(words) || words.length === 0) {
      results.push({ dayName: dayName ?? '', count: 0, error: 'Invalid data' });
      continue;
    }

    try {
      if (flat) {
        // ── Flat course (e.g. FAMOUS_QUOTE) ─────────────────────────────
        // The new CSV is treated as the authoritative list: delete all existing
        // documents first, then write the incoming set fresh (overwrite semantics).
        const col = adminDb.collection(coursePath);

        // Step 1 — clear existing documents (chunked to stay under batch limit)
        const existingSnap = await col.get();
        if (!existingSnap.empty) {
          for (let i = 0; i < existingSnap.docs.length; i += BATCH_LIMIT) {
            const deleteBatch = adminDb.batch();
            existingSnap.docs
              .slice(i, i + BATCH_LIMIT)
              .forEach((d) => deleteBatch.delete(d.ref));
            await deleteBatch.commit();
          }
          console.log(`[batch-upload] Cleared ${existingSnap.size} existing doc(s) from ${coursePath}`);
        }

        // Step 2 — write all incoming words
        for (let i = 0; i < words.length; i += BATCH_LIMIT) {
          const writeBatch = adminDb.batch();
          (words as Record<string, unknown>[]).slice(i, i + BATCH_LIMIT).forEach((word) => {
            writeBatch.set(col.doc(), word);
          });
          await writeBatch.commit();
        }

        // Report the written count back to the client
        results.push({ dayName, count: words.length });
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

  return NextResponse.json({ results });
}
