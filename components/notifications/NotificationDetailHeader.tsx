"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { getNotificationTitle } from "@/lib/notificationDisplay";
import type { AppNotification } from "@/types/user";

interface NotificationDetailHeaderProps {
  notification: AppNotification;
}

export default function NotificationDetailHeader({
  notification,
}: NotificationDetailHeaderProps) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography variant="h4" fontWeight={600}>
        {t("notifications.notificationDetails")}
      </Typography>
      <Typography color="text.secondary">
        {getNotificationTitle(notification, t)}
      </Typography>
    </Stack>
  );
}
