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
import TextField from "@mui/material/TextField";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";
import { type AISettings } from "@/lib/firebase/settings";

interface Props {
  settings: AISettings | null;
  onChange: (newSettings: AISettings) => void;
}

export default function PronunciationSettings({ settings, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <RecordVoiceOverIcon color="primary" />
          <Typography variant="h6">{t("settings.pronunciationGeneration")}</Typography>
        </Stack>
        {settings === null ? (
          <Stack spacing={1}>
            <Skeleton width={200} height={36} />
            <Skeleton width={180} height={36} />
          </Stack>
        ) : (
          <FormControl>
            <FormLabel sx={{ mb: 1 }}>{t("settings.selectModel")}</FormLabel>
            <RadioGroup
              value={settings.pronunciationApi}
              onChange={(e) =>
                onChange({
                  ...settings,
                  pronunciationApi: e.target.value as "free-dictionary" | "oxford",
                })
              }
              aria-label={t("settings.pronunciationGeneration")}
            >
              <FormControlLabel
                value="free-dictionary"
                control={<Radio />}
                label={t("settings.pronunciationApiFreeDictionary")}
              />
              <FormControlLabel
                value="oxford"
                control={<Radio />}
                label={t("settings.pronunciationApiOxford")}
                disabled
              />
            </RadioGroup>
            {settings.pronunciationApi === "oxford" && (
              <Stack spacing={1.5} sx={{ mt: 2 }}>
                <TextField
                  label={t("settings.oxfordAppId")}
                  value={settings.oxfordAppId}
                  onChange={(e) => onChange({ ...settings, oxfordAppId: e.target.value })}
                  size="small"
                  fullWidth
                />
                <TextField
                  label={t("settings.oxfordAppKey")}
                  value={settings.oxfordAppKey}
                  onChange={(e) => onChange({ ...settings, oxfordAppKey: e.target.value })}
                  size="small"
                  fullWidth
                  type="password"
                />
              </Stack>
            )}
          </FormControl>
        )}
      </CardContent>
    </Card>
  );
}
