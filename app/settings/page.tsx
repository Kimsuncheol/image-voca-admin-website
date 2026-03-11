"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ImageIcon from "@mui/icons-material/Image";
import TranslateIcon from "@mui/icons-material/Translate";
import PageLayout from "@/components/layout/PageLayout";
import { DEFAULT_AI_SETTINGS } from "@/lib/aiSettings";
import { getAISettings, saveAISettings, type AISettings } from "@/lib/firebase/settings";

export default function SettingsPage() {
  const { t } = useTranslation();

  const [settings, setSettings] = useState<AISettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getAISettings()
      .then(setSettings)
      .catch(() => {
        setSettings(DEFAULT_AI_SETTINGS);
        setMessage({ type: "error", text: t("settings.loadError") });
      });
  }, [t]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveAISettings(settings);
      setMessage({ type: "success", text: t("settings.saveSuccess") });
    } catch {
      setMessage({ type: "error", text: t("settings.saveError") });
    } finally {
      setSaving(false);
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
        {/* Image generation model */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <ImageIcon color="primary" />
              <Typography variant="h6">{t("settings.imageGeneration")}</Typography>
            </Stack>
            {settings === null ? (
              <Stack spacing={1}>
                <Skeleton width={180} height={36} />
                <Skeleton width={160} height={36} />
              </Stack>
            ) : (
              <FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.imageGenerationEnabled}
                      onChange={(_, checked) =>
                        setSettings({
                          ...settings,
                          imageGenerationEnabled: checked,
                        })
                      }
                    />
                  }
                  label={t("settings.featureEnabled")}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {settings.imageGenerationEnabled
                    ? t("settings.imageGenerationEnabledHelp")
                    : t("settings.imageGenerationDisabledHelp")}
                </Typography>
                <FormLabel sx={{ mb: 1 }}>{t("settings.selectModel")}</FormLabel>
                <RadioGroup
                  value={settings.imageModel}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      imageModel: e.target.value as AISettings["imageModel"],
                    })
                  }
                  aria-label={t("settings.imageGeneration")}
                >
                  <FormControlLabel
                    value="nano-banana2"
                    control={<Radio />}
                    label="Nano banana2 (Gemini)"
                    disabled={!settings.imageGenerationEnabled}
                  />
                  <FormControlLabel
                    value="gpt-image-1"
                    control={<Radio />}
                    label="gpt-image-1 (ChatGPT)"
                    disabled={!settings.imageGenerationEnabled}
                  />
                </RadioGroup>
              </FormControl>
            )}
          </CardContent>
        </Card>

        {/* Example & translation generation model */}
        <Card>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
              <TranslateIcon color="primary" />
              <Typography variant="h6">{t("settings.enrichGeneration")}</Typography>
            </Stack>
            {settings === null ? (
              <Stack spacing={1}>
                <Skeleton width={140} height={36} />
                <Skeleton width={160} height={36} />
              </Stack>
            ) : (
              <FormControl>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enrichGenerationEnabled}
                      onChange={(_, checked) =>
                        setSettings({
                          ...settings,
                          enrichGenerationEnabled: checked,
                        })
                      }
                    />
                  }
                  label={t("settings.featureEnabled")}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {settings.enrichGenerationEnabled
                    ? t("settings.enrichGenerationEnabledHelp")
                    : t("settings.enrichGenerationDisabledHelp")}
                </Typography>
                <FormLabel sx={{ mb: 1 }}>{t("settings.selectModel")}</FormLabel>
                <RadioGroup
                  value={settings.enrichModel}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      enrichModel: e.target.value as AISettings["enrichModel"],
                    })
                  }
                  aria-label={t("settings.enrichGeneration")}
                >
                  <FormControlLabel value="gemini" control={<Radio />} label="Gemini" disabled={!settings.enrichGenerationEnabled} />
                  <FormControlLabel value="chatgpt" control={<Radio />} label="ChatGPT" disabled={!settings.enrichGenerationEnabled} />
                </RadioGroup>
              </FormControl>
            )}
          </CardContent>
        </Card>

        <Button
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={settings === null || saving}
        >
          {saving ? t("settings.saving") : t("common.save")}
        </Button>
      </Stack>
    </PageLayout>
  );
}
