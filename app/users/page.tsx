"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/layout/PageLayout";
import type { AppUser, UserPlan } from "@/types/user";
import UserList from "@/components/users/UserList";

export default function UsersPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // FR-1: Gate access to admin users only
  useEffect(() => {
    if (!authLoading && user?.role === "user") {
      router.replace("/");
    }
  }, [authLoading, user, router]);

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

  const handleRoleChange = async (uid: string, role: "user" | "admin") => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, role }),
      });

      if (!res.ok) throw new Error();

      setMessage({ type: "success", text: t("users.roleChangeSuccess") });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
    } catch {
      setMessage({ type: "error", text: t("users.roleChangeError") });
    }
  };

  // FR-8: Subscription update
  const handlePlanChange = async (uid: string, plan: UserPlan) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, plan }),
      });

      if (!res.ok) throw new Error();

      setMessage({ type: "success", text: t("users.subscriptionUpdateSuccess") });
      setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, plan } : u)));
    } catch {
      setMessage({ type: "error", text: t("users.subscriptionUpdateError") });
    }
  };

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

  // FR-9: Loading state
  if (authLoading || loading) {
    return (
      <PageLayout>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  // Prevent flash while redirect is pending
  if (user?.role === "user") return null;

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("users.title")}
      </Typography>

      {/* FR-9: Error state */}
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

      {/* FR-9: Empty state */}
      {users.length === 0 && !error ? (
        <Typography color="text.secondary">{t("users.noUsers")}</Typography>
      ) : (
        <UserList
          users={users}
          currentUserRole={user?.role || "user"}
          currentUserUid={user?.uid || ""}
          onDelete={handleDelete}
          onRoleChange={handleRoleChange}
          onPlanChange={handlePlanChange}
        />
      )}
    </PageLayout>
  );
}
