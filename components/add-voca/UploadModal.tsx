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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import { parseCsvFile, type ParseResult } from "@/lib/utils/csvParser";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  /** file is passed back for CSV Storage backup (FR-6); absent for URL-sourced items */
  onConfirm: (dayName: string, data: ParseResult, file?: File) => void;
  initialDayName?: string;
  initialData?: ParseResult | null;
  /** Derived from the selected course; overrides CSV header auto-detection. */
  isCollocation?: boolean;
}

export default function UploadModal({
  open,
  onClose,
  onConfirm,
  initialDayName = "",
  initialData = null,
  isCollocation,
}: UploadModalProps) {
  const { t } = useTranslation();
  const [dayName, setDayName] = useState(initialDayName);
  const [parseResult, setParseResult] = useState<ParseResult | null>(
    initialData,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      const result = await parseCsvFile(file, isCollocation);
      setParseResult(result);
    }
  }, [isCollocation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/tab-separated-values": [".tsv"] },
    multiple: false,
  });

  const handleConfirm = () => {
    if (dayName && parseResult && parseResult.words.length > 0) {
      onConfirm(dayName, parseResult, selectedFile ?? undefined);
      onClose();
    }
  };

  const handleReset = () => {
    setDayName(initialDayName);
    setParseResult(initialData ?? null);
    setSelectedFile(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionProps={{ onExited: handleReset }}
    >
      <DialogTitle>{t("addVoca.csvUpload")}</DialogTitle>
      <DialogContent>
        <TextField
          label={t("addVoca.day")}
          value={dayName}
          onChange={(e) => setDayName(e.target.value)}
          fullWidth
          margin="normal"
          placeholder="Day 1"
        />

        <Box
          {...getRootProps()}
          sx={{
            border: "2px dashed",
            borderColor: isDragActive ? "primary.main" : "divider",
            borderRadius: 2,
            p: 4,
            textAlign: "center",
            cursor: "pointer",
            bgcolor: isDragActive ? "action.hover" : "transparent",
            mt: 2,
            mb: 2,
          }}
        >
          <input {...getInputProps()} />
          <CloudUploadIcon
            sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
          />
          <Typography color="text.secondary">
            {selectedFile ? selectedFile.name : t("addVoca.dropzone")}
          </Typography>
        </Box>

        {parseResult?.errors.length ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
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

        {parseResult && parseResult.words.length > 0 && (() => {
          const columns: string[] = (isCollocation ?? parseResult.isCollocation)
            ? ["collocation", "meaning", "explanation", "example", "translation"]
            : ["word", "meaning", "pronunciation", "example", "translation"];
          return (
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
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
                          {String((word as Record<string, unknown>)[col] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parseResult.words.length > 10 && (
                <Typography variant="caption" sx={{ p: 1, display: "block" }}>
                  ...and {parseResult.words.length - 10} more rows
                </Typography>
              )}
            </TableContainer>
          );
        })()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!dayName || !parseResult || parseResult.words.length === 0}
        >
          {t("common.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
