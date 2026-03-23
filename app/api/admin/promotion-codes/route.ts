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
  const secret = process.env.PROMOTION_CODE_HMAC_SECRET;
  if (!secret) throw new Error('Missing required environment variable: PROMOTION_CODE_HMAC_SECRET');
  return createHmac('sha256', secret).update(code).digest('hex');
}

async function deleteExpiredUnusedCodes(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'

  const snapshot = await adminDb
    .collection('promotionCodes')
    .where('currentUses', '==', 0)
    .get();

  // eventPeriod.endDate is 'YYYY-MM-DD' — lexicographic compare is safe
  const toDelete = snapshot.docs.filter((d) => {
    const endDate: string = d.data().eventPeriod?.endDate ?? '';
    return endDate !== '' && endDate < today;
  });

  if (toDelete.length === 0) return;

  const CHUNK = 500;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const batch = adminDb.batch();
    toDelete.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
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
    // Fire-and-forget cleanup — errors are logged but never block the response
    deleteExpiredUnusedCodes().catch((err) => {
      console.error('[promotion-codes] expiry cleanup failed:', err);
    });

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

    // #2 — Validate description and count
    if (!description || description.trim() === '') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    if (!count || count < 1 || count > 100) {
      return NextResponse.json({ error: 'Count must be between 1 and 100' }, { status: 400 });
    }

    // #2 — Validate eventPeriod date format (YYYY-MM-DD or empty)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (
      eventPeriod?.startDate !== '' && eventPeriod?.startDate && !datePattern.test(eventPeriod.startDate) ||
      eventPeriod?.endDate !== '' && eventPeriod?.endDate && !datePattern.test(eventPeriod.endDate)
    ) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    // #2 — Validate benefit fields
    if (benefit?.type !== 'subscription') {
      return NextResponse.json({ error: 'benefit.type must be "subscription"' }, { status: 400 });
    }
    if (benefit?.planId !== 'voca_unlimited' && benefit?.planId !== 'voca_speaking') {
      return NextResponse.json({ error: 'benefit.planId must be "voca_unlimited" or "voca_speaking"' }, { status: 400 });
    }
    if (typeof benefit?.isPermanent !== 'boolean') {
      return NextResponse.json({ error: 'benefit.isPermanent must be a boolean' }, { status: 400 });
    }

    // #9 — Validate durationDays when not permanent
    if (!benefit.isPermanent) {
      const days = benefit.durationDays;
      if (!Number.isInteger(days) || (days as number) < 1) {
        return NextResponse.json({ error: 'benefit.durationDays must be a positive integer when isPermanent is false' }, { status: 400 });
      }
    }

    // #3 — Validate maxUses and maxUsesPerUser with explicit bounds
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 10000) {
      return NextResponse.json({ error: 'maxUses must be an integer between 1 and 10000' }, { status: 400 });
    }
    if (!Number.isInteger(maxUsesPerUser) || maxUsesPerUser < 1 || maxUsesPerUser > 100) {
      return NextResponse.json({ error: 'maxUsesPerUser must be an integer between 1 and 100' }, { status: 400 });
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
        maxUses,
        maxUsesPerUser,
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

    // #7 — Atomic transaction eliminates the TOCTOU race between read and update
    // #5 — Status check inside the transaction ensures idempotency
    // #4 — Audit fields recorded atomically with the status change
    await adminDb.runTransaction(async (tx) => {
      const doc = await tx.get(docRef);
      if (!doc.exists) throw Object.assign(new Error('not_found'), { code: 'not_found' });
      if (doc.data()!.status !== 'active') throw Object.assign(new Error('not_active'), { code: 'not_active' });
      tx.update(docRef, {
        status: 'inactive',
        deactivatedBy: caller.uid,
        deactivatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ status: 'success' });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'not_found') {
      return NextResponse.json({ error: 'Promotion code not found' }, { status: 404 });
    }
    if (code === 'not_active') {
      return NextResponse.json({ error: 'Promotion code is not active' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to deactivate promotion code' }, { status: 500 });
  }
}
