"use client";

import { useState, useEffect, useCallback } from "react";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
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

function AdsPageSkeleton({ title }: { title: string }) {
  return (
    <PageLayout>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          gap: 2,
        }}
      >
        <Skeleton variant="text" width={200} height={48} />
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={110} height={36} />
          <Skeleton variant="rounded" width={120} height={36} />
        </Stack>
      </Box>

      <Typography
        variant="h4"
        fontWeight={600}
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          p: 0,
          m: -1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {title}
      </Typography>

      <Skeleton variant="text" width={150} sx={{ mb: 1 }} />

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={2}>
            <Skeleton variant="text" width="12%" />
            <Skeleton variant="text" width="16%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="16%" />
            <Skeleton variant="text" width="10%" />
            <Skeleton variant="text" width="14%" />
            <Skeleton variant="text" width="10%" />
          </Stack>

          {Array.from({ length: 5 }).map((_, idx) => (
            <Box
              key={idx}
              sx={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(90px, 0.9fr) minmax(120px, 1.2fr) minmax(140px, 1.8fr) minmax(120px, 1.2fr) 90px 120px 70px",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Skeleton variant="rounded" height={28} width={84} />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="95%" />
              <Skeleton variant="rounded" height={40} width={80} />
              <Skeleton variant="circular" width={36} height={36} />
              <Skeleton variant="text" width="85%" />
              <Skeleton variant="circular" width={32} height={32} />
            </Box>
          ))}
        </Stack>
      </Paper>
    </PageLayout>
  );
}

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

  if (loading) {
    return <AdsPageSkeleton title={t("ads.title")} />;
  }

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

      {ads.length === 0 ? (
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
