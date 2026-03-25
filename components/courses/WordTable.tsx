"use client";

import { useCallback, useEffect, useMemo, useState, type ClipboardEvent, type MouseEvent, type ReactNode } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";

import CellContextMenu from "@/components/shared/CellContextMenu";
import InlineEditableText from "@/components/shared/InlineEditableText";
import WordFinderMissingFieldDialog from "@/components/words/WordFinderMissingFieldDialog";
import { updateWordTextField, updateWordImageUrl } from "@/lib/firebase/firestore";
import { containsKorean } from "@/lib/utils/korean";
import { getCourseById, type CourseId } from "@/types/course";
import type { CollocationWord, JlptWord, PostfixWord, PrefixWord, StandardWord, Word } from "@/types/word";
import { isCollocationWord, isFamousQuoteWord, isJlptWord, isPostfixWord, isPrefixWord } from "@/types/word";
import {
  adaptCourseWordToWordFinderResult,
  applyCourseWordResolvedUpdates,
  isCourseWordFieldMissing,
} from "@/lib/wordFinderCourseAdapter";
import {
  applyCourseInlineEdit,
  resolveCourseInlineEditField,
  type CourseInlineEditableField,
} from "@/lib/wordFinderInlineEdit";
import type {
  WordFinderActionField,
  WordFinderResultFieldUpdates,
} from "@/types/wordFinder";

function hasTrimmedText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getWordTableColField(col: number, word: Word): WordFinderActionField | null {
  if (isPrefixWord(word) || isPostfixWord(word)) {
    if (col === 3 || col === 4) return "pronunciation";
    if (col === 5 || col === 6) return "example";
    if (col === 7 || col === 8) return "translation";
    return null;
  }
  if (isJlptWord(word)) {
    if (col === 3 || col === 4) return "pronunciation";
    if (col === 5 || col === 6) return "example";
    if (col === 7 || col === 8) return "translation";
    if (col === 9) return "image";
    return null;
  }
  if (isCollocationWord(word)) {
    if (col === 3) return "example";
    if (col === 4) return "translation";
    if (col === 5) return "image";
    return null;
  }
  if (isFamousQuoteWord(word)) {
    return col === 2 ? "translation" : null;
  }
  // Standard
  if (col === 2) return "pronunciation";
  if (col === 3) return "example";
  if (col === 4) return "translation";
  if (col === 5) return "image";
  return null;
}

function getWordTableColEditField(col: number, word: Word): CourseInlineEditableField | null {
  if (isPrefixWord(word) || isPostfixWord(word)) {
    if (col === 0) return "primaryText";
    if (col === 1) return "meaningEnglish";
    if (col === 2) return "meaningKorean";
    if (col === 5) return "example";
    if (col === 6) return "exampleRoman";
    if (col === 7) return "translationEnglish";
    if (col === 8) return "translationKorean";
    return null;
  }
  if (isJlptWord(word)) {
    if (col === 0) return "primaryText";
    if (col === 1) return "meaningEnglish";
    if (col === 2) return "meaningKorean";
    if (col === 5) return "example";
    if (col === 6) return "exampleRoman";
    if (col === 7) return "translationEnglish";
    if (col === 8) return "translationKorean";
    return null;
  }
  if (isCollocationWord(word) || (!isFamousQuoteWord(word))) {
    if (col === 0) return "primaryText";
    if (col === 1) return "meaning";
  }
  return null;
}

function canTranslateWordTableExample(col: number, word: Word): boolean {
  return (
    isJlptWord(word) &&
    col === 5 &&
    (hasTrimmedText(word.translationKorean) || hasTrimmedText(word.translationEnglish))
  );
}

// Detects "Name: text. Name: text" dialogue formatting.
// Supports plain names (Layne:) and numbered names (Neighbor 1:).
const DIALOGUE_SPLIT_REGEX =
  /(?<=[.?!])\s+(?!(?:Mr|Mrs|Ms|Dr|Prof)\b)(?=[A-Z][A-Za-z]+(?:\s+\d+)?:)/g;

// Matches the speaker name at the start of a dialogue line
const SPEAKER_LINE_REGEX = /^([A-Z][A-Za-z]+(?:\s+\d+)?):(.+)$/;
const ORDERED_ITEM_MARKER_REGEX = /(^|\s)(\d+\.)\s/g;

interface OrderedItem {
  marker: string;
  content: string;
}

function parseOrderedItems(text: string): OrderedItem[] | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const markers = Array.from(trimmed.matchAll(ORDERED_ITEM_MARKER_REGEX), (match) => {
    const start = match.index ?? 0;
    const leadingWhitespace = match[1] ?? "";
    const marker = match[2] ?? "";
    return {
      marker,
      markerStart: start + leadingWhitespace.length,
    };
  }).filter((item) => item.marker.length > 0);

  if (markers.length === 0 || markers[0].markerStart !== 0) {
    return null;
  }

  return markers.map((item, index) => {
    const contentStart = item.markerStart + item.marker.length + 1;
    const nextMarkerStart =
      index < markers.length - 1 ? markers[index + 1].markerStart : trimmed.length;
    return {
      marker: item.marker,
      content: trimmed.slice(contentStart, nextMarkerStart).trim(),
    };
  });
}

function OrderedItemRow({ item }: { item: OrderedItem }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "2ch 1fr",
        columnGap: "0.5ch",
      }}
    >
      <Typography variant="body2" sx={{ fontStyle: "normal" }}>
        {item.marker}
      </Typography>
      <Typography variant="body2" sx={{ fontStyle: "normal" }}>
        {item.content}
      </Typography>
    </Box>
  );
}

function ExampleCell({
  text,
  onClick,
  onContextMenu,
  selected,
}: {
  text: string | undefined;
  onClick?: (e: MouseEvent<HTMLTableCellElement>) => void;
  onContextMenu?: (e: MouseEvent<HTMLTableCellElement>) => void;
  selected?: boolean;
}) {
  const cellSx = {
    cursor: onClick ? "pointer" : undefined,
    bgcolor: selected ? "action.selected" : undefined,
    "&:hover": onClick ? { bgcolor: selected ? "action.selected" : "action.hover" } : undefined,
  };
  if (!text) return <TableCell onClick={onClick} onContextMenu={onContextMenu} sx={cellSx} />;

  const lines = text.split(DIALOGUE_SPLIT_REGEX);

  return (
    <TableCell onClick={onClick} onContextMenu={onContextMenu} sx={cellSx}>
      <Box
        sx={{
          borderLeft: "3px solid",
          borderColor: "primary.light",
          pl: 1.5,
          py: 0.5,
        }}
      >
        {lines.map((line, i) => {
          const match = line.match(SPEAKER_LINE_REGEX);
          if (match) {
            const dialogueText = match[2].trim();
            const orderedDialogueItems = parseOrderedItems(dialogueText);

            return (
              <Box key={i} sx={{ mb: i < lines.length - 1 ? 1 : 0 }}>
                {orderedDialogueItems ? (
                  <Box sx={{ display: "flex", alignItems: "flex-start" }}>
                    <Typography
                      component="span"
                      variant="body2"
                      color="primary.main"
                      fontWeight={600}
                    >
                      {match[1]}:
                    </Typography>
                    <Box sx={{ ml: 0.5, flex: 1 }}>
                      {orderedDialogueItems.map((item, orderedIndex) => (
                        <OrderedItemRow
                          key={`${i}-ordered-${orderedIndex}`}
                          item={item}
                        />
                      ))}
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography
                      component="span"
                      variant="body2"
                      color="primary.main"
                      fontWeight={600}
                    >
                      {match[1]}:
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ fontStyle: "normal", ml: 0.5 }}
                    >
                      {dialogueText}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          }

          const orderedItems = parseOrderedItems(line);
          if (!orderedItems) {
            return (
              <Typography
                key={i}
                variant="body2"
                sx={{ fontStyle: "normal", mb: i < lines.length - 1 ? 1 : 0 }}
              >
                {line}
              </Typography>
            );
          }

          return (
            <Box key={i} sx={{ mb: i < lines.length - 1 ? 1 : 0 }}>
              {orderedItems.map((item, orderedIndex) => (
                <OrderedItemRow key={`${i}-${orderedIndex}`} item={item} />
              ))}
            </Box>
          );
        })}
      </Box>
    </TableCell>
  );
}

type GeneratableField = "pronunciation" | "example" | "translation";
type WordTableLocalUpdates = Partial<
  Pick<StandardWord, "word" | "meaning" | "pronunciation" | "example" | "translation" | "imageUrl"> &
    Pick<
      JlptWord,
      | "word"
      | "meaningEnglish"
      | "meaningKorean"
      | "pronunciation"
      | "pronunciationRoman"
      | "example"
      | "exampleRoman"
      | "translationEnglish"
      | "translationKorean"
      | "imageUrl"
    > &
    Pick<PrefixWord, "prefix" | "meaningEnglish" | "meaningKorean" | "pronunciation" | "pronunciationRoman" | "example" | "exampleRoman" | "translationEnglish" | "translationKorean"> &
    Pick<PostfixWord, "postfix" | "meaningEnglish" | "meaningKorean" | "pronunciation" | "pronunciationRoman" | "example" | "exampleRoman" | "translationEnglish" | "translationKorean"> &
    Pick<CollocationWord, "collocation" | "meaning" | "example" | "translation" | "imageUrl">
>;

interface EditingCellState {
  wordId: string;
  field: CourseInlineEditableField;
  draft: string;
  saving: boolean;
  error: string;
}

interface CellPos {
  row: number;
  col: number;
}

interface ContextMenuState {
  anchorPosition: { top: number; left: number };
  row: number;
  col: number;
}

interface WordTableProps {
  words: Word[];
  isCollocation: boolean;
  isJlpt?: boolean;
  isFamousQuote?: boolean;
  isPrefix?: boolean;
  isPostfix?: boolean;
  showImageUrl?: boolean;
  courseId?: CourseId;
  coursePath?: string;
  dayId?: string;
  exitingWordIds?: Set<string>;
  onWordImageUpdated?: (wordId: string, imageUrl: string) => void;
  onWordFieldsUpdated?: (wordId: string, fields: WordFinderResultFieldUpdates) => void;
}

function filterJapanese(text: string): string {
  return text
    .replace(/[^\u3000-\u9FFF\uF900-\uFAFF\uFF01-\uFF9F\u31F0-\u31FF ]/g, "")
    .trim();
}

function extractRomanInBrackets(text: string): string {
  const regex = /\(([^)]+)\)|\[([^\]]+)\]/g;
  const parts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const inner = (match[1] ?? match[2]).trim();
    if (inner) parts.push(inner);
  }
  return parts.join(" ").trim();
}

export default function WordTable({
  words,
  isCollocation,
  isJlpt,
  isFamousQuote,
  isPrefix,
  isPostfix,
  showImageUrl,
  courseId,
  coursePath,
  dayId,
  exitingWordIds,
  onWordImageUpdated,
  onWordFieldsUpdated,
}: WordTableProps) {
  const { t } = useTranslation();
  const [localWordUpdates, setLocalWordUpdates] = useState<Record<string, WordTableLocalUpdates>>(
    {},
  );
  const [activeWordId, setActiveWordId] = useState("");
  const [activeField, setActiveField] = useState<WordFinderActionField | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<CellPos | null>(null);
  const [selectionExtent, setSelectionExtent] = useState<CellPos | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; success: boolean }>({ open: false, success: true });

  const courseLabel = useMemo(() => {
    if (!courseId) return "";
    return getCourseById(courseId)?.label ?? courseId;
  }, [courseId]);

  const activeWord = useMemo(
    () => words.find((word) => word.id === activeWordId) ?? null,
    [activeWordId, words],
  );

  const activeResult = useMemo(() => {
    if (!activeWord || !courseId || !coursePath || !courseLabel) return null;
    const mergedWord = { ...activeWord, ...localWordUpdates[activeWord.id] } as Word;

    return adaptCourseWordToWordFinderResult({
      word: mergedWord,
      courseId,
      courseLabel,
      coursePath,
      dayId,
      isCollocation,
      isJlpt,
      isFamousQuote,
      isPrefix,
      isPostfix,
    });
  }, [
    activeWord,
    courseId,
    courseLabel,
    coursePath,
    dayId,
    isCollocation,
    isJlpt,
    isFamousQuote,
    isPrefix,
    isPostfix,
    localWordUpdates,
  ]);

  const openFieldModal = (wordId: string, field: WordFinderActionField) => {
    setActiveWordId(wordId);
    setActiveField(field);
  };

  const closeFieldModal = () => {
    setActiveWordId("");
    setActiveField(null);
  };

  const getResolvedTextField = (wordId: string, field: GeneratableField): string => {
    const resolved = localWordUpdates[wordId];
    if (field === "pronunciation") {
      return resolved?.pronunciation ?? "";
    }
    if (field === "example") {
      return resolved?.example ?? "";
    }
    return resolved?.translation ?? "";
  };

  const getResolvedImage = (wordId: string): string => {
    return localWordUpdates[wordId]?.imageUrl ?? "";
  };

  const handleResolved = (updates: WordFinderResultFieldUpdates) => {
    if (!activeWordId || !activeWord) return;

    const mappedUpdates = applyCourseWordResolvedUpdates(activeWord, updates);

    setLocalWordUpdates((prev) => ({
      ...prev,
      [activeWordId]: {
        ...prev[activeWordId],
        ...mappedUpdates,
      },
    }));

    if (typeof mappedUpdates.imageUrl === "string") {
      onWordImageUpdated?.(activeWordId, mappedUpdates.imageUrl);
    }

    const fieldUpdates: WordFinderResultFieldUpdates = {};
    if (typeof mappedUpdates.pronunciation === "string") {
      fieldUpdates.pronunciation = mappedUpdates.pronunciation;
    }
    if (typeof mappedUpdates.pronunciationRoman === "string") {
      fieldUpdates.pronunciationRoman = mappedUpdates.pronunciationRoman;
    }
    if (typeof mappedUpdates.example === "string") {
      fieldUpdates.example = mappedUpdates.example;
    }
    if (typeof mappedUpdates.exampleRoman === "string") {
      fieldUpdates.exampleRoman = mappedUpdates.exampleRoman;
    }
    if (typeof mappedUpdates.translation === "string") {
      fieldUpdates.translation = mappedUpdates.translation;
    }
    if (typeof mappedUpdates.translationEnglish === "string") {
      fieldUpdates.translationEnglish = mappedUpdates.translationEnglish;
    }
    if (typeof mappedUpdates.translationKorean === "string") {
      fieldUpdates.translationKorean = mappedUpdates.translationKorean;
    }

    if (Object.keys(fieldUpdates).length > 0) {
      onWordFieldsUpdated?.(activeWordId, fieldUpdates);
    }
  };

  const handleRemoveImage = (wordId: string) => {
    setLocalWordUpdates((prev) => ({
      ...prev,
      [wordId]: { ...prev[wordId], imageUrl: "" },
    }));
    onWordImageUpdated?.(wordId, "");
    if (coursePath && dayId) {
      updateWordImageUrl(coursePath, dayId, wordId, "").catch(() => {});
    }
  };

  const activateInlineEdit = useCallback(
    (word: Word, field: CourseInlineEditableField) => {
      const editable = resolveCourseInlineEditField({
        word,
        isCollocation,
        isJlpt,
        isFamousQuote,
        isPrefix,
        isPostfix,
        field,
      });

      if (!editable) return;

      setEditingCell({
        wordId: word.id,
        field,
        draft: editable.value,
        saving: false,
        error: "",
      });
    },
    [isCollocation, isJlpt, isFamousQuote, isPrefix, isPostfix],
  );

  const updateInlineDraft = useCallback((draft: string) => {
    setEditingCell((prev) => (prev ? { ...prev, draft, error: "" } : prev));
  }, []);

  const handleJlptExamplePaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const raw = event.clipboardData.getData("text");
      let filtered = filterJapanese(raw);
      if (filtered && !filtered.endsWith("。")) {
        filtered += "。";
      }
      if (filtered) {
        updateInlineDraft(filtered);
      }
    },
    [updateInlineDraft],
  );

  const handleJlptExampleRomanPaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const raw = event.clipboardData.getData("text");
      const filtered = extractRomanInBrackets(raw);
      if (filtered) {
        updateInlineDraft(filtered);
      }
    },
    [updateInlineDraft],
  );

  const cancelInlineEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const commitInlineEdit = useCallback(
    async (word: Word) => {
      if (!editingCell || editingCell.wordId !== word.id || editingCell.saving) {
        return;
      }

      const editable = resolveCourseInlineEditField({
        word,
        isCollocation,
        isJlpt,
        isFamousQuote,
        field: editingCell.field,
      });

      if (!editable || !coursePath || !dayId) {
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
        await updateWordTextField(
          coursePath,
          dayId,
          word.id,
          editable.sourceField,
          nextValue,
        );

        const localUpdate = applyCourseInlineEdit(word, editingCell.field, nextValue);
        if (localUpdate) {
          setLocalWordUpdates((prev) => ({
            ...prev,
            [word.id]: {
              ...prev[word.id],
              ...localUpdate,
            },
          }));
          onWordFieldsUpdated?.(word.id, localUpdate);
        }

        setEditingCell(null);
      } catch {
        setEditingCell((prev) =>
          prev ? { ...prev, saving: false, error: t("words.generateActionError") } : prev,
        );
      }
    },
    [coursePath, dayId, editingCell, isCollocation, isJlpt, isFamousQuote, isPrefix, isPostfix, t],
  );

  const renderEditableTextCell = useCallback(
    (
      word: Word,
      field: CourseInlineEditableField,
      value: string,
      options?: {
        emptyLabel?: string;
        fontWeight?: number;
        textVariant?: "body1" | "body2";
      },
    ) => {
      const editable = resolveCourseInlineEditField({
        word,
        isCollocation,
        isJlpt,
        isFamousQuote,
        isPrefix,
        isPostfix,
        field,
      });
      const isEditing =
        editingCell?.wordId === word.id && editingCell.field === field;

      if (!editable) {
        return (
          <Typography variant={options?.textVariant ?? "body1"} fontWeight={options?.fontWeight}>
            {value}
          </Typography>
        );
      }

      return (
        <InlineEditableText
          value={value}
          emptyLabel={options?.emptyLabel}
          isEditing={isEditing}
          draft={isEditing ? editingCell.draft : value}
          saving={isEditing ? editingCell.saving : false}
          error={isEditing ? editingCell.error : ""}
          textVariant={options?.textVariant}
          fontWeight={options?.fontWeight}
          onActivate={() => activateInlineEdit(word, field)}
          onDraftChange={updateInlineDraft}
          onCommit={() => {
            void commitInlineEdit(word);
          }}
          onCancel={cancelInlineEdit}
          onPaste={
            (isJlpt || isPrefix || isPostfix) && field === "example"
              ? handleJlptExamplePaste
              : (isJlpt || isPrefix || isPostfix) && field === "exampleRoman"
                ? handleJlptExampleRomanPaste
                : undefined
          }
        />
      );
    },
    [
      activateInlineEdit,
      cancelInlineEdit,
      commitInlineEdit,
      editingCell,
      handleJlptExamplePaste,
      handleJlptExampleRomanPaste,
      isCollocation,
      isJlpt,
      isFamousQuote,
      isPrefix,
      isPostfix,
      updateInlineDraft,
    ],
  );

  function MissingFieldTrigger({
    wordId,
    field,
    tooltipKey,
    icon = <AutoFixHighIcon fontSize="small" />,
  }: {
    wordId: string;
    field: WordFinderActionField;
    tooltipKey: string;
    icon?: ReactNode;
  }) {
    return (
      <TableCell>
        <Tooltip title={t(tooltipKey)}>
          <IconButton
            size="small"
            onClick={() => openFieldModal(wordId, field)}
            sx={{ p: 0 }}
          >
            {icon}
          </IconButton>
        </Tooltip>
      </TableCell>
    );
  }

  const isMissingField = useCallback(
    (word: Word, field: WordFinderActionField | "primaryText" | "meaning") =>
      isCourseWordFieldMissing(
        word,
        { isCollocation, isJlpt, isFamousQuote, isPrefix, isPostfix, showImageUrl },
        field,
      ),
    [isCollocation, isJlpt, isFamousQuote, isPrefix, isPostfix, showImageUrl],
  );

  // 2D grid of copyable text per cell, schema-aware.
  const cellGrid = useMemo(() => {
    return words.map((word) => {
      const m = { ...word, ...localWordUpdates[word.id] } as Word;
      if (isJlpt && isJlptWord(m)) {
        return [
          m.word, m.meaningEnglish, m.meaningKorean,
          m.pronunciation, m.pronunciationRoman,
          m.example, m.exampleRoman,
          m.translationEnglish, m.translationKorean,
          "", // image
        ];
      }
      if (isPrefix && isPrefixWord(m)) {
        return [
          m.prefix, m.meaningEnglish, m.meaningKorean,
          m.pronunciation, m.pronunciationRoman,
          m.example, m.exampleRoman,
          m.translationEnglish, m.translationKorean,
        ];
      }
      if (isPostfix && isPostfixWord(m)) {
        return [
          m.postfix, m.meaningEnglish, m.meaningKorean,
          m.pronunciation, m.pronunciationRoman,
          m.example, m.exampleRoman,
          m.translationEnglish, m.translationKorean,
        ];
      }
      if (isCollocation && isCollocationWord(m)) {
        return [m.collocation, m.meaning, m.explanation, m.example, m.translation, ""];
      }
      if (isFamousQuote && isFamousQuoteWord(m)) {
        return [m.quote, m.author, m.translation, m.language ?? ''];
      }
      const s = m as StandardWord;
      return [s.word, s.meaning, s.pronunciation, s.example, s.translation, ""];
    });
  }, [words, localWordUpdates, isJlpt, isCollocation, isFamousQuote, isPrefix, isPostfix]);

  const contextMenuWord = useMemo(() => {
    if (!contextMenu) return null;
    const word = words[contextMenu.row];
    if (!word) return null;
    return { ...word, ...localWordUpdates[word.id] } as Word;
  }, [contextMenu, words, localWordUpdates]);

  const contextMenuField = useMemo(
    () =>
      contextMenu && contextMenuWord
        ? getWordTableColField(contextMenu.col, contextMenuWord)
        : null,
    [contextMenu, contextMenuWord],
  );

  const contextMenuEditField = useMemo(
    () =>
      contextMenu && contextMenuWord
        ? getWordTableColEditField(contextMenu.col, contextMenuWord)
        : null,
    [contextMenu, contextMenuWord],
  );

  const contextMenuCanTranslate = useMemo(
    () =>
      contextMenu && contextMenuWord
        ? canTranslateWordTableExample(contextMenu.col, contextMenuWord)
        : false,
    [contextMenu, contextMenuWord],
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
    async (anchor: CellPos, extent: CellPos) => {
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
      try {
        await navigator.clipboard.writeText(rows.join("\n"));
        setCopySnackbar({ open: true, success: true });
      } catch {
        setCopySnackbar({ open: true, success: false });
      }
    },
    [cellGrid],
  );

  const handleCellContextMenu = useCallback(
    (e: MouseEvent, row: number, col: number) => {
      e.preventDefault();
      if (!isCellSelected(row, col)) {
        setSelectionAnchor({ row, col });
        setSelectionExtent({ row, col });
      }
      setContextMenu({ anchorPosition: { top: e.clientY, left: e.clientX }, row, col });
    },
    [isCellSelected],
  );

  const handleContextMenuCopy = useCallback(() => {
    if (!selectionAnchor || !selectionExtent) return;
    void copyRangeToClipboard(selectionAnchor, selectionExtent);
  }, [selectionAnchor, selectionExtent, copyRangeToClipboard]);

  const handleContextMenuGenerate = useCallback(() => {
    if (!contextMenu) return;
    const { row, col } = contextMenu;
    const word = words[row];
    if (!word) return;
    const mergedWord = { ...word, ...localWordUpdates[word.id] } as Word;
    const field = getWordTableColField(col, mergedWord);
    if (!field) return;
    openFieldModal(word.id, field);
  }, [contextMenu, words, localWordUpdates]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContextMenuEdit = useCallback(() => {
    if (!contextMenu) return;
    const { row, col } = contextMenu;
    const word = words[row];
    if (!word) return;
    const mergedWord = { ...word, ...localWordUpdates[word.id] } as Word;
    const editField = getWordTableColEditField(col, mergedWord);
    if (!editField) return;
    activateInlineEdit(mergedWord, editField);
  }, [contextMenu, words, localWordUpdates, activateInlineEdit]);

  const handleContextMenuTranslate = useCallback(async () => {
    if (!contextMenu || !coursePath || !dayId) return;

    const { row, col } = contextMenu;
    const word = words[row];
    if (!word) return;

    const mergedWord = { ...word, ...localWordUpdates[word.id] } as Word;
    if (!canTranslateWordTableExample(col, mergedWord)) return;

    if (!isJlptWord(mergedWord)) return;

    const translationKorean = hasTrimmedText(mergedWord.translationKorean)
      ? mergedWord.translationKorean
      : undefined;
    const translationEnglish = hasTrimmedText(mergedWord.translationEnglish)
      ? mergedWord.translationEnglish
      : undefined;

    if (!translationKorean && !translationEnglish) return;

    try {
      const response = await fetch("/api/admin/translate-word-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "jlpt-example",
          translationKorean,
          translationEnglish,
          provider: "deepl",
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        example?: string;
      };

      if (!response.ok || !hasTrimmedText(payload.example)) {
        throw new Error(payload.error || t("words.generateActionError"));
      }

      await updateWordTextField(
        coursePath,
        dayId,
        mergedWord.id,
        "example",
        payload.example,
      );

      setLocalWordUpdates((prev) => ({
        ...prev,
        [mergedWord.id]: {
          ...prev[mergedWord.id],
          example: payload.example,
        },
      }));
      onWordFieldsUpdated?.(mergedWord.id, { example: payload.example });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : t("words.generateActionError"),
      );
    }
  }, [
    contextMenu,
    coursePath,
    dayId,
    localWordUpdates,
    onWordFieldsUpdated,
    t,
    words,
  ]);

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
        setSelectionExtent({ row, col });
      } else {
        setSelectionAnchor({ row, col });
        setSelectionExtent({ row, col });
      }
    },
    [selectionAnchor],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectionAnchor(null);
        setSelectionExtent(null);
        return;
      }
      if (!editingCell && e.key === "c" && (e.metaKey || e.ctrlKey) && selectionAnchor && selectionExtent) {
        e.preventDefault();
        void copyRangeToClipboard(selectionAnchor, selectionExtent);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectionAnchor, selectionExtent, copyRangeToClipboard, editingCell]);

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              {isCollocation ? (
                <>
                  <TableCell>{t("courses.collocation")}</TableCell>
                  <TableCell>{t("courses.meaning")}</TableCell>
                  <TableCell>{t("courses.explanation")}</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>{t("courses.translation")}</TableCell>
                  {showImageUrl && <TableCell>{t("courses.image", "Image")}</TableCell>}
                </>
              ) : isJlpt ? (
                <>
                  <TableCell>{t("courses.word")}</TableCell>
                  <TableCell>Meaning (English)</TableCell>
                  <TableCell>Meaning (Korean)</TableCell>
                  <TableCell>{t("courses.pronunciation")}</TableCell>
                  <TableCell>Pronunciation (Roman)</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>Example (Roman)</TableCell>
                  <TableCell>Translation (English)</TableCell>
                  <TableCell>Translation (Korean)</TableCell>
                  {showImageUrl && <TableCell>{t("courses.image", "Image")}</TableCell>}
                </>
              ) : isPrefix ? (
                <>
                  <TableCell>Prefix</TableCell>
                  <TableCell>Meaning (English)</TableCell>
                  <TableCell>Meaning (Korean)</TableCell>
                  <TableCell>{t("courses.pronunciation")}</TableCell>
                  <TableCell>Pronunciation (Roman)</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>Example (Roman)</TableCell>
                  <TableCell>Translation (English)</TableCell>
                  <TableCell>Translation (Korean)</TableCell>
                </>
              ) : isPostfix ? (
                <>
                  <TableCell>Postfix</TableCell>
                  <TableCell>Meaning (English)</TableCell>
                  <TableCell>Meaning (Korean)</TableCell>
                  <TableCell>{t("courses.pronunciation")}</TableCell>
                  <TableCell>Pronunciation (Roman)</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>Example (Roman)</TableCell>
                  <TableCell>Translation (English)</TableCell>
                  <TableCell>Translation (Korean)</TableCell>
                </>
              ) : isFamousQuote ? (
                <>
                  <TableCell>{t("courses.quote")}</TableCell>
                  <TableCell>{t("courses.author")}</TableCell>
                  <TableCell>{t("courses.translation")}</TableCell>
                  <TableCell>{t("courses.language")}</TableCell>
                </>
              ) : (
                <>
                  <TableCell>{t("courses.word")}</TableCell>
                  <TableCell>{t("courses.meaning")}</TableCell>
                  <TableCell>{t("courses.pronunciation")}</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>{t("courses.translation")}</TableCell>
                  {showImageUrl && <TableCell>{t("courses.image", "Image")}</TableCell>}
                </>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {words.map((word, rowIdx) => {
              const mergedWord = { ...word, ...localWordUpdates[word.id] } as Word;

              return (
                <TableRow
                  key={word.id}
                  id={word.id}
                  sx={exitingWordIds?.has(word.id) ? {
                    animation: "rowFadeOut 350ms ease forwards",
                    "@keyframes rowFadeOut": {
                      from: { opacity: 1, transform: "translateX(0)" },
                      to: { opacity: 0, transform: "translateX(-16px)" },
                    },
                    pointerEvents: "none",
                  } : undefined}
                >
                  {isCollocationWord(mergedWord) ? (
                  <>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 0)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 0)}
                      sx={selectableCellSx(rowIdx, 0)}
                    >
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.collocation, {
                        emptyLabel: t("courses.missingCollocationValue"),
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 1)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 1)}
                      sx={selectableCellSx(rowIdx, 1)}
                    >
                      {renderEditableTextCell(mergedWord, "meaning", mergedWord.meaning, {
                        emptyLabel: t("courses.missingMeaningValue"),
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 2)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 2)}
                      sx={selectableCellSx(rowIdx, 2)}
                    >
                      {mergedWord.explanation}
                    </TableCell>
                    {!isMissingField(mergedWord, "example") ? (
                      <ExampleCell
                        text={getResolvedTextField(word.id, "example") || mergedWord.example}
                        onClick={(e) => handleCellClick(e, rowIdx, 3)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                        selected={isCellSelected(rowIdx, 3)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="example"
                        tooltipKey="words.generateNewExamples"
                      />
                    )}
                    {!isMissingField(mergedWord, "translation") ? (
                      <ExampleCell
                        text={
                          getResolvedTextField(word.id, "translation") || mergedWord.translation
                        }
                        onClick={(e) => handleCellClick(e, rowIdx, 4)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 4)}
                        selected={isCellSelected(rowIdx, 4)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="translation"
                        tooltipKey="words.generateNewTranslations"
                      />
                    )}
                    {showImageUrl && (
                      <TableCell>
                        <Box
                          sx={{
                            position: "relative",
                            display: "inline-flex",
                            "&:hover .remove-img-btn": { opacity: 1 },
                          }}
                        >
                          <Tooltip title={t("words.generateNewImage")}>
                            <IconButton
                              size="small"
                              onClick={() => openFieldModal(word.id, "image")}
                              sx={{ p: 0 }}
                            >
                              {!isMissingField(mergedWord, "image") ? (
                                <Box
                                  component="img"
                                  src={getResolvedImage(word.id) || mergedWord.imageUrl}
                                  alt={mergedWord.collocation}
                                  sx={{
                                    width: 64,
                                    height: 64,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                  }}
                                />
                              ) : (
                                <AddPhotoAlternateIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          {!isMissingField(mergedWord, "image") && (
                            <Tooltip title={t("words.removeImage")}>
                              <IconButton
                                className="remove-img-btn"
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(word.id); }}
                                sx={{
                                  position: "absolute",
                                  top: -6,
                                  right: -6,
                                  opacity: 0,
                                  transition: "opacity 0.15s",
                                  bgcolor: "background.paper",
                                  border: "1px solid",
                                  borderColor: "divider",
                                  p: "2px",
                                  "&:hover": { bgcolor: "error.main", color: "white", borderColor: "error.main" },
                                }}
                              >
                                <CloseIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </>
                  ) : isJlptWord(mergedWord) ? (
                  <>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 0)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 0)}
                      sx={selectableCellSx(rowIdx, 0)}
                    >
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.word, {
                        emptyLabel: t("courses.missingWordValue"),
                        fontWeight: 500,
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 1)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 1)}
                      sx={selectableCellSx(rowIdx, 1)}
                    >
                      {renderEditableTextCell(
                        mergedWord,
                        "meaningEnglish",
                        mergedWord.meaningEnglish,
                        { emptyLabel: t("courses.missingMeaningValue") },
                      )}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 2)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 2)}
                      sx={selectableCellSx(rowIdx, 2)}
                    >
                      {renderEditableTextCell(
                        mergedWord,
                        "meaningKorean",
                        mergedWord.meaningKorean,
                        { emptyLabel: t("courses.missingMeaningValue") },
                      )}
                    </TableCell>
                    <TableCell
                      onClick={() => openFieldModal(word.id, "pronunciation")}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                      sx={selectableCellSx(rowIdx, 3)}
                    >
                      {!isMissingField(mergedWord, "pronunciation") ? (
                        mergedWord.pronunciation
                      ) : (
                        <Tooltip title={t("courses.generatePronunciation")}>
                          <AutoFixHighIcon fontSize="small" color="action" />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell
                      onClick={() => openFieldModal(word.id, "pronunciation")}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 4)}
                      sx={selectableCellSx(rowIdx, 4)}
                    >
                      {!isMissingField(mergedWord, "pronunciation") ? (
                        mergedWord.pronunciationRoman
                      ) : (
                        <Tooltip title={t("courses.generatePronunciation")}>
                          <AutoFixHighIcon fontSize="small" color="action" />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 5)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 5)}
                      sx={{
                        ...selectableCellSx(rowIdx, 5),
                        ...(containsKorean(mergedWord.example) && {
                          outline: "2px solid",
                          outlineColor: "warning.main",
                        }),
                      }}
                    >
                      {renderEditableTextCell(mergedWord, "example", mergedWord.example, {
                        emptyLabel: t("words.none"),
                        textVariant: "body2",
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 6)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 6)}
                      sx={selectableCellSx(rowIdx, 6)}
                    >
                      {renderEditableTextCell(mergedWord, "exampleRoman", mergedWord.exampleRoman, {
                        emptyLabel: t("words.none"),
                        textVariant: "body2",
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 7)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 7)}
                      sx={selectableCellSx(rowIdx, 7)}
                    >
                      {renderEditableTextCell(
                        mergedWord,
                        "translationEnglish",
                        mergedWord.translationEnglish,
                        {
                          emptyLabel: t("words.none"),
                          textVariant: "body2",
                        },
                      )}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 8)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 8)}
                      sx={selectableCellSx(rowIdx, 8)}
                    >
                      {renderEditableTextCell(
                        mergedWord,
                        "translationKorean",
                        mergedWord.translationKorean,
                        {
                          emptyLabel: t("words.none"),
                          textVariant: "body2",
                        },
                      )}
                    </TableCell>
                    {showImageUrl && (
                      <TableCell>
                        <Box
                          sx={{
                            position: "relative",
                            display: "inline-flex",
                            "&:hover .remove-img-btn": { opacity: 1 },
                          }}
                        >
                          <Tooltip title={t("words.generateNewImage")}>
                            <IconButton
                              size="small"
                              onClick={() => openFieldModal(word.id, "image")}
                              sx={{ p: 0 }}
                            >
                              {!isMissingField(mergedWord, "image") ? (
                                <Box
                                  component="img"
                                  src={getResolvedImage(word.id) || mergedWord.imageUrl}
                                  alt={mergedWord.word}
                                  sx={{
                                    width: 64,
                                    height: 64,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                  }}
                                />
                              ) : (
                                <AddPhotoAlternateIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          {!isMissingField(mergedWord, "image") && (
                            <Tooltip title={t("words.removeImage")}>
                              <IconButton
                                className="remove-img-btn"
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(word.id); }}
                                sx={{
                                  position: "absolute",
                                  top: -6,
                                  right: -6,
                                  opacity: 0,
                                  transition: "opacity 0.15s",
                                  bgcolor: "background.paper",
                                  border: "1px solid",
                                  borderColor: "divider",
                                  p: "2px",
                                  "&:hover": { bgcolor: "error.main", color: "white", borderColor: "error.main" },
                                }}
                              >
                                <CloseIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </>
                  ) : isPrefixWord(mergedWord) ? (
                  <>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 0)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 0)} sx={selectableCellSx(rowIdx, 0)}>
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.prefix, { emptyLabel: t("courses.missingWordValue"), fontWeight: 500 })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 1)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 1)} sx={selectableCellSx(rowIdx, 1)}>
                      {renderEditableTextCell(mergedWord, "meaningEnglish", mergedWord.meaningEnglish, { emptyLabel: t("courses.missingMeaningValue") })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 2)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 2)} sx={selectableCellSx(rowIdx, 2)}>
                      {renderEditableTextCell(mergedWord, "meaningKorean", mergedWord.meaningKorean, { emptyLabel: t("courses.missingMeaningValue") })}
                    </TableCell>
                    <TableCell onClick={() => openFieldModal(word.id, "pronunciation")} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)} sx={selectableCellSx(rowIdx, 3)}>
                      {!isMissingField(mergedWord, "pronunciation") ? mergedWord.pronunciation : <Tooltip title={t("courses.generatePronunciation")}><AutoFixHighIcon fontSize="small" color="action" /></Tooltip>}
                    </TableCell>
                    <TableCell onClick={() => openFieldModal(word.id, "pronunciation")} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 4)} sx={selectableCellSx(rowIdx, 4)}>
                      {!isMissingField(mergedWord, "pronunciation") ? mergedWord.pronunciationRoman : <Tooltip title={t("courses.generatePronunciation")}><AutoFixHighIcon fontSize="small" color="action" /></Tooltip>}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 5)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 5)} sx={selectableCellSx(rowIdx, 5)}>
                      {renderEditableTextCell(mergedWord, "example", mergedWord.example, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 6)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 6)} sx={selectableCellSx(rowIdx, 6)}>
                      {renderEditableTextCell(mergedWord, "exampleRoman", mergedWord.exampleRoman, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 7)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 7)} sx={selectableCellSx(rowIdx, 7)}>
                      {renderEditableTextCell(mergedWord, "translationEnglish", mergedWord.translationEnglish, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 8)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 8)} sx={selectableCellSx(rowIdx, 8)}>
                      {renderEditableTextCell(mergedWord, "translationKorean", mergedWord.translationKorean, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                  </>
                  ) : isPostfixWord(mergedWord) ? (
                  <>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 0)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 0)} sx={selectableCellSx(rowIdx, 0)}>
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.postfix, { emptyLabel: t("courses.missingWordValue"), fontWeight: 500 })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 1)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 1)} sx={selectableCellSx(rowIdx, 1)}>
                      {renderEditableTextCell(mergedWord, "meaningEnglish", mergedWord.meaningEnglish, { emptyLabel: t("courses.missingMeaningValue") })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 2)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 2)} sx={selectableCellSx(rowIdx, 2)}>
                      {renderEditableTextCell(mergedWord, "meaningKorean", mergedWord.meaningKorean, { emptyLabel: t("courses.missingMeaningValue") })}
                    </TableCell>
                    <TableCell onClick={() => openFieldModal(word.id, "pronunciation")} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)} sx={selectableCellSx(rowIdx, 3)}>
                      {!isMissingField(mergedWord, "pronunciation") ? mergedWord.pronunciation : <Tooltip title={t("courses.generatePronunciation")}><AutoFixHighIcon fontSize="small" color="action" /></Tooltip>}
                    </TableCell>
                    <TableCell onClick={() => openFieldModal(word.id, "pronunciation")} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 4)} sx={selectableCellSx(rowIdx, 4)}>
                      {!isMissingField(mergedWord, "pronunciation") ? mergedWord.pronunciationRoman : <Tooltip title={t("courses.generatePronunciation")}><AutoFixHighIcon fontSize="small" color="action" /></Tooltip>}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 5)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 5)} sx={selectableCellSx(rowIdx, 5)}>
                      {renderEditableTextCell(mergedWord, "example", mergedWord.example, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 6)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 6)} sx={selectableCellSx(rowIdx, 6)}>
                      {renderEditableTextCell(mergedWord, "exampleRoman", mergedWord.exampleRoman, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 7)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 7)} sx={selectableCellSx(rowIdx, 7)}>
                      {renderEditableTextCell(mergedWord, "translationEnglish", mergedWord.translationEnglish, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell onClick={(e) => handleCellClick(e, rowIdx, 8)} onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 8)} sx={selectableCellSx(rowIdx, 8)}>
                      {renderEditableTextCell(mergedWord, "translationKorean", mergedWord.translationKorean, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                  </>
                  ) : isFamousQuoteWord(mergedWord) ? (
                  <>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 0)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 0)}
                      sx={selectableCellSx(rowIdx, 0)}
                    >
                      {mergedWord.quote}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 1)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 1)}
                      sx={selectableCellSx(rowIdx, 1)}
                    >
                      {mergedWord.author}
                    </TableCell>
                    {mergedWord.translation || getResolvedTextField(word.id, "translation") ? (
                      <TableCell
                        onClick={(e) => handleCellClick(e, rowIdx, 2)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 2)}
                        sx={selectableCellSx(rowIdx, 2)}
                      >
                        {getResolvedTextField(word.id, "translation") || mergedWord.translation}
                      </TableCell>
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="translation"
                        tooltipKey="words.useSharedTranslations"
                      />
                    )}
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 3)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                      sx={selectableCellSx(rowIdx, 3)}
                    >
                      {mergedWord.language ?? ''}
                    </TableCell>
                  </>
                  ) : (
                  <>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 0)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 0)}
                      sx={selectableCellSx(rowIdx, 0)}
                    >
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.word, {
                        emptyLabel: t("courses.missingWordValue"),
                        fontWeight: 500,
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 1)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 1)}
                      sx={selectableCellSx(rowIdx, 1)}
                    >
                      {renderEditableTextCell(mergedWord, "meaning", mergedWord.meaning, {
                        emptyLabel: t("courses.missingMeaningValue"),
                      })}
                    </TableCell>
                    <TableCell
                      onClick={() => openFieldModal(word.id, "pronunciation")}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 2)}
                      sx={selectableCellSx(rowIdx, 2)}
                    >
                      {!isMissingField(mergedWord, "pronunciation") ? (
                        getResolvedTextField(word.id, "pronunciation") || mergedWord.pronunciation
                      ) : (
                        <Tooltip title={t("courses.generatePronunciation")}>
                          <AutoFixHighIcon fontSize="small" color="action" />
                        </Tooltip>
                      )}
                    </TableCell>
                    {!isMissingField(mergedWord, "example") ? (
                      <ExampleCell
                        text={getResolvedTextField(word.id, "example") || mergedWord.example}
                        onClick={(e) => handleCellClick(e, rowIdx, 3)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                        selected={isCellSelected(rowIdx, 3)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="example"
                        tooltipKey="courses.generateExample"
                      />
                    )}
                    {!isMissingField(mergedWord, "translation") ? (
                      <ExampleCell
                        text={
                          getResolvedTextField(word.id, "translation") || mergedWord.translation
                        }
                        onClick={(e) => handleCellClick(e, rowIdx, 4)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 4)}
                        selected={isCellSelected(rowIdx, 4)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="translation"
                        tooltipKey="courses.generateTranslation"
                      />
                    )}
                    {showImageUrl && (
                      <TableCell>
                        <Box
                          sx={{
                            position: "relative",
                            display: "inline-flex",
                            "&:hover .remove-img-btn": { opacity: 1 },
                          }}
                        >
                          <Tooltip title={t("words.generateNewImage")}>
                            <IconButton
                              size="small"
                              onClick={() => openFieldModal(word.id, "image")}
                              sx={{ p: 0 }}
                            >
                              {!isMissingField(mergedWord, "image") ? (
                                <Box
                                  component="img"
                                  src={getResolvedImage(word.id) || mergedWord.imageUrl}
                                  alt={mergedWord.word}
                                  sx={{
                                    width: 64,
                                    height: 64,
                                    objectFit: "cover",
                                    borderRadius: 1,
                                  }}
                                />
                              ) : (
                                <AddPhotoAlternateIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                          {!isMissingField(mergedWord, "image") && (
                            <Tooltip title={t("words.removeImage")}>
                              <IconButton
                                className="remove-img-btn"
                                size="small"
                                onClick={(e) => { e.stopPropagation(); handleRemoveImage(word.id); }}
                                sx={{
                                  position: "absolute",
                                  top: -6,
                                  right: -6,
                                  opacity: 0,
                                  transition: "opacity 0.15s",
                                  bgcolor: "background.paper",
                                  border: "1px solid",
                                  borderColor: "divider",
                                  p: "2px",
                                  "&:hover": { bgcolor: "error.main", color: "white", borderColor: "error.main" },
                                }}
                              >
                                <CloseIcon sx={{ fontSize: 12 }} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    )}
                  </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <CellContextMenu
        anchorPosition={contextMenu?.anchorPosition ?? null}
        onClose={() => setContextMenu(null)}
        onCopy={handleContextMenuCopy}
        onEdit={contextMenuEditField ? handleContextMenuEdit : null}
        onTranslate={contextMenuCanTranslate ? handleContextMenuTranslate : null}
        translateLabel={
          contextMenuCanTranslate ? "correct it with DeepL" : undefined
        }
        onGenerate={contextMenuField ? handleContextMenuGenerate : null}
      />

      {activeResult && (
        <WordFinderMissingFieldDialog
          open={Boolean(activeField)}
          field={activeField}
          result={activeResult}
          onClose={closeFieldModal}
          onResolved={handleResolved}
        />
      )}

      <Snackbar
        open={copySnackbar.open}
        autoHideDuration={1500}
        onClose={() => setCopySnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={copySnackbar.success ? "success" : "error"}
          onClose={() => setCopySnackbar((prev) => ({ ...prev, open: false }))}
        >
          {copySnackbar.success ? t("common.copied") : t("common.copyFailed")}
        </Alert>
      </Snackbar>
    </>
  );
}
