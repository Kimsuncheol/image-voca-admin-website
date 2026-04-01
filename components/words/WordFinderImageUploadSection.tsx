"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useTranslation } from "react-i18next";
import type { DropzoneInputProps, DropzoneRootProps } from "react-dropzone";

interface WordFinderImageUploadSectionProps {
  result: { primaryText: string; dayId?: string | null };
  actionLoading: "generate" | "upload" | "shared" | "furigana" | null;
  droppedFile: File | null;
  dropPreview: string | null;
  isDragActive: boolean;
  getRootProps: () => DropzoneRootProps;
  getInputProps: () => DropzoneInputProps;
  onUpload: () => void;
}

export default function WordFinderImageUploadSection({
  result,
  actionLoading,
  droppedFile,
  dropPreview,
  isDragActive,
  getRootProps,
  getInputProps,
  onUpload,
}: WordFinderImageUploadSectionProps) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2">{t("words.uploadSectionTitle")}</Typography>
      <Box
        {...getRootProps()}
        sx={{
          border: "2px dashed",
          borderColor: isDragActive ? "primary.main" : "divider",
          borderRadius: 2,
          p: 2,
          textAlign: "center",
          cursor: actionLoading ? "not-allowed" : "pointer",
          bgcolor: isDragActive ? "action.hover" : "background.paper",
          transition: "border-color 0.2s, background-color 0.2s",
        }}
      >
        <input {...getInputProps()} />
        {dropPreview ? (
          <Box
            component="img"
            src={dropPreview}
            alt={t("words.imagePreviewAlt", { text: result.primaryText })}
            sx={{
              width: 140,
              height: 140,
              objectFit: "cover",
              borderRadius: 1,
            }}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {isDragActive
              ? t("courses.dropHere", "Drop image here")
              : t("courses.dragOrClick", "Drag an image here, or click to select")}
          </Typography>
        )}
      </Box>

      <Button
        variant="outlined"
        startIcon={
          actionLoading === "upload" ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <CloudUploadIcon />
          )
        }
        onClick={onUpload}
        disabled={!droppedFile || Boolean(actionLoading) || !result.dayId}
      >
        {t("words.uploadNewImage")}
      </Button>
    </Stack>
  );
}
