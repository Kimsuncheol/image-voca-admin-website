import type { NextRequest } from "next/server";

import { normalizeUserWithAdminPermissions } from "@/lib/adminPermissions";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { AppUser } from "@/types/user";

export async function verifySessionUser(
  request: NextRequest,
): Promise<AppUser | null> {
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    if (!userDoc.exists) return null;

    return normalizeUserWithAdminPermissions({
      uid: decoded.uid,
      ...userDoc.data(),
    } as AppUser);
  } catch {
    return null;
  }
}
