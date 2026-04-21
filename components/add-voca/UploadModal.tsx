"use client";

import { useState, useCallback } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import InputAdornment from "@mui/material/InputAdornment";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import {
  parseUploadFile,
  type ParseResult,
  type SchemaType,
} from "@/lib/utils/csvParser";
import {
  JLPT_COUNTER_OPTIONS,
  type CourseId,
  type JlptCounterOptionId,
} from "@/types/course";
import { isKanjiNestedListGroup } from "@/lib/kanjiNestedList";

export interface UploadModalConfirmPayload {
  dayName: string;
  data: ParseResult;
  file?: File;
  counterOptionId?: JlptCounterOptionId;
  counterOptionLabel?: string;
  targetCoursePath?: string;
}

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  /** file is passed back for CSV Storage backup (FR-6); absent for URL-sourced items */
  onConfirm: (payload: UploadModalConfirmPayload) => void;
  initialDayName?: string;
  initialData?: ParseResult | null;
  initialCounterOptionId?: JlptCounterOptionId;
  /** Derived from the selected course; overrides CSV header auto-detection. */
  schemaType?: SchemaType;
  /**
   * Day names already present in the queue (excluding the item being edited).
   * Used to detect duplicates before confirming.
   */
  existingDayNames?: string[];
  /**
   * When true, hides the day name input and auto-assigns a UUID.
   * Used for Famous Quote uploads which have no day concept.
   */
  hideDayInput?: boolean;
  /** Optional fixed target used when the day input is hidden. */
  hiddenDayName?: string;
  /** Selected course label used to validate the uploaded filename. */
  courseLabel?: string;
  courseId?: CourseId | "";
}

const dayFieldSx = {
  "& .MuiOutlinedInput-root": {
    height: 40,
    borderRadius: 2.5,
    backgroundColor: "background.default",
    "& fieldset": {
      borderColor: "divider",
    },
    "&:hover fieldset": {
      borderColor: "text.disabled",
    },
  },
};

const STANDARD_HEADERS_WITH_SYNONYM = [
  "word",
  "meaning",
  "pronunciation",
  "example",
  "translation",
  "synonym",
] as const;

const KANJI_PREVIEW_COLUMNS = [
  "kanji",
  "meaning",
  "meaningExample",
  "meaningExampleHurigana",
  "meaningEnglishTranslation",
  "meaningKoreanTranslation",
  "reading",
  "readingExample",
  "readingExampleHurigana",
  "readingEnglishTranslation",
  "readingKoreanTranslation",
  "example",
  "exampleEnglishTranslation",
  "exampleKoreanTranslation",
  "exampleHurigana",
] as const;

function formatPreviewValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (Array.isArray(item)) return item.join(", ");
        if (isKanjiNestedListGroup(item)) return item.items.join(", ");
        return String(item ?? "");
      })
      .join("\n");
  }
  return String(value ?? "");
}

function normalizeCounterFilenameToken(value: string): string {
  return value
    .replace(/\.[^./\\]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function detectJlptCounterOptionIdFromFilename(
  filename: string,
): JlptCounterOptionId | null {
  const normalizedFilename = normalizeCounterFilenameToken(filename);
  if (!normalizedFilename) return null;

  if (normalizedFilename === "counters_numbers") {
    return "numbers";
  }

  if (normalizedFilename.startsWith("counters_")) {
    const candidateOptionId = `counter_${normalizedFilename.slice("counters_".length)}`;
    const matchedOption = JLPT_COUNTER_OPTIONS.find(
      (option) => option.id === candidateOptionId,
    );

    if (matchedOption) {
      return matchedOption.id;
    }
  }

  const matchedOption = JLPT_COUNTER_OPTIONS.find(
    (option) => option.id === normalizedFilename,
  );

  return matchedOption?.id ?? null;
}

export function resolveJlptCounterOptionIdFromFilename(
  filename: string,
  currentSelectionId: JlptCounterOptionId | "" = "",
): JlptCounterOptionId | "" {
  return detectJlptCounterOptionIdFromFilename(filename) ?? currentSelectionId;
}

export function extractDayFromFilename(filename: string): number | null {
  const offset = filename.startsWith("CSAT2 - ") ? 50 : 0;
  const match = filename.match(/[Dd][Aa][Yy](\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10) + offset;
}

function filenameMatchesCourse(filename: string, courseLabel: string): boolean {
  const lower = filename.toLowerCase();
  const tokens = courseLabel.split(/[\s/]+/).filter((t) => t.length > 1);
  return tokens.some((token) => lower.includes(token.toLowerCase()));
}

function isCsatOrToeicToeflIeltsHeaderMismatch(
  courseId: CourseId | "",
  parseResult: ParseResult | null,
): boolean {
  if (
    (courseId !== "CSAT" && courseId !== "TOEIC") ||
    parseResult?.blockingError !== "HEADER_MISMATCH"
  ) {
    return false;
  }

  const normalizedHeaders = parseResult.detectedHeaders.map((header) =>
    header.trim().toLowerCase(),
  );
  if (normalizedHeaders.length !== STANDARD_HEADERS_WITH_SYNONYM.length) {
    return false;
  }

  const headerSet = new Set(normalizedHeaders);
  if (headerSet.size !== STANDARD_HEADERS_WITH_SYNONYM.length) {
    return false;
  }

  return STANDARD_HEADERS_WITH_SYNONYM.every((header) => headerSet.has(header));
}

export default function UploadModal({
  open,
  onClose,
  onConfirm,
  initialDayName = "",
  initialData = null,
  initialCounterOptionId,
  schemaType,
  existingDayNames = [],
  hideDayInput = false,
  hiddenDayName,
  courseLabel,
  courseId,
}: UploadModalProps) {
  const { t } = useTranslation();
  const getHiddenDayName = useCallback(
    () => hiddenDayName || initialDayName || crypto.randomUUID(),
    [hiddenDayName, initialDayName],
  );
  const [dayName, setDayName] = useState(
    hideDayInput ? getHiddenDayName() : initialDayName,
  );
  const [parseResult, setParseResult] = useState<ParseResult | null>(
    initialData,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filenameMismatch, setFilenameMismatch] = useState(false);
  const [selectedCounterOptionId, setSelectedCounterOptionId] = useState<
    JlptCounterOptionId | ""
  >(initialCounterOptionId ?? "");
  const isJlptCounterCourse = courseId === "JLPT_COUNTER";

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setFilenameMismatch(
          !!courseLabel && !filenameMatchesCourse(file.name, courseLabel),
        );
        setSelectedFile(file);
        if (!hideDayInput) {
          const extracted = extractDayFromFilename(file.name);
          if (extracted !== null && extracted >= 1) {
            setDayName(`Day${extracted}`);
          }
        }
        if (isJlptCounterCourse) {
          setSelectedCounterOptionId((currentSelectionId) =>
            resolveJlptCounterOptionIdFromFilename(
              file.name,
              currentSelectionId,
            ),
          );
        }
        const result = await parseUploadFile(file, {
          schemaType,
          courseId,
        });
        console.log("[UploadModal] parsed words:", result.words);
        setParseResult(result);
      }
    },
    [schemaType, courseId, courseLabel, isJlptCounterCourse, hideDayInput],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/tab-separated-values": [".tsv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
  });

  const handleConfirm = () => {
    // When the day input is hidden, either use the fixed hidden target
    // (single-list uploads) or fall back to a UUID (flat uploads).
    const effectiveDayName = hideDayInput
      ? dayName || getHiddenDayName()
      : dayName;

    if (
      (!hideDayInput && !effectiveDayName) ||
      !parseResult ||
      parseResult.words.length === 0
    )
      return;

    // Duplicate check — ask before overwriting an existing queue item.
    if (existingDayNames.includes(effectiveDayName)) {
      if (
        !window.confirm(
          t(
            "addVoca.duplicateDayConfirm",
            `"${effectiveDayName}" is already in the queue. Replace it?`,
          ),
        )
      ) {
        return;
      }
    }

    const selectedCounterOption = JLPT_COUNTER_OPTIONS.find(
      (option) => option.id === selectedCounterOptionId,
    );

    onConfirm({
      dayName: effectiveDayName,
      data: parseResult,
      file: selectedFile ?? undefined,
      counterOptionId: selectedCounterOption?.id,
      counterOptionLabel: selectedCounterOption?.label,
      targetCoursePath: selectedCounterOption?.path,
    });
    onClose();
  };

  // Guard close when words have already been parsed — ask before discarding.
  const handleClose = () => {
    if (parseResult && parseResult.words.length > 0) {
      if (
        !window.confirm(
          t("addVoca.discardConfirm", "Discard parsed data and close?"),
        )
      ) {
        return;
      }
    }
    onClose();
  };

  const handleReset = () => {
    setDayName(
      hideDayInput ? getHiddenDayName() : initialDayName,
    );
    setParseResult(initialData ?? null);
    setSelectedFile(null);
    setFilenameMismatch(false);
    setSelectedCounterOptionId(initialCounterOptionId ?? "");
  };

  const getBlockingErrorMessage = (code?: ParseResult["blockingError"]) => {
    if (!code) return "";
    if (code === "HEADER_REQUIRED")
      return t("addVoca.validationHeaderRequired");
    if (code === "HEADER_MISMATCH")
      return t("addVoca.validationHeaderMismatch");
    return t("addVoca.validationCrossHeaderRow");
  };

  const showToeflIeltsSynonymHint = isCsatOrToeicToeflIeltsHeaderMismatch(
    courseId ?? "",
    parseResult,
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        },
      }}
      TransitionProps={{ onExited: handleReset }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>
        {t("addVoca.csvUpload")}
      </DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Stack spacing={2}>
          {!hideDayInput && (
            <TextField
              label={t("addVoca.day")}
              value={dayName.replace(/^Day/i, "")}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "");
                const num = digits ? parseInt(digits, 10) : 0;
                setDayName(num >= 1 ? `Day${num}` : "");
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">Day</InputAdornment>
                ),
              }}
              fullWidth
              placeholder="1"
              sx={dayFieldSx}
            />
          )}

          {isJlptCounterCourse && (
            <TextField
              select
              fullWidth
              label={t("addVoca.counterOption", "Counter target")}
              value={selectedCounterOptionId}
              onChange={(event) =>
                setSelectedCounterOptionId(
                  event.target.value as JlptCounterOptionId | "",
                )
              }
              SelectProps={{ native: true }}
              sx={dayFieldSx}
            >
              <option value="" />
              {JLPT_COUNTER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </TextField>
          )}

          <Box
            {...getRootProps()}
            sx={{
              border: "1px dashed",
              borderColor: isDragActive ? "primary.main" : "divider",
              borderRadius: 2.5,
              p: { xs: 3, sm: 4 },
              textAlign: "center",
              cursor: "pointer",
              bgcolor: isDragActive ? "action.hover" : "background.default",
              transition:
                "background-color 120ms ease, border-color 120ms ease",
            }}
          >
            <input {...getInputProps()} />
            <CloudUploadIcon
              sx={{ fontSize: 42, color: "text.secondary", mb: 1 }}
            />
            <Typography color="text.secondary" variant="body2">
              {selectedFile ? selectedFile.name : t("addVoca.dropzone")}
            </Typography>
          </Box>

          {filenameMismatch && (
            <Alert severity="warning">
              <Typography variant="body2">
                {t("addVoca.filenameMismatch", { courseLabel })}
              </Typography>
            </Alert>
          )}

          {parseResult?.blockingError ? (
            <Alert severity="error">
              <Typography variant="body2">
                {getBlockingErrorMessage(parseResult.blockingError)}
              </Typography>
              {showToeflIeltsSynonymHint && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {t(
                    "addVoca.validationToeflIeltsSynonymMismatch",
                    "This file appears to use the TOEFL/IELTS format because it includes a synonym column. The synonym column is supported for TOEFL/IELTS, but not for CSAT or TOEIC.",
                  )}
                </Typography>
              )}
              {parseResult.expectedHeaders &&
                parseResult.expectedHeaders.length > 0 && (
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {t("addVoca.expectedKeys", {
                      keys: parseResult.expectedHeaders.join(", "),
                    })}
                  </Typography>
                )}
              {parseResult.detectedHeaders.length > 0 && (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {t("addVoca.detectedKeys", {
                    keys: parseResult.detectedHeaders.join(", "),
                  })}
                </Typography>
              )}
            </Alert>
          ) : parseResult?.errors.length ? (
            <Alert severity="warning">
              {parseResult.detectedHeaders.length > 0 && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Detected columns:</strong>{" "}
                  {parseResult.detectedHeaders.join(", ")}
                </Typography>
              )}
              {parseResult.errors.slice(0, 5).map((err, i) => (
                <Typography key={i} variant="body2">
                  {err}
                </Typography>
              ))}
            </Alert>
          ) : null}

          {parseResult &&
            parseResult.words.length > 0 &&
            (() => {
              const resolvedSchema = schemaType ?? parseResult.schemaType;
              const columns: string[] =
                resolvedSchema === "collocation"
                  ? [
                      "collocation",
                      "meaning",
                      "explanation",
                      "example",
                      "translation",
                    ]
                  : resolvedSchema === "jlpt"
                    ? [
                        "word",
                        "meaningEnglish",
                        "meaningKorean",
                        "pronunciation",
                        "example",
                        "exampleHurigana",
                        "translationEnglish",
                        "translationKorean",
                        "imageUrl",
                      ]
                  : resolvedSchema === "prefix"
                    ? [
                        "prefix",
                        "meaningEnglish",
                        "meaningKorean",
                        "pronunciation",
                        "example",
                        "translationEnglish",
                        "translationKorean",
                      ]
                  : resolvedSchema === "postfix"
                    ? [
                        "postfix",
                        "meaningEnglish",
                        "meaningKorean",
                        "pronunciation",
                        "example",
                        "translationEnglish",
                        "translationKorean",
                      ]
                  : resolvedSchema === "famousQuote"
                    ? ["quote", "author", "translation"]
                  : resolvedSchema === "kanji"
                    ? [...KANJI_PREVIEW_COLUMNS]
                  : resolvedSchema === "extremelyAdvanced"
                    ? ["word", "meaning", "example", "translation", "imageUrl"]
                    : courseId === "TOEFL_IELTS"
                      ? [
                          "word",
                          "meaning",
                          "synonym",
                          "pronunciation",
                          "example",
                          "translation",
                        ]
                    : [
                        "word",
                        "meaning",
                        "pronunciation",
                        "example",
                        "translation",
                      ];
              return (
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    maxHeight: 300,
                    borderRadius: 2,
                    borderColor: "divider",
                    scrollbarWidth: "none",
                    "&::-webkit-scrollbar": { display: "none" },
                  }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {columns.map((col) => (
                          <TableCell key={col}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {parseResult.words.slice(0, 10).map((word, i) => (
                        <TableRow key={i}>
                          {columns.map((col) => (
                            <TableCell key={col}>
                              {formatPreviewValue((word as Record<string, unknown>)[col])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {parseResult.words.length > 10 && (
                    <Typography
                      variant="caption"
                      sx={{ p: 1, display: "block" }}
                    >
                      ...and {parseResult.words.length - 10} more rows
                    </Typography>
                  )}
                </TableContainer>
              );
            })()}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1.5 }}>
        <Button onClick={handleClose} sx={{ borderRadius: 2 }}>
          {t("common.cancel")}
        </Button>
        {parseResult?.blockingError && (
          <Button
            onClick={handleReset}
            color="warning"
            sx={{ borderRadius: 2 }}
          >
            {t("common.retry", "Retry")}
          </Button>
        )}
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={
            (!hideDayInput && !dayName) ||
            (isJlptCounterCourse && !selectedCounterOptionId) ||
            !parseResult ||
            parseResult.words.length === 0 ||
            filenameMismatch
          }
          sx={{ borderRadius: 2 }}
        >
          {t("common.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
