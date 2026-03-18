"use client";

import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import { useTranslation } from "react-i18next";

import InlineEditableText from "@/components/shared/InlineEditableText";
import WordFinderMissingFieldDialog from "@/components/words/WordFinderMissingFieldDialog";
import { updateWordTextField } from "@/lib/firebase/firestore";
import { getCourseById, type CourseId } from "@/types/course";
import type { CollocationWord, JlptWord, StandardWord, Word } from "@/types/word";
import { isCollocationWord, isFamousQuoteWord, isJlptWord } from "@/types/word";
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
  selected,
}: {
  text: string | undefined;
  onClick?: (e: MouseEvent<HTMLTableCellElement>) => void;
  selected?: boolean;
}) {
  const cellSx = {
    cursor: onClick ? "pointer" : undefined,
    bgcolor: selected ? "action.selected" : undefined,
    "&:hover": onClick ? { bgcolor: selected ? "action.selected" : "action.hover" } : undefined,
  };
  if (!text) return <TableCell onClick={onClick} sx={cellSx} />;

  const lines = text.split(DIALOGUE_SPLIT_REGEX);

  return (
    <TableCell onClick={onClick} sx={cellSx}>
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

interface WordTableProps {
  words: Word[];
  isCollocation: boolean;
  isJlpt?: boolean;
  isFamousQuote?: boolean;
  showImageUrl?: boolean;
  courseId?: CourseId;
  coursePath?: string;
  dayId?: string;
  onWordImageUpdated?: (wordId: string, imageUrl: string) => void;
  onWordFieldsUpdated?: (wordId: string, fields: WordFinderResultFieldUpdates) => void;
}

export default function WordTable({
  words,
  isCollocation,
  isJlpt,
  isFamousQuote,
  showImageUrl,
  courseId,
  coursePath,
  dayId,
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

  const activateInlineEdit = useCallback(
    (word: Word, field: CourseInlineEditableField) => {
      const editable = resolveCourseInlineEditField({
        word,
        isCollocation,
        isJlpt,
        isFamousQuote,
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
    [isCollocation, isJlpt, isFamousQuote],
  );

  const updateInlineDraft = useCallback((draft: string) => {
    setEditingCell((prev) => (prev ? { ...prev, draft, error: "" } : prev));
  }, []);

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
        }

        setEditingCell(null);
      } catch {
        setEditingCell((prev) =>
          prev ? { ...prev, saving: false, error: t("words.generateActionError") } : prev,
        );
      }
    },
    [coursePath, dayId, editingCell, isCollocation, isJlpt, isFamousQuote, t],
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
        />
      );
    },
    [
      activateInlineEdit,
      cancelInlineEdit,
      commitInlineEdit,
      editingCell,
      isCollocation,
      isJlpt,
      isFamousQuote,
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
        { isCollocation, isJlpt, isFamousQuote, showImageUrl },
        field,
      ),
    [isCollocation, isJlpt, isFamousQuote, showImageUrl],
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
      if (isCollocation && isCollocationWord(m)) {
        return [m.collocation, m.meaning, m.explanation, m.example, m.translation, ""];
      }
      if (isFamousQuote && isFamousQuoteWord(m)) {
        return [m.quote, m.author, m.translation];
      }
      const s = m as StandardWord;
      return [s.word, s.meaning, s.pronunciation, s.example, s.translation, ""];
    });
  }, [words, localWordUpdates, isJlpt, isCollocation, isFamousQuote]);

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
              ) : isFamousQuote ? (
                <>
                  <TableCell>{t("courses.quote")}</TableCell>
                  <TableCell>{t("courses.author")}</TableCell>
                  <TableCell>{t("courses.translation")}</TableCell>
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
                <TableRow key={word.id}>
                  {isCollocationWord(mergedWord) ? (
                  <>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 0)}
                      sx={selectableCellSx(rowIdx, 0)}
                    >
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.collocation, {
                        emptyLabel: t("courses.missingCollocationValue"),
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 1)}
                      sx={selectableCellSx(rowIdx, 1)}
                    >
                      {renderEditableTextCell(mergedWord, "meaning", mergedWord.meaning, {
                        emptyLabel: t("courses.missingMeaningValue"),
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 2)}
                      sx={selectableCellSx(rowIdx, 2)}
                    >
                      {mergedWord.explanation}
                    </TableCell>
                    {!isMissingField(mergedWord, "example") ? (
                      <ExampleCell
                        text={getResolvedTextField(word.id, "example") || mergedWord.example}
                        onClick={(e) => handleCellClick(e, rowIdx, 3)}
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
                      </TableCell>
                    )}
                  </>
                  ) : isJlptWord(mergedWord) ? (
                  <>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 0)}
                      sx={selectableCellSx(rowIdx, 0)}
                    >
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.word, {
                        emptyLabel: t("courses.missingWordValue"),
                        fontWeight: 500,
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 1)}
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
                      sx={selectableCellSx(rowIdx, 5)}
                    >
                      {renderEditableTextCell(mergedWord, "example", mergedWord.example, {
                        emptyLabel: t("words.none"),
                        textVariant: "body2",
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 6)}
                      sx={selectableCellSx(rowIdx, 6)}
                    >
                      {renderEditableTextCell(mergedWord, "exampleRoman", mergedWord.exampleRoman, {
                        emptyLabel: t("words.none"),
                        textVariant: "body2",
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 7)}
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
                      </TableCell>
                    )}
                  </>
                  ) : isFamousQuoteWord(mergedWord) ? (
                  <>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 0)}
                      sx={selectableCellSx(rowIdx, 0)}
                    >
                      {mergedWord.quote}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 1)}
                      sx={selectableCellSx(rowIdx, 1)}
                    >
                      {mergedWord.author}
                    </TableCell>
                    {mergedWord.translation || getResolvedTextField(word.id, "translation") ? (
                      <TableCell
                        onClick={(e) => handleCellClick(e, rowIdx, 2)}
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
                  </>
                  ) : (
                  <>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 0)}
                      sx={selectableCellSx(rowIdx, 0)}
                    >
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.word, {
                        emptyLabel: t("courses.missingWordValue"),
                        fontWeight: 500,
                      })}
                    </TableCell>
                    <TableCell
                      onClick={(e) => handleCellClick(e, rowIdx, 1)}
                      sx={selectableCellSx(rowIdx, 1)}
                    >
                      {renderEditableTextCell(mergedWord, "meaning", mergedWord.meaning, {
                        emptyLabel: t("courses.missingMeaningValue"),
                      })}
                    </TableCell>
                    <TableCell
                      onClick={() => openFieldModal(word.id, "pronunciation")}
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

      {activeResult && (
        <WordFinderMissingFieldDialog
          open={Boolean(activeField)}
          field={activeField}
          result={activeResult}
          onClose={closeFieldModal}
          onResolved={handleResolved}
        />
      )}
    </>
  );
}
