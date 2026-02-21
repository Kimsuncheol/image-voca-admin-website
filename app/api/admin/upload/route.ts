import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

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

    const courseRef = adminDb.doc(coursePath);
    const daysRef = courseRef.collection('days');

    const existingDays = await daysRef.where('name', '==', dayName).get();
    let dayRef;

    if (!existingDays.empty) {
      dayRef = existingDays.docs[0].ref;
    } else {
      dayRef = daysRef.doc();
      await dayRef.set({ name: dayName, wordCount: 0 });
    }

    const batch = adminDb.batch();
    const wordsRef = dayRef.collection('words');

    for (const word of words) {
      const wordDoc = wordsRef.doc();
      batch.set(wordDoc, word);
    }

    batch.update(dayRef, { wordCount: words.length });
    await batch.commit();

    return NextResponse.json({ status: 'success', count: words.length });
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
