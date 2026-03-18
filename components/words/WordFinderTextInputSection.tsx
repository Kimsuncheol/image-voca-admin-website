"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

interface WordFinderTextInputSectionProps {
  fieldLabel: string;
  textValue: string;
  actionLoading: "generate" | "upload" | "shared" | null;
  onTextChange: (value: string) => void;
  onApply: () => void;
}

export default function WordFinderTextInputSection({
  fieldLabel,
  textValue,
  actionLoading,
  onTextChange,
  onApply,
}: WordFinderTextInputSectionProps) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <TextField
        multiline
        minRows={2}
        fullWidth
        size="small"
        label={fieldLabel}
        value={textValue}
        onChange={(e) => onTextChange(e.target.value)}
        disabled={Boolean(actionLoading)}
      />
      <Button
        variant="outlined"
        onClick={onApply}
        disabled={!textValue.trim() || Boolean(actionLoading)}
      >
        {t("common.apply")}
      </Button>
    </Stack>
  );
}
