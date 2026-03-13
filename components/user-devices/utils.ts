import type { TFunction } from "i18next";

import type { AdminManagedDeviceListItem, DeviceRegistrationRecord } from "@/types/device";

export function parseDeviceTimestamp(value: string | null): number {
  if (!value) return 0;

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatDeviceTimestamp(value: string | null): string {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

export function formatDeviceValue(value: string | null): string {
  if (!value) return "-";
  return value;
}

export function getLatestLastSeenAt(user: AdminManagedDeviceListItem): string | null {
  const [latestDevice] = [...user.devices].sort(
    (left, right) =>
      parseDeviceTimestamp(right.lastSeenAt) - parseDeviceTimestamp(left.lastSeenAt),
  );

  return latestDevice?.lastSeenAt ?? null;
}

export function getLatestCreatedAt(user: AdminManagedDeviceListItem): string | null {
  const [latestDevice] = [...user.devices].sort(
    (left, right) =>
      parseDeviceTimestamp(right.createdAt) - parseDeviceTimestamp(left.createdAt),
  );

  return latestDevice?.createdAt ?? null;
}

export function getUserPlatformSummary(
  user: AdminManagedDeviceListItem,
  t: TFunction,
): string {
  const values = Array.from(new Set(user.devices.map((device) => device.platform)));

  if (values.length === 0) {
    return t("users.devices.none");
  }

  return values.join(", ");
}

export function getDeviceTitle(device: DeviceRegistrationRecord): string {
  return (
    device.modelName ||
    device.brand ||
    device.manufacturer ||
    device.deviceId
  );
}
