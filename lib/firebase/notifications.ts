import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";

import { db } from "./config";
import type { AppNotification } from "@/types/user";

function getNotificationsCollection(uid: string) {
  return collection(db, "users", uid, "notifications");
}

function getNotificationDocument(uid: string, notificationId: string) {
  return doc(db, "users", uid, "notifications", notificationId);
}

export function subscribeToNotifications(
  uid: string,
  onData: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const notificationsQuery = query(
    getNotificationsCollection(uid),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      onData(
        snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<AppNotification, "id">),
        })),
      );
    },
    (error) => onError?.(error),
  );
}

export function subscribeToNotification(
  uid: string,
  notificationId: string,
  onData: (notification: AppNotification | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getNotificationDocument(uid, notificationId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData({
        id: snapshot.id,
        ...(snapshot.data() as Omit<AppNotification, "id">),
      });
    },
    (error) => onError?.(error),
  );
}

export async function markNotificationRead(
  uid: string,
  notificationId: string,
): Promise<void> {
  await updateDoc(getNotificationDocument(uid, notificationId), {
    readAt: new Date(),
  });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const unreadSnapshot = await getDocs(
    query(getNotificationsCollection(uid), where("readAt", "==", null)),
  );

  if (unreadSnapshot.empty) return;

  const batch = writeBatch(db);
  unreadSnapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { readAt: new Date() });
  });
  await batch.commit();
}
