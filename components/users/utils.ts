import {
  ADMIN_PERMISSION_KEYS,
  getEffectiveAdminPermissions,
} from "@/lib/adminPermissions";
import type { AdminPermissions, AppUser, UserPlan, UserRole } from "@/types/user";

export const roleColors: Record<UserRole, "error" | "warning" | "default"> = {
  "super-admin": "error",
  admin: "warning",
  user: "default",
};

export function planChipColor(plan: UserPlan | undefined): "default" | "primary" {
  if (plan === "voca_unlimited") return "primary";
  return "default";
}

export function getPlanLabel(plan: UserPlan | undefined, t: (k: string) => string) {
  if (plan === "voca_unlimited") return t("users.planVocaUnlimited");
  return t("users.planFree");
}

export function formatCreatedAt(val: unknown): string | null {
  if (!val) return null;
  try {
    if (typeof val === "object" && val !== null && "toDate" in val) {
      return (val as { toDate(): Date }).toDate().toLocaleDateString();
    }
    if (typeof val === "object" && val !== null && "_seconds" in val) {
      return new Date(
        (val as { _seconds: number })._seconds * 1000,
      ).toLocaleDateString();
    }
    return new Date(val as string | number).toLocaleDateString();
  } catch {
    return null;
  }
}

export function getPermissionLabel(
  permission: keyof AdminPermissions,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (permission) {
    case "imageGeneration":
      return t("users.permissionImageGeneration");
    case "exampleTranslationGeneration":
      return t("users.permissionExampleTranslationGeneration");
    case "planModification":
      return t("users.permissionPlanModification");
    case "roleModification":
      return t("users.permissionRoleModification");
    default:
      return permission;
  }
}

export function getUserPermissionsSummary(
  user: AppUser,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (user.role === "super-admin") {
    return t("users.fullAccess");
  }

  if (user.role !== "admin") {
    return t("users.notApplicable");
  }

  const permissions = getEffectiveAdminPermissions(user);
  const enabledCount = ADMIN_PERMISSION_KEYS.filter(
    (permission) => permissions[permission],
  ).length;

  return t("users.permissionsSummary", {
    count: enabledCount,
    total: ADMIN_PERMISSION_KEYS.length,
  });
}
