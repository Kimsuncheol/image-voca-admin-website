import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { idToken, displayName, photoURL } = await request.json();

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    await adminDb.collection('users').doc(uid).set({
      uid,
      email: decodedToken.email || '',
      displayName: displayName || '',
      photoURL: photoURL || '',
      role: 'user',
      createdAt: new Date(),
    });

    await adminAuth.setCustomUserClaims(uid, { role: 'user' });

    return NextResponse.json({ status: 'success', uid });
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
