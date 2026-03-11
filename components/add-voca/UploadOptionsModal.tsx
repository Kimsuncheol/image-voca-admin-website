"use client";

import { useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

export interface UploadOptions {
  images: boolean;
  examples: boolean;
  translations: boolean;
}

interface UploadOptionsModalProps {
  open: boolean;
  selectedOptions: UploadOptions;
  imageGenerationSupported: boolean;
  imageGenerationEnabled: boolean;
  enrichGenerationEnabled: boolean;
  onClose: () => void;
  onConfirm: (options: UploadOptions) => void;
}

export default function UploadOptionsModal({
  open,
  selectedOptions,
  imageGenerationSupported,
  imageGenerationEnabled,
  enrichGenerationEnabled,
  onClose,
  onConfirm,
}: UploadOptionsModalProps) {
  const { t } = useTranslation();
  const [draftOptions, setDraftOptions] = useState<UploadOptions>(selectedOptions);

  const toggle = (key: keyof UploadOptions) =>
    setDraftOptions((prev) => ({
      ...prev,
      [key]:
        key === "images"
          ? imageGenerationSupported && imageGenerationEnabled && !prev[key]
          : enrichGenerationEnabled && !prev[key],
    }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      onTransitionEnter={() =>
        setDraftOptions({
          ...selectedOptions,
          images:
            imageGenerationSupported && imageGenerationEnabled
              ? selectedOptions.images
              : false,
          examples: enrichGenerationEnabled ? selectedOptions.examples : false,
          translations: enrichGenerationEnabled
            ? selectedOptions.translations
            : false,
        })
      }
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            border: "1px solid",
            borderColor: "divider",
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>
        {t("addVoca.uploadOptionsTitle", "Choose what to generate")}
      </DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            {t(
              "addVoca.uploadOptionsDescription",
              "Select any generation steps to run before uploading.",
            )}
          </Typography>

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={draftOptions.images}
                  onChange={() => toggle("images")}
                  disabled={!imageGenerationSupported || !imageGenerationEnabled}
                />
              }
              label={t("addVoca.generateImages", "Generate images")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={draftOptions.examples}
                  onChange={() => toggle("examples")}
                  disabled={!enrichGenerationEnabled}
                />
              }
              label={t("addVoca.generateExamples", "Generate examples")}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={draftOptions.translations}
                  onChange={() => toggle("translations")}
                  disabled={!enrichGenerationEnabled}
                />
              }
              label={t("addVoca.generateTranslations", "Generate translations")}
            />
          </FormGroup>

          {!imageGenerationSupported && (
            <Typography variant="caption" color="text.secondary">
              {t(
                "addVoca.generateImagesUnsupported",
                "Image generation is only available for CSAT, IELTS, TOEFL, and TOEIC.",
              )}
            </Typography>
          )}

          {imageGenerationSupported && !imageGenerationEnabled && (
            <Typography variant="caption" color="text.secondary">
              {t("addVoca.generateImagesDisabled")}
            </Typography>
          )}

          {!enrichGenerationEnabled && (
            <Typography variant="caption" color="text.secondary">
              {t("addVoca.generateEnrichDisabled")}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1.5 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={() => onConfirm(draftOptions)}
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          {t("addVoca.startUpload", "Start Upload")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
