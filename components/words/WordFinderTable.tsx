"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import LaunchIcon from "@mui/icons-material/Launch";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import { useTranslation } from "react-i18next";

import InlineEditableText from "@/components/shared/InlineEditableText";
import {
  formatWordFinderLocation,
  isWordFinderFieldMissing,
} from "@/lib/wordFinderMissingFieldActions";

interface CellPos {
  row: number;
  col: number;
}
import {
  resolveWordFinderInlineEditField,
  type InlineEditableWordFinderField,
} from "@/lib/wordFinderInlineEdit";
import type { WordFinderResult } from "@/types/wordFinder";
import type { WordFinderActionField } from "@/types/wordFinder";

interface WordFinderTableProps {
  results: WordFinderResult[];
  onMissingFieldClick?: (
    result: WordFinderResult,
    field: WordFinderActionField,
  ) => void;
  onTextEdit?: (
    result: WordFinderResult,
    field: InlineEditableWordFinderField,
    value: string,
  ) => Promise<void>;
}

interface EditingCellState {
  resultKey: string;
  field: InlineEditableWordFinderField;
  draft: string;
  saving: boolean;
  error: string;
}

function getTypeLabel(
  value: WordFinderResult["type"],
  t: (key: string) => string,
): string {
  switch (value) {
    case "collocation":
      return t("words.typeCollocation");
    case "famousQuote":
      return t("words.typeFamousQuote");
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
      onClick={onMissingFieldClick ? () => onMissingFieldClick(result, field) : undefined}
      clickable={Boolean(onMissingFieldClick)}
      sx={onMissingFieldClick ? { cursor: "pointer" } : undefined}
    />
  );
}

export default function WordFinderTable({
  results,
  onMissingFieldClick,
  onTextEdit,
}: WordFinderTableProps) {
  const { t } = useTranslation();
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<CellPos | null>(null);
  const [selectionExtent, setSelectionExtent] = useState<CellPos | null>(null);

  // cols: 0=primaryText, 1=meaning, 2=translation, 3="" (image), 4=location, 5="" (status), 6="" (actions)
  const cellGrid = useMemo(
    () =>
      results.map((r) => [
        r.primaryText,
        r.meaning || r.secondaryText || "",
        r.translation ?? "",
        "",
        formatWordFinderLocation(r, ""),
        "",
        "",
      ]),
    [results],
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
      "&:hover": { bgcolor: isCellSelected(row, col) ? "action.selected" : "action.hover" },
    }),
    [isCellSelected],
  );

  const handleCellClick = useCallback(
    (e: MouseEvent, row: number, col: number) => {
      e.stopPropagation();
      if (e.shiftKey && selectionAnchor) {
        const newExtent = { row, col };
        setSelectionExtent(newExtent);
        copyRangeToClipboard(selectionAnchor, newExtent);
      } else {
        setSelectionAnchor({ row, col });
        setSelectionExtent({ row, col });
        const text = cellGrid[row]?.[col] ?? "";
        if (text) void navigator.clipboard.writeText(text);
      }
    },
    [cellGrid, copyRangeToClipboard, selectionAnchor],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectionAnchor(null);
        setSelectionExtent(null);
        return;
      }
      if (e.key === "c" && (e.metaKey || e.ctrlKey) && selectionAnchor && selectionExtent) {
        e.preventDefault();
        copyRangeToClipboard(selectionAnchor, selectionExtent);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectionAnchor, selectionExtent, copyRangeToClipboard]);

  const activateInlineEdit = useCallback((result: WordFinderResult, field: InlineEditableWordFinderField) => {
    const editable = resolveWordFinderInlineEditField(result, field);
    if (!editable || !onTextEdit) return;

    setEditingCell({
      resultKey: `${result.courseId}:${result.dayId ?? "root"}:${result.id}`,
      field,
      draft: editable.value,
      saving: false,
      error: "",
    });
  }, [onTextEdit]);

  const updateInlineDraft = useCallback((draft: string) => {
    setEditingCell((prev) => (prev ? { ...prev, draft, error: "" } : prev));
  }, []);

  const cancelInlineEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const commitInlineEdit = useCallback(
    async (result: WordFinderResult) => {
      if (!editingCell || editingCell.saving || !onTextEdit) return;

      const resultKey = `${result.courseId}:${result.dayId ?? "root"}:${result.id}`;
      if (editingCell.resultKey !== resultKey) return;

      const editable = resolveWordFinderInlineEditField(result, editingCell.field);
      if (!editable) {
        setEditingCell(null);
        return;
      }

      const nextValue = editingCell.draft.trim();
      if (!nextValue || nextValue === editable.value) {
        setEditingCell(null);
        return;
      }

      setEditingCell((prev) => (prev ? { ...prev, saving: true, error: "" } : prev));

      try {
        await onTextEdit(result, editingCell.field, nextValue);
        setEditingCell(null);
      } catch {
        setEditingCell((prev) =>
          prev ? { ...prev, saving: false, error: t("words.generateActionError") } : prev,
        );
      }
    },
    [editingCell, onTextEdit, t],
  );

  const renderEditableText = useCallback(
    (
      result: WordFinderResult,
      field: InlineEditableWordFinderField,
      value: string,
      options?: {
        textVariant?: "body1" | "body2";
        fontWeight?: number;
      },
    ) => {
      const editable = resolveWordFinderInlineEditField(result, field);
      const resultKey = `${result.courseId}:${result.dayId ?? "root"}:${result.id}`;
      const isEditing =
        editingCell?.resultKey === resultKey && editingCell.field === field;

      if (!editable || !onTextEdit) {
        return (
          <Typography variant={options?.textVariant ?? "body1"} fontWeight={options?.fontWeight}>
            {value || t("words.none")}
          </Typography>
        );
      }

      return (
        <InlineEditableText
          value={value}
          emptyLabel={t("words.none")}
          isEditing={isEditing}
          draft={isEditing ? editingCell.draft : value}
          saving={isEditing ? editingCell.saving : false}
          error={isEditing ? editingCell.error : ""}
          textVariant={options?.textVariant}
          fontWeight={options?.fontWeight}
          onActivate={() => activateInlineEdit(result, field)}
          onDraftChange={updateInlineDraft}
          onCommit={() => {
            void commitInlineEdit(result);
          }}
          onCancel={cancelInlineEdit}
        />
      );
    },
    [
      activateInlineEdit,
      cancelInlineEdit,
      commitInlineEdit,
      editingCell,
      onTextEdit,
      t,
      updateInlineDraft,
    ],
  );

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
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
            <TableCell>{t("words.translationLabel")}</TableCell>
            <TableCell>{t("courses.image", "Image")}</TableCell>
            <TableCell>{t("words.location")}</TableCell>
            <TableCell>{t("words.status")}</TableCell>
            <TableCell align="right">{t("words.actions")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((result, rowIdx) => (
            <TableRow key={`${result.courseId}:${result.dayId ?? "root"}:${result.id}`}>
              <TableCell
                sx={{ minWidth: 220, ...selectableCellSx(rowIdx, 0) }}
                onClick={(e) => handleCellClick(e, rowIdx, 0)}
              >
                <Stack spacing={0.75}>
                  {renderEditableText(result, "primaryText", result.primaryText, {
                    fontWeight: 600,
                  })}
                  <Chip
                    label={getTypeLabel(result.type, t)}
                    size="small"
                    sx={{ width: "fit-content" }}
                  />
                </Stack>
              </TableCell>
              <TableCell
                sx={{ minWidth: 260, ...selectableCellSx(rowIdx, 1) }}
                onClick={(e) => handleCellClick(e, rowIdx, 1)}
              >
                <Stack spacing={0.5}>
                  {renderEditableText(
                    result,
                    "meaning",
                    result.meaning || result.secondaryText || "",
                    { textVariant: "body2" },
                  )}
                  {result.secondaryText && result.secondaryText !== result.meaning && (
                    <Typography variant="caption" color="text.secondary">
                      {result.secondaryText}
                    </Typography>
                  )}
                </Stack>
              </TableCell>
              <TableCell
                sx={{ minWidth: 220, ...selectableCellSx(rowIdx, 2) }}
                onClick={(e) => handleCellClick(e, rowIdx, 2)}
              >
                <Typography variant="body2">
                  {result.translation || t("words.none")}
                </Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 120 }}>
                {result.type === "famousQuote" ? null : result.imageUrl ? (
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
                sx={{ minWidth: 180, ...selectableCellSx(rowIdx, 4) }}
                onClick={(e) => handleCellClick(e, rowIdx, 4)}
              >
                <Typography variant="body2">
                  {formatWordFinderLocation(result, t("words.noDay"))}
                </Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 220 }}>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {result.type !== "famousQuote" && (
                    renderStatusChip(
                      result,
                      "image",
                      result.imageUrl ? t("words.hasImage") : t("words.missingImage"),
                      Boolean(result.imageUrl),
                      onMissingFieldClick,
                    )
                  )}
                  {result.type === "standard" && (
                    renderStatusChip(
                      result,
                      "pronunciation",
                      result.pronunciation
                        ? t("words.hasPronunciation")
                        : t("words.missingPronunciation"),
                      Boolean(result.pronunciation),
                      onMissingFieldClick,
                      true,
                    )
                  )}
                  {result.type !== "famousQuote" && (
                    renderStatusChip(
                      result,
                      "example",
                      result.example ? t("words.hasExample") : t("words.missingExample"),
                      Boolean(result.example),
                      result.schemaVariant === "jlpt" ? undefined : onMissingFieldClick,
                    )
                  )}
                  {renderStatusChip(
                    result,
                    "translation",
                    result.translation
                      ? t("words.hasTranslation")
                      : t("words.missingTranslation"),
                    Boolean(result.translation),
                    result.schemaVariant === "jlpt" ? undefined : onMissingFieldClick,
                  )}
                </Stack>
              </TableCell>
              <TableCell align="right">
                <Button
                  component={Link}
                  href={result.sourceHref}
                  size="small"
                  endIcon={<LaunchIcon />}
                >
                  {t("words.openSource")}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
