"use client";

import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import {
  formatNotificationTimestamp,
  getNotificationActorLabel,
  getNotificationStatusLabel,
} from "@/lib/notificationDisplay";
import type { AppNotification } from "@/types/user";

interface NotificationDetailMetaProps {
  notification: AppNotification;
}

export default function NotificationDetailMeta({
  notification,
}: NotificationDetailMetaProps) {
  const { t } = useTranslation();
  const createdAt = formatNotificationTimestamp(notification.createdAt);
  const readAt = formatNotificationTimestamp(notification.readAt);

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      spacing={1.5}
    >
      {/* Actor info */}
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {t("notifications.changedBy")}
        </Typography>
        <Typography fontWeight={600}>
          {getNotificationActorLabel(notification)}
        </Typography>
        {notification.actorEmail && (
          <Typography variant="body2" color="text.secondary">
            {notification.actorEmail}
          </Typography>
        )}
      </Stack>

      {/* Status + timestamps */}
      <Stack spacing={1} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
        <Chip
          label={getNotificationStatusLabel(notification.readAt, t)}
          color={notification.readAt ? "default" : "primary"}
          variant={notification.readAt ? "outlined" : "filled"}
          size="small"
        />
        {createdAt && (
          <Typography variant="body2" color="text.secondary">
            {createdAt}
          </Typography>
        )}
        {readAt && (
          <Typography variant="body2" color="text.secondary">
            {t("notifications.readAt", { value: readAt })}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
