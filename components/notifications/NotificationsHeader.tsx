"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

interface NotificationsHeaderProps {
  unreadCount: number;
  onMarkAllRead: () => void;
}

export default function NotificationsHeader({
  unreadCount,
  onMarkAllRead,
}: NotificationsHeaderProps) {
  const { t } = useTranslation();

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      spacing={2}
    >
      <Box>
        <Typography variant="h4" fontWeight={600}>
          {t("notifications.title")}
        </Typography>
        <Typography color="text.secondary">
          {t("notifications.unreadSummary", { count: unreadCount })}
        </Typography>
      </Box>

      <Box>
        <Button
          variant="outlined"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
        >
          {t("notifications.markAllRead")}
        </Button>
      </Box>
    </Stack>
  );
}
