"use client";

import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { getNotificationChangeItems } from "@/lib/notificationDisplay";
import type { AppNotification } from "@/types/user";

interface NotificationChangeListProps {
  notification: AppNotification;
}

export default function NotificationChangeList({
  notification,
}: NotificationChangeListProps) {
  const { t } = useTranslation();
  const changeItems = getNotificationChangeItems(notification.changes, t);

  return (
    <Stack spacing={1}>
      <Typography variant="h6">{t("notifications.status")}</Typography>

      {changeItems.length === 0 ? (
        <Alert severity="info">{t("notifications.unsupportedDetails")}</Alert>
      ) : (
        <Stack spacing={1.5}>
          {changeItems.map((item) => (
            <Card key={item.key} variant="outlined">
              <CardContent>
                <Stack spacing={1}>
                  <Typography fontWeight={600}>{item.permission}</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" color="text.secondary">
                        {t("notifications.before")}
                      </Typography>
                      <Typography variant="body2">
                        {item.before
                          ? t("notifications.enabled")
                          : t("notifications.disabled")}
                      </Typography>
                    </Stack>
                    <Stack spacing={0.25}>
                      <Typography variant="body2" color="text.secondary">
                        {t("notifications.after")}
                      </Typography>
                      <Typography variant="body2">
                        {item.after
                          ? t("notifications.enabled")
                          : t("notifications.disabled")}
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
