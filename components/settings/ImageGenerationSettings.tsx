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
import ImageIcon from "@mui/icons-material/Image";
import { type AISettings } from "@/lib/firebase/settings";

interface Props {
  settings: AISettings | null;
  onChange: (newSettings: AISettings) => void;
}

export default function ImageGenerationSettings({ settings, onChange }: Props) {
  const { t } = useTranslation();

  return (
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
                    onChange({ ...settings, imageGenerationEnabled: checked })
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
                onChange({ ...settings, imageModel: e.target.value as AISettings["imageModel"] })
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
  );
}
