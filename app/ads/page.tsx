"use client";

import { useState, useEffect, useCallback } from "react";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import type { Ad } from "@/types/ad";
import type { AdFormData } from "@/types/ad";
import {
  getAllAds,
  createAd,
  toggleAdStatus,
  deleteAd,
} from "@/lib/firebase/ads";
import AdList from "@/components/ads/AdList";
import AddAdModal from "@/components/ads/AddAdModal";

export default function AdsPage() {
  const { t } = useTranslation();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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

  const handleCreate = async (formData: AdFormData) => {
    try {
      // TODO: pass actual user ID when auth context is available
      await createAd(formData, "admin");
      setMessage({ type: "success", text: t("ads.createSuccess") });
      fetchAds();
    } catch {
      setMessage({ type: "error", text: t("ads.createError") });
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await toggleAdStatus(id, active);
      setMessage({ type: "success", text: t("ads.toggleSuccess") });
      fetchAds();
    } catch {
      setMessage({ type: "error", text: t("ads.toggleError") });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAd(id);
      setMessage({ type: "success", text: t("ads.deleteSuccess") });
      fetchAds();
    } catch {
      setMessage({ type: "error", text: t("ads.deleteError") });
    }
  };

  return (
    <PageLayout>
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
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchAds}
            disabled={loading}
          >
            {t("ads.refresh")}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setModalOpen(true)}
          >
            {t("ads.addAd")}
          </Button>
        </Box>
      </Box>

      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : ads.length === 0 ? (
        <Typography color="text.secondary">{t("ads.noAds")}</Typography>
      ) : (
        <AdList ads={ads} onToggle={handleToggle} onDelete={handleDelete} />
      )}

      <AddAdModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={handleCreate}
      />
    </PageLayout>
  );
}
