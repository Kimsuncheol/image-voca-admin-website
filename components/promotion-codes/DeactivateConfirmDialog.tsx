"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "react-i18next";

interface DeactivateConfirmDialogProps {
  open: boolean;
  codeId: string;
  codeText: string;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export default function DeactivateConfirmDialog({
  open,
  codeId,
  codeText,
  onClose,
  onSuccess,
  onError,
}: DeactivateConfirmDialogProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotion-codes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("promotionCodes.deactivateError"));
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : t("promotionCodes.deactivateError"));
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={600}>{t("promotionCodes.deactivateTitle")}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t("promotionCodes.deactivateConfirm")}
        </DialogContentText>
        <DialogContentText
          sx={{ mt: 1, fontFamily: "monospace", fontWeight: 600, letterSpacing: 1 }}
        >
          {codeText}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleConfirm}
          color="error"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {t("promotionCodes.deactivate")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
