"use client";

import { FormEvent, KeyboardEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
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
import ExtractIcon from "@mui/icons-material/AutoAwesome";
import { useTranslation } from "react-i18next";

import {
  findSpreadsheetBoundary,
  focusSpreadsheetCell,
  getArrowDirection,
  isEditableEventTarget,
  isPlatformJumpModifier,
  moveCell,
  type CellCoord,
  type SpreadsheetGrid,
} from "@/lib/utils/spreadsheetNavigation";

type VocabEntry = {
  word: string;
  meaning_english: string;
  meaning_korean: string;
  pronunciation: string;
  example: string;
  translation_english: string;
  translation_korean: string;
  example_hiragana: string;
};

type VocabExtractResponse = {
  results: VocabEntry[];
};

type MeaningLanguage = "korean" | "english";

type TableColumnKey =
  | "word"
  | "meaning_english"
  | "meaning_korean"
  | "pronunciation"
  | "example"
  | "translation_english"
  | "translation_korean"
  | "example_hiragana";

const TABLE_COLUMNS: TableColumnKey[] = [
  "word",
  "meaning_english",
  "meaning_korean",
  "pronunciation",
  "example",
  "translation_english",
  "translation_korean",
  "example_hiragana",
];

type TableCellCoords = CellCoord;

type TableSelectionRange = {
  start: TableCellCoords;
  end: TableCellCoords;
};

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

function clampToMaxLines(value: string, max: number): string {
  const lines = value.split("\n");
  let nonEmptyCount = 0;
  const result: string[] = [];
  for (const line of lines) {
    if (line.trim()) {
      nonEmptyCount += 1;
      if (nonEmptyCount > max) break;
    }
    result.push(line);
  }
  return result.join("\n");
}

function filterJapaneseExampleInput(value: string): string {
  return value.replace(/[a-zA-Z\uAC00-\uD7A3\u3131-\u314E\u314F-\u3163]/g, "");
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function VocabExtractForm({
  submitLabel,
  loadingLabel,
  resetLabel,
  exampleLabel,
  exampleHelpText,
  exampleInvalidMsg,
  meaningLanguageLabel,
  meaningKoreanChipLabel,
  meaningEnglishChipLabel,
  meaningKoreanLabel,
  meaningKoreanHelpText,
  meaningEnglishInputLabel,
  meaningEnglishInputHelpText,
  meaningKoreanInvalidMsg,
  meaningEnglishInvalidMsg,
  inputRequiredMsg,
  lineMismatchMsg,
  tooManyPairsMsg,
  networkErrorMsg,
  standbyTitle,
  standbyDescription,
  resultTitle,
  wordLabel,
  meaningEnglishLabel,
  meaningKoreanResultLabel,
  pronunciationLabel,
  exampleResultLabel,
  translationEnglishLabel,
  translationKoreanLabel,
  exampleHiraganaLabel,
}: {
  submitLabel: string;
  loadingLabel: string;
  resetLabel: string;
  exampleLabel: string;
  exampleHelpText: string;
  exampleInvalidMsg: string;
  meaningLanguageLabel: string;
  meaningKoreanChipLabel: string;
  meaningEnglishChipLabel: string;
  meaningKoreanLabel: string;
  meaningKoreanHelpText: string;
  meaningEnglishInputLabel: string;
  meaningEnglishInputHelpText: string;
  meaningKoreanInvalidMsg: string;
  meaningEnglishInvalidMsg: string;
  inputRequiredMsg: string;
  lineMismatchMsg: string;
  tooManyPairsMsg: string;
  networkErrorMsg: string;
  standbyTitle: string;
  standbyDescription: string;
  resultTitle: string;
  wordLabel: string;
  meaningEnglishLabel: string;
  meaningKoreanResultLabel: string;
  pronunciationLabel: string;
  exampleResultLabel: string;
  translationEnglishLabel: string;
  translationKoreanLabel: string;
  exampleHiraganaLabel: string;
}) {
  const { t } = useTranslation();
  const [exampleInput, setExampleInput] = useState("");
  const [meaningLanguage, setMeaningLanguage] = useState<MeaningLanguage>("korean");
  const [meaningKoreanInput, setMeaningKoreanInput] = useState("");
  const [meaningEnglishInput, setMeaningEnglishInput] = useState("");
  const [results, setResults] = useState<VocabEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeCell, setActiveCell] = useState<TableCellCoords | null>(null);
  const [selectionRanges, setSelectionRanges] = useState<TableSelectionRange[]>([]);
  const [selectionAnchor, setSelectionAnchor] = useState<TableCellCoords | null>(null);
  const [dragState, setDragState] = useState<{
    start: TableCellCoords;
    current: TableCellCoords;
    additive: boolean;
  } | null>(null);
  const [exampleInputError, setExampleInputError] = useState(false);
  const [meaningKoreanInputError, setMeaningKoreanInputError] = useState(false);
  const [meaningEnglishInputError, setMeaningEnglishInputError] = useState(false);
  const exampleErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meaningKoreanErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const meaningEnglishErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<typeof dragState>(null);
  const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; success: boolean }>({
    open: false,
    success: true,
  });

  function commitDragSelection(currentDragState = dragStateRef.current) {
    if (!currentDragState) return;

    const committedRange = normalizeSelectionRange(
      currentDragState.start,
      currentDragState.current,
    );

    setSelectionRanges((prev) =>
      currentDragState.additive ? [...prev, committedRange] : [committedRange],
    );
    setSelectionAnchor(currentDragState.start);
    setActiveCell(currentDragState.current);
    dragStateRef.current = null;
    setDragState(null);
  }

  useEffect(() => {
    if (!dragState) return;

    function handleWindowMouseUp() {
      commitDragSelection();
    }

    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [dragState]);

  useEffect(() => {
    return () => {
      if (exampleErrorTimerRef.current) clearTimeout(exampleErrorTimerRef.current);
      if (meaningKoreanErrorTimerRef.current) clearTimeout(meaningKoreanErrorTimerRef.current);
      if (meaningEnglishErrorTimerRef.current) clearTimeout(meaningEnglishErrorTimerRef.current);
    };
  }, []);

  function clearSelection() {
    setActiveCell(null);
    setSelectionRanges([]);
    setSelectionAnchor(null);
    dragStateRef.current = null;
    setDragState(null);
  }

  function validate(
    exampleLines: string[],
    meaningKoreanLines: string[],
    meaningEnglishLines: string[],
  ): string | null {
    if (exampleLines.length === 0) return inputRequiredMsg;
    if (meaningLanguage === "korean") {
      if (meaningKoreanLines.length === 0) return inputRequiredMsg;
      if (exampleLines.length !== meaningKoreanLines.length) return lineMismatchMsg;
    }
    if (meaningLanguage === "english") {
      if (meaningEnglishLines.length === 0) return inputRequiredMsg;
      if (exampleLines.length !== meaningEnglishLines.length) return lineMismatchMsg;
    }
    if (exampleLines.length > 20) return tooManyPairsMsg;
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const exampleLines = parseLines(exampleInput);
    const meaningKoreanLines = parseLines(meaningKoreanInput);
    const meaningEnglishLines = parseLines(meaningEnglishInput);

    const msg = validate(exampleLines, meaningKoreanLines, meaningEnglishLines);
    if (msg) {
      setValidationError(msg);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    clearSelection();

    const pairs = exampleLines.map((example, i) => ({
      example,
      meaning_korean: meaningLanguage === "korean" ? meaningKoreanLines[i] : null,
      meaning_english: meaningLanguage === "english" ? meaningEnglishLines[i] : null,
    }));

    try {
      const response = await fetch("/api/text/vocab-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pairs }),
      });

      const data = (await response.json()) as VocabExtractResponse;

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
    setExampleInput("");
    setMeaningLanguage("korean");
    setMeaningKoreanInput("");
    setMeaningEnglishInput("");
    setResults([]);
    setError("");
    setValidationError(null);
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

  function getCellValue(entry: VocabEntry, columnKey: TableColumnKey): string {
    return entry[columnKey];
  }

  const exampleCount = useMemo(() => parseLines(exampleInput).length, [exampleInput]);
  const meaningKoreanCount = useMemo(() => parseLines(meaningKoreanInput).length, [meaningKoreanInput]);
  const meaningEnglishCount = useMemo(() => parseLines(meaningEnglishInput).length, [meaningEnglishInput]);
  const activeMeaningCount =
    meaningLanguage === "korean" ? meaningKoreanCount : meaningEnglishCount;

  function renderMeaningLanguageChips() {
    const options: Array<{ value: MeaningLanguage; label: string }> = [
      { value: "korean", label: meaningKoreanChipLabel },
      { value: "english", label: meaningEnglishChipLabel },
    ];

    return (
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        role="radiogroup"
        aria-label={meaningLanguageLabel}
      >
        {options.map((option) => {
          const selected = option.value === meaningLanguage;

          return (
            <Chip
              key={option.value}
              label={option.label}
              clickable
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setMeaningLanguage(option.value);
                setValidationError(null);
              }}
              sx={{
                borderRadius: 999,
                fontWeight: selected ? 600 : 500,
                px: 0.5,
                height: 36,
                bgcolor: selected ? undefined : "background.paper",
                borderColor: selected ? "primary.main" : "divider",
              }}
            />
          );
        })}
      </Stack>
    );
  }

  function renderMeaningTextField() {
    if (meaningLanguage === "korean") {
      return (
        <TextField
          label={meaningKoreanLabel}
          value={meaningKoreanInput}
          onChange={(e) => {
            const filtered = e.target.value.replace(/[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F]/g, "");
            if (filtered !== e.target.value) {
              if (meaningKoreanErrorTimerRef.current) clearTimeout(meaningKoreanErrorTimerRef.current);
              setMeaningKoreanInputError(true);
              meaningKoreanErrorTimerRef.current = setTimeout(() => setMeaningKoreanInputError(false), 2000);
            }
            setMeaningKoreanInput(clampToMaxLines(filtered, 20));
            setValidationError(null);
          }}
          multiline
          minRows={6}
          fullWidth
          error={meaningKoreanInputError}
          helperText={
            <Box component="span" sx={{ display: "flex", justifyContent: "space-between" }}>
              <span>{meaningKoreanInputError ? meaningKoreanInvalidMsg : meaningKoreanHelpText}</span>
              {activeMeaningCount > 0 && (
                <Box component="span" sx={{ color: activeMeaningCount > 20 ? "error.main" : undefined }}>
                  {activeMeaningCount} / 20
                </Box>
              )}
            </Box>
          }
        />
      );
    }

    return (
      <TextField
        label={meaningEnglishInputLabel}
        value={meaningEnglishInput}
        onChange={(e) => {
          const filtered = e.target.value.replace(/[\uAC00-\uD7A3\u3131-\u314E\u314F-\u3163\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F]/g, "");
          if (filtered !== e.target.value) {
            if (meaningEnglishErrorTimerRef.current) clearTimeout(meaningEnglishErrorTimerRef.current);
            setMeaningEnglishInputError(true);
            meaningEnglishErrorTimerRef.current = setTimeout(() => setMeaningEnglishInputError(false), 2000);
          }
          setMeaningEnglishInput(clampToMaxLines(filtered, 20));
          setValidationError(null);
        }}
        multiline
        minRows={6}
        fullWidth
        error={meaningEnglishInputError}
        helperText={
          <Box component="span" sx={{ display: "flex", justifyContent: "space-between" }}>
            <span>{meaningEnglishInputError ? meaningEnglishInvalidMsg : meaningEnglishInputHelpText}</span>
            {activeMeaningCount > 0 && (
              <Box component="span" sx={{ color: activeMeaningCount > 20 ? "error.main" : undefined }}>
                {activeMeaningCount} / 20
              </Box>
            )}
          </Box>
        }
      />
    );
  }

  const cellGrid = useMemo<SpreadsheetGrid>(
    () =>
      results.map((entry) =>
        TABLE_COLUMNS.map((columnKey) => getCellValue(entry, columnKey)),
      ),
    [results],
  );

  function preprocessCellValue(value: string): string {
    return value.replace(
      /([가-힣a-zA-Z])\s*(\([^)]*(?:의 겸손|humble)[^)]*\))/g,
      "$1\n$2",
    );
  }

  function renderCellContent(value: string) {
    const processed = preprocessCellValue(value);
    const lines = processed.split("\n").filter((line) => line.trim() !== "");
    if (lines.length <= 1) {
      return <Typography variant="body2">{processed}</Typography>;
    }
    const hasNumberedLines = lines.some((line) => /^\d+\./.test(line.trim()));
    return (
      <Stack spacing={0}>
        {lines.map((line, i) => {
          const isNumbered = /^\d+\./.test(line.trim());
          return (
            <Typography
              key={i}
              variant="body2"
              sx={
                isNumbered
                  ? { pl: "1.5em", textIndent: "-1.5em" }
                  : hasNumberedLines
                    ? { pl: "1em" }
                    : undefined
              }
            >
              {line}
            </Typography>
          );
        })}
      </Stack>
    );
  }

  function serializeSelectionRanges(ranges: TableSelectionRange[]) {
    return ranges
      .map((range) => {
        const rows: string[] = [];
        for (let rowIndex = range.start.row; rowIndex <= range.end.row; rowIndex += 1) {
          const entry = results[rowIndex];
          const values: string[] = [];
          for (
            let colIndex = range.start.col;
            colIndex <= range.end.col;
            colIndex += 1
          ) {
            values.push(getCellValue(entry, TABLE_COLUMNS[colIndex]));
          }
          rows.push(values.join("\t"));
        }
        return rows.join("\n");
      })
      .join("\n\n");
  }

  function handleCellMouseDown(cell: TableCellCoords, event: MouseEvent<HTMLTableCellElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    setActiveCell(cell);

    const additive = event.metaKey || event.ctrlKey;
    const startCell = event.shiftKey && selectionAnchor ? selectionAnchor : cell;
    const nextDragState = { start: startCell, current: cell, additive };

    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  function handleCellMouseEnter(cell: TableCellCoords) {
    const currentDragState = dragStateRef.current;
    if (!currentDragState) return;

    const nextDragState = { ...currentDragState, current: cell };
    dragStateRef.current = nextDragState;
    setDragState(nextDragState);
  }

  function handleCellMouseUp() {
    commitDragSelection();
  }

  function handleCellFocus(cell: TableCellCoords) {
    setActiveCell(cell);
    if (selectionRanges.length === 0) {
      setSelectionAnchor(cell);
      setSelectionRanges([normalizeSelectionRange(cell, cell)]);
    }
  }

  const columnLabels: Record<TableColumnKey, string> = {
    word: wordLabel,
    meaning_english: meaningEnglishLabel,
    meaning_korean: meaningKoreanResultLabel,
    pronunciation: pronunciationLabel,
    example: exampleResultLabel,
    translation_english: translationEnglishLabel,
    translation_korean: translationKoreanLabel,
    example_hiragana: exampleHiraganaLabel,
  };

  function renderResultsTable() {
    if (results.length === 0) return null;

    const displayedRanges = dragState
      ? [
          ...(dragState.additive ? selectionRanges : []),
          normalizeSelectionRange(dragState.start, dragState.current),
        ]
      : selectionRanges;

    function isSelected(rowIndex: number, colIndex: number) {
      return displayedRanges.some((range) =>
        isCellInRange({ row: rowIndex, col: colIndex }, range),
      );
    }

    function handleSelectionKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (isEditableEventTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        if (selectionRanges.length === 0) return;
        event.preventDefault();
        void handleCopy(serializeSelectionRanges(selectionRanges));
        return;
      }

      if (event.key === "Escape") {
        if (!activeCell && selectionRanges.length === 0) return;
        event.preventDefault();
        clearSelection();
        return;
      }

      const direction = getArrowDirection(event.key);
      if (!direction) return;

      const currentCell =
        activeCell ??
        selectionAnchor ??
        (cellGrid.length > 0 && cellGrid[0]?.length ? { row: 0, col: 0 } : null);
      if (!currentCell) return;

      event.preventDefault();

      const nextCell = isPlatformJumpModifier(event)
        ? findSpreadsheetBoundary(cellGrid, currentCell, direction)
        : moveCell(cellGrid, currentCell, direction);
      const anchor = event.shiftKey ? selectionAnchor ?? currentCell : nextCell;

      setActiveCell(nextCell);
      setSelectionAnchor(anchor);
      setSelectionRanges([normalizeSelectionRange(anchor, nextCell)]);
      requestAnimationFrame(() => {
        focusSpreadsheetCell(tableContainerRef.current, nextCell);
      });
    }

    function isActiveCell(rowIndex: number, colIndex: number) {
      return activeCell?.row === rowIndex && activeCell.col === colIndex;
    }

    function getCellTabIndex(rowIndex: number, colIndex: number) {
      if (!activeCell) return rowIndex === 0 && colIndex === 0 ? 0 : -1;
      return isActiveCell(rowIndex, colIndex) ? 0 : -1;
    }

    function getCellId(rowIndex: number, colIndex: number) {
      return `vocab-extract-cell-${rowIndex}-${colIndex}`;
    }

    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="subtitle1" fontWeight={600}>
              {resultTitle}
            </Typography>

            <TableContainer
              ref={tableContainerRef}
              onKeyDown={handleSelectionKeyDown}
              role="grid"
              aria-activedescendant={
                activeCell ? getCellId(activeCell.row, activeCell.col) : undefined
              }
              sx={{
                userSelect: dragState ? "none" : "auto",
                overflowX: "auto",
                pb: 2,
                "&::-webkit-scrollbar": {
                  height: 8,
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "transparent",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "action.disabled",
                  borderRadius: 10,
                  border: "2px solid transparent",
                  backgroundClip: "content-box",
                  "&:hover": {
                    backgroundColor: "action.active",
                  },
                },
              }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {TABLE_COLUMNS.map((col) => (
                      <TableCell key={col} sx={{ whiteSpace: "nowrap" }}>
                        {columnLabels[col]}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {results.map((entry, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {TABLE_COLUMNS.map((col, colIndex) => {
                        const selected = isSelected(rowIndex, colIndex);
                        const active = isActiveCell(rowIndex, colIndex);
                        return (
                          <TableCell
                            key={col}
                            id={getCellId(rowIndex, colIndex)}
                            data-spreadsheet-cell="true"
                            data-row={rowIndex}
                            data-col={colIndex}
                            tabIndex={getCellTabIndex(rowIndex, colIndex)}
                            role="gridcell"
                            aria-selected={selected || undefined}
                            onFocus={() =>
                              handleCellFocus({ row: rowIndex, col: colIndex })
                            }
                            onMouseDown={(event) =>
                              handleCellMouseDown({ row: rowIndex, col: colIndex }, event)
                            }
                            onMouseOver={() =>
                              handleCellMouseEnter({ row: rowIndex, col: colIndex })
                            }
                            onMouseUp={handleCellMouseUp}
                            sx={{
                              cursor: "cell",
                              userSelect: "none",
                              backgroundColor: selected ? "action.selected" : "inherit",
                              boxShadow: active
                                ? (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`
                                : selected
                                  ? (theme) => `inset 0 0 0 1px ${theme.palette.primary.light}`
                                  : "none",
                              "&:focus-visible": {
                                outline: "2px solid",
                                outlineColor: "primary.main",
                                outlineOffset: -2,
                              },
                            }}
                          >
                            {renderCellContent(getCellValue(entry, col))}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch">
          <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            <Box aria-hidden="true" sx={{ height: 36, px: 0.5, visibility: "hidden" }} />
            <TextField
              label={exampleLabel}
              value={exampleInput}
              onChange={(e) => {
                const filtered = filterJapaneseExampleInput(e.target.value);
                if (filtered !== e.target.value) {
                  if (exampleErrorTimerRef.current) clearTimeout(exampleErrorTimerRef.current);
                  setExampleInputError(true);
                  exampleErrorTimerRef.current = setTimeout(() => setExampleInputError(false), 2000);
                }
                setExampleInput(clampToMaxLines(filtered, 20));
                setValidationError(null);
              }}
              multiline
              minRows={6}
              fullWidth
              helperText={
                <Box component="span" sx={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{validationError ?? (exampleInputError ? exampleInvalidMsg : exampleHelpText)}</span>
                  {exampleCount > 0 && (
                    <Box component="span" sx={{ color: exampleCount > 20 ? "error.main" : undefined }}>
                      {exampleCount} / 20
                    </Box>
                  )}
                </Box>
              }
              error={!!validationError || exampleInputError}
            />
          </Stack>

          <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
            {renderMeaningLanguageChips()}
            {renderMeaningTextField()}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? loadingLabel : submitLabel}
          </Button>
          <Button type="button" variant="outlined" onClick={handleReset} disabled={loading}>
            {resetLabel}
          </Button>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        {results.length === 0 && !error ? (
          <Card
            variant="outlined"
            sx={{
              minHeight: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.default",
            }}
          >
            <CardContent>
              <Stack spacing={1.5} alignItems="center" color="text.secondary">
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 64,
                    width: 64,
                    "@keyframes geminiPulse": {
                      "0%, 100%": {
                        transform: "scale(1)",
                        filter: "drop-shadow(0 0 0px transparent)",
                      },
                      "50%": {
                        transform: "scale(1.15)",
                        filter: "drop-shadow(0 0 15px rgba(155, 114, 203, 0.5))",
                      },
                    },
                    "@keyframes geminiTwinkle": {
                      "0%, 100%": { opacity: 0.3, transform: "scale(0.8) rotate(0deg)" },
                      "50%": { opacity: 1, transform: "scale(1.1) rotate(15deg)" },
                    },
                  }}
                >
                  {/* Hidden SVG for Gradient Definition */}
                  <svg width="0" height="0" style={{ position: "absolute" }}>
                    <defs>
                      <linearGradient id="gemini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#4285f4" />
                        <stop offset="50%" stopColor="#9b72cb" />
                        <stop offset="100%" stopColor="#d96570" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <ExtractIcon
                    sx={{
                      fontSize: 48,
                      opacity: loading ? 1 : 0.5,
                      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      fill: loading ? "url(#gemini-gradient)" : "currentColor",
                      animation: loading ? "geminiPulse 2s infinite ease-in-out" : "none",
                    }}
                  />

                  {loading && (
                    <>
                      <ExtractIcon
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          fontSize: 18,
                          fill: "#9b72cb",
                          animation: "geminiTwinkle 1.8s infinite ease-in-out",
                        }}
                      />
                      <ExtractIcon
                        sx={{
                          position: "absolute",
                          bottom: 8,
                          left: 4,
                          fontSize: 14,
                          fill: "#4285f4",
                          animation: "geminiTwinkle 2.5s infinite ease-in-out",
                          animationDelay: "0.5s",
                        }}
                      />
                    </>
                  )}
                </Box>

                <Typography variant="subtitle1" fontWeight={600} align="center">
                  {loading ? t("textTools.loading") : standbyTitle}
                </Typography>
                <Typography variant="body2" align="center" sx={{ maxWidth: 360 }}>
                  {loading ? t("textTools.aiProcessingDescription") : standbyDescription}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          renderResultsTable()
        )}
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
