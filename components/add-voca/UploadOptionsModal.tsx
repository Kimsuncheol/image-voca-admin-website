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
import type { UploadOptions } from "@/lib/addVocaUploadOptions";

interface UploadOptionsModalProps {
  open: boolean;
  selectedOptions: UploadOptions;
  isImageGenerationEnabled: boolean;
  isExampleAndTranslationGenerationEnabled: boolean;
  onClose: () => void;
  onConfirm: (options: UploadOptions) => void;
}

export default function UploadOptionsModal({
  open,
  selectedOptions,
  isImageGenerationEnabled,
  isExampleAndTranslationGenerationEnabled,
  onClose,
  onConfirm,
}: UploadOptionsModalProps) {
  const { t } = useTranslation();
  const [draftOptions, setDraftOptions] = useState<UploadOptions>(selectedOptions);

  const toggle = (key: keyof UploadOptions) =>
    setDraftOptions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));

  const getVisibleOptions = (options: UploadOptions): UploadOptions => ({
    images: isImageGenerationEnabled ? options.images : false,
    examples: isExampleAndTranslationGenerationEnabled ? options.examples : false,
    translations: isExampleAndTranslationGenerationEnabled
      ? options.translations
      : false,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      onTransitionEnter={() => setDraftOptions(getVisibleOptions(selectedOptions))}
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
            {isImageGenerationEnabled && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={draftOptions.images}
                    onChange={() => toggle("images")}
                  />
                }
                label={t("addVoca.generateImages", "Generate images")}
              />
            )}
            {isExampleAndTranslationGenerationEnabled && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={draftOptions.examples}
                    onChange={() => toggle("examples")}
                  />
                }
                label={t("addVoca.generateExamples", "Generate examples")}
              />
            )}
            {isExampleAndTranslationGenerationEnabled && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={draftOptions.translations}
                    onChange={() => toggle("translations")}
                  />
                }
                label={t("addVoca.generateTranslations", "Generate translations")}
              />
            )}
          </FormGroup>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1.5 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={() => onConfirm(getVisibleOptions(draftOptions))}
          variant="contained"
          sx={{ borderRadius: 2 }}
        >
          {t("addVoca.startUpload", "Start Upload")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
