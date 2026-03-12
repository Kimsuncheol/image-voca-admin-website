import type { TFunction } from "i18next";

import type { AdminNotificationChange, AppNotification } from "@/types/user";

export interface NotificationChangeItem {
  key: keyof AdminNotificationChange;
  permission: string;
  before: boolean;
  after: boolean;
  summary: string;
}

export function formatNotificationTimestamp(value: unknown): string | null {
  if (!value) return null;

  try {
    if (typeof value === "object" && value !== null && "toDate" in value) {
      return (value as { toDate(): Date }).toDate().toLocaleString();
    }
    if (typeof value === "object" && value !== null && "_seconds" in value) {
      return new Date(
        (value as { _seconds: number })._seconds * 1000,
      ).toLocaleString();
    }
    return new Date(value as string | number).toLocaleString();
  } catch {
    return null;
  }
}

export function getNotificationActorLabel(notification: AppNotification): string {
  return (
    notification.actorDisplayName ||
    notification.actorEmail ||
    notification.actorUid
  );
}

export function getNotificationTitle(
  notification: AppNotification,
  t: TFunction,
): string {
  if (notification.type === "admin_ai_permissions_changed") {
    return t("notifications.adminPermissionsChanged", {
      actor: getNotificationActorLabel(notification),
    });
  }

  return t("notifications.notificationDetails");
}

export function getNotificationChangeItems(
  changes: AdminNotificationChange,
  t: TFunction,
): NotificationChangeItem[] {
  const items: NotificationChangeItem[] = [];

  if (changes.imageGeneration) {
    items.push({
      key: "imageGeneration",
      permission: t("users.permissionImageGeneration"),
      before: changes.imageGeneration.before,
      after: changes.imageGeneration.after,
      summary: t("notifications.changeLine", {
        permission: t("users.permissionImageGeneration"),
        status: changes.imageGeneration.after
          ? t("notifications.enabled")
          : t("notifications.disabled"),
      }),
    });
  }

  if (changes.exampleTranslationGeneration) {
    items.push({
      key: "exampleTranslationGeneration",
      permission: t("users.permissionExampleTranslationGeneration"),
      before: changes.exampleTranslationGeneration.before,
      after: changes.exampleTranslationGeneration.after,
      summary: t("notifications.changeLine", {
        permission: t("users.permissionExampleTranslationGeneration"),
        status: changes.exampleTranslationGeneration.after
          ? t("notifications.enabled")
          : t("notifications.disabled"),
      }),
    });
  }

  return items;
}

export function getNotificationStatusLabel(
  readAt: AppNotification["readAt"],
  t: TFunction,
): string {
  return readAt ? t("notifications.read") : t("notifications.unread");
}
