"use client";

import { FormEvent, KeyboardEvent, MouseEvent, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import { useTranslation } from "react-i18next";

import { VocabularyEntry } from "./VocabularyResultCard";

type VocabularyBatchResult = {
  original_text: string;
  status: string;
  entry: VocabularyEntry | null;
  error: string | null;
};

type VocabularyBatchLookupResponse = {
  original_texts: string[];
  results: VocabularyBatchResult[];
};

type TableColumnKey = "word" | "reading" | "romanized" | "meanings";

type TableCellCoords = {
  row: number;
  col: number;
};

type TableSelectionRange = {
  start: TableCellCoords;
  end: TableCellCoords;
};

const TABLE_COLUMNS: TableColumnKey[] = ["word", "reading", "romanized", "meanings"];

function normalizeSelectionRange(
  start: TableCellCoords,
  end: TableCellCoords,
): TableSelectionRange {
  return {
    start: {
      row: Math.min(start.row, end.row),
      col: Math.min(start.col, end.col),
    },
    end: {
      row: Math.max(start.row, end.row),
      col: Math.max(start.col, end.col),
    },
  };
}

function isCellInRange(cell: TableCellCoords, range: TableSelectionRange) {
  return (
    cell.row >= range.start.row &&
    cell.row <= range.end.row &&
    cell.col >= range.start.col &&
    cell.col <= range.end.col
  );
}

export default function VocabularyBatchLookup({
  apiPath,
  submitLabel,
  loadingLabel,
  resetLabel,
  inputLabel,
  inputHelpText,
  inputRequiredMsg,
  networkErrorMsg,
  resultTitle,
  wordLabel,
  readingLabel,
  romanizedLabel,
  meaningsLabel,
  commonLabel,
  uncommonLabel,
  originalTextLabel,
  notFoundTitle,
  invalidInputTitle,
  errorTitle,
  unknownErrorMsg,
  standbyTitle,
  standbyDescription,
}: {
  apiPath: string;
  submitLabel: string;
  loadingLabel: string;
  resetLabel: string;
  inputLabel: string;
  inputHelpText: string;
  inputRequiredMsg: string;
  networkErrorMsg: string;
  resultTitle: string;
  wordLabel: string;
  readingLabel: string;
  romanizedLabel: string;
  meaningsLabel: string;
  partOfSpeechLabel: string;
  commonLabel: string;
  uncommonLabel: string;
  originalTextLabel: string;
  notFoundTitle: string;
  invalidInputTitle: string;
  errorTitle: string;
  unknownErrorMsg: string;
  standbyTitle: string;
  standbyDescription: string;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [results, setResults] = useState<VocabularyBatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectionRanges, setSelectionRanges] = useState<TableSelectionRange[]>([]);
  const [selectionAnchor, setSelectionAnchor] = useState<TableCellCoords | null>(null);
  const [dragState, setDragState] = useState<{
    start: TableCellCoords;
    current: TableCellCoords;
    additive: boolean;
  } | null>(null);
  const dragStateRef = useRef<typeof dragState>(null);
  const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; success: boolean }>({
    open: false,
    success: true,
  });

  function commitDragSelection(currentDragState = dragStateRef.current) {
    if (!currentDragState) {
      return;
    }

    const committedRange = normalizeSelectionRange(
      currentDragState.start,
      currentDragState.current,
    );

    setSelectionRanges((currentRanges) =>
      currentDragState.additive ? [...currentRanges, committedRange] : [committedRange],
    );
    setSelectionAnchor(currentDragState.start);
    dragStateRef.current = null;
    setDragState(null);
  }

  useEffect(() => {
    if (!dragState) {
      return;
    }

    function handleWindowMouseUp() {
      commitDragSelection();
    }

    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [dragState]);

  function parseTexts(value: string) {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function clearSelection() {
    setSelectionRanges([]);
    setSelectionAnchor(null);
    dragStateRef.current = null;
    setDragState(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const texts = parseTexts(input);

    if (texts.length === 0) {
      setError(inputRequiredMsg);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    clearSelection();

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });

      const data = (await response.json()) as VocabularyBatchLookupResponse;

      if (!response.ok) {
        setError(networkErrorMsg);
        return;
      }

      setResults(data.results);
    } catch {
      setError(networkErrorMsg);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setInput("");
    setResults([]);
    setError("");
    clearSelection();
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopySnackbar({ open: true, success: true });
    } catch {
      setCopySnackbar({ open: true, success: false });
    }
  }

  function getCellValue(entry: VocabularyEntry, columnKey: TableColumnKey) {
    if (columnKey === "word") {
      return entry.word ?? "";
    }

    if (columnKey === "reading") {
      return entry.reading ?? "";
    }

    if (columnKey === "romanized") {
      return entry.romanized ?? "";
    }

    return entry.meanings.join("\n");
  }

  function serializeSelectionRanges(
    ranges: TableSelectionRange[],
    successResults: Array<VocabularyBatchResult & { entry: VocabularyEntry }>,
  ) {
    return ranges
      .map((range) => {
        const rows: string[] = [];

        for (let rowIndex = range.start.row; rowIndex <= range.end.row; rowIndex += 1) {
          const row = successResults[rowIndex];
          const values: string[] = [];

          for (let columnIndex = range.start.col; columnIndex <= range.end.col; columnIndex += 1) {
            values.push(getCellValue(row.entry, TABLE_COLUMNS[columnIndex]));
          }

          rows.push(values.join("\t"));
        }

        return rows.join("\n");
      })
      .join("\n\n");
  }

  function handleCellMouseDown(
    cell: TableCellCoords,
    event: MouseEvent<HTMLTableCellElement>,
  ) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.currentTarget.focus();

    const additive = event.metaKey || event.ctrlKey;
    const startCell = event.shiftKey && selectionAnchor ? selectionAnchor : cell;
    const nextDragState = {
      start: startCell,
      current: cell,
      additive,
    };

    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  function handleCellMouseEnter(cell: TableCellCoords) {
    const currentDragState = dragStateRef.current;

    if (!currentDragState) {
      return;
    }

    const nextDragState = {
      ...currentDragState,
      current: cell,
    };

    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  function handleCellMouseUp() {
    commitDragSelection();
  }

  function renderNonSuccessResultItem(result: VocabularyBatchResult, index: number) {
    const label = result.original_text.trim() || "—";

    let severity: "info" | "warning" | "error" = "info";
    let message = notFoundTitle;

    if (result.status === "invalid_input") {
      severity = "warning";
      message = invalidInputTitle;
    } else if (result.status !== "ok") {
      severity = "error";
      message = result.error || unknownErrorMsg;
    }

    return (
      <Card key={`${result.original_text}-${index}`} variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                {originalTextLabel}
              </Typography>
              <Typography variant="body2">{label}</Typography>
            </Stack>

            <Alert severity={severity}>
              <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  {severity === "error" ? errorTitle : message}
                </Typography>
                {severity === "error" ? (
                  <Typography variant="body2">{message}</Typography>
                ) : null}
              </Stack>
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  function renderSuccessTable() {
    const successResults = results.filter(
      (result): result is VocabularyBatchResult & { entry: VocabularyEntry } =>
        result.status === "ok" && result.entry !== null,
    );

    if (successResults.length === 0) {
      return null;
    }

    const originalTextNotes = successResults.filter((result) => {
      const original = result.original_text.trim();
      const word = result.entry.word?.trim() ?? "";
      return original && word && original !== word;
    });
    const displayedRanges = dragState
      ? [
          ...(dragState.additive ? selectionRanges : []),
          normalizeSelectionRange(dragState.start, dragState.current),
        ]
      : selectionRanges;

    function isSelected(rowIndex: number, columnIndex: number) {
      return displayedRanges.some((range) =>
        isCellInRange({ row: rowIndex, col: columnIndex }, range),
      );
    }

    function handleSelectionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        if (selectionRanges.length === 0) {
          return;
        }

        event.preventDefault();
        void handleCopy(serializeSelectionRanges(selectionRanges, successResults));
      }
    }

    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              {resultTitle}
            </Typography>

            <TableContainer
              onKeyDown={handleSelectionKeyDown}
              sx={{
                userSelect: dragState ? "none" : "auto",
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{wordLabel}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{readingLabel}</TableCell>
                    <TableCell>{romanizedLabel}</TableCell>
                    <TableCell>{meaningsLabel}</TableCell>
                    {/* <TableCell>part of speech</TableCell> */}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {successResults.map((result, rowIndex) => (
                    <TableRow key={`${result.original_text}-${rowIndex}`}>
                      <TableCell
                        tabIndex={0}
                        aria-selected={isSelected(rowIndex, 0) || undefined}
                        data-testid={`vocabulary-batch-cell-${rowIndex}-word`}
                        onMouseDown={(event) =>
                          handleCellMouseDown({ row: rowIndex, col: 0 }, event)
                        }
                        onMouseOver={() => handleCellMouseEnter({ row: rowIndex, col: 0 })}
                        onMouseUp={handleCellMouseUp}
                        sx={{
                          cursor: "cell",
                          userSelect: "none",
                          backgroundColor: isSelected(rowIndex, 0) ? "action.selected" : "inherit",
                          boxShadow: isSelected(rowIndex, 0)
                            ? (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`
                            : "none",
                          "&:focus-visible": {
                            outline: "2px solid",
                            outlineColor: "primary.main",
                            outlineOffset: -2,
                          },
                        }}
                      >
                        <Stack spacing={0.5}>
                          <Typography>{result.entry.word}</Typography>
                          <Chip
                            size="small"
                            color={result.entry.is_common ? "success" : "default"}
                            label={result.entry.is_common ? commonLabel : uncommonLabel}
                            sx={{ alignSelf: "flex-start" }}
                          />
                        </Stack>
                      </TableCell>

                      <TableCell
                        tabIndex={0}
                        aria-selected={isSelected(rowIndex, 1) || undefined}
                        data-testid={`vocabulary-batch-cell-${rowIndex}-reading`}
                        onMouseDown={(event) =>
                          handleCellMouseDown({ row: rowIndex, col: 1 }, event)
                        }
                        onMouseOver={() => handleCellMouseEnter({ row: rowIndex, col: 1 })}
                        onMouseUp={handleCellMouseUp}
                        sx={{
                          whiteSpace: "nowrap",
                          cursor: "cell",
                          userSelect: "none",
                          backgroundColor: isSelected(rowIndex, 1) ? "action.selected" : "inherit",
                          boxShadow: isSelected(rowIndex, 1)
                            ? (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`
                            : "none",
                          "&:focus-visible": {
                            outline: "2px solid",
                            outlineColor: "primary.main",
                            outlineOffset: -2,
                          },
                        }}
                      >
                        <Typography sx={{ whiteSpace: "nowrap" }}>
                          {result.entry.reading}
                        </Typography>
                      </TableCell>

                      <TableCell
                        tabIndex={0}
                        aria-selected={isSelected(rowIndex, 2) || undefined}
                        data-testid={`vocabulary-batch-cell-${rowIndex}-romanized`}
                        onMouseDown={(event) =>
                          handleCellMouseDown({ row: rowIndex, col: 2 }, event)
                        }
                        onMouseOver={() => handleCellMouseEnter({ row: rowIndex, col: 2 })}
                        onMouseUp={handleCellMouseUp}
                        sx={{
                          cursor: "cell",
                          userSelect: "none",
                          backgroundColor: isSelected(rowIndex, 2) ? "action.selected" : "inherit",
                          boxShadow: isSelected(rowIndex, 2)
                            ? (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`
                            : "none",
                          "&:focus-visible": {
                            outline: "2px solid",
                            outlineColor: "primary.main",
                            outlineOffset: -2,
                          },
                        }}
                      >
                        <Typography>{result.entry.romanized}</Typography>
                      </TableCell>

                      <TableCell
                        tabIndex={0}
                        aria-selected={isSelected(rowIndex, 3) || undefined}
                        data-testid={`vocabulary-batch-cell-${rowIndex}-meanings`}
                        onMouseDown={(event) =>
                          handleCellMouseDown({ row: rowIndex, col: 3 }, event)
                        }
                        onMouseOver={() => handleCellMouseEnter({ row: rowIndex, col: 3 })}
                        onMouseUp={handleCellMouseUp}
                        sx={{
                          cursor: "cell",
                          userSelect: "none",
                          backgroundColor: isSelected(rowIndex, 3) ? "action.selected" : "inherit",
                          boxShadow: isSelected(rowIndex, 3)
                            ? (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`
                            : "none",
                          "&:focus-visible": {
                            outline: "2px solid",
                            outlineColor: "primary.main",
                            outlineOffset: -2,
                          },
                        }}
                      >
                        <Stack spacing={0.5}>
                          {result.entry.meanings.map((meaning, meaningIndex) => (
                            <Typography key={`${meaning}-${meaningIndex}`}>{meaning}</Typography>
                          ))}
                        </Stack>
                      </TableCell>

                      {/* <TableCell>
                        {renderCellContent({
                          cellId: `part-of-speech-${rowIndex}`,
                          copyValue: result.entry.part_of_speech.join(", "),
                          children: (
                            <Stack spacing={0.75} alignItems="flex-start">
                              {result.entry.part_of_speech.map((value, partIndex) => (
                                <Chip
                                  key={`${value}-${partIndex}`}
                                  size="small"
                                  variant="outlined"
                                  label={value}
                                  data-testid={`vocabulary-batch-part-of-speech-${rowIndex}-${partIndex}`}
                                />
                              ))}
                            </Stack>
                          ),
                        })}
                      </TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {originalTextNotes.length > 0 ? (
              <Stack spacing={0.5}>
                {originalTextNotes.map((result, index) => (
                  <Typography
                    key={`${result.original_text}-${index}-original`}
                    variant="caption"
                    color="text.secondary"
                  >
                    {originalTextLabel}: {result.original_text} {"->"} {result.entry.word}
                  </Typography>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
        <Stack spacing={2} sx={{ flex: 1, width: "100%" }}>
          <TextField
            label={inputLabel}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            multiline
            minRows={6}
            fullWidth
            helperText={inputHelpText}
          />

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? loadingLabel : submitLabel}
            </Button>
            <Button type="button" variant="outlined" onClick={handleReset} disabled={loading}>
              {resetLabel}
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>

        <Stack spacing={2} sx={{ flex: 1, width: "100%" }}>
          {results.length === 0 ? (
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                minHeight: 250,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.default",
              }}
            >
              <CardContent>
                <Stack spacing={1.5} alignItems="center" color="text.secondary">
                  <SearchIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                  <Typography variant="subtitle1" fontWeight={600} align="center">
                    {standbyTitle}
                  </Typography>
                  <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                    {standbyDescription}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <>
              {renderSuccessTable()}
              {results
                .filter((result) => result.status !== "ok" || result.entry === null)
                .map((result, index) => renderNonSuccessResultItem(result, index))}
            </>
          )}
        </Stack>
      </Stack>

      <Snackbar
        open={copySnackbar.open}
        autoHideDuration={1500}
        onClose={() => setCopySnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={copySnackbar.success ? "success" : "error"}
          onClose={() => setCopySnackbar((prev) => ({ ...prev, open: false }))}
        >
          {copySnackbar.success ? t("common.copied") : t("common.copyFailed")}
        </Alert>
      </Snackbar>
    </Box>
  );
}
