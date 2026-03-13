"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import UserDevicesConfirmDialog, {
  type PendingDeviceDelete,
} from "@/components/user-devices/UserDevicesConfirmDialog";
import UserDevicesDetailDialog from "@/components/user-devices/UserDevicesDetailDialog";
import UserDevicesFilters from "@/components/user-devices/UserDevicesFilters";
import UserDevicesPageSkeleton from "@/components/user-devices/UserDevicesPageSkeleton";
import UserDevicesTable from "@/components/user-devices/UserDevicesTable";
import {
  getDeviceTitle,
  getLatestCreatedAt,
  getLatestLastSeenAt,
  parseDeviceTimestamp,
} from "@/components/user-devices/utils";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { tokenizeQuery, matchesAllTokens } from "@/lib/utils/search";
import type { AdminManagedDeviceListItem } from "@/types/device";

type DeviceSortKey = "lastSeenAt" | "createdAt" | "registeredDeviceCount";

export default function UserDevicesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, authLoading } = useAdminGuard();

  const [deviceUsers, setDeviceUsers] = useState<AdminManagedDeviceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "ios" | "android">(
    "all",
  );
  const [notificationFilter, setNotificationFilter] = useState("all");
  const [sortBy, setSortBy] = useState<DeviceSortKey>("lastSeenAt");
  const [scopedUid, setScopedUid] = useState(searchParams.get("uid") ?? "");
  const [selectedUser, setSelectedUser] =
    useState<AdminManagedDeviceListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeviceDelete | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDeviceUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/user-devices");
      if (!response.ok) {
        throw new Error();
      }

      const data = (await response.json()) as {
        users: AdminManagedDeviceListItem[];
      };
      setDeviceUsers(data.users);
    } catch {
      setError(t("users.devices.fetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDeviceUsers();
  }, [fetchDeviceUsers]);

  useEffect(() => {
    setScopedUid(searchParams.get("uid") ?? "");
  }, [searchParams]);

  useEffect(() => {
    if (!selectedUser) return;

    const nextSelectedUser = deviceUsers.find((item) => item.uid === selectedUser.uid);
    if (!nextSelectedUser) {
      setSelectedUser(null);
      return;
    }

    if (nextSelectedUser !== selectedUser) {
      setSelectedUser(nextSelectedUser);
    }
  }, [deviceUsers, selectedUser]);

  const notificationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          deviceUsers.flatMap((item) =>
            item.devices.map((device) => device.notificationPermissionStatus),
          ),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [deviceUsers],
  );

  const filteredUsers = useMemo(() => {
    const tokens = tokenizeQuery(search);

    return [...deviceUsers]
      .filter((item) => (scopedUid ? item.uid === scopedUid : true))
      .filter((item) => {
        if (tokens.length === 0) return true;

        const searchableText = [
          item.displayName,
          item.email,
          ...item.devices.flatMap((device) =>
            [device.modelName, device.deviceId].filter(Boolean),
          ),
        ].join(" ");

        return matchesAllTokens(searchableText, tokens);
      })
      .filter((item) =>
        platformFilter === "all"
          ? true
          : item.devices.some((device) => device.platform === platformFilter),
      )
      .filter((item) =>
        notificationFilter === "all"
          ? true
          : item.devices.some(
              (device) =>
                device.notificationPermissionStatus === notificationFilter,
            ),
      )
      .sort((left, right) => {
        if (sortBy === "registeredDeviceCount") {
          return right.registeredDeviceCount - left.registeredDeviceCount;
        }

        if (sortBy === "createdAt") {
          return (
            parseDeviceTimestamp(getLatestCreatedAt(right)) -
            parseDeviceTimestamp(getLatestCreatedAt(left))
          );
        }

        return (
          parseDeviceTimestamp(getLatestLastSeenAt(right)) -
          parseDeviceTimestamp(getLatestLastSeenAt(left))
        );
      });
  }, [deviceUsers, search, scopedUid, platformFilter, notificationFilter, sortBy]);

  const scopedUserLabel = useMemo(() => {
    if (!scopedUid) return null;

    const scopedUser = deviceUsers.find((item) => item.uid === scopedUid);
    if (!scopedUser) return scopedUid;

    return scopedUser.displayName || scopedUser.email || scopedUid;
  }, [deviceUsers, scopedUid]);

  const canDeleteDevices =
    user?.role === "super-admin" ||
    (user?.role === "admin" && selectedUser?.role === "user");

  const handleRequestDelete = useCallback(
    (targetUser: AdminManagedDeviceListItem, deviceId: string, deviceLabel: string) => {
      setPendingDelete({
        uid: targetUser.uid,
        deviceId,
        deviceLabel,
      });
    },
    [],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete || isDeleting) return;

    setIsDeleting(true);

    try {
      const response = await fetch("/api/admin/user-devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: pendingDelete.uid,
          deviceId: pendingDelete.deviceId,
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = (await response.json()) as {
        uid: string;
        deviceId: string;
        registeredDeviceCount: number;
      };

      setDeviceUsers((prev) =>
        prev.flatMap((item) => {
          if (item.uid !== data.uid) return [item];

          const devices = item.devices.filter(
            (device) => device.deviceId !== data.deviceId,
          );
          if (devices.length === 0) {
            return [];
          }

          return [
            {
              ...item,
              devices,
              registeredDeviceCount: data.registeredDeviceCount,
            },
          ];
        }),
      );
      setMessage({
        type: "success",
        text: t("users.devices.deleteSuccess"),
      });
    } catch {
      setMessage({
        type: "error",
        text: t("users.devices.deleteError"),
      });
    } finally {
      setPendingDelete(null);
      setIsDeleting(false);
    }
  }, [isDeleting, pendingDelete, t]);

  const handleClearScopedUser = useCallback(() => {
    setScopedUid("");
    router.replace("/users/devices");
  }, [router]);

  if (authLoading || loading) {
    return <UserDevicesPageSkeleton title={t("users.devices.title")} />;
  }

  if (user?.role === "user") return null;

  const emptyLabel =
    deviceUsers.length === 0
      ? t("users.devices.noDevices")
      : t("users.devices.noResults");

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("users.devices.title")}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <UserDevicesFilters
        search={search}
        onSearchChange={setSearch}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        notificationFilter={notificationFilter}
        onNotificationFilterChange={setNotificationFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        notificationOptions={notificationOptions}
        scopedUserLabel={scopedUserLabel}
        onClearScopedUser={scopedUid ? handleClearScopedUser : undefined}
      />

      <UserDevicesTable
        users={filteredUsers}
        onSelectUser={setSelectedUser}
        emptyLabel={emptyLabel}
      />

      {selectedUser && (
        <UserDevicesDetailDialog
          user={selectedUser}
          canDeleteDevices={Boolean(canDeleteDevices)}
          isDeleting={isDeleting}
          onClose={() => {
            if (!isDeleting) {
              setSelectedUser(null);
            }
          }}
          onRequestDelete={(device) =>
            handleRequestDelete(selectedUser, device.deviceId, getDeviceTitle(device))
          }
        />
      )}

      <UserDevicesConfirmDialog
        pendingDelete={pendingDelete}
        isSubmitting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) {
            setPendingDelete(null);
          }
        }}
      />
    </PageLayout>
  );
}
