"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import PageLayout from "@/components/layout/PageLayout";
import { DEFAULT_AI_SETTINGS } from "@/lib/aiSettings";
import { getAISettings, saveAISettings, type AISettings } from "@/lib/firebase/settings";
import ImageGenerationSettings from "@/components/settings/ImageGenerationSettings";
import ExampleTranslationSettings from "@/components/settings/ExampleTranslationSettings";
import PronunciationSettings from "@/components/settings/PronunciationSettings";
import AdjectiveDerivativesSettings from "@/components/settings/AdjectiveDerivativesSettings";

export default function SettingsPage() {
  const { t } = useTranslation();

  const [settings, setSettings] = useState<AISettings | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getAISettings()
      .then(setSettings)
      .catch(() => {
        setSettings(DEFAULT_AI_SETTINGS);
        setMessage({ type: "error", text: t("settings.loadError") });
      });
  }, [t]);

  async function handleChange(newSettings: AISettings) {
    setSettings(newSettings);
    setMessage(null);
    try {
      await saveAISettings(newSettings);
      setMessage({ type: "success", text: t("settings.saveSuccess") });
    } catch {
      setMessage({ type: "error", text: t("settings.saveError") });
    }
  }

  return (
    <PageLayout>
      <Typography variant="h4" fontWeight={600} sx={{ mb: 4 }}>
        {t("settings.title")}
      </Typography>

      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ mb: 3 }}>
          {message.text}
        </Alert>
      )}

      <Stack spacing={3} maxWidth={600}>
        <ImageGenerationSettings settings={settings} onChange={handleChange} />
        <ExampleTranslationSettings settings={settings} onChange={handleChange} />
        <PronunciationSettings settings={settings} onChange={handleChange} />
        <AdjectiveDerivativesSettings settings={settings} onChange={handleChange} />
      </Stack>
    </PageLayout>
  );
}
