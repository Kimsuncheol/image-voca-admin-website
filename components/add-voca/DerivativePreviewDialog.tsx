"use client";

import { useMemo, useState } from "react";
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

import { derivativeDialogContentScrollbarSx } from "@/components/derivatives/dialogContentScrollbarSx";
import { useTransientScrollbarVisibility } from "@/components/derivatives/useTransientScrollbarVisibility";
import { normalizeVocabularyWord } from "@/lib/word-derivation/shared";
import type { DerivativePreviewItemResult } from "@/types/vocabulary";
import type { DerivativeSelectionMap } from "@/services/vocaSaveService";

interface DerivativePreviewDialogProps {
  open: boolean;
  loading: boolean;
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

export default function DerivativePreviewDialog({
  open,
  loading,
  items,
  error,
  onClose,
  onConfirm,
}: DerivativePreviewDialogProps) {
  const { t } = useTranslation();
  const [selectionMap, setSelectionMap] = useState<DerivativeSelectionMap>(() =>
    buildInitialSelectionMap(items),
  );
  const { isScrollbarVisible, handleScroll } =
    useTransientScrollbarVisibility(open && !loading);

  const totalCandidateCount = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          item.words.reduce(
            (wordSum, wordPreview) => wordSum + wordPreview.candidates.length,
            0,
          ),
        0,
      ),
    [items],
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
      onClose={loading ? undefined : onClose}
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
        {t(
          "addVoca.derivativePreviewTitle",
          "Confirm adjective derivatives",
        )}
      </DialogTitle>
      <DialogContent
        data-testid="add-voca-derivative-preview-dialog-content"
        data-scrollbar-active={isScrollbarVisible ? "true" : "false"}
        onScroll={handleScroll}
        sx={[
          derivativeDialogContentScrollbarSx,
          { pt: "12px !important" },
        ]}
      >
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
                  "addVoca.derivativePreviewLoading",
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
                    "addVoca.derivativePreviewEmpty",
                    "No adjective derivatives were found. The original words will be uploaded as usual.",
                  )}
                </Alert>
              )}
              {items.some(
                (item) =>
                  item.errors?.length ||
                  item.words.some((word) => word.errors?.length),
              ) && (
                <Alert severity="warning">
                  {t(
                    "addVoca.derivativePreviewPartial",
                    "Some words could not be analyzed. You can still continue with the available results.",
                  )}
                </Alert>
              )}

              {items.map((item) => {
                const wordsWithCandidates = item.words.filter(
                  (wordPreview) => wordPreview.candidates.length > 0,
                );

                if (wordsWithCandidates.length === 0) return null;

                return (
                  <Paper
                    key={item.itemId}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2.5 }}
                  >
                    <Stack spacing={2}>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                      >
                        <Typography variant="subtitle2" fontWeight={600}>
                          {item.dayName}
                        </Typography>
                        <Chip
                          size="small"
                          label={t("addVoca.derivativePreviewCount", {
                            count: wordsWithCandidates.reduce(
                              (sum, wordPreview) =>
                                sum + wordPreview.candidates.length,
                              0,
                            ),
                            defaultValue: "{{count}} candidates",
                          })}
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>

                      {wordsWithCandidates.map((wordPreview) => (
                        <Box
                          key={`${item.itemId}-${wordPreview.baseWord}`}
                          sx={{
                            borderTop: "1px solid",
                            borderColor: "divider",
                            pt: 1.5,
                          }}
                        >
                          <Stack spacing={1}>
                            <Stack
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              alignItems={{ xs: "flex-start", sm: "center" }}
                            >
                              <Chip
                                label={t(
                                  "addVoca.derivativePreviewOriginal",
                                  "Original",
                                )}
                                size="small"
                                color="default"
                              />
                              <Typography fontWeight={600}>
                                {wordPreview.baseWord}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {wordPreview.baseMeaning}
                              </Typography>
                            </Stack>

                            <Stack spacing={0.5}>
                              {wordPreview.candidates.map((candidate) => (
                                <FormControlLabel
                                  key={`${wordPreview.baseWord}-${candidate.word}`}
                                  control={
                                    <Checkbox
                                      checked={
                                        selectionMap[item.itemId]?.[
                                          normalizeVocabularyWord(
                                            wordPreview.baseWord,
                                          )
                                        ]?.[
                                          normalizeVocabularyWord(candidate.word)
                                        ] ?? false
                                      }
                                      onChange={() =>
                                        toggleCandidate(
                                          item.itemId,
                                          wordPreview.baseWord,
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
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                );
              })}
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(selectionMap)}
          disabled={loading || !!error}
        >
          {t("common.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
