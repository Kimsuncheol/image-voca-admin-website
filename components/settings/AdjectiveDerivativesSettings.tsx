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
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { type AISettings } from "@/lib/firebase/settings";

interface Props {
  settings: AISettings | null;
  onChange: (newSettings: AISettings) => void;
}

export default function AdjectiveDerivativesSettings({ settings, onChange }: Props) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <AutoAwesomeIcon color="primary" />
          <Typography variant="h6">{t("settings.adjectiveDerivatives")}</Typography>
        </Stack>
        {settings === null ? (
          <Stack spacing={1}>
            <Skeleton width={220} height={36} />
            <Skeleton width={180} height={36} />
          </Stack>
        ) : (
          <FormControl>
            <FormLabel sx={{ mb: 1 }}>{t("settings.selectDerivativeApi")}</FormLabel>
            <RadioGroup
              value={settings.adjectiveDerivativeApi}
              onChange={(e) =>
                onChange({
                  ...settings,
                  adjectiveDerivativeApi: e.target.value as AISettings["adjectiveDerivativeApi"],
                })
              }
              aria-label={t("settings.adjectiveDerivatives")}
            >
              <FormControlLabel
                value="word-sense"
                control={<Radio />}
                label={t("settings.adjectiveDerivativeApiWordSense")}
              />
              <FormControlLabel
                value="datamuse"
                control={<Radio />}
                label={t("settings.adjectiveDerivativeApiDatamuse")}
              />
              <FormControlLabel
                value="free-dictionary"
                control={<Radio />}
                label={t("settings.adjectiveDerivativeApiFreeDictionary")}
              />
            </RadioGroup>
          </FormControl>
        )}
      </CardContent>
    </Card>
  );
}
