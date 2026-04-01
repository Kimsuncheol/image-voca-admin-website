"use client";

import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { useTranslation } from "react-i18next";

import type { AISettings } from "@/lib/aiSettings";
import type { WordFinderActionField, WordFinderResult } from "@/types/wordFinder";

interface WordFinderGenerateSectionProps {
  field: WordFinderActionField;
  result: WordFinderResult;
  actionLoading: "generate" | "upload" | "shared" | "furigana" | null;
  generateDisabledReason: string | null;
  generateActionLabel: string;
  settings: AISettings;
  onGenerate: () => void;
}

export default function WordFinderGenerateSection({
  field,
  result,
  actionLoading,
  generateDisabledReason,
  generateActionLabel,
  settings,
  onGenerate,
}: WordFinderGenerateSectionProps) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{t("words.generateSectionTitle")}</Typography>
      <Button
        variant="contained"
        startIcon={
          actionLoading === "generate" ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <AutoFixHighIcon />
          )
        }
        onClick={onGenerate}
        disabled={Boolean(actionLoading) || Boolean(generateDisabledReason)}
      >
        {generateActionLabel}
      </Button>
      {generateDisabledReason && (
        <Typography variant="caption" color="text.secondary">
          {generateDisabledReason}
        </Typography>
      )}
      {field === "pronunciation" && !generateDisabledReason && (
        <Typography variant="caption" color="text.secondary">
          {result.schemaVariant === "jlpt"
            ? "JMdict"
            : settings.pronunciationApi === "oxford"
            ? t("settings.pronunciationApiOxford")
            : t("settings.pronunciationApiFreeDictionary")}
        </Typography>
      )}
    </Stack>
  );
}
