"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { useTranslation } from "react-i18next";
import type { StandardWord } from "@/types/word";
import { useAISettings } from "@/lib/hooks/useAISettings";
import { updateWordImageUrl } from "@/lib/firebase/firestore";
import { uploadWordImage } from "@/lib/firebase/storage";

interface WordImageModalProps {
  open: boolean;
  word: StandardWord;
  courseId: string;
  coursePath: string;
  dayId: string;
  onClose: () => void;
  onImageSaved: (wordId: string, imageUrl: string) => void;
}

export default function WordImageModal({
  open,
  word,
  courseId,
  coursePath,
  dayId,
  onClose,
  onImageSaved,
}: WordImageModalProps) {
  const { t } = useTranslation();
  const { settings: aiSettings, loading: aiSettingsLoading } = useAISettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [dropPreview, setDropPreview] = useState<string | null>(null);

  // Revoke object URL when modal closes or a new file is dropped
  useEffect(() => {
    return () => {
      if (dropPreview) URL.revokeObjectURL(dropPreview);
    };
  }, [dropPreview]);

  const resetDropped = () => {
    if (dropPreview) URL.revokeObjectURL(dropPreview);
    setDroppedFile(null);
    setDropPreview(null);
  };

  const handleClose = () => {
    if (loading) return;
    resetDropped();
    setError("");
    onClose();
  };

  const handleGenerate = async () => {
    if (aiSettingsLoading || !aiSettings.imageGenerationEnabled) return;
    setLoading(true);
    setError("");
    try {
      const resp = await fetch("/api/admin/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, words: [word] }),
      });
      const result = (await resp.json()) as {
        error?: string;
        words?: (StandardWord & { imageUrl: string })[];
        failures?: { word: string; error: string }[];
      };
      if (!resp.ok) throw new Error(result.error || "Generation failed");
      const newImageUrl = result.words?.[0]?.imageUrl;
      if (!newImageUrl) throw new Error("No image URL returned");
      await updateWordImageUrl(coursePath, dayId, word.id, newImageUrl);
      onImageSaved(word.id, newImageUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!droppedFile) return;
    setLoading(true);
    setError("");
    try {
      const downloadUrl = await uploadWordImage(droppedFile, courseId, dayId, word.id);
      await updateWordImageUrl(coursePath, dayId, word.id, downloadUrl);
      onImageSaved(word.id, downloadUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      resetDropped();
      setDroppedFile(file);
      setDropPreview(URL.createObjectURL(file));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple: false,
    disabled: loading,
  });

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {t("courses.addImage", "Add image")} — {word.word}
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        {/* ── Generate section ─────────────────────────── */}
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoFixHighIcon />}
          onClick={handleGenerate}
          disabled={loading || aiSettingsLoading || !aiSettings.imageGenerationEnabled}
          fullWidth
        >
          {t("courses.generateImage", "Generate image")}
        </Button>

        {!aiSettingsLoading && !aiSettings.imageGenerationEnabled && (
          <Typography variant="caption" color="text.secondary">
            {t("courses.imageGenerationDisabled")}
          </Typography>
        )}

        {/* ── Divider ──────────────────────────────────── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Divider sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary">
            {t("common.or", "or")}
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Box>

        {/* ── DnD zone ─────────────────────────────────── */}
        <Box
          {...getRootProps()}
          sx={{
            border: "2px dashed",
            borderColor: isDragActive ? "primary.main" : "divider",
            borderRadius: 2,
            p: 2,
            textAlign: "center",
            cursor: loading ? "not-allowed" : "pointer",
            bgcolor: isDragActive ? "action.hover" : "background.paper",
            transition: "border-color 0.2s, background-color 0.2s",
          }}
        >
          <input {...getInputProps()} />

          {dropPreview ? (
            <Box
              component="img"
              src={dropPreview}
              alt="preview"
              sx={{ width: 120, height: 120, objectFit: "cover", borderRadius: 1 }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              {isDragActive
                ? t("courses.dropHere", "Drop image here")
                : t("courses.dragOrClick", "Drag an image here, or click to select")}
            </Typography>
          )}
        </Box>

        {droppedFile && (
          <Button
            variant="outlined"
            onClick={handleUpload}
            disabled={loading}
            fullWidth
          >
            {loading ? (
              <CircularProgress size={18} />
            ) : (
              t("courses.uploadImage", "Upload image")
            )}
          </Button>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {t("common.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
