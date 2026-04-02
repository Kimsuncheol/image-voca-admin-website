"use client";

import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { useTranslation } from "react-i18next";
import { persistMangaUploadBatch } from "@/lib/mangaUpload";
import type {
  MangaNoAiUploadCourseId,
  MangaNoAiUploadJlptLevel,
  MangaNoAiUploadPayload,
} from "@/types/manga";

interface MangaNoAiUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (payload: MangaNoAiUploadPayload) => Promise<unknown> | unknown;
}

interface SelectedMangaImage {
  file: File;
  previewUrl: string;
  signature: string;
}

export const MANGA_NO_AI_COURSE_OPTIONS: Array<{
  id: MangaNoAiUploadCourseId;
  label: string;
}> = [
  { id: "CSAT", label: "CSAT" },
  { id: "TOEFL_IELTS", label: "TOEFL / IELTS" },
  { id: "TOEIC", label: "TOEIC" },
  { id: "JLPT", label: "JLPT" },
  { id: "COLLOCATIONS", label: "Collocations" },
];

const MANGA_NO_AI_JLPT_LEVEL_OPTIONS: MangaNoAiUploadJlptLevel[] = [
  "N1",
  "N2",
  "N3",
  "N4",
  "N5",
];

const IMAGE_ACCEPT = {
  "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"],
};

const MODAL_BG = "#0b1020";
const SURFACE_BORDER = "rgba(255,255,255,0.08)";
const TEXT_SOFT = "rgba(224,231,255,0.72)";
const TEXT_DIM = "rgba(224,231,255,0.46)";

const sectionSx = {
  border: "1px solid",
  borderColor: SURFACE_BORDER,
  borderRadius: 4,
  px: { xs: 2, sm: 2.5 },
  py: { xs: 2, sm: 2.25 },
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.025) 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
};

const dayFieldSx = {
  "& .MuiInputLabel-root": {
    color: TEXT_DIM,
  },
  "& .MuiInputLabel-root.Mui-focused": {
    color: "#dbe7ff",
  },
  "& .MuiOutlinedInput-root": {
    borderRadius: 2.5,
    color: "#f7f9ff",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
    "& fieldset": {
      borderColor: SURFACE_BORDER,
    },
    "&:hover fieldset": {
      borderColor: "rgba(129,161,255,0.4)",
    },
    "&.Mui-focused fieldset": {
      borderColor: "rgba(129,161,255,0.72)",
      boxShadow: "0 0 0 4px rgba(98,127,224,0.14)",
    },
    "& .MuiInputAdornment-root": {
      color: TEXT_DIM,
      fontWeight: 600,
    },
  },
};

function getFileSignature(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function createSelectedImage(file: File): SelectedMangaImage {
  return {
    file,
    previewUrl: URL.createObjectURL(file),
    signature: getFileSignature(file),
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getChipSx(selected: boolean) {
  return {
    height: 36,
    borderRadius: "999px",
    fontWeight: selected ? 700 : 500,
    color: selected ? "#f7f9ff" : "rgba(232,238,255,0.88)",
    borderColor: selected
      ? "rgba(140,170,255,0.7)"
      : "rgba(255,255,255,0.12)",
    background: selected
      ? "linear-gradient(135deg, rgba(88,120,222,0.92) 0%, rgba(121,156,255,0.92) 100%)"
      : "rgba(255,255,255,0.035)",
    boxShadow: selected ? "0 10px 24px rgba(67,97,197,0.24)" : "none",
    "& .MuiChip-label": { px: "12px", py: "7px" },
  };
}

export default function MangaNoAiUploadModal({
  open,
  onClose,
  onSubmit,
}: MangaNoAiUploadModalProps) {
  const { t } = useTranslation();
  const [selectedImages, setSelectedImages] = useState<SelectedMangaImage[]>([]);
  const [selectedCourseId, setSelectedCourseId] =
    useState<MangaNoAiUploadCourseId | null>(null);
  const [selectedJlptLevel, setSelectedJlptLevel] =
    useState<MangaNoAiUploadJlptLevel | null>(null);
  const [dayInput, setDayInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetState = useCallback(() => {
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    setSelectedCourseId(null);
    setSelectedJlptLevel(null);
    setDayInput("");
    setError("");
  }, []);

  const handleClose = useCallback(() => {
    if (loading) return;
    resetState();
    onClose();
  }, [loading, onClose, resetState]);

  const appendFiles = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setSelectedImages((current) => {
      const seenSignatures = new Set(current.map((image) => image.signature));
      const nextItems = [...current];

      acceptedFiles.forEach((file) => {
        const signature = getFileSignature(file);
        if (seenSignatures.has(signature)) return;
        seenSignatures.add(signature);
        nextItems.push(createSelectedImage(file));
      });

      return nextItems;
    });
    setError("");
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      appendFiles(acceptedFiles);
    },
    [appendFiles],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: IMAGE_ACCEPT,
    multiple: true,
    disabled: loading,
  });

  const removeImage = useCallback((signature: string) => {
    setSelectedImages((current) =>
      current.filter((image) => {
        if (image.signature !== signature) return true;
        URL.revokeObjectURL(image.previewUrl);
        return false;
      }),
    );
    setError("");
  }, []);

  const clearImages = useCallback(() => {
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
    setError("");
  }, []);

  const parsedDay = useMemo(() => {
    if (!dayInput) return null;
    const day = Number.parseInt(dayInput, 10);
    return Number.isInteger(day) && day > 0 ? day : null;
  }, [dayInput]);

  const jlptLevelRequired = selectedCourseId === "JLPT";
  const isValid =
    selectedImages.length > 0 &&
    !!selectedCourseId &&
    parsedDay !== null &&
    (!jlptLevelRequired || !!selectedJlptLevel);

  const handleSubmit = useCallback(async () => {
    if (
      !selectedCourseId ||
      parsedDay === null ||
      selectedImages.length === 0 ||
      (selectedCourseId === "JLPT" && !selectedJlptLevel)
    ) {
      return;
    }

    const payload: MangaNoAiUploadPayload = {
      files: selectedImages.map((image) => image.file),
      courseId: selectedCourseId,
      jlptLevel:
        selectedCourseId === "JLPT" ? (selectedJlptLevel ?? undefined) : undefined,
      day: parsedDay,
    };

    setLoading(true);
    setError("");

    try {
      await (onSubmit ? onSubmit(payload) : persistMangaUploadBatch(payload));
      resetState();
      onClose();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t(
              "manga.noAiUploadErrorGeneric",
              "Failed to upload manga images. Please try again.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }, [
    onClose,
    onSubmit,
    parsedDay,
    resetState,
    selectedCourseId,
    selectedImages,
    selectedJlptLevel,
    t,
  ]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            background: "rgba(5, 8, 18, 0.72)",
            backdropFilter: "blur(10px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: 5,
          border: "1px solid rgba(255,255,255,0.08)",
          background: `
            radial-gradient(circle at top, rgba(102,130,255,0.16), transparent 30%),
            linear-gradient(180deg, #11192d 0%, ${MODAL_BG} 100%)
          `,
          color: "#f7f9ff",
          boxShadow: "0 30px 100px rgba(0, 0, 0, 0.48)",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2.5, sm: 3 }, pt: 3, pb: 1.5 }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 1,
            px: 1.25,
            py: 0.75,
            borderRadius: "999px",
            border: "1px solid rgba(144,169,255,0.22)",
            bgcolor: "rgba(112,136,219,0.1)",
            color: "#dbe7ff",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <UploadFileOutlinedIcon sx={{ fontSize: 16 }} />
          Studio Upload
        </Box>
        <Typography sx={{ mt: 2, fontSize: { xs: 26, sm: 30 }, fontWeight: 800, lineHeight: 1.05 }}>
          {t("manga.noAiUploadTitle", "Upload manga (no AI)")}
        </Typography>
        <Typography sx={{ mt: 1, maxWidth: 520, color: TEXT_SOFT, fontSize: 14, lineHeight: 1.65 }}>
          {t(
            "manga.noAiUploadDescription",
            "Drop a manual manga batch, assign the course path, and queue the day with compact visual review.",
          )}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pb: 2, pt: "4px !important" }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {error ? (
            <Alert
              severity="error"
              sx={{
                bgcolor: "rgba(211,47,47,0.12)",
                color: "#ffe6ea",
                border: "1px solid rgba(255,107,129,0.24)",
              }}
            >
              {error}
            </Alert>
          ) : null}

          <Box sx={sectionSx}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1.25, color: "#f6f8ff", fontWeight: 700 }}
            >
              {t("manga.noAiUploadDropzoneLabel", "Manga images")}
            </Typography>
            <Box
              {...getRootProps()}
              sx={{
                border: "1px dashed",
                borderColor: isDragActive
                  ? "rgba(148,177,255,0.95)"
                  : "rgba(144,169,255,0.24)",
                borderRadius: 4,
                p: { xs: 3, sm: 3.5 },
                textAlign: "center",
                cursor: loading ? "not-allowed" : "pointer",
                background: isDragActive
                  ? "linear-gradient(180deg, rgba(107,137,232,0.22) 0%, rgba(107,137,232,0.08) 100%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.015) 100%)",
                transition:
                  "background-color 150ms ease, border-color 150ms ease, transform 150ms ease",
                "&:hover": {
                  borderColor: "rgba(148,177,255,0.7)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <input {...getInputProps()} disabled={loading} />
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  mx: "auto",
                  mb: 1.5,
                  borderRadius: "18px",
                  display: "grid",
                  placeItems: "center",
                  color: "#f7f9ff",
                  background:
                    "linear-gradient(135deg, rgba(116,145,236,0.8) 0%, rgba(164,191,255,0.35) 100%)",
                  boxShadow: "0 14px 34px rgba(74,105,210,0.28)",
                }}
              >
                <UploadFileOutlinedIcon sx={{ fontSize: 28 }} />
              </Box>
              <Typography variant="body1" sx={{ color: "#f7f9ff", fontWeight: 700 }}>
                {isDragActive
                  ? t("manga.noAiUploadDropActive", "Drop manga images here")
                  : t(
                      "manga.noAiUploadDropIdle",
                      "Drag multiple manga images here, or click to select",
                    )}
              </Typography>
              <Typography sx={{ mt: 0.75, fontSize: 13, color: TEXT_DIM }}>
                PNG, JPG, WEBP, GIF, AVIF
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.35fr 0.85fr" },
              gap: 2,
            }}
          >
            <Box sx={sectionSx}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.25, color: "#f6f8ff", fontWeight: 700 }}
              >
                {t("manga.noAiUploadCourseLabel", "Course")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {MANGA_NO_AI_COURSE_OPTIONS.map((course) => (
                  <Chip
                    key={course.id}
                    label={course.label}
                    clickable
                    color={selectedCourseId === course.id ? "primary" : "default"}
                    variant={selectedCourseId === course.id ? "filled" : "outlined"}
                    onClick={() => {
                      if (loading) return;
                      setSelectedCourseId(course.id);
                      if (course.id !== "JLPT") {
                        setSelectedJlptLevel(null);
                      }
                      setError("");
                    }}
                    sx={getChipSx(selectedCourseId === course.id)}
                  />
                ))}
              </Box>
            </Box>

            <Box sx={sectionSx}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.25, color: "#f6f8ff", fontWeight: 700 }}
              >
                {t("manga.noAiUploadDayLabel", "Day")}
              </Typography>
              <TextField
                label={t("manga.noAiUploadDayLabel", "Day")}
                value={dayInput}
                onChange={(event) => {
                  setDayInput(event.target.value.replace(/\D/g, ""));
                  setError("");
                }}
                placeholder="1"
                inputMode="numeric"
                sx={dayFieldSx}
                slotProps={{
                  htmlInput: {
                    "aria-label": "Day",
                  },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">Day</InputAdornment>
                    ),
                  },
                }}
                fullWidth
              />
            </Box>
          </Box>

          {selectedCourseId === "JLPT" && (
            <Box sx={sectionSx}>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.25, color: "#f6f8ff", fontWeight: 700 }}
              >
                {t("manga.noAiUploadJlptLevelLabel", "JLPT level")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {MANGA_NO_AI_JLPT_LEVEL_OPTIONS.map((level) => (
                  <Chip
                    key={level}
                    label={level}
                    clickable
                    color={selectedJlptLevel === level ? "primary" : "default"}
                    variant={selectedJlptLevel === level ? "filled" : "outlined"}
                    onClick={() => {
                      setSelectedJlptLevel(level);
                      setError("");
                    }}
                    disabled={loading}
                    sx={getChipSx(selectedJlptLevel === level)}
                  />
                ))}
              </Box>
            </Box>
          )}

          <Box sx={sectionSx}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: 1.25,
              }}
            >
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ color: "#f6f8ff", fontWeight: 700 }}
                >
                  {t("manga.noAiUploadPreviewLabel", "Preview")}
                </Typography>
                <Typography sx={{ mt: 0.35, fontSize: 13, color: TEXT_DIM }}>
                  {selectedImages.length > 0
                    ? `${selectedImages.length} selected`
                    : t("manga.noAiUploadPreviewHint", "Compact review before upload")}
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={clearImages}
                disabled={selectedImages.length === 0 || loading}
                sx={{
                  minWidth: 0,
                  px: 1.25,
                  py: 0.5,
                  color: selectedImages.length === 0 ? TEXT_DIM : "#cddcff",
                  borderRadius: "999px",
                  bgcolor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {t("manga.noAiUploadClearAll", "Clear all")}
              </Button>
            </Box>

            {selectedImages.length === 0 ? (
              <Box
                sx={{
                  border: "1px dashed",
                  borderColor: "rgba(255,255,255,0.12)",
                  borderRadius: 3,
                  px: 2.5,
                  py: 3,
                  color: TEXT_SOFT,
                  textAlign: "center",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%)",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t("manga.noAiUploadPreviewEmpty", "No images selected yet.")}
                </Typography>
                <Typography sx={{ mt: 0.75, fontSize: 13, color: TEXT_DIM }}>
                  Add a few manga cuts to review them here.
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    sm: "repeat(3, minmax(0, 1fr))",
                  },
                  gap: 1.25,
                }}
              >
                {selectedImages.map((image) => (
                  <Box
                    key={image.signature}
                    sx={{
                      position: "relative",
                      border: "1px solid",
                      borderColor: "rgba(255,255,255,0.08)",
                      borderRadius: 3,
                      overflow: "hidden",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                      boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
                    }}
                  >
                    <Box
                      component="img"
                      src={image.previewUrl}
                      alt={image.file.name}
                      sx={{
                        display: "block",
                        width: "100%",
                        height: 116,
                        objectFit: "cover",
                        bgcolor: "action.hover",
                      }}
                    />
                    <IconButton
                      size="small"
                      aria-label={`Remove ${image.file.name}`}
                      onClick={() => removeImage(image.signature)}
                      disabled={loading}
                      sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        width: 28,
                        height: 28,
                        bgcolor: "rgba(8,12,22,0.68)",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        backdropFilter: "blur(8px)",
                        "&:hover": {
                          bgcolor: "rgba(18,26,44,0.92)",
                        },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                    <Box sx={{ px: 1.25, py: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          color: "#f6f8ff",
                          fontWeight: 700,
                          fontSize: 12,
                          lineHeight: 1.4,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {image.file.name}
                      </Typography>
                      <Typography sx={{ mt: 0.25, fontSize: 12, color: TEXT_DIM }}>
                        {formatFileSize(image.file.size)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3 },
          pb: 3,
          pt: 1.5,
          gap: 1,
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ display: { xs: "none", sm: "block" }, color: TEXT_DIM, fontSize: 12 }}>
          Manual queue only. No AI processing yet.
        </Typography>
        <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            sx={{
              px: 1.8,
              borderRadius: "999px",
              color: "#d5e2ff",
              border: "1px solid rgba(255,255,255,0.1)",
              bgcolor: "rgba(255,255,255,0.035)",
            }}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!isValid || loading}
            sx={{
              px: 2.2,
              borderRadius: "999px",
              fontWeight: 700,
              color: "#f7f9ff",
              background: "linear-gradient(135deg, #5e81ff 0%, #84a4ff 100%)",
              boxShadow: "0 14px 32px rgba(65,101,209,0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #6c8cff 0%, #93b0ff 100%)",
              },
              "&.Mui-disabled": {
                color: "rgba(255,255,255,0.45)",
                background: "rgba(255,255,255,0.1)",
              },
            }}
          >
            {loading ? (
              <CircularProgress size={18} sx={{ color: "#f7f9ff" }} />
            ) : (
              t("manga.noAiUploadPrimaryAction", "Upload without AI")
            )}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
