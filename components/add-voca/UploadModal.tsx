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
  parseCsvFile,
  type ParseResult,
  type SchemaType,
} from "@/lib/utils/csvParser";
import type { CourseId } from "@/types/course";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  /** file is passed back for CSV Storage backup (FR-6); absent for URL-sourced items */
  onConfirm: (dayName: string, data: ParseResult, file?: File) => void;
  initialDayName?: string;
  initialData?: ParseResult | null;
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

function filenameMatchesCourse(filename: string, courseLabel: string): boolean {
  const lower = filename.toLowerCase();
  const tokens = courseLabel.split(/[\s/]+/).filter((t) => t.length > 1);
  return tokens.some((token) => lower.includes(token.toLowerCase()));
}

export default function UploadModal({
  open,
  onClose,
  onConfirm,
  initialDayName = "",
  initialData = null,
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

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setFilenameMismatch(
          !!courseLabel && !filenameMatchesCourse(file.name, courseLabel),
        );
        setSelectedFile(file);
        const result = await parseCsvFile(file, {
          schemaType,
          courseId,
        });
        console.log("[UploadModal] parsed words:", result.words);
        setParseResult(result);
      }
    },
    [schemaType, courseId, courseLabel],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/tab-separated-values": [".tsv"] },
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

    onConfirm(effectiveDayName, parseResult, selectedFile ?? undefined);
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
  };

  const getBlockingErrorMessage = (code?: ParseResult["blockingError"]) => {
    if (!code) return "";
    if (code === "HEADER_REQUIRED")
      return t("addVoca.validationHeaderRequired");
    if (code === "HEADER_MISMATCH")
      return t("addVoca.validationHeaderMismatch");
    return t("addVoca.validationCrossHeaderRow");
  };

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
                              {String(
                                (word as Record<string, unknown>)[col] ?? "",
                              )}
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
