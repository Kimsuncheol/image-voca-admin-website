"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { useTranslation } from "react-i18next";

import {
  buildDerivativePreviewRequestItems,
  requestDerivativePreview,
} from "@/lib/derivativeGeneration";
import { normalizeVocabularyWord } from "@/lib/word-derivation/shared";
import type { CourseId } from "@/types/course";
import type { DerivativePreviewItemResult } from "@/types/vocabulary";

export interface DerivativeItem {
  word: string;
  meaning: string;
}

type DerivativeSelectionMap = Record<string, Record<string, Record<string, boolean>>>;

interface DerivativeEditDialogProps {
  open: boolean;
  courseId: CourseId | "";
  baseWord: string;
  baseMeaning: string;
  sourceLabel?: string;
  canGenerate?: boolean;
  initial: DerivativeItem[];
  onClose: () => void;
  onSave: (items: DerivativeItem[]) => void | Promise<void>;
}

const PREVIEW_ITEM_ID = "derivative-edit-dialog";

function cloneDerivativeItems(items: DerivativeItem[]): DerivativeItem[] {
  return items.map((item) => ({ ...item }));
}

function buildInitialSelectionMap(
  items: DerivativePreviewItemResult[],
): DerivativeSelectionMap {
  return items.reduce<DerivativeSelectionMap>((acc, item) => {
    acc[item.itemId] = item.words.reduce<Record<string, Record<string, boolean>>>(
      (wordAcc, wordPreview) => {
        const baseWordKey = normalizeVocabularyWord(wordPreview.baseWord);
        wordAcc[baseWordKey] = wordPreview.candidates.reduce<Record<string, boolean>>(
          (candidateAcc, candidate) => {
            candidateAcc[normalizeVocabularyWord(candidate.word)] =
              candidate.selectedByDefault;
            return candidateAcc;
          },
          {},
        );
        return wordAcc;
      },
      {},
    );
    return acc;
  }, {});
}

function buildMergedDerivativeItems(
  currentItems: DerivativeItem[],
  previewItems: DerivativePreviewItemResult[],
  selectionMap: DerivativeSelectionMap,
): DerivativeItem[] {
  const existingWords = new Set(
    currentItems.map((item) => normalizeVocabularyWord(item.word)),
  );
  const additions: DerivativeItem[] = [];

  previewItems.forEach((item) => {
    item.words.forEach((wordPreview) => {
      const baseWordKey = normalizeVocabularyWord(wordPreview.baseWord);
      wordPreview.candidates.forEach((candidate) => {
        const candidateWordKey = normalizeVocabularyWord(candidate.word);
        const isSelected =
          selectionMap[item.itemId]?.[baseWordKey]?.[candidateWordKey] ?? false;
        if (!isSelected || existingWords.has(candidateWordKey)) {
          return;
        }
        existingWords.add(candidateWordKey);
        additions.push({
          word: candidate.word,
          meaning: candidate.meaning,
        });
      });
    });
  });

  return [...currentItems, ...additions];
}

export default function DerivativeEditDialog({
  open,
  courseId,
  baseWord,
  baseMeaning,
  sourceLabel,
  canGenerate = false,
  initial,
  onClose,
  onSave,
}: DerivativeEditDialogProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<DerivativeItem[]>(() =>
    cloneDerivativeItems(initial),
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<DerivativePreviewItemResult[]>([]);
  const [previewError, setPreviewError] = useState("");
  const [selectionMap, setSelectionMap] = useState<DerivativeSelectionMap>({});
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItems(cloneDerivativeItems(initial));
    setPreviewLoading(false);
    setPreviewItems([]);
    setPreviewError("");
    setSelectionMap({});
    setSaveError("");
    setSaving(false);
  }, [initial, open]);

  useEffect(() => {
    if (!open) return;
    setSelectionMap(buildInitialSelectionMap(previewItems));
  }, [open, previewItems]);

  const previewEntries = useMemo(
    () =>
      previewItems.flatMap((item) =>
        item.words.map((word) => ({
          itemId: item.itemId,
          label: item.dayName,
          ...word,
        })),
      ),
    [previewItems],
  );

  const totalCandidateCount = useMemo(
    () =>
      previewEntries.reduce((sum, entry) => sum + entry.candidates.length, 0),
    [previewEntries],
  );

  const selectedCandidateCount = useMemo(
    () =>
      previewEntries.reduce((sum, entry) => {
        const baseWordKey = normalizeVocabularyWord(entry.baseWord);
        const selectedCount = entry.candidates.filter((candidate) => {
          const candidateWordKey = normalizeVocabularyWord(candidate.word);
          return selectionMap[entry.itemId]?.[baseWordKey]?.[candidateWordKey] ?? false;
        }).length;
        return sum + selectedCount;
      }, 0),
    [previewEntries, selectionMap],
  );

  const handleChange = (index: number, field: keyof DerivativeItem, value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleAdd = () => {
    setItems((prev) => [...prev, { word: "", meaning: "" }]);
  };

  const handleDelete = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleCandidate = (itemId: string, sourceBaseWord: string, candidateWord: string) => {
    const baseWordKey = normalizeVocabularyWord(sourceBaseWord);
    const candidateWordKey = normalizeVocabularyWord(candidateWord);

    setSelectionMap((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? {}),
        [baseWordKey]: {
          ...(prev[itemId]?.[baseWordKey] ?? {}),
          [candidateWordKey]:
            !(prev[itemId]?.[baseWordKey]?.[candidateWordKey] ?? false),
        },
      },
    }));
  };

  const handleGenerate = async () => {
    if (!canGenerate || !courseId) return;

    setPreviewLoading(true);
    setPreviewItems([]);
    setPreviewError("");
    setSelectionMap({});

    try {
      const preview = await requestDerivativePreview(
        courseId,
        buildDerivativePreviewRequestItems(
          [
            {
              id: PREVIEW_ITEM_ID,
              primaryText: baseWord,
              meaning: baseMeaning,
              derivative: items,
            },
          ],
          () => sourceLabel ?? baseWord,
        ),
      );
      setPreviewItems(preview.items);
    } catch (error) {
      setPreviewError(
        error instanceof Error
          ? error.message
          : t("words.generateActionError"),
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleApplySelected = () => {
    setItems((prev) =>
      buildMergedDerivativeItems(prev, previewItems, selectionMap),
    );
  };

  const handleSave = async () => {
    setSaveError("");
    setSaving(true);

    try {
      await onSave(items.filter((item) => item.word.trim() || item.meaning.trim()));
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : t("words.generateActionError"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Typography variant="h6">
            {t("words.editDerivativesTitle", "Edit derivatives")}
          </Typography>
          {canGenerate ? (
            <Button
              variant="outlined"
              size="small"
              startIcon={
                previewLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AutoFixHighIcon />
                )
              }
              onClick={() => {
                void handleGenerate();
              }}
              disabled={previewLoading || saving}
            >
              {t("words.generateDerivatives")}
            </Button>
          ) : null}
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {saveError ? <Alert severity="error">{saveError}</Alert> : null}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {items.map((item, index) => (
              <Box key={index} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  label={t("courses.word", "Word")}
                  size="small"
                  value={item.word}
                  onChange={(event) => handleChange(index, "word", event.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  label={t("courses.meaning", "Meaning")}
                  size="small"
                  value={item.meaning}
                  onChange={(event) => handleChange(index, "meaning", event.target.value)}
                  sx={{ flex: 1 }}
                />
                <IconButton
                  size="small"
                  onClick={() => handleDelete(index)}
                  aria-label={t("common.delete")}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={handleAdd}
              size="small"
              sx={{ alignSelf: "flex-start" }}
            >
              {t("words.addDerivative", "Add derivative")}
            </Button>
          </Box>

          {previewLoading ? (
            <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                {t(
                  "words.derivativePreviewLoading",
                  "Detecting adjective derivatives...",
                )}
              </Typography>
            </Stack>
          ) : null}

          {!previewLoading && previewError ? (
            <Alert severity="error">{previewError}</Alert>
          ) : null}

          {!previewLoading && !previewError && previewItems.length > 0 ? (
            <Stack spacing={2}>
              {previewEntries.some((entry) => entry.errors?.length) ? (
                <Alert severity="warning">
                  {t(
                    "words.derivativePreviewPartial",
                    "Some words could not be analyzed. You can still continue with the available results.",
                  )}
                </Alert>
              ) : null}

              {totalCandidateCount === 0 ? (
                <Alert severity="info">
                  {t(
                    "words.derivativePreviewEmptyRow",
                    "No adjective derivatives were found for this word.",
                  )}
                </Alert>
              ) : (
                <>
                  {previewEntries.map((entry) => (
                    <Paper
                      key={`${entry.itemId}-${entry.baseWord}`}
                      variant="outlined"
                      sx={{ p: 2, borderRadius: 2.5 }}
                    >
                      <Stack spacing={1.5}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <Chip
                            label={t("words.derivativePreviewOriginal", "Original")}
                            size="small"
                            color="default"
                          />
                          <Typography fontWeight={600}>{entry.baseWord}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {entry.baseMeaning}
                          </Typography>
                          <Chip
                            label={t("words.derivativePreviewCount", "{{count}} candidates", {
                              count: entry.candidates.length,
                            })}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>

                        {entry.label ? (
                          <Typography variant="caption" color="text.secondary">
                            {entry.label}
                          </Typography>
                        ) : null}

                        <Stack spacing={0.5}>
                          {entry.candidates.map((candidate) => (
                            <FormControlLabel
                              key={`${entry.itemId}-${entry.baseWord}-${candidate.word}`}
                              control={
                                <Checkbox
                                  checked={
                                    selectionMap[entry.itemId]?.[
                                      normalizeVocabularyWord(entry.baseWord)
                                    ]?.[
                                      normalizeVocabularyWord(candidate.word)
                                    ] ?? false
                                  }
                                  onChange={() =>
                                    toggleCandidate(
                                      entry.itemId,
                                      entry.baseWord,
                                      candidate.word,
                                    )
                                  }
                                />
                              }
                              label={
                                <Stack spacing={0.25}>
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography fontWeight={500}>
                                      {candidate.word}
                                    </Typography>
                                    <Chip
                                      label={candidate.source}
                                      size="small"
                                      variant="outlined"
                                    />
                                  </Stack>
                                  <Typography variant="body2" color="text.secondary">
                                    {candidate.meaning}
                                  </Typography>
                                  {candidate.attribution ? (
                                    <Typography variant="caption" color="text.secondary">
                                      {candidate.attribution}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              }
                              sx={{ alignItems: "flex-start", m: 0 }}
                            />
                          ))}
                        </Stack>
                      </Stack>
                    </Paper>
                  ))}

                  <Box>
                    <Button
                      variant="contained"
                      onClick={handleApplySelected}
                      disabled={selectedCandidateCount === 0 || saving}
                    >
                      {t("words.applySelectedDerivatives", "Apply selected")}
                    </Button>
                  </Box>
                </>
              )}
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button onClick={() => void handleSave()} variant="contained" disabled={saving}>
          {saving ? <CircularProgress size={16} color="inherit" /> : t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
