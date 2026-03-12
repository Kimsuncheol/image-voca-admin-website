import type {
  AdminAIPermissions,
  AdminNotificationChange,
  AdminPermissions,
  AppUser,
  UserRole,
} from "../types/user.ts";

type UserPermissionSource = Pick<AppUser, "role" | "adminPermissions"> | null | undefined;

export const AI_ADMIN_PERMISSION_KEYS = [
  "imageGeneration",
  "exampleTranslationGeneration",
] as const satisfies readonly (keyof AdminAIPermissions)[];

export const ADMIN_PERMISSION_KEYS = [
  "imageGeneration",
  "exampleTranslationGeneration",
  "planModification",
  "roleModification",
] as const satisfies readonly (keyof AdminPermissions)[];

export const EMPTY_ADMIN_PERMISSIONS: AdminPermissions = {
  imageGeneration: false,
  exampleTranslationGeneration: false,
  planModification: false,
  roleModification: false,
};

export const LEGACY_ADMIN_PERMISSIONS: AdminPermissions = {
  imageGeneration: true,
  exampleTranslationGeneration: true,
  planModification: true,
  roleModification: false,
};

export const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  imageGeneration: true,
  exampleTranslationGeneration: true,
  planModification: true,
  roleModification: true,
};

export function createSeedAdminPermissions(): AdminPermissions {
  return { ...EMPTY_ADMIN_PERMISSIONS };
}

export function normalizeAdminPermissions(
  value?: Partial<AdminPermissions> | null,
): AdminPermissions {
  return {
    ...EMPTY_ADMIN_PERMISSIONS,
    ...(value ?? {}),
  };
}

export function getEffectiveAdminPermissions(
  user: UserPermissionSource,
): AdminPermissions {
  const role = user?.role;

  if (role === "super-admin") {
    return { ...SUPER_ADMIN_PERMISSIONS };
  }

  if (role === "admin") {
    if (user?.adminPermissions) {
      return normalizeAdminPermissions(user.adminPermissions);
    }
    return { ...LEGACY_ADMIN_PERMISSIONS };
  }

  return { ...EMPTY_ADMIN_PERMISSIONS };
}

export function hasAdminPermission(
  user: UserPermissionSource,
  permission: keyof AdminPermissions,
): boolean {
  return getEffectiveAdminPermissions(user)[permission];
}

export function normalizeUserWithAdminPermissions<T extends Pick<AppUser, "role" | "adminPermissions">>(
  user: T,
): T & { adminPermissions?: AdminPermissions } {
  if (user.role === "admin") {
    return {
      ...user,
      adminPermissions: getEffectiveAdminPermissions(user),
    };
  }

  if (user.role === "super-admin") {
    return {
      ...user,
      adminPermissions: getEffectiveAdminPermissions(user),
    };
  }

  return user;
}

export function diffAdminAIUsagePermissions(
  beforePermissions: AdminPermissions,
  afterPermissions: AdminPermissions,
): AdminNotificationChange {
  const changes: AdminNotificationChange = {};

  AI_ADMIN_PERMISSION_KEYS.forEach((key) => {
    if (beforePermissions[key] !== afterPermissions[key]) {
      changes[key] = {
        before: beforePermissions[key],
        after: afterPermissions[key],
      };
    }
  });

  return changes;
}

export function hasAdminAIUsagePermissionChanges(
  changes: AdminNotificationChange,
): boolean {
  return AI_ADMIN_PERMISSION_KEYS.some((key) => Boolean(changes[key]));
}

export function canManageUsersPage(role: UserRole): boolean {
  return role === "admin" || role === "super-admin";
}
