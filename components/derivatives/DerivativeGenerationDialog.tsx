"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { normalizeVocabularyWord } from "@/lib/word-derivation/shared";
import type { DerivativeSelectionMap } from "@/services/vocaSaveService";
import type { DerivativePreviewItemResult } from "@/types/vocabulary";

interface DerivativeGenerationDialogProps {
  open: boolean;
  loading: boolean;
  saving?: boolean;
  items: DerivativePreviewItemResult[];
  error?: string;
  onClose: () => void;
  onConfirm: (selectionMap: DerivativeSelectionMap) => void;
}

function buildInitialSelectionMap(
  items: DerivativePreviewItemResult[],
): DerivativeSelectionMap {
  return items.reduce<DerivativeSelectionMap>((acc, item) => {
    acc[item.itemId] = item.words.reduce<Record<string, Record<string, boolean>>>(
      (wordAcc, wordPreview) => {
        const baseWordKey = normalizeVocabularyWord(wordPreview.baseWord);
        wordAcc[baseWordKey] = wordPreview.candidates.reduce<
          Record<string, boolean>
        >((candidateAcc, candidate) => {
          candidateAcc[normalizeVocabularyWord(candidate.word)] =
            candidate.selectedByDefault;
          return candidateAcc;
        }, {});
        return wordAcc;
      },
      {},
    );
    return acc;
  }, {});
}

export default function DerivativeGenerationDialog({
  open,
  loading,
  saving = false,
  items,
  error,
  onClose,
  onConfirm,
}: DerivativeGenerationDialogProps) {
  const { t } = useTranslation();
  const [selectionMap, setSelectionMap] = useState<DerivativeSelectionMap>({});

  useEffect(() => {
    if (!open) return;
    setSelectionMap(buildInitialSelectionMap(items));
  }, [items, open]);

  const entries = useMemo(
    () =>
      items.flatMap((item) =>
        item.words.map((word) => ({
          itemId: item.itemId,
          label: item.dayName,
          ...word,
        })),
      ),
    [items],
  );

  const totalCandidateCount = useMemo(
    () =>
      entries.reduce(
        (sum, entry) => sum + entry.candidates.length,
        0,
      ),
    [entries],
  );

  const toggleCandidate = (
    itemId: string,
    baseWord: string,
    candidateWord: string,
  ) => {
    const baseWordKey = normalizeVocabularyWord(baseWord);
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

  return (
    <Dialog
      open={open}
      onClose={loading || saving ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>
        {t("words.derivativePreviewTitle", "Confirm adjective derivatives")}
      </DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Stack spacing={2}>
          {loading ? (
            <Stack
              spacing={2}
              alignItems="center"
              justifyContent="center"
              sx={{ py: 6 }}
            >
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                {t(
                  "words.derivativePreviewLoading",
                  "Detecting adjective derivatives...",
                )}
              </Typography>
            </Stack>
          ) : (
            <>
              {error && <Alert severity="error">{error}</Alert>}
              {!error && totalCandidateCount === 0 && (
                <Alert severity="info">
                  {t(
                    "words.derivativePreviewEmpty",
                    "No adjective derivatives were found for the selected words.",
                  )}
                </Alert>
              )}
              {entries.some((entry) => entry.errors?.length) && (
                <Alert severity="warning">
                  {t(
                    "words.derivativePreviewPartial",
                    "Some words could not be analyzed. You can still continue with the available results.",
                  )}
                </Alert>
              )}

              {entries.map((entry) => (
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
                    </Stack>

                    {entry.label ? (
                      <Typography variant="caption" color="text.secondary">
                        {entry.label}
                      </Typography>
                    ) : null}

                    {entry.candidates.length > 0 ? (
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
                                <Stack
                                  direction="row"
                                  spacing={1}
                                  alignItems="center"
                                >
                                  <Typography fontWeight={500}>
                                    {candidate.word}
                                  </Typography>
                                  <Chip
                                    label={candidate.source}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Stack>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {candidate.meaning}
                                </Typography>
                                {candidate.attribution && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {candidate.attribution}
                                  </Typography>
                                )}
                              </Stack>
                            }
                            sx={{ alignItems: "flex-start", m: 0 }}
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {t(
                            "words.derivativePreviewEmptyRow",
                            "No adjective derivatives were found for this word.",
                          )}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              ))}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading || saving}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(selectionMap)}
          disabled={loading || saving || totalCandidateCount === 0}
        >
          {saving ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            t("common.confirm")
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
