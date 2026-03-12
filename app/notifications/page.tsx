"use client";

import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/layout/PageLayout";
import NotificationsHeader from "@/components/notifications/NotificationsHeader";
import NotificationsList from "@/components/notifications/NotificationsList";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useNotifications } from "@/lib/hooks/useNotifications";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, authLoading } = useAdminGuard();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useNotifications();

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

  return (
    <PageLayout>
      <Stack spacing={3}>
        <NotificationsHeader
          unreadCount={unreadCount}
          onMarkAllRead={markAllAsRead}
        />
        <NotificationsList
          notifications={notifications}
          onMarkRead={markAsRead}
          onOpenDetail={(id) => router.push(`/notifications/${id}`)}
        />
      </Stack>
    </PageLayout>
  );
}
