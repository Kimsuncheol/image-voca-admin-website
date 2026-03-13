import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySessionUser } from "@/lib/server/sessionUser";
import type {
  AdminManagedDeviceListItem,
  DevicePlatform,
  DeviceRegistrationRecord,
} from "@/types/device";

const MAX_REGISTERED_DEVICES = 3;

function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;

  try {
    if (typeof value === "object" && value !== null && "toDate" in value) {
      return (value as { toDate(): Date }).toDate().toISOString();
    }
    if (typeof value === "object" && value !== null && "_seconds" in value) {
      return new Date(
        (value as { _seconds: number })._seconds * 1000,
      ).toISOString();
    }

    const date = new Date(value as string | number);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return date.toISOString();
  } catch {
    return null;
  }
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeRequiredText(value: unknown): string {
  if (typeof value !== "string") return "unknown";

  const trimmed = value.trim();
  return trimmed === "" ? "unknown" : trimmed;
}

function normalizePlatform(value: unknown): DevicePlatform {
  return value === "ios" ? "ios" : "android";
}

function serializeDevice(data: Record<string, unknown>): DeviceRegistrationRecord {
  return {
    deviceId: normalizeRequiredText(data.deviceId),
    platform: normalizePlatform(data.platform),
    brand: normalizeNullableText(data.brand),
    manufacturer: normalizeNullableText(data.manufacturer),
    modelName: normalizeNullableText(data.modelName),
    deviceType: normalizeNullableText(data.deviceType),
    osName: normalizeNullableText(data.osName),
    osVersion: normalizeNullableText(data.osVersion),
    appVersion: normalizeNullableText(data.appVersion),
    appBuild: normalizeNullableText(data.appBuild),
    authProvider: normalizeRequiredText(data.authProvider),
    notificationPermissionStatus: normalizeRequiredText(
      data.notificationPermissionStatus,
    ),
    expoPushToken: normalizeNullableText(data.expoPushToken),
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    lastSeenAt: serializeTimestamp(data.lastSeenAt),
  };
}

function getDeviceTimestampValue(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function GET(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const snapshot = await adminDb.collectionGroup("devices").get();
    const groupedDevices = new Map<string, DeviceRegistrationRecord[]>();

    snapshot.docs.forEach((doc) => {
      const uid = doc.ref.parent.parent?.id;
      if (!uid) return;

      const device = serializeDevice({
        deviceId: doc.id,
        ...(doc.data() as Record<string, unknown>),
      });

      const existingDevices = groupedDevices.get(uid) ?? [];
      existingDevices.push(device);
      groupedDevices.set(uid, existingDevices);
    });

    const users = await Promise.all(
      Array.from(groupedDevices.keys()).map(async (uid) => {
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists) return null;

        const userData = userDoc.data() as Record<string, unknown>;
        const devices = (groupedDevices.get(uid) ?? []).sort(
          (left, right) =>
            getDeviceTimestampValue(right.lastSeenAt) -
            getDeviceTimestampValue(left.lastSeenAt),
        );

        const item: AdminManagedDeviceListItem = {
          uid,
          displayName:
            typeof userData.displayName === "string" ? userData.displayName : "",
          email: typeof userData.email === "string" ? userData.email : "",
          role:
            userData.role === "admin" || userData.role === "super-admin"
              ? userData.role
              : "user",
          registeredDeviceCount: devices.length,
          maxRegisteredDevices: MAX_REGISTERED_DEVICES,
          devices,
        };

        return item;
      }),
    );

    return NextResponse.json({
      users: users
        .filter((user): user is AdminManagedDeviceListItem => Boolean(user))
        .sort((left, right) => right.registeredDeviceCount - left.registeredDeviceCount),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch registered devices" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const { uid, deviceId } = (await request.json()) as {
      uid?: string;
      deviceId?: string;
    };

    if (!uid || !deviceId) {
      return NextResponse.json(
        { error: "User ID and device ID are required" },
        { status: 400 },
      );
    }

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetRole = userDoc.data()?.role;
    if (
      caller.role === "admin" &&
      targetRole !== "user"
    ) {
      return NextResponse.json(
        { error: "Admins can only delete devices for users" },
        { status: 403 },
      );
    }

    const deviceRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("devices")
      .doc(deviceId);
    const deviceDoc = await deviceRef.get();

    if (!deviceDoc.exists) {
      return NextResponse.json(
        { error: "Registered device not found" },
        { status: 404 },
      );
    }

    await deviceRef.delete();

    const remainingDevicesSnapshot = await adminDb
      .collection("users")
      .doc(uid)
      .collection("devices")
      .get();

    return NextResponse.json({
      status: "success",
      uid,
      deviceId,
      registeredDeviceCount: remainingDevicesSnapshot.size,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete registered device" },
      { status: 500 },
    );
  }
}
