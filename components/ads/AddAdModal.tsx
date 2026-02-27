"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { AdFormData } from "@/types/ad";

interface AddAdModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: AdFormData) => void;
}

export default function AddAdModal({ open, onClose, onAdd }: AddAdModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isDirty = title.trim() !== "" || description.trim() !== "" || videoUrl.trim() !== "";

  const handleReset = () => {
    setTitle("");
    setDescription("");
    setVideoUrl("");
  };

  const isValid = () => {
    if (!title.trim()) return false;
    if (!videoUrl.trim().startsWith("http")) return false;
    return true;
  };

  const handleCloseRequest = () => {
    if (isDirty) {
      setConfirmOpen(true);
    } else {
      onClose();
    }
  };

  const handleConfirmLeave = () => {
    setConfirmOpen(false);
    onClose();
  };

  const handleAdd = () => {
    if (!isValid()) return;
    onAdd({
      type: "video",
      title: title.trim(),
      description: description.trim(),
      videoUrl: videoUrl.trim(),
    });
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleCloseRequest}
        maxWidth="sm"
        fullWidth
        TransitionProps={{ onExited: handleReset }}
      >
        <DialogTitle>{t("ads.addAd")}</DialogTitle>
        <DialogContent>
          {/* Title */}
          <TextField
            label={t("ads.adTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            margin="normal"
            required
          />

          {/* Description */}
          <TextField
            label={t("ads.description")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows={2}
          />

          {/* Video URL */}
          <TextField
            label={t("ads.videoUrl")}
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            fullWidth
            margin="normal"
            placeholder={t("ads.urlPlaceholder")}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRequest}>{t("common.cancel")}</Button>
          <Button onClick={handleAdd} variant="contained" disabled={!isValid()}>
            {t("common.confirm")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discard confirmation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t("ads.discardTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">{t("ads.discardMessage")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t("ads.keep")}</Button>
          <Button onClick={handleConfirmLeave} color="error" variant="contained">
            {t("ads.leave")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
