"use client";

import { useState, useMemo } from "react";
import type {
  AdminPermissions,
  AppUser,
  UserRole,
  UserPlan,
} from "@/types/user";
import { tokenizeQuery, matchesAllTokens } from "@/lib/utils/search";

import UserStats from "./UserStats";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import UserDetailModal, { type ConfirmActionPayload } from "./UserDetailModal";
import UserConfirmDialog from "./UserConfirmDialog";

interface UserListProps {
  users: AppUser[];
  currentUserRole: UserRole;
  currentUserUid: string;
  currentUserPermissions: AdminPermissions;
  onDelete: (uid: string) => Promise<void>;
  onRoleChange: (uid: string, role: "user" | "admin") => Promise<void>;
  onPlanChange: (uid: string, plan: UserPlan) => Promise<void>;
  onAdminPermissionsChange: (
    uid: string,
    adminPermissions: AdminPermissions,
  ) => Promise<void>;
}

export default function UserList({
  users,
  currentUserRole,
  currentUserUid,
  currentUserPermissions,
  onDelete,
  onRoleChange,
  onPlanChange,
  onAdminPermissionsChange,
}: UserListProps) {
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<UserPlan | "all">("all");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "super-admin">(
    "all",
  );
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [pendingConfirmAction, setPendingConfirmAction] =
    useState<ConfirmActionPayload | null>(null);
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false);

  // Aggregate counters from all users (not filtered)
  const total = users.length;
  const unlimitedCount = users.filter(
    (u) => u.plan === "voca_unlimited",
  ).length;
  const freeCount = users.filter((u) => !u.plan || u.plan === "free").length;

  const filteredUsers = useMemo(() => {
    const tokens = tokenizeQuery(search);
    return users.filter((u) => {
      const matchSearch =
        tokens.length === 0 ||
        matchesAllTokens(
          [u.displayName || "", u.email || ""].join(" "),
          tokens,
        );
      const matchPlan =
        planFilter === "all" ||
        (planFilter === "free"
          ? !u.plan || u.plan === "free"
          : u.plan === planFilter);
      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "admin"
          ? u.role === "admin" || u.role === "super-admin"
          : u.role === roleFilter);
      return matchSearch && matchPlan && matchRole;
    });
  }, [users, search, planFilter, roleFilter]);

  const handleConfirmAction = async () => {
    if (!pendingConfirmAction || isConfirmSubmitting) return;

    const action = pendingConfirmAction;
    setPendingConfirmAction(null);
    setSelectedUser(null);
    setIsConfirmSubmitting(true);

    try {
      if (action.type === "delete") {
        await onDelete(action.uid);
        return;
      }
      if (action.type === "roleChange") {
        await onRoleChange(action.uid, action.nextRole);
        return;
      }
      if (action.type === "adminPermissionsChange") {
        await onAdminPermissionsChange(action.uid, action.nextAdminPermissions);
        return;
      }
      await onPlanChange(action.uid, action.nextPlan);
    } finally {
      setIsConfirmSubmitting(false);
    }
  };

  const handleCancelConfirm = () => {
    if (isConfirmSubmitting) return;
    setPendingConfirmAction(null);
  };

  return (
    <>
      <UserStats
        total={total}
        unlimitedCount={unlimitedCount}
        freeCount={freeCount}
      />

      <UserFilters
        search={search}
        onSearchChange={setSearch}
        planFilter={planFilter}
        onPlanFilterChange={setPlanFilter}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
      />

      <UserTable users={filteredUsers} onSelectUser={setSelectedUser} />

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          currentUserRole={currentUserRole}
          currentUserUid={currentUserUid}
          currentUserPermissions={currentUserPermissions}
          isConfirmSubmitting={isConfirmSubmitting}
          onClose={() => {
            if (isConfirmSubmitting) return;
            setPendingConfirmAction(null);
            setSelectedUser(null);
          }}
          onActionSelect={setPendingConfirmAction}
        />
      )}

      <UserConfirmDialog
        pendingAction={pendingConfirmAction}
        isSubmitting={isConfirmSubmitting}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelConfirm}
      />
    </>
  );
}
