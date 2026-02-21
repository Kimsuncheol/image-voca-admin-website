// Requires PROMOTION_CODE_HMAC_SECRET in .env.local for code integrity hashing.
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { CodeGenerationRequest } from '@/types/promotionCode';

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

function isAdmin(caller: Record<string, unknown>): boolean {
  const role = caller.role as string | undefined;
  return role === 'admin' || role === 'super-admin';
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = randomBytes(12);
  let result = 'PROMO-';
  for (let i = 0; i < 12; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

function hashCode(code: string): string {
  const secret = process.env.PROMOTION_CODE_HMAC_SECRET ?? '';
  return createHmac('sha256', secret).update(code).digest('hex');
}

export async function GET(request: NextRequest) {
  const caller = await verifySession(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(caller as Record<string, unknown>)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const snapshot = await adminDb
      .collection('promotionCodes')
      .orderBy('createdAt', 'desc')
      .get();

    const codes = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate().toISOString() ?? null,
    }));

    return NextResponse.json({ codes });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch promotion codes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const caller = await verifySession(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(caller as Record<string, unknown>)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body: CodeGenerationRequest = await request.json();
    const { eventPeriod, benefit, maxUses, maxUsesPerUser, description, count } = body;

    if (!description || description.trim() === '') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!count || count < 1 || count > 100) {
      return NextResponse.json({ error: 'Count must be between 1 and 100' }, { status: 400 });
    }

    const codes: string[] = [];
    const codeIds: string[] = [];
    const batch = adminDb.batch();

    for (let i = 0; i < count; i++) {
      const code = generateCode();
      const codeHash = hashCode(code);
      const docRef = adminDb.collection('promotionCodes').doc();

      batch.set(docRef, {
        code,
        codeHash,
        eventPeriod,
        benefit,
        maxUses: Number(maxUses) || 0,
        maxUsesPerUser: Number(maxUsesPerUser) || 1,
        currentUses: 0,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: caller.uid,
        status: 'active',
        description: description.trim(),
      });

      codes.push(code);
      codeIds.push(docRef.id);
    }

    await batch.commit();

    return NextResponse.json({ codes, codeIds });
  } catch {
    return NextResponse.json({ error: 'Failed to generate promotion codes' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const caller = await verifySession(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isAdmin(caller as Record<string, unknown>)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { codeId } = await request.json();
    if (!codeId) {
      return NextResponse.json({ error: 'codeId is required' }, { status: 400 });
    }

    const docRef = adminDb.collection('promotionCodes').doc(codeId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Promotion code not found' }, { status: 404 });
    }

    await docRef.update({ status: 'inactive' });

    return NextResponse.json({ status: 'success' });
  } catch {
    return NextResponse.json({ error: 'Failed to deactivate promotion code' }, { status: 500 });
  }
}
