"use client";

import { use, useEffect, useRef } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import NotificationChangeList from "@/components/notifications/NotificationChangeList";
import NotificationDetailBreadcrumbs from "@/components/notifications/NotificationDetailBreadcrumbs";
import NotificationDetailHeader from "@/components/notifications/NotificationDetailHeader";
import NotificationDetailMeta from "@/components/notifications/NotificationDetailMeta";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useNotification } from "@/lib/hooks/useNotifications";

export default function NotificationDetailPage({
  params,
}: {
  params: Promise<{ notificationId: string }>;
}) {
  const { notificationId } = use(params);
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();
  const { notification, found, loading, markAsRead } =
    useNotification(notificationId);
  const hasMarkedReadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!notification || notification.readAt) return;
    if (hasMarkedReadRef.current === notification.id) return;

    hasMarkedReadRef.current = notification.id;
    void markAsRead();
  }, [markAsRead, notification]);

  if (authLoading || loading) {
    return (
      <PageLayout>
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ flex: 1, py: 6 }}
        >
          <CircularProgress />
        </Stack>
      </PageLayout>
    );
  }

  if (user?.role === "user") return null;

  if (!found || !notification) {
    return (
      <PageLayout>
        <Stack spacing={3}>
          <NotificationDetailBreadcrumbs />
          <Alert severity="info">{t("notifications.notFound")}</Alert>
        </Stack>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Stack spacing={3}>
        <NotificationDetailBreadcrumbs />
        <NotificationDetailHeader notification={notification} />

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={2}>
              <NotificationDetailMeta notification={notification} />
              <Divider />
              <NotificationChangeList notification={notification} />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </PageLayout>
  );
}
