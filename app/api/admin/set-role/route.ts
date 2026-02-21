import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const callerDoc = await adminDb.collection('users').doc(decoded.uid).get();

    if (!callerDoc.exists || callerDoc.data()?.role !== 'super-admin') {
      return NextResponse.json({ error: 'Only super-admin can set roles' }, { status: 403 });
    }

    const { uid, role } = await request.json();

    if (!['super-admin', 'admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await adminAuth.setCustomUserClaims(uid, { role });
    await adminDb.collection('users').doc(uid).update({ role });

    return NextResponse.json({ status: 'success' });
  } catch {
    return NextResponse.json({ error: 'Failed to set role' }, { status: 500 });
  }
}
