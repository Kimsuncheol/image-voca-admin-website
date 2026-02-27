"use client";

import { useState, useMemo } from "react";
import type { AppUser, UserRole, UserPlan } from "@/types/user";

import UserStats from "./UserStats";
import UserFilters from "./UserFilters";
import UserTable from "./UserTable";
import UserDetailModal, { type ConfirmActionPayload } from "./UserDetailModal";
import UserConfirmDialog from "./UserConfirmDialog";

interface UserListProps {
  users: AppUser[];
  currentUserRole: UserRole;
  currentUserUid: string;
  onDelete: (uid: string) => Promise<void>;
  onRoleChange: (uid: string, role: "user" | "admin") => Promise<void>;
  onPlanChange: (uid: string, plan: UserPlan) => Promise<void>;
}

export default function UserList({
  users,
  currentUserRole,
  currentUserUid,
  onDelete,
  onRoleChange,
  onPlanChange,
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
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q ||
        (u.displayName || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q);
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
