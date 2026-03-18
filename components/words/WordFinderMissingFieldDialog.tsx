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
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
import type { GenerateImagesSuccessResponse } from "@/types/imageGeneration";
import type {
  WordFinderActionField,
  WordFinderResponse,
  WordFinderResult,
  WordFinderResultFieldUpdates,
} from "@/types/wordFinder";

import {
  getFieldLabel,
  getGenerateButtonLabel,
  getGenerateDisabledReason,
  getSharedButtonLabel,
  hasTrimmedText,
} from "./wordFinderMissingFieldHelpers";
import WordFinderGenerateSection from "./WordFinderGenerateSection";
import WordFinderImageUploadSection from "./WordFinderImageUploadSection";
import WordFinderSharedCandidatesSection from "./WordFinderSharedCandidatesSection";
import WordFinderTextInputSection from "./WordFinderTextInputSection";

interface WordFinderMissingFieldDialogProps {
  open: boolean;
  field: WordFinderActionField | null;
  result: WordFinderResult | null;
  onClose: () => void;
  onResolved: (updates: WordFinderResultFieldUpdates) => void;
  sharedLookupResult?: WordFinderResult | null;
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
  const [textValue, setTextValue] = useState("");

  const fieldLabel = field ? getFieldLabel(field, t) : "";
  const noDayLabel = t("words.noDay");
  const allowSharedLookup = !(
    result?.schemaVariant === "jlpt" && field === "pronunciation"
  );

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

    if (!open || !result || !field || !lookupSource || !allowSharedLookup) {
      setError("");
      setSharedLookupError("");
      setSharedCandidates([]);
      setSelectedSharedKey("");
      setTextValue("");
      return;
    }

    if (field === "example" || field === "translation") {
      setTextValue(getWordFinderFieldValue(result, field) ?? "");
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
  }, [allowSharedLookup, field, open, result, sharedLookupResult, t]);

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
    setTextValue("");
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
            | "imageUrl"
            | "pronunciation"
            | "pronunciationRoman"
            | "example"
            | "exampleRoman"
            | "translation"
            | "translationEnglish"
            | "translationKorean",
            string,
          ] =>
            (entry[0] === "imageUrl" ||
              entry[0] === "pronunciation" ||
              entry[0] === "pronunciationRoman" ||
              entry[0] === "example" ||
              entry[0] === "exampleRoman" ||
              entry[0] === "translation" ||
              entry[0] === "translationEnglish" ||
              entry[0] === "translationKorean") &&
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
        if (result.schemaVariant === "jlpt") {
          const response = await fetch("/api/admin/jlpt-pronunciation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ words: [result.primaryText] }),
          });
          const payload = (await response.json()) as {
            error?: string;
            items?: Array<{
              word: string;
              pronunciation: string;
              pronunciationRoman: string;
            }>;
          };

          if (!response.ok) {
            throw new Error(payload.error || t("words.generateActionError"));
          }

          const item = payload.items?.[0];
          if (!item) {
            throw new Error(t("words.generateActionError"));
          }

          await handleResolved({
            pronunciation: item.pronunciation,
            pronunciationRoman: item.pronunciationRoman,
          });
          return;
        }

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
  }, [field, generateDisabledReason, handleResolved, result, settings, t]);

  const handleApplyText = useCallback(async () => {
    if (!field || !result || !textValue.trim()) return;
    setActionLoading("generate");
    setError("");
    try {
      const trimmedValue = textValue.trim();
      const updates: WordFinderResultFieldUpdates = {
        [field]: trimmedValue,
      };

      if (field === "example" && !hasTrimmedText(result.translation)) {
        const response = await fetch("/api/admin/translate-word-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field,
            example: trimmedValue,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          translation?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || t("words.generateActionError"));
        }
        if (!hasTrimmedText(payload.translation)) {
          throw new Error(t("words.generateActionError"));
        }

        updates.translation = payload.translation.trim();
      }

      if (field === "translation" && !hasTrimmedText(result.example)) {
        const response = await fetch("/api/admin/translate-word-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field,
            translation: trimmedValue,
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          example?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || t("words.generateActionError"));
        }
        if (!hasTrimmedText(payload.example)) {
          throw new Error(t("words.generateActionError"));
        }

        updates.example = payload.example.trim();
      }

      await handleResolved(updates);
    } catch (applyError) {
      setError(
        applyError instanceof Error ? applyError.message : t("words.generateActionError"),
      );
    } finally {
      setActionLoading(null);
    }
  }, [field, handleResolved, result, t, textValue]);

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
        {/* Word location / meaning metadata */}
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

        {/* Generate section */}
        <WordFinderGenerateSection
          field={field}
          result={result}
          actionLoading={actionLoading}
          generateDisabledReason={generateDisabledReason}
          generateActionLabel={generateActionLabel}
          settings={settings}
          onGenerate={handleGenerate}
        />

        {/* Text input section (example / translation) */}
        {(field === "example" || field === "translation") && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Divider sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {t("common.or", "or")}
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            <WordFinderTextInputSection
              fieldLabel={fieldLabel}
              textValue={textValue}
              actionLoading={actionLoading}
              onTextChange={setTextValue}
              onApply={handleApplyText}
            />
          </>
        )}

        {/* Image upload section */}
        {field === "image" && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Divider sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {t("common.or", "or")}
              </Typography>
              <Divider sx={{ flex: 1 }} />
            </Box>

            <WordFinderImageUploadSection
              result={result}
              actionLoading={actionLoading}
              droppedFile={droppedFile}
              dropPreview={dropPreview}
              isDragActive={isDragActive}
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              onUpload={handleUpload}
            />
          </>
        )}

        {/* Shared candidates section */}
        {allowSharedLookup && (
          <>
            <Divider />

            <WordFinderSharedCandidatesSection
              field={field}
              fieldLabel={fieldLabel}
              sharedCandidates={sharedCandidates}
              sharedLoading={sharedLoading}
              sharedLookupError={sharedLookupError}
              selectedSharedKey={selectedSharedKey}
              noDayLabel={noDayLabel}
              onSelectCandidate={setSelectedSharedKey}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={Boolean(actionLoading)}>
          {t("common.cancel")}
        </Button>
        {allowSharedLookup && (
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
        )}
      </DialogActions>
    </Dialog>
  );
}
