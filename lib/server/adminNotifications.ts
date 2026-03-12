import type { AppUser } from "@/types/user";
import type { AdminNotificationChange } from "@/types/user";
import { adminDb } from "@/lib/firebase/admin";

export async function createAdminAIPermissionsChangedNotification(params: {
  actor: Pick<AppUser, "uid" | "email" | "displayName">;
  targetUid: string;
  changes: AdminNotificationChange;
}): Promise<void> {
  await adminDb
    .collection("users")
    .doc(params.targetUid)
    .collection("notifications")
    .add({
      type: "admin_ai_permissions_changed",
      createdAt: new Date(),
      readAt: null,
      actorUid: params.actor.uid,
      actorEmail: params.actor.email,
      actorDisplayName: params.actor.displayName,
      targetUid: params.targetUid,
      changes: params.changes,
    });
}
