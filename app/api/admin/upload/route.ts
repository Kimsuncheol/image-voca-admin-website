import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

/**
 * Firestore structure:
 *   {coursePath}            ← course document (has totalDays, lastUploadedDayId, etc.)
 *     /{dayId}              ← subcollection per day: Day1, Day2, ...
 *       /{wordDocId}        ← word documents directly inside each day subcollection
 */
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);

    const { coursePath, dayName, words } = await request.json();

    if (!coursePath || !dayName || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // dayName is used as the subcollection name directly (e.g. "Day1")
    const courseRef = adminDb.doc(coursePath);
    const dayCollection = courseRef.collection(dayName);

    // FR-8: Clear existing day documents before inserting new records to prevent
    // duplicates. Chunked to stay within Firestore's 500-op batch limit.
    const BATCH_LIMIT = 499;
    const existingSnap = await dayCollection.get();
    if (!existingSnap.empty) {
      for (let i = 0; i < existingSnap.docs.length; i += BATCH_LIMIT) {
        const deleteBatch = adminDb.batch();
        existingSnap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => deleteBatch.delete(d.ref));
        await deleteBatch.commit();
      }
    }

    for (let i = 0; i < words.length; i += BATCH_LIMIT) {
      const batch = adminDb.batch();
      words.slice(i, i + BATCH_LIMIT).forEach((word) => {
        batch.set(dayCollection.doc(), word);
      });
      await batch.commit();
    }

    // FR-13: Update course document metadata
    const courseSnap = await courseRef.get();
    const currentTotal = (courseSnap.data()?.totalDays as number) || 0;
    const dayNumber = parseInt(dayName.replace('Day', ''), 10) || 0;

    await courseRef.set(
      {
        lastUploadedDayId: dayName,
        lastUpdated: new Date().toISOString(),
        totalDays: Math.max(currentTotal, dayNumber),
      },
      { merge: true }
    );

    return NextResponse.json({ status: 'success', count: words.length });
  } catch (err) {
    console.error('[upload] Error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
