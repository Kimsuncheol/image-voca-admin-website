import type { UserRole } from "@/types/user";

export type DevicePlatform = "ios" | "android";

export interface DeviceRegistrationRecord {
  deviceId: string;
  platform: DevicePlatform;
  brand: string | null;
  manufacturer: string | null;
  modelName: string | null;
  deviceType: string | null;
  osName: string | null;
  osVersion: string | null;
  appVersion: string | null;
  appBuild: string | null;
  authProvider: string;
  notificationPermissionStatus: string;
  expoPushToken: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastSeenAt: string | null;
}

export interface AdminManagedDeviceListItem {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  registeredDeviceCount: number;
  maxRegisteredDevices: number;
  devices: DeviceRegistrationRecord[];
}
