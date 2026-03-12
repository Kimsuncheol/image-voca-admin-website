"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotification,
  subscribeToNotifications,
} from "@/lib/firebase/notifications";
import type { AppNotification } from "@/types/user";

export function useNotifications() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const [state, setState] = useState<{
    uid: string | null;
    notifications: AppNotification[];
    loading: boolean;
  }>({
    uid: null,
    notifications: [],
    loading: false,
  });

  useEffect(() => {
    if (authLoading || !uid) return;

    const unsubscribe = subscribeToNotifications(
      uid,
      (nextNotifications) => {
        setState({
          uid,
          notifications: nextNotifications,
          loading: false,
        });
      },
      () => {
        setState({
          uid,
          notifications: [],
          loading: false,
        });
      },
    );

    return unsubscribe;
  }, [authLoading, uid]);

  const notifications = useMemo(
    () => (uid === state.uid ? state.notifications : []),
    [state.notifications, state.uid, uid],
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  async function markAsRead(notificationId: string) {
    if (!uid) return;
    await markNotificationRead(uid, notificationId);
  }

  async function markAllAsRead() {
    if (!uid) return;
    await markAllNotificationsRead(uid);
  }

  return {
    notifications,
    unreadCount,
    loading:
      authLoading ||
      (Boolean(uid) && uid !== state.uid ? true : state.loading),
    markAsRead,
    markAllAsRead,
  };
}

export function useNotification(notificationId: string) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const key = uid && notificationId ? `${uid}:${notificationId}` : null;
  const [state, setState] = useState<{
    key: string | null;
    notification: AppNotification | null;
    found: boolean;
  }>({
    key: null,
    notification: null,
    found: true,
  });

  useEffect(() => {
    if (authLoading || !uid || !notificationId) return;

    return subscribeToNotification(
      uid,
      notificationId,
      (notification) => {
        setState({
          key: `${uid}:${notificationId}`,
          notification,
          found: notification !== null,
        });
      },
      () => {
        setState({
          key: `${uid}:${notificationId}`,
          notification: null,
          found: false,
        });
      },
    );
  }, [authLoading, uid, notificationId]);

  return {
    notification: key === state.key ? state.notification : null,
    found: key === state.key ? state.found : true,
    loading: authLoading || (Boolean(key) && key !== state.key),
    async markAsRead() {
      if (!uid) return;
      await markNotificationRead(uid, notificationId);
    },
  };
}
