"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useTranslation } from "react-i18next";

import {
  updateFlatCourseField,
  updateWordField,
  updateWordImageUrl,
} from "@/lib/firebase/firestore";
import { uploadWordImage } from "@/lib/firebase/storage";
import { getPersistedPronunciation } from "@/lib/utils/ipaLookup";
import { useAdminAIAccess } from "@/lib/hooks/useAdminAccess";
import {
  filterSharedWordFinderCandidates,
  formatWordFinderLocation,
  getWordFinderFieldValue,
  getWordFinderResultKey,
} from "@/lib/wordFinderMissingFieldActions";
import {
  isSupportedImageGenerationCourseId,
  type GenerateImagesSuccessResponse,
} from "@/types/imageGeneration";
import type {
  WordFinderActionField,
  WordFinderResponse,
  WordFinderResult,
  WordFinderResultFieldUpdates,
} from "@/types/wordFinder";

interface WordFinderMissingFieldDialogProps {
  open: boolean;
  field: WordFinderActionField | null;
  result: WordFinderResult | null;
  onClose: () => void;
  onResolved: (updates: WordFinderResultFieldUpdates) => void;
  sharedLookupResult?: WordFinderResult | null;
}

function getFieldLabel(
  field: WordFinderActionField,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (field) {
    case "image":
      return t("courses.image");
    case "pronunciation":
      return t("courses.pronunciation");
    case "example":
      return t("courses.example");
    case "translation":
      return t("courses.translation");
    default:
      return field;
  }
}

function getGenerateButtonLabel(
  field: WordFinderActionField,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (field) {
    case "image":
      return t("words.generateNewImage");
    case "pronunciation":
      return t("words.generatePronunciationAction");
    case "example":
      return t("words.generateNewExamples");
    case "translation":
      return t("words.generateNewTranslations");
    default:
      return t("words.generateAction");
  }
}

function getSharedButtonLabel(
  field: WordFinderActionField,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (field) {
    case "image":
      return t("words.useSharedImage");
    case "pronunciation":
      return t("words.useSharedPronunciation");
    case "example":
      return t("words.useSharedExamples");
    case "translation":
      return t("words.useSharedTranslations");
    default:
      return t("words.useSharedAction");
  }
}

function getGenerateDisabledReason(
  result: WordFinderResult,
  field: WordFinderActionField,
  options: {
    imageGenerationBlockedByPermissions: boolean;
    imageGenerationBlockedBySettings: boolean;
    exampleTranslationBlockedByPermissions: boolean;
    exampleTranslationBlockedBySettings: boolean;
  },
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (field === "image") {
    if (!result.dayId) return t("words.imageUploadUnavailable");
    if (!result.meaning) return t("words.generateRequiresMeaning");
    if (!isSupportedImageGenerationCourseId(result.courseId)) {
      return t("addVoca.generateImagesUnsupported");
    }
    if (options.imageGenerationBlockedBySettings) {
      return t("courses.imageGenerationDisabled");
    }
    if (options.imageGenerationBlockedByPermissions) {
      return t("courses.imageGenerationPermissionDenied");
    }
    return null;
  }

  if (field === "pronunciation") {
    if (!result.dayId) return t("words.pronunciationUnavailable");
    if (result.primaryText.includes(" ")) {
      return t("words.pronunciationGenerationUnavailableForPhrase");
    }
    return null;
  }

  if (!result.dayId) {
    return t("words.translationGenerationUnavailableForQuote");
  }
  if (!result.meaning) {
    return t("words.generateRequiresMeaning");
  }
  if (options.exampleTranslationBlockedBySettings) {
    return t("courses.enrichGenerationDisabled");
  }
  if (options.exampleTranslationBlockedByPermissions) {
    return t("courses.enrichGenerationPermissionDenied");
  }
  return null;
}

function getSharedCandidateContent(
  candidate: WordFinderResult,
  field: WordFinderActionField,
  noDayLabel: string,
): { primary: string; secondary: string } {
  if (field === "image") {
    return {
      primary: candidate.primaryText,
      secondary: formatWordFinderLocation(candidate, noDayLabel),
    };
  }

  return {
    primary: getWordFinderFieldValue(candidate, field) ?? "",
    secondary: formatWordFinderLocation(candidate, noDayLabel),
  };
}

export default function WordFinderMissingFieldDialog({
  open,
  field,
  result,
  onClose,
  onResolved,
  sharedLookupResult,
}: WordFinderMissingFieldDialogProps) {
  const { t } = useTranslation();
  const {
    loading: aiAccessLoading,
    settings,
    imageGenerationBlockedByPermissions,
    imageGenerationBlockedBySettings,
    exampleTranslationBlockedByPermissions,
    exampleTranslationBlockedBySettings,
  } = useAdminAIAccess();
  const [actionLoading, setActionLoading] = useState<"generate" | "upload" | "shared" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [sharedLookupError, setSharedLookupError] = useState("");
  const [sharedCandidates, setSharedCandidates] = useState<WordFinderResult[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [selectedSharedKey, setSelectedSharedKey] = useState("");
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [dropPreview, setDropPreview] = useState<string | null>(null);

  const fieldLabel = field ? getFieldLabel(field, t) : "";
  const noDayLabel = t("words.noDay");

  const sharedActionLabel = field ? getSharedButtonLabel(field, t) : "";
  const generateActionLabel = field ? getGenerateButtonLabel(field, t) : "";

  const generateDisabledReason = useMemo(() => {
    if (!field || !result) return null;
    if (aiAccessLoading && (field === "image" || field === "example" || field === "translation")) {
      return t("common.loading");
    }
    return getGenerateDisabledReason(
      result,
      field,
      {
        imageGenerationBlockedByPermissions,
        imageGenerationBlockedBySettings,
        exampleTranslationBlockedByPermissions,
        exampleTranslationBlockedBySettings,
      },
      t,
    );
  }, [
    aiAccessLoading,
    exampleTranslationBlockedByPermissions,
    exampleTranslationBlockedBySettings,
    field,
    imageGenerationBlockedByPermissions,
    imageGenerationBlockedBySettings,
    result,
    t,
  ]);

  useEffect(() => {
    return () => {
      if (dropPreview) {
        URL.revokeObjectURL(dropPreview);
      }
    };
  }, [dropPreview]);

  useEffect(() => {
    const lookupSource = sharedLookupResult ?? result;

    if (!open || !result || !field || !lookupSource) {
      setError("");
      setSharedLookupError("");
      setSharedCandidates([]);
      setSelectedSharedKey("");
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      q: lookupSource.primaryText,
      type: lookupSource.type,
    });

    setSharedLoading(true);
    setSharedLookupError("");
    setSharedCandidates([]);
    setSelectedSharedKey("");

    fetch(`/api/admin/words?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error();
        }

        const data = (await response.json()) as WordFinderResponse;
        const nextCandidates = filterSharedWordFinderCandidates(
          result,
          data.results,
          field,
        );

        setSharedCandidates(nextCandidates);
        setSelectedSharedKey(
          nextCandidates.length === 1
            ? getWordFinderResultKey(nextCandidates[0])
            : "",
        );
      })
      .catch((fetchError: unknown) => {
        if (
          fetchError &&
          typeof fetchError === "object" &&
          "name" in fetchError &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setSharedLookupError(t("words.sharedLookupError"));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setSharedLoading(false);
        }
      });

    return () => controller.abort();
  }, [field, open, result, sharedLookupResult, t]);

  const resetUploadState = useCallback(() => {
    if (dropPreview) {
      URL.revokeObjectURL(dropPreview);
    }
    setDroppedFile(null);
    setDropPreview(null);
  }, [dropPreview]);

  const resetDialogState = useCallback(() => {
    setError("");
    setSharedLookupError("");
    setSharedCandidates([]);
    setSelectedSharedKey("");
    resetUploadState();
  }, [resetUploadState]);

  const handleClose = useCallback(() => {
    if (actionLoading) return;
    resetDialogState();
    onClose();
  }, [actionLoading, onClose, resetDialogState]);

  const persistUpdates = useCallback(
    async (updates: WordFinderResultFieldUpdates) => {
      if (!result) return;

      const tasks = Object.entries(updates)
        .filter(
          (
            entry,
          ): entry is [
            "imageUrl" | "pronunciation" | "example" | "translation",
            string,
          ] =>
            (entry[0] === "imageUrl" ||
              entry[0] === "pronunciation" ||
              entry[0] === "example" ||
              entry[0] === "translation") &&
            typeof entry[1] === "string" &&
            entry[1].trim().length > 0,
        )
        .map(([updateField, value]) => {
          if (updateField === "imageUrl") {
            if (!result.dayId) {
              throw new Error(t("words.imageUploadUnavailable"));
            }
            return updateWordImageUrl(result.coursePath, result.dayId, result.id, value);
          }

          if (result.dayId) {
            return updateWordField(
              result.coursePath,
              result.dayId,
              result.id,
              updateField,
              value,
            );
          }

          return updateFlatCourseField(result.coursePath, result.id, "translation", value);
        });

      await Promise.all(tasks);
    },
    [result, t],
  );

  const handleResolved = useCallback(
    async (updates: WordFinderResultFieldUpdates) => {
      await persistUpdates(updates);
      onResolved(updates);
      resetDialogState();
      onClose();
    },
    [onClose, onResolved, persistUpdates, resetDialogState],
  );

  const handleGenerate = useCallback(async () => {
    if (!field || !result || generateDisabledReason) return;

    setActionLoading("generate");
    setError("");

    try {
      if (field === "image") {
        const response = await fetch("/api/admin/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: result.courseId,
            words: [
              {
                word: result.primaryText,
                meaning: result.meaning,
                imageUrl: result.imageUrl ?? undefined,
              },
            ],
          }),
        });
        const payload = (await response.json()) as
          | GenerateImagesSuccessResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            ("error" in payload ? payload.error : undefined) ||
              t("words.generateActionError"),
          );
        }

        const imageUrl =
          "words" in payload ? payload.words?.[0]?.imageUrl : undefined;
        if (!imageUrl) {
          throw new Error(t("words.generateActionError"));
        }

        await handleResolved({ imageUrl });
        return;
      }

      if (field === "pronunciation") {
        const pronunciation = await getPersistedPronunciation(result.primaryText, settings);
        if (!pronunciation) {
          throw new Error(t("words.generateActionError"));
        }
        await handleResolved({ pronunciation });
        return;
      }

      const response = await fetch("/api/admin/generate-word-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          word: result.primaryText,
          meaning: result.meaning,
          ...(field === "translation" && result.example
            ? { example: result.example }
            : {}),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        example?: string;
        translation?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || t("words.generateActionError"));
      }

      const updates: WordFinderResultFieldUpdates = {};
      if (payload.example) {
        updates.example = payload.example;
      }
      if (payload.translation) {
        updates.translation = payload.translation;
      }

      if (Object.keys(updates).length === 0) {
        throw new Error(t("words.generateActionError"));
      }

      await handleResolved(updates);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : t("words.generateActionError"),
      );
    } finally {
      setActionLoading(null);
    }
  }, [field, generateDisabledReason, handleResolved, result, t]);

  const handleUpload = useCallback(async () => {
    if (!result || !droppedFile || !result.dayId) return;

    setActionLoading("upload");
    setError("");

    try {
      const imageUrl = await uploadWordImage(
        droppedFile,
        result.courseId,
        result.dayId,
        result.id,
      );
      await handleResolved({ imageUrl });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : t("words.uploadActionError"),
      );
    } finally {
      setActionLoading(null);
    }
  }, [droppedFile, handleResolved, result, t]);

  const handleApplyShared = useCallback(async () => {
    if (!field || !result) return;

    const sharedCandidate = sharedCandidates.find(
      (candidate) => getWordFinderResultKey(candidate) === selectedSharedKey,
    );
    if (!sharedCandidate) {
      setError(t("words.selectSharedCandidate"));
      return;
    }

    const sharedValue = getWordFinderFieldValue(sharedCandidate, field);
    if (!sharedValue) {
      setError(t("words.sharedApplyError"));
      return;
    }

    setActionLoading("shared");
    setError("");

    try {
      if (field === "image") {
        await handleResolved({ imageUrl: sharedValue });
        return;
      }

      await handleResolved({ [field]: sharedValue });
    } catch (sharedError) {
      setError(
        sharedError instanceof Error
          ? sharedError.message
          : t("words.sharedApplyError"),
      );
    } finally {
      setActionLoading(null);
    }
  }, [field, handleResolved, result, selectedSharedKey, sharedCandidates, t]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      resetUploadState();
      setDroppedFile(file);
      setDropPreview(URL.createObjectURL(file));
    },
    [resetUploadState],
  );

  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple: false,
    disabled: Boolean(actionLoading) || !open || field !== "image",
  });

  if (!result || !field) {
    return null;
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        {t("words.resolveFieldTitle", {
          field: fieldLabel,
          text: result.primaryText,
        })}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        <Stack spacing={0.5}>
          <Typography variant="body2" color="text.secondary">
            {t("words.location")}: {formatWordFinderLocation(result, noDayLabel)}
          </Typography>
          {result.meaning && (
            <Typography variant="body2" color="text.secondary">
              {t("words.secondaryText")}: {result.meaning}
            </Typography>
          )}
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

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
            onClick={handleGenerate}
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
              {settings.pronunciationApi === "oxford"
                ? t("settings.pronunciationApiOxford")
                : t("settings.pronunciationApiFreeDictionary")}
            </Typography>
          )}
        </Stack>

        {field === "image" && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Divider sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {t("common.or", "or")}
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

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
                    alt={t("words.imagePreviewAlt", {
                      text: result.primaryText,
                    })}
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
                onClick={handleUpload}
                disabled={!droppedFile || Boolean(actionLoading) || !result.dayId}
              >
                {t("words.uploadNewImage")}
              </Button>
            </Stack>
          </>
        )}

        <Divider />

        <Stack spacing={1}>
          <Typography variant="subtitle2">{t("words.sharedSectionTitle")}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t("words.sharedSectionDescription", { field: fieldLabel })}
          </Typography>

          {sharedLookupError && <Alert severity="warning">{sharedLookupError}</Alert>}

          {sharedLoading ? (
            <Stack alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={24} />
            </Stack>
          ) : sharedCandidates.length === 0 ? (
            <Alert severity="info">{t("words.noSharedMatches")}</Alert>
          ) : (
            <Stack spacing={1}>
              {sharedCandidates.map((candidate) => {
                const candidateKey = getWordFinderResultKey(candidate);
                const isSelected = candidateKey === selectedSharedKey;
                const content = getSharedCandidateContent(candidate, field, noDayLabel);

                return (
                  <Paper
                    key={candidateKey}
                    variant="outlined"
                    onClick={() => setSelectedSharedKey(candidateKey)}
                    sx={{
                      p: 1.5,
                      cursor: "pointer",
                      borderColor: isSelected ? "primary.main" : "divider",
                      backgroundColor: isSelected ? "action.selected" : "background.paper",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: "2px solid",
                          borderColor: isSelected ? "primary.main" : "divider",
                          mt: 0.25,
                          position: "relative",
                          flexShrink: 0,
                        }}
                      >
                        {isSelected && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "primary.main",
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                            }}
                          />
                        )}
                      </Box>

                      {field === "image" && candidate.imageUrl && (
                        <Box
                          component="img"
                          src={candidate.imageUrl}
                          alt={candidate.primaryText}
                          sx={{
                            width: 72,
                            height: 72,
                            borderRadius: 1,
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      )}

                      <Stack spacing={0.5} sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {content.secondary}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ whiteSpace: "pre-line", wordBreak: "break-word" }}
                        >
                          {content.primary}
                        </Typography>
                        {(field === "example" || field === "translation") &&
                          candidate.meaning && (
                            <Typography variant="caption" color="text.secondary">
                              {candidate.meaning}
                            </Typography>
                          )}
                      </Stack>
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={Boolean(actionLoading)}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          startIcon={
            actionLoading === "shared" ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <ContentCopyIcon />
            )
          }
          onClick={handleApplyShared}
          disabled={
            Boolean(actionLoading) ||
            sharedLoading ||
            sharedCandidates.length === 0 ||
            !selectedSharedKey
          }
        >
          {sharedActionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
