"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import PageLayout from "@/components/layout/PageLayout";
import GenerateTab from "@/components/promotion-codes/GenerateTab";
import ActiveCodesTab from "@/components/promotion-codes/ActiveCodesTab";
import GeneratedCodesModal from "@/components/promotion-codes/GeneratedCodesModal";
import type { PromotionCode, CodeGenerationResponse } from "@/types/promotionCode";

export default function PromotionCodesPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [codes, setCodes] = useState<PromotionCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [generatedModalOpen, setGeneratedModalOpen] = useState(false);

  // FR-1: Gate access to admin users only
  useEffect(() => {
    if (!authLoading && user?.role === "user") {
      router.replace("/");
    }
  }, [authLoading, user, router]);

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

  const handleGenerated = (response: CodeGenerationResponse) => {
    setMessage({ type: "success", text: t("promotionCodes.generateSuccess") });
    setGeneratedCodes(response.codes);
    setGeneratedModalOpen(true);
    fetchCodes();
    setTabIndex(1);
  };

  const handleDeactivateSuccess = () => {
    setMessage({ type: "success", text: t("promotionCodes.deactivateSuccess") });
    fetchCodes();
  };

  if (authLoading || (loading && codes.length === 0)) {
    return (
      <PageLayout>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  if (user?.role === "user") return null;

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("promotionCodes.title")}
      </Typography>

      {message && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Tabs
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab label={t("promotionCodes.generate")} />
        <Tab label={t("promotionCodes.activeCodes")} />
      </Tabs>

      {tabIndex === 0 && (
        <GenerateTab
          onGenerated={handleGenerated}
          onError={(msg) => setMessage({ type: "error", text: msg })}
        />
      )}
      {tabIndex === 1 && (
        <ActiveCodesTab
          codes={codes}
          loading={loading}
          onRefresh={fetchCodes}
          onDeactivateSuccess={handleDeactivateSuccess}
          onError={(msg) => setMessage({ type: "error", text: msg })}
        />
      )}

      <GeneratedCodesModal
        open={generatedModalOpen}
        codes={generatedCodes}
        onClose={() => setGeneratedModalOpen(false)}
      />
    </PageLayout>
  );
}
