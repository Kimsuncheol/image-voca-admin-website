"use client";

/**
 * AdsPage  —  /ads
 *
 * Admin page for managing advertisements shown in the mobile app.
 * Accessible to all admin roles (no additional guard needed beyond the
 * global layout-level auth check).
 *
 * ── Ad types supported ────────────────────────────────────────────────
 *  image  — static image uploaded to Firebase Storage
 *  video  — external video URL (e.g. YouTube embed link)
 *
 * ── Data flow ─────────────────────────────────────────────────────────
 *  getAllAds()          → fetch all ads from Firestore (on mount + on refresh)
 *  createAd(form, uid) → create a new Firestore ad document (+ Storage upload)
 *  toggleAdStatus(id)  → flip the `active` flag on an existing ad
 *  deleteAd(id)        → remove the ad document (and Storage asset if image)
 *
 * ── States ────────────────────────────────────────────────────────────
 *  loading   → AdsPageSkeleton (header + table rows)
 *  message   → dismissible success/error Alert after mutations
 *  modalOpen → AddAdModal (full-screen create form)
 *  success   → AdList (sortable table with toggle + delete actions)
 *
 * ── Child components ──────────────────────────────────────────────────
 *  AdsPageSkeleton  — skeleton header + 5 table row skeletons
 *  AdList           — displays all ads with status toggle and delete button
 *  AddAdModal       — modal form for creating a new ad (image or video)
 */

import { useState, useEffect, useCallback } from "react";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTranslation } from "react-i18next";

// ── Layout ────────────────────────────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Ad types ──────────────────────────────────────────────────────────
import type { Ad } from "@/types/ad";
import type { AdFormData } from "@/types/ad";

// ── Firestore ad operations ───────────────────────────────────────────
import {
  getAllAds,
  createAd,
  toggleAdStatus,
  deleteAd,
} from "@/lib/firebase/ads";

// ── Feature-specific components ───────────────────────────────────────
import AdList from "@/components/ads/AdList";
import AddAdModal from "@/components/ads/AddAdModal";
import AdsPageSkeleton from "@/components/ads/AdsPageSkeleton";

export default function AdsPage() {
  const { t } = useTranslation();

  // ── Local state ───────────────────────────────────────────────────
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Dismissible feedback message shown after create / toggle / delete
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────
  /**
   * Fetches all ads from Firestore.
   * Called on mount and whenever the user clicks "Refresh".
   * Always resets `loading` so the skeleton re-appears on manual refresh.
   */
  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllAds();
      setAds(data);
    } catch {
      setMessage({ type: "error", text: t("ads.fetchError") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  // ── Mutation handlers ─────────────────────────────────────────────

  /**
   * Creates a new ad document in Firestore.
   * If the ad type is "image", createAd also uploads the file to Firebase
   * Storage and stores the download URL.
   *
   * Note: "admin" is used as a placeholder creator UID until the auth
   * context is wired into this handler.
   */
  const handleCreate = async (formData: AdFormData) => {
    try {
      // TODO: replace "admin" with actual user UID from auth context
      await createAd(formData, "admin");
      setMessage({ type: "success", text: t("ads.createSuccess") });
      fetchAds(); // Reload list to show the new ad
    } catch {
      setMessage({ type: "error", text: t("ads.createError") });
    }
  };

  /**
   * Toggles the `active` status of an ad (active ↔ inactive).
   * Active ads are shown in the mobile app; inactive ones are hidden.
   */
  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleAdStatus(id, active);
      setMessage({ type: "success", text: t("ads.toggleSuccess") });
      fetchAds();
    } catch {
      setMessage({ type: "error", text: t("ads.toggleError") });
    }
  };

  /**
   * Permanently deletes an ad.
   * For image ads, the associated Storage file is also removed.
   */
  const handleDelete = async (id: string) => {
    try {
      await deleteAd(id);
      setMessage({ type: "success", text: t("ads.deleteSuccess") });
      fetchAds();
    } catch {
      setMessage({ type: "error", text: t("ads.deleteError") });
    }
  };

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return <AdsPageSkeleton title={t("ads.title")} />;
  }

  // ── Resolved state ────────────────────────────────────────────────
  return (
    <PageLayout>
      {/* ── Header row: title + action buttons ───────────────────────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" fontWeight={600}>
          {t("ads.title")}
        </Typography>

        <Box sx={{ display: "flex", gap: 1 }}>
          {/* Refresh: re-fetches ads from Firestore */}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAds}
            disabled={loading}
          >
            {t("ads.refresh")}
          </Button>

          {/* Add Ad: opens the AddAdModal creation form */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
          >
            {t("ads.addAd")}
          </Button>
        </Box>
      </Box>

      {/* ── Mutation feedback alert ───────────────────────────────────── */}
      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* ── Ad list / empty state ─────────────────────────────────────── */}
      {ads.length === 0 ? (
        // Empty state: no ads have been created yet
        <Typography color="text.secondary">{t("ads.noAds")}</Typography>
      ) : (
        /*
         * AdList renders a table with columns:
         *   Type | Title | URL | Thumbnail | Active | Created | Actions
         * Each row has a toggle switch and a delete button.
         */
        <AdList ads={ads} onToggle={handleToggle} onDelete={handleDelete} />
      )}

      {/* ── Create ad modal ───────────────────────────────────────────── */}
      {/*
       * AddAdModal is always mounted (not conditionally) so MUI handles
       * the open/close animation correctly via the `open` prop.
       */}
      <AddAdModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleCreate}
      />
    </PageLayout>
  );
}
