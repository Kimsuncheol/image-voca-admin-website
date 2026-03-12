import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';

import {
  createSeedAdminPermissions,
  diffAdminAIUsagePermissions,
  getEffectiveAdminPermissions,
  hasAdminAIUsagePermissionChanges,
  hasAdminPermission,
  normalizeAdminPermissions,
  normalizeUserWithAdminPermissions,
} from '@/lib/adminPermissions';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { createAdminAIPermissionsChangedNotification } from '@/lib/server/adminNotifications';
import { verifySessionUser } from '@/lib/server/sessionUser';
import type { AdminPermissions, AppUser, UserPlan } from '@/types/user';

function normalizeLegacyPlan(plan: unknown): unknown {
  if (plan === 'voca_speaking') return 'voca_unlimited';
  return plan;
}

function serializeUser(uid: string, data: Record<string, unknown>): AppUser {
  return normalizeUserWithAdminPermissions({
    uid,
    ...data,
    plan: normalizeLegacyPlan(data.plan),
  } as AppUser);
}

export async function GET(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (caller.role !== 'admin' && caller.role !== 'super-admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  try {
    const snapshot = await adminDb.collection('users').get();
    const users = snapshot.docs.map((doc) =>
      serializeUser(doc.id, doc.data() as Record<string, unknown>),
    );
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerRole = caller.role;

  try {
    const { uid, role, plan, adminPermissions } = await request.json() as {
      uid?: string;
      role?: 'user' | 'admin';
      plan?: UserPlan;
      adminPermissions?: Partial<AdminPermissions>;
    };

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const mutationCount = [role !== undefined, plan !== undefined, adminPermissions !== undefined]
      .filter(Boolean).length;

    if (mutationCount !== 1) {
      return NextResponse.json({ error: 'Exactly one update is allowed per request' }, { status: 400 });
    }

    const targetDoc = await adminDb.collection('users').doc(uid).get();
    if (!targetDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUser = serializeUser(uid, targetDoc.data() as Record<string, unknown>);

    if (role !== undefined) {
      if (callerRole !== 'super-admin') {
        return NextResponse.json({ error: 'Only super-admin can change roles' }, { status: 403 });
      }
      if (!['user', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role. Must be "user" or "admin".' }, { status: 400 });
      }
      if (targetUser.role === 'super-admin') {
        return NextResponse.json({ error: 'Cannot change role of a super-admin' }, { status: 403 });
      }

      const updatePayload: Record<string, unknown> = { role };

      if (role === 'admin' && targetUser.role !== 'admin') {
        updatePayload.adminPermissions = createSeedAdminPermissions();
      }

      if (role === 'user') {
        updatePayload.adminPermissions = FieldValue.delete();
      }

      await adminDb.collection('users').doc(uid).update(updatePayload);

      const updatedUser = normalizeUserWithAdminPermissions({
        ...targetUser,
        role,
        adminPermissions:
          role === 'admin'
            ? targetUser.role === 'admin'
              ? targetUser.adminPermissions
              : createSeedAdminPermissions()
            : undefined,
      });

      return NextResponse.json({ status: 'success', user: updatedUser });
    }

    if (plan !== undefined) {
      if (
        (callerRole !== 'super-admin' && callerRole !== 'admin') ||
        !hasAdminPermission(caller, 'planModification')
      ) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
      if (!['free', 'voca_unlimited'].includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }
      await adminDb.collection('users').doc(uid).update({ plan });
      return NextResponse.json({
        status: 'success',
        user: normalizeUserWithAdminPermissions({
          ...targetUser,
          plan,
        }),
      });
    }

    if (adminPermissions !== undefined) {
      if (callerRole !== 'super-admin') {
        return NextResponse.json({ error: 'Only super-admin can change admin permissions' }, { status: 403 });
      }
      if (targetUser.role !== 'admin') {
        return NextResponse.json({ error: 'Admin permissions can only be changed for admin users' }, { status: 400 });
      }

      const nextPermissions = normalizeAdminPermissions(adminPermissions);
      const previousPermissions = getEffectiveAdminPermissions(targetUser);
      const aiPermissionChanges = diffAdminAIUsagePermissions(
        previousPermissions,
        nextPermissions,
      );

      await adminDb.collection('users').doc(uid).update({
        adminPermissions: nextPermissions,
      });

      if (hasAdminAIUsagePermissionChanges(aiPermissionChanges)) {
        await createAdminAIPermissionsChangedNotification({
          actor: caller,
          targetUid: uid,
          changes: aiPermissionChanges,
        });
      }

      return NextResponse.json({
        status: 'success',
        user: normalizeUserWithAdminPermissions({
          ...targetUser,
          adminPermissions: nextPermissions,
        }),
      });
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerRole = caller.role;
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
