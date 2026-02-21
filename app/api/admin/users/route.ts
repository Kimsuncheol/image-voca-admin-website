import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

async function verifySession(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    return userDoc.exists ? { uid: decoded.uid, ...userDoc.data() } : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const caller = await verifySession(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const snapshot = await adminDb.collection('users').get();
    const users = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const caller = await verifySession(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerRole = (caller as Record<string, unknown>).role as string;

  try {
    const { uid, role, plan } = await request.json();

    if (role !== undefined) {
      if (callerRole !== 'super-admin') {
        return NextResponse.json({ error: 'Only super-admin can change roles' }, { status: 403 });
      }
      if (!['user', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role. Must be "user" or "admin".' }, { status: 400 });
      }
      const targetDoc = await adminDb.collection('users').doc(uid).get();
      if (!targetDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      if (targetDoc.data()?.role === 'super-admin') {
        return NextResponse.json({ error: 'Cannot change role of a super-admin' }, { status: 403 });
      }
      await adminDb.collection('users').doc(uid).update({ role });
      return NextResponse.json({ status: 'success' });
    }

    if (plan !== undefined) {
      if (callerRole !== 'super-admin' && callerRole !== 'admin') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      if (!['free', 'voca_unlimited', 'voca_speaking'].includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }
      const targetDoc = await adminDb.collection('users').doc(uid).get();
      if (!targetDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      await adminDb.collection('users').doc(uid).update({ plan });
      return NextResponse.json({ status: 'success' });
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const caller = await verifySession(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerRole = (caller as Record<string, unknown>).role as string;
  if (callerRole !== 'super-admin' && callerRole !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const { uid } = await request.json();

    const targetDoc = await adminDb.collection('users').doc(uid).get();
    if (!targetDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetRole = targetDoc.data()?.role as string;

    if (callerRole === 'admin' && targetRole !== 'user') {
      return NextResponse.json({ error: 'Admins can only delete users' }, { status: 403 });
    }

    await adminAuth.deleteUser(uid);
    await adminDb.collection('users').doc(uid).delete();

    return NextResponse.json({ status: 'success' });
  } catch {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
