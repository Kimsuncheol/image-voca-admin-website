"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { useTranslation } from "react-i18next";

interface GeneratedCodesModalProps {
  open: boolean;
  codes: string[];
  onClose: () => void;
}

export default function GeneratedCodesModal({
  open,
  codes,
  onClose,
}: GeneratedCodesModalProps) {
  const { t } = useTranslation();
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={600}>
        {t("promotionCodes.generatedTitle")} ({codes.length})
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t("promotionCodes.copyCode")}
        </Typography>
        <Stack spacing={1}>
          {codes.map((code, idx) => (
            <Box
              key={code}
              onClick={() => handleCopy(code, idx)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                p: 1.5,
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
                cursor: "pointer",
                "&:hover": { bgcolor: "action.hover" },
                transition: "background-color 0.15s",
              }}
            >
              <Typography
                fontFamily="monospace"
                fontWeight={600}
                letterSpacing={1}
              >
                {code}
              </Typography>
              <Chip
                size="small"
                icon={copiedIndex === idx ? <CheckIcon /> : <ContentCopyIcon />}
                label={copiedIndex === idx ? t("promotionCodes.copied") : t("promotionCodes.copyCode")}
                color={copiedIndex === idx ? "success" : "default"}
                variant={copiedIndex === idx ? "filled" : "outlined"}
              />
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          {t("common.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
