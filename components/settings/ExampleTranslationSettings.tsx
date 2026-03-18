"use client";

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
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TranslateIcon from "@mui/icons-material/Translate";
import { type AISettings } from "@/lib/firebase/settings";

interface Props {
  settings: AISettings | null;
  onChange: (newSettings: AISettings) => void;
}

export default function ExampleTranslationSettings({ settings, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <TranslateIcon color="primary" />
          <Typography variant="h6">{t("settings.exampleTranslation")}</Typography>
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
                    onChange({ ...settings, enrichGenerationEnabled: checked })
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
                onChange({ ...settings, enrichModel: e.target.value as AISettings["enrichModel"] })
              }
              aria-label={t("settings.exampleTranslation")}
            >
              <FormControlLabel
                value="gemini"
                control={<Radio />}
                label="Gemini"
                disabled={!settings.enrichGenerationEnabled}
              />
              <FormControlLabel
                value="chatgpt"
                control={<Radio />}
                label="ChatGPT"
                disabled={!settings.enrichGenerationEnabled}
              />
            </RadioGroup>
            <FormLabel sx={{ mt: 2, mb: 1 }}>{t("settings.selectTranslationApi")}</FormLabel>
            <RadioGroup
              value={settings.exampleTranslationApi}
              onChange={(e) =>
                onChange({
                  ...settings,
                  exampleTranslationApi: e.target.value as AISettings["exampleTranslationApi"],
                })
              }
              aria-label={t("settings.selectTranslationApi")}
            >
              <FormControlLabel
                value="deepl"
                control={<Radio />}
                label={t("settings.exampleTranslationApiDeepL")}
                disabled={!settings.enrichGenerationEnabled}
              />
              <FormControlLabel
                value="google-translate"
                control={<Radio />}
                label={t("settings.exampleTranslationApiGoogle")}
                disabled={!settings.enrichGenerationEnabled}
              />
            </RadioGroup>
          </FormControl>
        )}
      </CardContent>
    </Card>
  );
}
