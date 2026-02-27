"use client";

/**
 * PromotionCodesPage  —  /promotion-codes
 *
 * Admin page for generating and managing promotional discount codes.
 * Only accessible to users with role "admin" or "super-admin".
 *
 * ── Access control ────────────────────────────────────────────────────
 *  useAdminGuard() redirects users with role "user" to "/" once auth resolves.
 *
 * ── Tab structure ─────────────────────────────────────────────────────
 *  Tab 0 — Generate     : form to bulk-generate new promotion codes
 *  Tab 1 — Active Codes : table listing all existing / active codes
 *
 * ── Data flow ─────────────────────────────────────────────────────────
 *  GET  /api/admin/promotion-codes      → fetch all codes (on mount)
 *  POST (inside GenerateTab)            → API call to generate codes
 *                                         on success → handleGenerated()
 *  PATCH (inside ActiveCodesTab)        → deactivate a specific code
 *                                         on success → handleDeactivateSuccess()
 *
 * ── States ────────────────────────────────────────────────────────────
 *  authLoading || (loading && no codes yet)  → PromotionCodesPageSkeleton
 *  user.role === "user"                       → null (redirect in flight)
 *  message                                    → dismissible success/error Alert
 *  generatedModalOpen                         → GeneratedCodesModal overlay
 *
 * ── Child components ──────────────────────────────────────────────────
 *  PromotionCodesPageSkeleton — skeleton tabs + form fields while loading
 *  GenerateTab                — bulk code generation form
 *  ActiveCodesTab             — list of all codes with deactivate button
 *  GeneratedCodesModal        — shows newly generated codes for copy/export
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";

// ── Layout ────────────────────────────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Types ─────────────────────────────────────────────────────────────
import type {
  PromotionCode,
  CodeGenerationResponse,
} from "@/types/promotionCode";

// ── Feature-specific components & hooks ───────────────────────────────
import GenerateTab from "@/components/promotion-codes/GenerateTab";
import ActiveCodesTab from "@/components/promotion-codes/ActiveCodesTab";
import GeneratedCodesModal from "@/components/promotion-codes/GeneratedCodesModal";
import PromotionCodesPageSkeleton from "@/components/promotion-codes/PromotionCodesPageSkeleton";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  setNavigationInterceptor,
  clearNavigationInterceptor,
} from "@/lib/navigationGuard";

export default function PromotionCodesPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // ── Auth guard ────────────────────────────────────────────────────
  // Redirects non-admin users to "/" once auth resolves.
  const { user, authLoading } = useAdminGuard();

  // ── Local state ───────────────────────────────────────────────────
  const [codes, setCodes] = useState<PromotionCode[]>([]);
  const [loading, setLoading] = useState(true);

  // Dirty state forwarded from GenerateTab; drives the navigation guard
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Navigation-guard confirm dialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingProceed = useRef<(() => void) | null>(null);

  // Index of the currently active tab (0 = Generate, 1 = Active Codes)
  const [tabIndex, setTabIndex] = useState(0);

  // Dismissible feedback message after generate / deactivate operations
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // The list of code strings returned from the most recent generation request
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  // Whether the "newly generated codes" modal is visible
  const [generatedModalOpen, setGeneratedModalOpen] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────
  /**
   * Loads all promotion codes from the admin API.
   * Called on mount and re-called after generate / deactivate mutations
   * to keep the Active Codes tab up to date.
   */
  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotion-codes");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCodes(data.codes);
    } catch {
      setMessage({ type: "error", text: t("promotionCodes.fetchError") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // ── Navigation guard ──────────────────────────────────────────────
  // Register an async interceptor while the generate form has unsaved data.
  // On cleanup (unmount or dirty→false) the interceptor is removed.
  useEffect(() => {
    if (isFormDirty) {
      setNavigationInterceptor((_, proceed) => {
        pendingProceed.current = proceed;
        setConfirmOpen(true);
      });
    } else {
      clearNavigationInterceptor();
    }
    return () => clearNavigationInterceptor();
  }, [isFormDirty]);

  // ── Event handlers ────────────────────────────────────────────────

  /**
   * Called by GenerateTab when the generate API call succeeds.
   * - Shows a success message.
   * - Stores the new code strings in state and opens the result modal.
   * - Refreshes the code list from the API.
   * - Switches to the Active Codes tab so the user sees the new entries.
   */
  const handleGenerated = (response: CodeGenerationResponse) => {
    setMessage({ type: "success", text: t("promotionCodes.generateSuccess") });
    setGeneratedCodes(response.codes);
    setGeneratedModalOpen(true);
    fetchCodes();
    setTabIndex(1); // Switch to "Active Codes" tab automatically
  };

  /**
   * Called by ActiveCodesTab when a code is successfully deactivated.
   * Shows a success message and refreshes the code list.
   */
  const handleDeactivateSuccess = () => {
    setMessage({
      type: "success",
      text: t("promotionCodes.deactivateSuccess"),
    });
    fetchCodes();
  };

  // ── Loading state ─────────────────────────────────────────────────
  // Show skeleton while:
  //   a) Auth state is still resolving, OR
  //   b) First-load fetch is in progress (codes.length === 0 prevents
  //      re-showing the skeleton on background refreshes after generate)
  if (authLoading || (loading && codes.length === 0)) {
    return <PromotionCodesPageSkeleton title={t("promotionCodes.title")} />;
  }

  // Prevent flash while redirect is in flight
  if (user?.role === "user") return null;

  // ── Resolved state ────────────────────────────────────────────────
  return (
    <PageLayout>
      {/* ── Page heading ─────────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("promotionCodes.title")}
      </Typography>

      {/* ── Feedback alert ────────────────────────────────────────────── */}
      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* ── Tab navigation ────────────────────────────────────────────── */}
      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={t("promotionCodes.generate")} />
        <Tab label={t("promotionCodes.activeCodes")} />
      </Tabs>

      {/* ── Tab 0: Generate codes ─────────────────────────────────────── */}
      {/*
       * GenerateTab renders the full code-generation form:
       *   - Scope (plan restriction)
       *   - Quantity, expiry date, prefix, code length, notes
       *   - Submit button → calls POST /api/admin/promotion-codes
       * On success it fires onGenerated; on error it fires onError.
       */}
      {tabIndex === 0 && (
        <GenerateTab
          onGenerated={handleGenerated}
          onError={(msg) => setMessage({ type: "error", text: msg })}
          onDirtyChange={setIsFormDirty}
        />
      )}

      {/* ── Tab 1: Active codes list ──────────────────────────────────── */}
      {/*
       * ActiveCodesTab renders a table of all existing codes:
       *   Code | Plan | Expiry | Uses | Status | Actions (deactivate)
       * `loading` is still passed so the tab can show a spinner during
       * background refreshes triggered by generate / deactivate.
       */}
      {tabIndex === 1 && (
        <ActiveCodesTab
          codes={codes}
          loading={loading}
          onRefresh={fetchCodes}
          onDeactivateSuccess={handleDeactivateSuccess}
          onError={(msg) => setMessage({ type: "error", text: msg })}
        />
      )}

      {/* ── Generated codes modal ─────────────────────────────────────── */}
      {/*
       * Displays the list of newly generated codes after a successful
       * generation request so the admin can copy or export them.
       * Always mounted; visibility controlled by `open` prop.
       */}
      <GeneratedCodesModal
        open={generatedModalOpen}
        codes={generatedCodes}
        onClose={() => setGeneratedModalOpen(false)}
      />

      {/* ── Navigation-guard confirm dialog ───────────────────────────── */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("promotionCodes.discardTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t("promotionCodes.discardMessage")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t("promotionCodes.keep")}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmOpen(false);
              pendingProceed.current?.();
              pendingProceed.current = null;
            }}
          >
            {t("promotionCodes.leave")}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}
