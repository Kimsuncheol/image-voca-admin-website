"use client";

/**
 * UsersPage  —  /users
 *
 * Admin page for managing all registered users.
 * Only accessible to users with role "admin" or "super-admin".
 *
 * ── Access control ────────────────────────────────────────────────────
 *  useAdminGuard() handles redirect: if the current user's role is "user",
 *  they are automatically sent to "/" once auth resolves.
 *
 * ── Data flow ─────────────────────────────────────────────────────────
 *  GET  /api/admin/users           → fetch all users (on mount)
 *  PATCH /api/admin/users { uid, role }  → change user role
 *  PATCH /api/admin/users { uid, plan }  → change subscription plan
 *  DELETE /api/admin/users { uid }       → remove user account
 *
 * ── States ────────────────────────────────────────────────────────────
 *  authLoading || loading  → UsersPageSkeleton
 *  user.role === "user"    → null (prevents flash before redirect)
 *  error                   → Alert banner (non-blocking; list still shown)
 *  message                 → dismissible success/error Alert after mutations
 *  success                 → UserList component
 *
 * ── Child components ──────────────────────────────────────────────────
 *  UsersPageSkeleton  — skeleton cards + table rows while loading
 *  UserList           — full user table with search, filters, detail modal,
 *                       and inline role/plan controls
 */

import { useState, useEffect, useCallback } from "react";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

// ── Layout ────────────────────────────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Auth + types ──────────────────────────────────────────────────────
import {
  getEffectiveAdminPermissions,
} from "@/lib/adminPermissions";
import type { AdminPermissions, AppUser, UserPlan } from "@/types/user";
import { useTranslation } from "react-i18next";

// ── Feature-specific components & hooks ───────────────────────────────
import UserList from "@/components/users/UserList";
import UsersPageSkeleton from "@/components/users/UsersPageSkeleton";
import { useAdminGuard } from "@/hooks/useAdminGuard";

export default function UsersPage() {
  const { t } = useTranslation();

  // ── Auth guard ────────────────────────────────────────────────────
  // Redirects non-admin users to "/" once auth resolves.
  // Returns the current user object and auth loading flag.
  const { user, authLoading } = useAdminGuard();

  // ── Local state ───────────────────────────────────────────────────
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Feedback message shown after role/plan changes or deletions
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const currentUserPermissions = getEffectiveAdminPermissions(user);

  const replaceUpdatedUser = useCallback((nextUser: AppUser) => {
    setUsers((prev) => prev.map((u) => (u.uid === nextUser.uid ? nextUser : u)));
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────
  /**
   * Fetches the full user list from the admin API route.
   * Wrapped in useCallback so it can be passed as a stable reference
   * to the useEffect dependency array.
   */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUsers(data.users);
    } catch {
      setError(t("courses.fetchError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ── Mutation handlers ─────────────────────────────────────────────

  /**
   * Promotes or demotes a user's role between "user" and "admin".
   * Super-admin role can only be granted through the Firebase console.
   */
  const handleRoleChange = async (uid: string, role: "user" | "admin") => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, role }),
      });

      if (!res.ok) throw new Error();
      const data = (await res.json()) as { user: AppUser };

      setMessage({ type: "success", text: t("users.roleChangeSuccess") });
      replaceUpdatedUser(data.user);
    } catch {
      setMessage({ type: "error", text: t("users.roleChangeError") });
    }
  };

  /**
   * Updates a user's subscription plan (e.g. free → voca_unlimited).
   */
  const handlePlanChange = async (uid: string, plan: UserPlan) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, plan }),
      });

      if (!res.ok) throw new Error();
      const data = (await res.json()) as { user: AppUser };

      setMessage({
        type: "success",
        text: t("users.subscriptionUpdateSuccess"),
      });
      replaceUpdatedUser(data.user);
    } catch {
      setMessage({ type: "error", text: t("users.subscriptionUpdateError") });
    }
  };

  const handleAdminPermissionsChange = async (
    uid: string,
    adminPermissions: AdminPermissions,
  ) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, adminPermissions }),
      });

      if (!res.ok) throw new Error();
      const data = (await res.json()) as { user: AppUser };

      setMessage({
        type: "success",
        text: t("users.adminPermissionsUpdateSuccess"),
      });
      replaceUpdatedUser(data.user);
    } catch {
      setMessage({
        type: "error",
        text: t("users.adminPermissionsUpdateError"),
      });
    }
  };

  /**
   * Permanently deletes a user account.
   * Permission check (`canDelete`) is enforced in UserList.
   */
  const handleDelete = async (uid: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });

      if (!res.ok) throw new Error();

      setMessage({ type: "success", text: t("users.deleteSuccess") });
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch {
      setMessage({ type: "error", text: t("users.deleteError") });
    }
  };

  // ── Loading state ─────────────────────────────────────────────────
  // Show skeleton while auth is resolving OR while users are being fetched
  if (authLoading || loading) {
    return <UsersPageSkeleton title={t("users.title")} />;
  }

  // Prevent a flash of the page content while the redirect is in flight
  if (user?.role === "user") return null;

  // ── Resolved state ────────────────────────────────────────────────
  return (
    <PageLayout>
      {/* ── Page heading ─────────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("users.title")}
      </Typography>

      {/* ── Error / feedback alerts ───────────────────────────────────── */}
      {/* Fetch error (non-dismissible; indicates a systemic problem) */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {/* Mutation feedback (dismissible via the × button) */}
      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* ── User list ─────────────────────────────────────────────────── */}
      {users.length === 0 && !error ? (
        // Empty state: no users found in the database
        <Typography color="text.secondary">{t("users.noUsers")}</Typography>
      ) : (
        /*
         * UserList encapsulates:
         *   - Stat cards (total / unlimited / free counts)
         *   - Search field & plan/role toggle filters
         *   - Sortable user table with avatar + email + role chip + plan chip
         *   - Detail modal with inline role & plan selectors
         *   - Delete confirmation dialog
         */
        <UserList
          users={users}
          currentUserRole={user?.role || "user"}
          currentUserUid={user?.uid || ""}
          currentUserPermissions={currentUserPermissions}
          onDelete={handleDelete}
          onRoleChange={handleRoleChange}
          onPlanChange={handlePlanChange}
          onAdminPermissionsChange={handleAdminPermissionsChange}
        />
      )}
    </PageLayout>
  );
}
