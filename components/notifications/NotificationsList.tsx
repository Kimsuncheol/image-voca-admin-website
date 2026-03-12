"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import { useTranslation } from "react-i18next";

import type { AppNotification } from "@/types/user";
import NotificationCard from "./NotificationCard";

interface NotificationsListProps {
  notifications: AppNotification[];
  onMarkRead: (notificationId: string) => Promise<void>;
  onOpenDetail: (notificationId: string) => void;
}

export default function NotificationsList({
  notifications,
  onMarkRead,
  onOpenDetail,
}: NotificationsListProps) {
  const { t } = useTranslation();

  if (notifications.length === 0) {
    return <Alert severity="info">{t("notifications.empty")}</Alert>;
  }

  return (
    <Stack spacing={2}>
      {notifications.map((notification) => (
        <NotificationCard
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </Stack>
  );
}
