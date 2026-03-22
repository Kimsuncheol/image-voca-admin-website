"use client";

/**
 * useAdminGuard
 *
 * A reusable hook that enforces admin-only access for a page.
 *
 * Behaviour:
 *   - While Firebase Auth is still loading (`authLoading` is true), nothing happens so
 *     we never redirect prematurely on a cold page load.
 *   - Once auth resolves, if the current user has the plain "user" role (i.e. NOT admin /
 *     super-admin), they are redirected to the app root ("/").
 *
 * Usage:
 *   ```tsx
 *   const { user, authLoading } = useAdminGuard();
 *   if (authLoading) return <Skeleton />;
 *   if (user?.role === "user") return null; // prevent flash before redirect fires
 *   ```
 *
 * Replaces duplicated inline useEffect auth-guard blocks in:
 *   - app/users/page.tsx
 *   - app/promotion-codes/page.tsx
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function useAdminGuard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once auth state has resolved; avoids flashing the redirect
    // on initial render when `user` is briefly null.
    if (!authLoading && user?.role !== "admin" && user?.role !== "super-admin") {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  // Return both so callers can conditionally render skeletons / null guards
  return { user, authLoading };
}
