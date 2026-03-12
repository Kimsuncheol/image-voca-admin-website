"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import {
  formatNotificationTimestamp,
  getNotificationChangeItems,
  getNotificationStatusLabel,
  getNotificationTitle,
} from "@/lib/notificationDisplay";
import type { AppNotification } from "@/types/user";

interface NotificationCardProps {
  notification: AppNotification;
  onMarkRead: (notificationId: string) => Promise<void>;
  onOpenDetail: (notificationId: string) => void;
}

export default function NotificationCard({
  notification,
  onMarkRead,
  onOpenDetail,
}: NotificationCardProps) {
  const { t } = useTranslation();
  const createdAt = formatNotificationTimestamp(notification.createdAt);
  const changeItems = getNotificationChangeItems(notification.changes, t);

  return (
    <Card
      variant="outlined"
      sx={{
        borderColor: notification.readAt ? "divider" : "primary.main",
        bgcolor: notification.readAt ? "background.paper" : "action.hover",
      }}
    >
      <CardActionArea onClick={() => onOpenDetail(notification.id)}>
        <CardContent>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Typography fontWeight={600}>
                  {getNotificationTitle(notification, t)}
                </Typography>
                {createdAt && (
                  <Typography variant="body2" color="text.secondary">
                    {createdAt}
                  </Typography>
                )}
              </Box>
              <Chip
                label={getNotificationStatusLabel(notification.readAt, t)}
                color={notification.readAt ? "default" : "primary"}
                size="small"
                variant={notification.readAt ? "outlined" : "filled"}
              />
            </Stack>

            <Stack spacing={0.5}>
              {changeItems.map((item) => (
                <Typography key={item.key} variant="body2">
                  {item.summary}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </CardContent>
      </CardActionArea>
      <CardActions
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: 1,
        }}
      >
        {!notification.readAt && (
          <Button size="small" onClick={() => onMarkRead(notification.id)}>
            {t("notifications.markRead")}
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
