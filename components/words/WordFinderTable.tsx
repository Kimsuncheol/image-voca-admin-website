"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { Theme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

import CellContextMenu from "@/components/shared/CellContextMenu";
import {
  formatWordFinderLocation,
  isWordFinderFieldMissing,
} from "@/lib/wordFinderMissingFieldActions";
import { supportsDerivativeGenerationForResult } from "@/lib/derivativeGeneration";
import type { WordFinderResult } from "@/types/wordFinder";
import type { WordFinderActionField, WordFinderMissingField } from "@/types/wordFinder";
import { insertNumberedBreaks } from "@/lib/utils/textFormat";
import {
  findSpreadsheetBoundary,
  focusSpreadsheetCell,
  getArrowDirection,
  isEditableEventTarget,
  isPlatformJumpModifier,
  moveCell,
  type CellCoord,
} from "@/lib/utils/spreadsheetNavigation";

type FuriganaActionField = Extract<WordFinderActionField, "pronunciation" | "example">;

const singleLineWordTextSx = {
  whiteSpace: "nowrap",
  overflowWrap: "normal",
  wordBreak: "keep-all",
};

type CellPos = CellCoord;

interface ContextMenuState {
  anchorPosition: { top: number; left: number };
  row: number;
  col: number;
}

function shouldShowSynonymColumn(results: WordFinderResult[]): boolean {
  return results.some(
    (result) =>
      result.courseId === "TOEFL_IELTS" && result.schemaVariant === "standard",
  );
}

function isToeflSynonymResult(result: WordFinderResult): boolean {
  return result.courseId === "TOEFL_IELTS" && result.schemaVariant === "standard";
}

function isExtremelyAdvancedResult(result: WordFinderResult): boolean {
  return result.schemaVariant === "extremelyAdvanced";
}

function isKanjiResult(result: WordFinderResult | undefined): boolean {
  return result?.schemaVariant === "kanji" || result?.type === "kanji";
}

function shouldShowPronunciationColumn(results: WordFinderResult[]): boolean {
  return results.some((result) => !isExtremelyAdvancedResult(result));
}

function shouldShowExampleHuriganaColumn(results: WordFinderResult[]): boolean {
  return results.some(
    (result) =>
      result.schemaVariant === "jlpt" ||
      result.schemaVariant === "prefix" ||
      result.schemaVariant === "postfix",
  );
}

function getColField(
  col: number,
  hasSynonymColumn: boolean,
  hasPronunciationColumn: boolean,
  isExampleHuriganaMode: boolean,
  hasExampleHuriganaColumn: boolean,
): WordFinderActionField | null {
  if (isExampleHuriganaMode) {
    if (col === 2) return "example";
    if (col === 3) return "exampleHurigana";
    return null;
  }

  const translationCol =
    (hasSynonymColumn ? 2 : 1) + (hasPronunciationColumn ? 1 : 0) + 1;
  if (col === translationCol) return "translation";
  if (hasExampleHuriganaColumn && col === translationCol + 1) return "exampleHurigana";
  return null;
}

interface WordFinderTableProps {
  results: WordFinderResult[];
  activeMissingField?: WordFinderMissingField;
  onMissingFieldClick?: (
    result: WordFinderResult,
    field: WordFinderActionField,
  ) => void;
  onAddFuriganaClick?: (
    result: WordFinderResult,
    field: FuriganaActionField,
  ) => void;
}

function isJapaneseFuriganaResult(result: WordFinderResult): boolean {
  return (
    result.schemaVariant === "jlpt" ||
    result.schemaVariant === "prefix" ||
    result.schemaVariant === "postfix"
  );
}

function getContextMenuAddFuriganaField(
  result: WordFinderResult | undefined,
  col: number,
  isExampleHuriganaMode: boolean,
): FuriganaActionField | null {
  if (!result || !isJapaneseFuriganaResult(result) || isExampleHuriganaMode) {
    return null;
  }

  if (col === 0 && result.primaryText.trim()) {
    return "pronunciation";
  }

  if (col === 1 && result.example?.trim()) {
    return "example";
  }

  return null;
}

function getTypeLabel(
  value: WordFinderResult["type"],
  t: (key: string) => string,
): string {
  switch (value) {
    case "collocation":
      return t("words.typeCollocation");
    case "idiom":
      return t("words.typeIdiom");
    case "famousQuote":
      return t("words.typeFamousQuote");
    case "kanji":
      return t("words.typeKanji");
    case "standard":
    default:
      return t("words.typeStandard");
  }
}

function renderStatusChip(
  result: WordFinderResult,
  field: WordFinderActionField,
  label: string,
  filled: boolean,
  onMissingFieldClick?: WordFinderTableProps["onMissingFieldClick"],
  forceClickable = false,
) {
  const isMissing = isWordFinderFieldMissing(result, field);
  const isClickable = (isMissing || forceClickable) && Boolean(onMissingFieldClick);

  if (!isClickable) {
    return <Chip size="small" variant={filled ? "filled" : "outlined"} label={label} />;
  }

  return (
    <Chip
      size="small"
      variant={filled ? "filled" : "outlined"}
      label={label}
      onClick={onMissingFieldClick ? (e) => { e.stopPropagation(); onMissingFieldClick(result, field); } : undefined}
      clickable={Boolean(onMissingFieldClick)}
      sx={onMissingFieldClick ? { cursor: "pointer" } : undefined}
    />
  );
}

export default function WordFinderTable({
  results,
  activeMissingField,
  onMissingFieldClick,
  onAddFuriganaClick,
}: WordFinderTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [activeCell, setActiveCell] = useState<CellPos | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<CellPos | null>(null);
  const [selectionExtent, setSelectionExtent] = useState<CellPos | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const isExampleHuriganaMode = activeMissingField === "exampleHurigana";
  const hasSynonymColumn = useMemo(() => shouldShowSynonymColumn(results), [results]);
  const hasPronunciationColumn = useMemo(
    () => shouldShowPronunciationColumn(results),
    [results],
  );
  const hasExampleHuriganaColumn = useMemo(
    () => !isExampleHuriganaMode && shouldShowExampleHuriganaColumn(results),
    [results, isExampleHuriganaMode],
  );
  const translationCol =
    (hasSynonymColumn ? 2 : 1) + (hasPronunciationColumn ? 1 : 0) + 1;
  const locationCol = translationCol + (hasExampleHuriganaColumn ? 3 : 2);
  const imageCol = isExampleHuriganaMode
    ? 4
    : translationCol + (hasExampleHuriganaColumn ? 2 : 1);
  const statusCol = locationCol + 1;
  // cols: 0=primaryText, 1=meaning, 2=synonym?, 3=pronunciation?, 4=translation, 5="" (image), 6=location, 7="" (status)
  const cellGrid = useMemo(
    () =>
      results.map((r) =>
        isExampleHuriganaMode
          ? [
              r.primaryText,
              r.meaning || r.secondaryText || "",
              r.example ?? "",
              r.exampleHurigana ?? "",
              "",
              formatWordFinderLocation(r, ""),
            ]
          : [
              r.primaryText,
              r.meaning || r.secondaryText || "",
              ...(hasSynonymColumn ? [isToeflSynonymResult(r) ? r.synonym ?? "" : ""] : []),
              ...(hasPronunciationColumn
                ? [isExtremelyAdvancedResult(r) ? "" : r.pronunciation || ""]
                : []),
              r.translation ?? "",
              ...(hasExampleHuriganaColumn ? [r.exampleHurigana ?? ""] : []),
              "",
              formatWordFinderLocation(r, ""),
              "",
            ],
      ),
    [results, hasSynonymColumn, hasPronunciationColumn, isExampleHuriganaMode, hasExampleHuriganaColumn],
  );

  const isCellSelected = useCallback(
    (row: number, col: number): boolean => {
      if (!selectionAnchor || !selectionExtent) return false;
      const minRow = Math.min(selectionAnchor.row, selectionExtent.row);
      const maxRow = Math.max(selectionAnchor.row, selectionExtent.row);
      const minCol = Math.min(selectionAnchor.col, selectionExtent.col);
      const maxCol = Math.max(selectionAnchor.col, selectionExtent.col);
      return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
    },
    [selectionAnchor, selectionExtent],
  );

  const copyRangeToClipboard = useCallback(
    (anchor: CellPos, extent: CellPos) => {
      const minRow = Math.min(anchor.row, extent.row);
      const maxRow = Math.max(anchor.row, extent.row);
      const minCol = Math.min(anchor.col, extent.col);
      const maxCol = Math.max(anchor.col, extent.col);
      const rows: string[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        const cols: string[] = [];
        for (let c = minCol; c <= maxCol; c++) {
          cols.push(cellGrid[r]?.[c] ?? "");
        }
        rows.push(cols.join("\t"));
      }
      void navigator.clipboard.writeText(rows.join("\n"));
    },
    [cellGrid],
  );

  const selectableCellSx = useCallback(
    (row: number, col: number) => ({
      cursor: "pointer",
      bgcolor: isCellSelected(row, col) ? "action.selected" : undefined,
      boxShadow:
        activeCell?.row === row && activeCell.col === col
          ? (theme: Theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`
          : undefined,
      "&:hover": { bgcolor: isCellSelected(row, col) ? "action.selected" : "action.hover" },
      "&:focus-visible": {
        outline: "2px solid",
        outlineColor: "primary.main",
        outlineOffset: -2,
      },
    }),
    [activeCell, isCellSelected],
  );

  const handleCellClick = useCallback(
    (e: MouseEvent<HTMLTableCellElement>, row: number, col: number) => {
      e.stopPropagation();
      e.currentTarget.focus();
      setActiveCell({ row, col });
      if (e.shiftKey && selectionAnchor) {
        setSelectionExtent({ row, col });
      } else {
        setSelectionAnchor({ row, col });
        setSelectionExtent({ row, col });
      }
    },
    [selectionAnchor],
  );

  const handleCellFocus = useCallback(
    (row: number, col: number) => {
      const cell = { row, col };
      setActiveCell(cell);
      if (!selectionAnchor || !selectionExtent) {
        setSelectionAnchor(cell);
        setSelectionExtent(cell);
      }
    },
    [selectionAnchor, selectionExtent],
  );

  const clearSelection = useCallback(() => {
    setActiveCell(null);
    setSelectionAnchor(null);
    setSelectionExtent(null);
  }, []);

  const getCellId = useCallback(
    (row: number, col: number) => `word-finder-cell-${row}-${col}`,
    [],
  );

  const getCellTabIndex = useCallback(
    (row: number, col: number) => {
      if (!activeCell) return row === 0 && col === 0 ? 0 : -1;
      return activeCell.row === row && activeCell.col === col ? 0 : -1;
    },
    [activeCell],
  );

  const handleSpreadsheetKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isEditableEventTarget(event.target)) return;

      if (event.key === "Escape") {
        if (!activeCell && !selectionAnchor && !selectionExtent) return;
        event.preventDefault();
        clearSelection();
        return;
      }

      if (
        event.key.toLowerCase() === "c" &&
        (event.metaKey || event.ctrlKey) &&
        selectionAnchor &&
        selectionExtent
      ) {
        event.preventDefault();
        copyRangeToClipboard(selectionAnchor, selectionExtent);
        return;
      }

      const direction = getArrowDirection(event.key);
      if (!direction) return;

      const currentCell =
        activeCell ??
        selectionExtent ??
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
      setSelectionExtent(nextCell);
      requestAnimationFrame(() => {
        focusSpreadsheetCell(tableContainerRef.current, nextCell);
      });
    },
    [
      activeCell,
      cellGrid,
      clearSelection,
      copyRangeToClipboard,
      selectionAnchor,
      selectionExtent,
    ],
  );

  const handleCellContextMenu = useCallback(
    (e: MouseEvent<HTMLTableCellElement>, row: number, col: number) => {
      e.preventDefault();
      e.stopPropagation();
      setActiveCell({ row, col });
      if (!isCellSelected(row, col)) {
        setSelectionAnchor({ row, col });
        setSelectionExtent({ row, col });
      }
      setContextMenu({ anchorPosition: { top: e.clientY, left: e.clientX }, row, col });
    },
    [isCellSelected],
  );

  const selectableCellProps = useCallback(
    (row: number, col: number) => ({
      id: getCellId(row, col),
      "data-spreadsheet-cell": "true",
      "data-row": row,
      "data-col": col,
      role: "gridcell",
      tabIndex: getCellTabIndex(row, col),
      "aria-selected": isCellSelected(row, col),
      onFocus: () => handleCellFocus(row, col),
      onClick: (e: MouseEvent<HTMLTableCellElement>) => handleCellClick(e, row, col),
      onContextMenu: (e: MouseEvent<HTMLTableCellElement>) =>
        handleCellContextMenu(e, row, col),
      sx: selectableCellSx(row, col),
    }),
    [
      getCellId,
      getCellTabIndex,
      handleCellClick,
      handleCellContextMenu,
      handleCellFocus,
      isCellSelected,
      selectableCellSx,
    ],
  );

  const handleContextMenuCopy = useCallback(() => {
    if (!selectionAnchor || !selectionExtent) return;
    copyRangeToClipboard(selectionAnchor, selectionExtent);
  }, [selectionAnchor, selectionExtent, copyRangeToClipboard]);

  const handleContextMenuGenerate = useCallback(() => {
    if (!contextMenu || !onMissingFieldClick) return;
    const result = results[contextMenu.row];
    if (!result || isKanjiResult(result)) return;
    const field = getColField(
      contextMenu.col,
      hasSynonymColumn,
      hasPronunciationColumn,
      isExampleHuriganaMode,
      hasExampleHuriganaColumn,
    );
    if (!field) return;
    onMissingFieldClick(result, field);
  }, [contextMenu, results, onMissingFieldClick, hasSynonymColumn, hasPronunciationColumn, isExampleHuriganaMode, hasExampleHuriganaColumn]);

  const handleContextMenuAddFurigana = useCallback(() => {
    if (!contextMenu || !onAddFuriganaClick) return;
    const result = results[contextMenu.row];
    const field = getContextMenuAddFuriganaField(
      result,
      contextMenu.col,
      isExampleHuriganaMode,
    );
    if (!result || !field) return;
    onAddFuriganaClick(result, field);
  }, [contextMenu, onAddFuriganaClick, results, isExampleHuriganaMode]);

  const contextMenuResult = contextMenu ? results[contextMenu.row] : undefined;
  const contextMenuField = contextMenu && !isKanjiResult(contextMenuResult)
    ? getColField(
        contextMenu.col,
        hasSynonymColumn,
        hasPronunciationColumn,
        isExampleHuriganaMode,
        hasExampleHuriganaColumn,
      )
    : null;
  const contextMenuAddFuriganaField = contextMenu
    ? getContextMenuAddFuriganaField(
        results[contextMenu.row],
        contextMenu.col,
        isExampleHuriganaMode,
      )
    : null;

  return (
    <>
    <TableContainer
      ref={tableContainerRef}
      component={Paper}
      variant="outlined"
      onKeyDown={handleSpreadsheetKeyDown}
      role="grid"
      aria-activedescendant={
        activeCell ? getCellId(activeCell.row, activeCell.col) : undefined
      }
      sx={{
        "&::-webkit-scrollbar": { height: 6 },
        "&::-webkit-scrollbar-track": {
          borderRadius: 3,
          bgcolor: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          borderRadius: 3,
          bgcolor: "transparent",
          transition: "background-color 0.2s",
        },
        "&:hover::-webkit-scrollbar-track": {
          bgcolor: "action.hover",
        },
        "&:hover::-webkit-scrollbar-thumb": {
          bgcolor: "text.disabled",
        },
        "&:hover::-webkit-scrollbar-thumb:hover": {
          bgcolor: "text.secondary",
        },
        scrollbarWidth: "thin",
        scrollbarColor: "transparent transparent",
        "&:hover": {
          scrollbarColor: (theme) =>
            `${theme.palette.text.disabled} ${theme.palette.action.hover}`,
        },
      }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("words.primaryText")}</TableCell>
            <TableCell>{t("words.secondaryText")}</TableCell>
            {isExampleHuriganaMode ? (
              <>
                <TableCell>{t("courses.example")}</TableCell>
                <TableCell>{t("words.exampleHuriganaLabel")}</TableCell>
              </>
            ) : (
              <>
                {hasSynonymColumn && (
                  <TableCell>{t("courses.synonym", "Synonym")}</TableCell>
                )}
                {hasPronunciationColumn && (
                  <TableCell>{t("courses.pronunciation")}</TableCell>
                )}
                <TableCell>{t("words.translationLabel")}</TableCell>
                {hasExampleHuriganaColumn && (
                  <TableCell>{t("words.exampleHuriganaLabel")}</TableCell>
                )}
              </>
            )}
            <TableCell>{t("courses.image", "Image")}</TableCell>
            <TableCell>{t("words.location")}</TableCell>
            {!isExampleHuriganaMode && <TableCell>{t("words.status")}</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((result, rowIdx) => (
            <TableRow
              key={`${result.courseId}:${result.dayId ?? "root"}:${result.id}`}
              onClick={() => router.push(result.sourceHref)}
              sx={{ cursor: "pointer" }}
            >
              <TableCell
                {...selectableCellProps(rowIdx, 0)}
                sx={{ minWidth: 220, ...selectableCellSx(rowIdx, 0) }}
              >
                <Stack spacing={0.75}>
                  <Typography fontWeight={600} sx={singleLineWordTextSx}>
                    {result.primaryText || t("words.none")}
                  </Typography>
                  <Chip
                    label={getTypeLabel(result.type, t)}
                    size="small"
                    sx={{ width: "fit-content" }}
                  />
                </Stack>
              </TableCell>
              <TableCell
                {...selectableCellProps(rowIdx, 1)}
                sx={{ minWidth: 260, ...selectableCellSx(rowIdx, 1) }}
              >
                <Stack spacing={0.5}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                    {insertNumberedBreaks(result.meaning || result.secondaryText || "") || t("words.none")}
                  </Typography>
                  {result.secondaryText && result.secondaryText !== result.meaning && (
                    <Typography variant="caption" color="text.secondary">
                      {result.secondaryText}
                    </Typography>
                  )}
                </Stack>
              </TableCell>
              {!isExampleHuriganaMode && hasSynonymColumn && (
                <TableCell
                  {...selectableCellProps(rowIdx, 2)}
                  sx={{ minWidth: 180, ...selectableCellSx(rowIdx, 2) }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                    {isToeflSynonymResult(result)
                      ? insertNumberedBreaks(result.synonym || "") || t("words.none")
                      : ""}
                  </Typography>
                </TableCell>
              )}
              {!isExampleHuriganaMode && hasPronunciationColumn && (
                <TableCell
                  {...selectableCellProps(rowIdx, hasSynonymColumn ? 3 : 2)}
                  sx={{ minWidth: 220, ...selectableCellSx(rowIdx, hasSynonymColumn ? 3 : 2) }}
                >
                  <Typography variant="body2">
                    {isExtremelyAdvancedResult(result)
                      ? ""
                      : result.pronunciation || t("words.none")}
                  </Typography>
                </TableCell>
              )}
              {isExampleHuriganaMode ? (
                <>
                  <TableCell
                    {...selectableCellProps(rowIdx, 2)}
                    sx={{ minWidth: 220, ...selectableCellSx(rowIdx, 2) }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                      {insertNumberedBreaks(result.example || "") || t("words.none")}
                    </Typography>
                  </TableCell>
                  <TableCell
                    {...selectableCellProps(rowIdx, 3)}
                    sx={{ minWidth: 220, ...selectableCellSx(rowIdx, 3) }}
                  >
                    {result.exampleHurigana ? (
                      <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                        {insertNumberedBreaks(result.exampleHurigana) || t("words.none")}
                      </Typography>
                    ) : (
                      renderStatusChip(
                        result,
                        "exampleHurigana",
                        t("words.missingExampleHurigana"),
                        false,
                        onMissingFieldClick,
                      )
                    )}
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell
                    {...selectableCellProps(rowIdx, translationCol)}
                    sx={{ minWidth: 220, ...selectableCellSx(rowIdx, translationCol) }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                      {insertNumberedBreaks(result.translation || "") || t("words.none")}
                    </Typography>
                  </TableCell>
                  {hasExampleHuriganaColumn && (
                    <TableCell
                      {...selectableCellProps(rowIdx, translationCol + 1)}
                      sx={{ minWidth: 220, ...selectableCellSx(rowIdx, translationCol + 1) }}
                    >
                      {result.exampleHurigana ? (
                        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                          {insertNumberedBreaks(result.exampleHurigana) || t("words.none")}
                        </Typography>
                      ) : (
                        renderStatusChip(
                          result,
                          "exampleHurigana",
                          t("words.missingExampleHurigana"),
                          false,
                          onMissingFieldClick,
                        )
                      )}
                    </TableCell>
                  )}
                </>
              )}
              <TableCell
                {...selectableCellProps(rowIdx, imageCol)}
                sx={{ minWidth: 120, ...selectableCellSx(rowIdx, imageCol) }}
              >
                {result.type === "famousQuote" || isKanjiResult(result) ? null : result.imageUrl ? (
                  <Box
                    component="img"
                    src={result.imageUrl}
                    alt={result.primaryText}
                    sx={{
                      width: 64,
                      height: 64,
                      objectFit: "cover",
                      borderRadius: 1,
                      display: "block",
                    }}
                  />
                ) : (
                  renderStatusChip(
                    result,
                    "image",
                    t("words.missingImage"),
                    false,
                    onMissingFieldClick,
                  )
                )}
              </TableCell>
              <TableCell
                {...selectableCellProps(rowIdx, isExampleHuriganaMode ? 5 : locationCol)}
                sx={{
                  minWidth: 180,
                  ...selectableCellSx(rowIdx, isExampleHuriganaMode ? 5 : locationCol),
                }}
              >
                <Typography variant="body2">
                  {formatWordFinderLocation(result, t("words.noDay"))}
                </Typography>
              </TableCell>
              {!isExampleHuriganaMode && (
              <TableCell
                {...selectableCellProps(rowIdx, statusCol)}
                sx={{ minWidth: 220, ...selectableCellSx(rowIdx, statusCol) }}
              >
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {result.type !== "famousQuote" && !isKanjiResult(result) && (
                    renderStatusChip(
                      result,
                      "image",
                      result.imageUrl ? t("words.hasImage") : t("words.missingImage"),
                      Boolean(result.imageUrl),
                      onMissingFieldClick,
                    )
                  )}
                  {result.type === "standard" &&
                    !isExtremelyAdvancedResult(result) && (
                    renderStatusChip(
                      result,
                      "pronunciation",
                      result.pronunciation
                        ? t("words.hasPronunciation")
                        : t("words.missingPronunciation"),
                      Boolean(result.pronunciation),
                      onMissingFieldClick,
                      isJapaneseFuriganaResult(result),
                    )
                  )}
                  {result.type !== "famousQuote" && !isKanjiResult(result) && (
                    renderStatusChip(
                      result,
                      "example",
                      result.example ? t("words.hasExample") : t("words.missingExample"),
                      Boolean(result.example),
                      onMissingFieldClick,
                      isJapaneseFuriganaResult(result),
                    )
                  )}
                  {!isKanjiResult(result) && renderStatusChip(
                    result,
                    "translation",
                    result.translation
                      ? t("words.hasTranslation")
                      : t("words.missingTranslation"),
                    Boolean(result.translation),
                    result.schemaVariant === "jlpt" ? undefined : onMissingFieldClick,
                  )}
                  {supportsDerivativeGenerationForResult(result) &&
                    renderStatusChip(
                      result,
                      "derivative",
                      result.derivative?.length
                        ? t("words.hasDerivative")
                        : t("words.missingDerivative"),
                      Boolean(result.derivative?.length),
                      onMissingFieldClick,
                    )}
                </Stack>
              </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>

    <CellContextMenu
      anchorPosition={contextMenu?.anchorPosition ?? null}
      onClose={() => setContextMenu(null)}
      onCopy={handleContextMenuCopy}
      onAddFurigana={
        contextMenuAddFuriganaField && onAddFuriganaClick
          ? handleContextMenuAddFurigana
          : null
      }
      onGenerate={
        contextMenuField && onMissingFieldClick ? handleContextMenuGenerate : null
      }
    />
    </>
  );
}
