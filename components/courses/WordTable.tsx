"use client";

import { useCallback, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { type TableCellProps } from "@mui/material/TableCell";
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
import Stack from "@mui/material/Stack";
import type { Theme } from "@mui/material/styles";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import { useTranslation } from "react-i18next";

import CellContextMenu from "@/components/shared/CellContextMenu";
import InlineEditableText from "@/components/shared/InlineEditableText";
import WordFinderMissingFieldDialog from "@/components/words/WordFinderMissingFieldDialog";
import { addFuriganaText } from "@/lib/addFurigana";
import { analyzeSentence } from "@/lib/analyzeText";
import {
  type EditableWordTextField,
  updateCollectionWordDerivatives,
  updateCollectionWordImageUrl,
  updateCollectionWordTextField,
  updateSingleListWordDerivatives,
  updateSingleListWordImageUrl,
  updateSingleListWordTextField,
  updateWordDerivatives,
  updateWordImageUrl,
  updateWordTextField,
} from "@/lib/firebase/firestore";
import {
  isDerivativeGenerationEligibleResult,
} from "@/lib/derivativeGeneration";
import { containsKorean } from "@/lib/utils/korean";
import { capitalizeFirstCharacter, insertNumberedBreaks } from "@/lib/utils/textFormat";
import {
  findSpreadsheetBoundary,
  focusSpreadsheetCell,
  getArrowDirection,
  isEditableEventTarget,
  isPlatformJumpModifier,
  moveCell,
  type CellCoord,
} from "@/lib/utils/spreadsheetNavigation";
import { supportsDerivativeCourse } from "@/constants/supportedDerivativeCourses";
import { getCourseById, type CourseId } from "@/types/course";
import type { CourseDayMissingField } from "@/types/courseDayMissingField";
import type { CollocationWord, ExtremelyAdvancedWord, JlptWord, KanjiWord, PostfixWord, PrefixWord, StandardWord, Word } from "@/types/word";
import DerivativeEditDialog from "@/components/courses/DerivativeEditDialog";
import { isCollocationWord, isFamousQuoteWord, isIdiomWord, isJlptWord, isKanjiWord, isPostfixWord, isPrefixWord } from "@/types/word";
import {
  isKanjiNestedListGroup,
  type KanjiNestedListGroup,
} from "@/lib/kanjiNestedList";
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

type FuriganaActionField = Extract<WordFinderActionField, "pronunciation" | "example">;

interface AnalyzeActionRequest {
  sentence: string;
  targetBaseForm: string;
}

function hasTrimmedText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function formatDerivativeCellValue(
  derivative?: Array<{ word: string; meaning: string }>,
): string {
  if (!Array.isArray(derivative) || derivative.length === 0) {
    return "";
  }

  return derivative
    .map((item) => `${item.word}: ${item.meaning}`)
    .join("\n");
}

function getWordTableColField(
  col: number,
  word: Word,
  showImageUrl?: boolean,
  supportsDerivatives?: boolean,
  hasSynonymColumn = false,
  isExtremelyAdvanced = false,
  isJlptExampleHuriganaMode = false,
): WordFinderActionField | null {
  if (isPrefixWord(word) || isPostfixWord(word)) {
    if (col === 3) return "pronunciation";
    if (col === 4) return "example";
    if (col === 5 || col === 6) return "translation";
    return null;
  }
  if (isJlptWord(word)) {
    if (isJlptExampleHuriganaMode) {
      if (col === 3) return "example";
      if (col === 4) return "exampleHurigana";
      if (showImageUrl && col === 5) return "image";
      return null;
    }
    if (col === 3) return "pronunciation";
    if (col === 4) return "example";
    if (col === 5) return "exampleHurigana";
    if (col === 6 || col === 7) return "translation";
    if (col === 8) return "image";
    return null;
  }
  if (isCollocationWord(word)) {
    if (col === 3) return "example";
    if (col === 4) return "translation";
    if (col === 5) return "image";
    return null;
  }
  if (isIdiomWord(word)) {
    if (col === 2) return "example";
    if (col === 3) return "translation";
    if (col === 4) return "image";
    return null;
  }
  if (isFamousQuoteWord(word)) {
    return col === 2 ? "translation" : null;
  }
  if (isExtremelyAdvanced) {
    if (col === 2) return "example";
    if (col === 3) return "translation";
    if (showImageUrl && col === 4) return "image";
    return null;
  }
  // Standard
  const pronunciationCol = hasSynonymColumn ? 3 : 2;
  const exampleCol = pronunciationCol + 1;
  const translationCol = exampleCol + 1;
  const imageCol = translationCol + 1;
  const derivativeCol = imageCol + (showImageUrl ? 1 : 0);

  if (col === pronunciationCol) return "pronunciation";
  if (col === exampleCol) return "example";
  if (col === translationCol) return "translation";
  if (showImageUrl && col === imageCol) return "image";
  if (
    supportsDerivatives &&
    col === derivativeCol
  ) {
    return "derivative";
  }
  return null;
}

function getWordTableColEditField(
  col: number,
  word: Word,
  hasSynonymColumn = false,
  isExtremelyAdvanced = false,
  isJlptExampleHuriganaMode = false,
): CourseInlineEditableField | null {
  if (isPrefixWord(word) || isPostfixWord(word)) {
    if (col === 0) return "primaryText";
    if (col === 1) return "meaningEnglish";
    if (col === 2) return "meaningKorean";
    if (col === 3) return "pronunciation";
    if (col === 4) return "example";
    if (col === 5) return "translationEnglish";
    if (col === 6) return "translationKorean";
    return null;
  }
  if (isJlptWord(word)) {
    if (isJlptExampleHuriganaMode) {
      if (col === 0) return "primaryText";
      if (col === 1) return "meaningEnglish";
      if (col === 2) return "meaningKorean";
      if (col === 3) return "example";
      return null;
    }
    if (col === 0) return "primaryText";
    if (col === 1) return "meaningEnglish";
    if (col === 2) return "meaningKorean";
    if (col === 3) return "pronunciation";
    if (col === 4) return "example";
    if (col === 5) return "translationEnglish";
    if (col === 6) return "translationKorean";
    return null;
  }
  if (isCollocationWord(word) || isIdiomWord(word) || (!isFamousQuoteWord(word))) {
    if (col === 0) return "primaryText";
    if (col === 1) return "meaning";
    if (!isCollocationWord(word) && !isIdiomWord(word) && !isExtremelyAdvanced) {
      const pronunciationCol = hasSynonymColumn ? 3 : 2;
      if (col === pronunciationCol) return "pronunciation";
    }
  }
  return null;
}

function getWordTableAddFuriganaField(
  col: number,
  word: Word,
  isJlptExampleHuriganaMode = false,
): FuriganaActionField | null {
  if (!(isJlptWord(word) || isPrefixWord(word) || isPostfixWord(word))) {
    return null;
  }

  if (isJlptExampleHuriganaMode && isJlptWord(word)) {
    return null;
  }

  if (col === 3) return "pronunciation";
  if (col === 4) return "example";
  return null;
}

function getWordTableAddFuriganaSource(
  word: Word,
  field: FuriganaActionField,
): string | null {
  if (field === "pronunciation") {
    if (isJlptWord(word)) return hasTrimmedText(word.word) ? word.word : null;
    if (isPrefixWord(word)) return hasTrimmedText(word.prefix) ? word.prefix : null;
    if (isPostfixWord(word)) return hasTrimmedText(word.postfix) ? word.postfix : null;
    return null;
  }

  if (isJlptWord(word) || isPrefixWord(word) || isPostfixWord(word)) {
    return hasTrimmedText(word.example) ? word.example : null;
  }

  return null;
}

function stripBoundaryAsciiHyphens(value: string): string {
  return value.trim().replace(/^-+|-+$/g, "").trim();
}

function getWordTableAnalyzeRequest(
  col: number,
  word: Word,
  isJlptExampleHuriganaMode = false,
): AnalyzeActionRequest | null {
  if (isJlptWord(word)) {
    const exampleCol = isJlptExampleHuriganaMode ? 3 : 4;
    if (col !== exampleCol) return null;

    const sentence = word.example.trim();
    const targetBaseForm = word.word.trim();
    return sentence && targetBaseForm ? { sentence, targetBaseForm } : null;
  }

  if (isPrefixWord(word)) {
    if (col !== 4) return null;

    const sentence = word.example.trim();
    const targetBaseForm = stripBoundaryAsciiHyphens(word.prefix);
    return sentence && targetBaseForm ? { sentence, targetBaseForm } : null;
  }

  if (isPostfixWord(word)) {
    if (col !== 4) return null;

    const sentence = word.example.trim();
    const targetBaseForm = stripBoundaryAsciiHyphens(word.postfix);
    return sentence && targetBaseForm ? { sentence, targetBaseForm } : null;
  }

  return null;
}

function canTranslateWordTableExample(col: number, word: Word): boolean {
  return (
    isJlptWord(word) &&
    col === 4 &&
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

const singleLineWordTextSx = {
  whiteSpace: "nowrap",
  overflowWrap: "normal",
  wordBreak: "keep-all",
};

function ExampleCell({
  text,
  onClick,
  onContextMenu,
  selected,
  spreadsheetProps,
}: {
  text: string | undefined;
  onClick?: (e: MouseEvent<HTMLTableCellElement>) => void;
  onContextMenu?: (e: MouseEvent<HTMLTableCellElement>) => void;
  selected?: boolean;
  spreadsheetProps?: TableCellProps;
}) {
  const cellSx = {
    cursor: onClick ? "pointer" : undefined,
    bgcolor: selected ? "action.selected" : undefined,
    "&:hover": onClick ? { bgcolor: selected ? "action.selected" : "action.hover" } : undefined,
  };
  const sx = [
    ...(Array.isArray(spreadsheetProps?.sx)
      ? spreadsheetProps.sx
      : spreadsheetProps?.sx
        ? [spreadsheetProps.sx]
        : []),
    cellSx,
  ];
  if (!text) {
    return (
      <TableCell
        {...spreadsheetProps}
        aria-selected={selected}
        onClick={onClick}
        onContextMenu={onContextMenu}
        sx={sx}
      />
    );
  }

  const lines = text.split(DIALOGUE_SPLIT_REGEX);

  return (
    <TableCell
      {...spreadsheetProps}
      aria-selected={selected}
      onClick={onClick}
      onContextMenu={onContextMenu}
      sx={sx}
    >
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

type KanjiNestedListLike = Array<KanjiNestedListGroup | string[] | string>;

function getKanjiGroupItems(group: KanjiNestedListGroup | string[] | string | undefined): string[] {
  if (Array.isArray(group)) return group.map((item) => String(item ?? "")).filter(Boolean);
  if (isKanjiNestedListGroup(group)) {
    return group.items.map((item) => String(item ?? "")).filter(Boolean);
  }
  return typeof group === "string" && group ? [group] : [];
}

function joinKanjiItems(items: string[] | undefined): string {
  return Array.isArray(items) ? items.filter(Boolean).join(", ") : "";
}

function getKanjiNestedGroup(groups: KanjiNestedListLike | undefined, index: number): string {
  if (!Array.isArray(groups)) return "";
  return joinKanjiItems(getKanjiGroupItems(groups[index]));
}

function formatKanjiKoreanLine(
  korean: string | undefined,
  romanized: string | undefined,
  translation: string,
): string {
  const capitalizedRomanized = capitalizeFirstCharacter(romanized);
  const primary = [
    korean,
    capitalizedRomanized ? `(${capitalizedRomanized})` : "",
  ].filter(Boolean).join(" ");
  return [primary, translation].filter(Boolean).join(" / ");
}

function formatKanjiCopyText(items: string[] | KanjiNestedListLike | undefined): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((item, index) =>
      `${index + 1}. ${Array.isArray(item) || isKanjiNestedListGroup(item) ? joinKanjiItems(getKanjiGroupItems(item)) : item}`,
    )
    .join("\n");
}

function formatKanjiRomanizedCopyText(items: string[] | undefined): string {
  if (!Array.isArray(items)) return "";
  return items
    .map((item, index) => `${index + 1}. ${capitalizeFirstCharacter(item)}`)
    .join("\n");
}

function KanjiGroupCell({
  groups,
}: {
  groups: Array<{
    title: string;
    examples?: string;
    hurigana?: string;
    english?: string;
    korean?: string;
  }>;
}) {
  return (
    <Stack spacing={1.25}>
      {groups.map((group, index) => (
        <Box key={`${group.title}-${index}`}>
          <Typography variant="body2" fontWeight={700}>
            {index + 1}. {group.title}
          </Typography>
          {group.examples && (
            <Typography variant="caption" component="div" color="text.secondary">
              Examples: {group.examples}
            </Typography>
          )}
          {group.hurigana && (
            <Typography variant="caption" component="div" color="text.secondary">
              Hurigana: {group.hurigana}
            </Typography>
          )}
          {group.english && (
            <Typography variant="caption" component="div" color="text.secondary">
              EN: {group.english}
            </Typography>
          )}
          {group.korean && (
            <Typography variant="caption" component="div" color="text.secondary">
              KO: {group.korean}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

function KanjiExamplesCell({ word }: { word: KanjiWord }) {
  return (
    <Stack spacing={1.25}>
      {word.example.map((example, index) => (
        <Box key={`${example}-${index}`}>
          <Typography variant="body2" fontWeight={600}>
            {index + 1}. {example}
          </Typography>
          {word.exampleHurigana[index] && (
            <Typography variant="caption" component="div" color="text.secondary">
              Hurigana: {word.exampleHurigana[index]}
            </Typography>
          )}
          {word.exampleEnglishTranslation[index] && (
            <Typography variant="caption" component="div" color="text.secondary">
              EN: {word.exampleEnglishTranslation[index]}
            </Typography>
          )}
          {word.exampleKoreanTranslation[index] && (
            <Typography variant="caption" component="div" color="text.secondary">
              KO: {word.exampleKoreanTranslation[index]}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

type GeneratableField = "pronunciation" | "example" | "translation";
type WordTableLocalUpdates = Partial<
  Pick<
    StandardWord,
    | "word"
    | "meaning"
    | "pronunciation"
    | "example"
    | "translation"
    | "imageUrl"
    | "derivative"
  > &
    Pick<
      JlptWord,
      | "word"
      | "meaningEnglish"
      | "meaningKorean"
      | "pronunciation"
      | "pronunciationRoman"
      | "example"
      | "exampleHurigana"
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

type CellPos = CellCoord;

interface ContextMenuState {
  anchorPosition: { top: number; left: number };
  row: number;
  col: number;
}

interface WordTableProps {
  words: Word[];
  isCollocation: boolean;
  isIdiom?: boolean;
  isExtremelyAdvanced?: boolean;
  isJlpt?: boolean;
  isKanji?: boolean;
  activeMissingField?: CourseDayMissingField;
  isFamousQuote?: boolean;
  isPrefix?: boolean;
  isPostfix?: boolean;
  showImageUrl?: boolean;
  courseId?: CourseId;
  coursePath?: string;
  dayId?: string;
  rowIdPrefix?: string;
  exitingWordIds?: Set<string>;
  onWordImageUpdated?: (wordId: string, imageUrl: string) => void;
  onWordFieldsUpdated?: (wordId: string, fields: WordFinderResultFieldUpdates) => void;
}

function filterJapanese(text: string): string {
  return text
    .replace(/[^\u3000-\u9FFF\uF900-\uFAFF\uFF01-\uFF9F\u31F0-\u31FF ]/g, "")
    .trim();
}

export default function WordTable({
  words,
  isCollocation,
  isIdiom,
  isExtremelyAdvanced,
  isJlpt,
  isKanji,
  activeMissingField,
  isFamousQuote,
  isPrefix,
  isPostfix,
  showImageUrl,
  courseId,
  coursePath,
  dayId,
  rowIdPrefix = "",
  exitingWordIds,
  onWordImageUpdated,
  onWordFieldsUpdated,
}: WordTableProps) {
  const { t } = useTranslation();
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const [localWordUpdates, setLocalWordUpdates] = useState<Record<string, WordTableLocalUpdates>>(
    {},
  );
  const [activeWordId, setActiveWordId] = useState("");
  const [activeField, setActiveField] = useState<WordFinderActionField | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCellState | null>(null);
  const [activeCell, setActiveCell] = useState<CellPos | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<CellPos | null>(null);
  const [selectionExtent, setSelectionExtent] = useState<CellPos | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; success: boolean }>({ open: false, success: true });
  const [derivativeDialogWordId, setDerivativeDialogWordId] = useState<string | null>(null);
  const isJlptExampleHuriganaMode =
    Boolean(isJlpt) && activeMissingField === "exampleHurigana";

  const clearSelection = useCallback(() => {
    setActiveCell(null);
    setSelectionAnchor(null);
    setSelectionExtent(null);
    setContextMenu(null);
  }, []);

  const courseLabel = useMemo(() => {
    if (!courseId) return "";
    return getCourseById(courseId)?.label ?? courseId;
  }, [courseId]);
  const storageMode = useMemo(() => {
    if (!courseId) return null;
    return getCourseById(courseId)?.storageMode ?? "day";
  }, [courseId]);
  const supportsDerivatives = Boolean(
    courseId &&
      !isCollocation &&
      !isIdiom &&
      !isExtremelyAdvanced &&
      !isJlpt &&
      !isKanji &&
      !isFamousQuote &&
      !isPrefix &&
      !isPostfix &&
      supportsDerivativeCourse(courseId),
  );
  const hasSynonymColumn = Boolean(
    courseId === "TOEFL_IELTS" &&
      !isCollocation &&
      !isIdiom &&
      !isExtremelyAdvanced &&
      !isJlpt &&
      !isKanji &&
      !isFamousQuote &&
      !isPrefix &&
      !isPostfix,
  );

  const persistTextField = useCallback(
    async (
      wordId: string,
      field: EditableWordTextField,
      value: string,
    ) => {
      if (!coursePath || !storageMode) return;

      if (storageMode === "singleList") {
        if (!courseId) return;
        await updateSingleListWordTextField(courseId, coursePath, wordId, field, value);
        return;
      }

      if (storageMode === "collection") {
        await updateCollectionWordTextField(coursePath, wordId, field, value);
        return;
      }

      if (storageMode === "day" && dayId) {
        await updateWordTextField(coursePath, dayId, wordId, field, value);
      }
    },
    [courseId, coursePath, dayId, storageMode],
  );

  const persistImageField = useCallback(
    async (wordId: string, imageUrl: string) => {
      if (!coursePath || !storageMode) return;

      if (storageMode === "singleList") {
        if (!courseId) return;
        await updateSingleListWordImageUrl(courseId, coursePath, wordId, imageUrl);
        return;
      }

      if (storageMode === "collection") {
        await updateCollectionWordImageUrl(coursePath, wordId, imageUrl);
        return;
      }

      if (storageMode === "day" && dayId) {
        await updateWordImageUrl(coursePath, dayId, wordId, imageUrl);
      }
    },
    [courseId, coursePath, dayId, storageMode],
  );

  const persistDerivatives = useCallback(
    async (wordId: string, items: Array<{ word: string; meaning: string }>) => {
      if (!coursePath || !storageMode) return;

      if (storageMode === "singleList") {
        if (!courseId) return;
        await updateSingleListWordDerivatives(courseId, coursePath, wordId, items);
        return;
      }

      if (storageMode === "collection") {
        await updateCollectionWordDerivatives(coursePath, wordId, items);
        return;
      }

      if (storageMode === "day" && dayId) {
        await updateWordDerivatives(coursePath, dayId, wordId, items);
      }
    },
    [courseId, coursePath, dayId, storageMode],
  );

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
      isIdiom,
      isExtremelyAdvanced,
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
    isIdiom,
    isExtremelyAdvanced,
    isJlpt,
    isFamousQuote,
    isPrefix,
    isPostfix,
    localWordUpdates,
  ]);

  const openFieldModal = useCallback((wordId: string, field: WordFinderActionField) => {
    if (field === "image" || field === "derivative") {
      clearSelection();
    }
    if (field === "derivative") {
      setDerivativeDialogWordId(wordId);
      return;
    }
    setActiveWordId(wordId);
    setActiveField(field);
  }, [clearSelection]);

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
    if (typeof mappedUpdates.exampleHurigana === "string") {
      fieldUpdates.exampleHurigana = mappedUpdates.exampleHurigana;
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
    clearSelection();
    setLocalWordUpdates((prev) => ({
      ...prev,
      [wordId]: { ...prev[wordId], imageUrl: "" },
    }));
    onWordImageUpdated?.(wordId, "");
    void persistImageField(wordId, "").catch(() => {});
  };

  const activateInlineEdit = useCallback(
    (word: Word, field: CourseInlineEditableField) => {
      const editable = resolveCourseInlineEditField({
        word,
        isCollocation,
        isIdiom,
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
    [isCollocation, isIdiom, isJlpt, isFamousQuote, isPrefix, isPostfix],
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
        isIdiom,
        isJlpt,
        isFamousQuote,
        field: editingCell.field,
      });

      if (!editable || !coursePath || !storageMode) {
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
        await persistTextField(word.id, editable.sourceField, nextValue);

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
    [coursePath, editingCell, isCollocation, isIdiom, isJlpt, isFamousQuote, onWordFieldsUpdated, persistTextField, storageMode, t],
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
        singleLine?: boolean;
        numberedList?: boolean;
      },
    ) => {
      const editable = resolveCourseInlineEditField({
        word,
        isCollocation,
        isIdiom,
        isJlpt,
        isFamousQuote,
        isPrefix,
        isPostfix,
        field,
      });
      const isEditing =
        editingCell?.wordId === word.id && editingCell.field === field;

      const baseSx = options?.singleLine ? singleLineWordTextSx : undefined;
      const numberedListSx = options?.numberedList
        ? { whiteSpace: "pre-line" as const }
        : undefined;
      const resolvedSx = numberedListSx
        ? baseSx
          ? [baseSx, numberedListSx]
          : numberedListSx
        : baseSx;

      if (!editable) {
        return (
          <Typography
            variant={options?.textVariant ?? "body1"}
            fontWeight={options?.fontWeight}
            sx={resolvedSx}
          >
            {options?.numberedList ? insertNumberedBreaks(value) : value}
          </Typography>
        );
      }

      return (
        <InlineEditableText
          value={options?.numberedList ? insertNumberedBreaks(value) : value}
          emptyLabel={options?.emptyLabel}
          isEditing={isEditing}
          draft={isEditing ? editingCell.draft : value}
          saving={isEditing ? editingCell.saving : false}
          error={isEditing ? editingCell.error : ""}
          textVariant={options?.textVariant}
          fontWeight={options?.fontWeight}
          sx={resolvedSx}
          onActivate={() => activateInlineEdit(word, field)}
          onDraftChange={updateInlineDraft}
          onCommit={() => {
            void commitInlineEdit(word);
          }}
          onCancel={cancelInlineEdit}
          onPaste={
            (isJlpt || isPrefix || isPostfix) && field === "example"
              ? handleJlptExamplePaste
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
      isCollocation,
      isIdiom,
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
    row,
    col,
    icon = <AutoFixHighIcon fontSize="small" />,
  }: {
    wordId: string;
    field: WordFinderActionField;
    tooltipKey: string;
    row?: number;
    col?: number;
    icon?: ReactNode;
  }) {
    const spreadsheetProps =
      row !== undefined && col !== undefined ? selectableCellProps(row, col) : undefined;

    return (
      <TableCell {...spreadsheetProps}>
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

  function MissingPronunciationButton({ wordId }: { wordId: string }) {
    return (
      <Tooltip title={t("courses.generatePronunciation")}>
        <IconButton
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            openFieldModal(wordId, "pronunciation");
          }}
          sx={{ p: 0 }}
        >
          <AutoFixHighIcon fontSize="small" color="action" />
        </IconButton>
      </Tooltip>
    );
  }

  const isMissingField = useCallback(
    (word: Word, field: WordFinderActionField | "primaryText" | "meaning") =>
      isCourseWordFieldMissing(
        word,
        {
          isCollocation,
          isIdiom,
          isExtremelyAdvanced,
          isJlpt,
          isFamousQuote,
          isPrefix,
          isPostfix,
          showImageUrl,
          supportsDerivatives,
        },
        field,
      ),
    [
      isCollocation,
      isIdiom,
      isExtremelyAdvanced,
      isJlpt,
      isFamousQuote,
      isPrefix,
      isPostfix,
      showImageUrl,
      supportsDerivatives,
    ],
  );

  // 2D grid of copyable text per cell, schema-aware.
  const cellGrid = useMemo(() => {
    return words.map((word) => {
      const m = { ...word, ...localWordUpdates[word.id] } as Word;
      if (isKanji && isKanjiWord(m)) {
        return [
          m.kanji,
          [
            formatKanjiCopyText(m.meaning),
            formatKanjiCopyText(m.meaningKorean),
            formatKanjiRomanizedCopyText(m.meaningKoreanRomanize),
            formatKanjiCopyText(m.meaningExample),
            formatKanjiCopyText(m.meaningExampleHurigana),
            formatKanjiCopyText(m.meaningEnglishTranslation),
            formatKanjiCopyText(m.meaningKoreanTranslation),
          ].filter(Boolean).join("\n"),
          [
            formatKanjiCopyText(m.reading),
            formatKanjiCopyText(m.readingKorean),
            formatKanjiRomanizedCopyText(m.readingKoreanRomanize),
            formatKanjiCopyText(m.readingExample),
            formatKanjiCopyText(m.readingExampleHurigana),
            formatKanjiCopyText(m.readingEnglishTranslation),
            formatKanjiCopyText(m.readingKoreanTranslation),
          ].filter(Boolean).join("\n"),
          [
            formatKanjiCopyText(m.example),
            formatKanjiCopyText(m.exampleHurigana),
            formatKanjiCopyText(m.exampleEnglishTranslation),
            formatKanjiCopyText(m.exampleKoreanTranslation),
          ].filter(Boolean).join("\n"),
        ];
      }
      if (isJlpt && isJlptWord(m)) {
        if (isJlptExampleHuriganaMode) {
          return [
            m.word,
            m.meaningEnglish,
            m.meaningKorean,
            m.example,
            m.exampleHurigana,
            ...(showImageUrl ? [""] : []),
          ];
        }
        return [
          m.word, m.meaningEnglish, m.meaningKorean,
          m.pronunciation,
          m.example,
          m.exampleHurigana,
          m.translationEnglish,
          m.translationKorean,
          ...(showImageUrl ? [""] : []),
        ];
      }
      if (isPrefix && isPrefixWord(m)) {
        return [
          m.prefix, m.meaningEnglish, m.meaningKorean,
          m.pronunciation,
          m.example,
          m.translationEnglish, m.translationKorean,
        ];
      }
      if (isPostfix && isPostfixWord(m)) {
        return [
          m.postfix, m.meaningEnglish, m.meaningKorean,
          m.pronunciation,
          m.example,
          m.translationEnglish, m.translationKorean,
        ];
      }
      if (isCollocation && isCollocationWord(m)) {
        return [
          m.collocation,
          m.meaning,
          m.explanation,
          m.example,
          m.translation,
          ...(showImageUrl ? [""] : []),
        ];
      }
      if (isIdiom && isIdiomWord(m)) {
        return [
          m.idiom,
          m.meaning,
          m.example,
          m.translation,
          ...(showImageUrl ? [""] : []),
        ];
      }
      if (isFamousQuote && isFamousQuoteWord(m)) {
        return [m.quote, m.author, m.translation, m.language ?? ''];
      }
      if (isExtremelyAdvanced) {
        const advanced = m as ExtremelyAdvancedWord;
        return [
          advanced.word,
          advanced.meaning,
          advanced.example,
          advanced.translation,
          ...(showImageUrl ? [""] : []),
        ];
      }
      const s = m as StandardWord;
      const derivativeCell = formatDerivativeCellValue(s.derivative);
      return hasSynonymColumn
        ? [
            s.word,
            s.meaning,
            s.synonym ?? "",
            s.pronunciation,
            s.example,
            s.translation,
            ...(showImageUrl ? [""] : []),
            derivativeCell,
          ]
        : [
            s.word,
            s.meaning,
            s.pronunciation,
            s.example,
            s.translation,
            ...(showImageUrl ? [""] : []),
            derivativeCell,
          ];
    });
  }, [words, localWordUpdates, isKanji, isJlpt, isJlptExampleHuriganaMode, isCollocation, isIdiom, isExtremelyAdvanced, isFamousQuote, isPrefix, isPostfix, hasSynonymColumn, showImageUrl]);

  const contextMenuWord = useMemo(() => {
    if (!contextMenu) return null;
    const word = words[contextMenu.row];
    if (!word) return null;
    return { ...word, ...localWordUpdates[word.id] } as Word;
  }, [contextMenu, words, localWordUpdates]);

  const contextMenuField = useMemo(
    () => {
      if (!contextMenu || !contextMenuWord) return null;
      const field = getWordTableColField(
        contextMenu.col,
        contextMenuWord,
        showImageUrl,
        supportsDerivatives,
        hasSynonymColumn,
        isExtremelyAdvanced,
        isJlptExampleHuriganaMode,
      );
      if (
        field === "derivative" &&
        !isMissingField(contextMenuWord, "derivative")
      ) {
        return null;
      }
      return field;
    },
    [
      contextMenu,
      contextMenuWord,
      isMissingField,
      showImageUrl,
      supportsDerivatives,
      hasSynonymColumn,
      isExtremelyAdvanced,
      isJlptExampleHuriganaMode,
    ],
  );

  const contextMenuEditField = useMemo(
    () =>
      contextMenu && contextMenuWord
        ? getWordTableColEditField(
            contextMenu.col,
          contextMenuWord,
          hasSynonymColumn,
          isExtremelyAdvanced,
          isJlptExampleHuriganaMode,
        )
        : null,
    [
      contextMenu,
      contextMenuWord,
      hasSynonymColumn,
      isExtremelyAdvanced,
      isJlptExampleHuriganaMode,
    ],
  );

  const contextMenuCanTranslate = useMemo(
    () =>
      contextMenu && contextMenuWord
        ? canTranslateWordTableExample(contextMenu.col, contextMenuWord)
        : false,
    [contextMenu, contextMenuWord],
  );

  const contextMenuAddFuriganaField = useMemo(() => {
    if (!contextMenu || !contextMenuWord) return null;

    const field = getWordTableAddFuriganaField(
      contextMenu.col,
      contextMenuWord,
      isJlptExampleHuriganaMode,
    );
    if (!field) return null;

    return getWordTableAddFuriganaSource(contextMenuWord, field) ? field : null;
  }, [contextMenu, contextMenuWord, isJlptExampleHuriganaMode]);

  const contextMenuAnalyzeRequest = useMemo(() => {
    if (!contextMenu || !contextMenuWord) return null;

    return getWordTableAnalyzeRequest(
      contextMenu.col,
      contextMenuWord,
      isJlptExampleHuriganaMode,
    );
  }, [contextMenu, contextMenuWord, isJlptExampleHuriganaMode]);

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
    const field = getWordTableColField(
      col,
      mergedWord,
      showImageUrl,
      supportsDerivatives,
      hasSynonymColumn,
      isExtremelyAdvanced,
      isJlptExampleHuriganaMode,
    );
    if (!field) return;
    if (field === "derivative" && !isMissingField(mergedWord, "derivative")) return;
    if (field === "image" || field === "derivative") {
      clearSelection();
    }
    openFieldModal(word.id, field);
  }, [
    clearSelection,
    contextMenu,
    isMissingField,
    words,
    localWordUpdates,
    openFieldModal,
    showImageUrl,
    supportsDerivatives,
    hasSynonymColumn,
    isExtremelyAdvanced,
    isJlptExampleHuriganaMode,
  ]);

  const handleContextMenuEdit = useCallback(() => {
    if (!contextMenu) return;
    const { row, col } = contextMenu;
    const word = words[row];
    if (!word) return;
    const mergedWord = { ...word, ...localWordUpdates[word.id] } as Word;
    const editField = getWordTableColEditField(
      col,
      mergedWord,
      hasSynonymColumn,
      isExtremelyAdvanced,
      isJlptExampleHuriganaMode,
    );
    if (!editField) return;
    activateInlineEdit(mergedWord, editField);
  }, [
    contextMenu,
    words,
    localWordUpdates,
    hasSynonymColumn,
    isExtremelyAdvanced,
    isJlptExampleHuriganaMode,
    activateInlineEdit,
  ]);

  const handleContextMenuTranslate = useCallback(async () => {
    if (!contextMenu || !coursePath || !storageMode) return;

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

      await persistTextField(mergedWord.id, "example", payload.example);

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
    localWordUpdates,
    onWordFieldsUpdated,
    persistTextField,
    storageMode,
    t,
    words,
  ]);

  const handleContextMenuAddFurigana = useCallback(async () => {
    if (!contextMenu) return;

    const word = words[contextMenu.row];
    if (!word) return;

    const mergedWord = { ...word, ...localWordUpdates[word.id] } as Word;
    const field = getWordTableAddFuriganaField(
      contextMenu.col,
      mergedWord,
      isJlptExampleHuriganaMode,
    );
    if (!field) return;

    const sourceText = getWordTableAddFuriganaSource(mergedWord, field);
    if (!sourceText) return;

    try {
      const nextValue = await addFuriganaText(
        sourceText,
        field === "pronunciation" ? { mode: "hiragana_only" } : undefined,
      );

      await persistTextField(word.id, field, nextValue);

      setLocalWordUpdates((prev) => ({
        ...prev,
        [word.id]: {
          ...prev[word.id],
          [field]: nextValue,
        },
      }));

      onWordFieldsUpdated?.(word.id, { [field]: nextValue });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : t("words.generateActionError"),
      );
    }
  }, [
    contextMenu,
    localWordUpdates,
    onWordFieldsUpdated,
    persistTextField,
    t,
    words,
    isJlptExampleHuriganaMode,
  ]);

  const handleContextMenuAnalyze = useCallback(async () => {
    if (!contextMenu) return;

    const word = words[contextMenu.row];
    if (!word) return;

    const mergedWord = { ...word, ...localWordUpdates[word.id] } as Word;
    const request = getWordTableAnalyzeRequest(
      contextMenu.col,
      mergedWord,
      isJlptExampleHuriganaMode,
    );
    if (!request) return;

    try {
      const maskedSentence = await analyzeSentence({
        language: "ja",
        sentence: request.sentence,
        target_base_form: request.targetBaseForm,
      });

      await persistTextField(word.id, "example", maskedSentence);

      setLocalWordUpdates((prev) => ({
        ...prev,
        [word.id]: {
          ...prev[word.id],
          example: maskedSentence,
        },
      }));

      onWordFieldsUpdated?.(word.id, { example: maskedSentence });
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : t("words.generateActionError"),
      );
    }
  }, [
    contextMenu,
    localWordUpdates,
    onWordFieldsUpdated,
    persistTextField,
    t,
    words,
    isJlptExampleHuriganaMode,
  ]);

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

  const getCellId = useCallback(
    (row: number, col: number) => `word-table-cell-${row}-${col}`,
    [],
  );

  const getCellTabIndex = useCallback(
    (row: number, col: number) => {
      if (!activeCell) return row === 0 && col === 0 ? 0 : -1;
      return activeCell.row === row && activeCell.col === col ? 0 : -1;
    },
    [activeCell],
  );

  const selectableCellProps = useCallback(
    (
      row: number,
      col: number,
      options?: { omitUnselectedAria?: boolean },
    ) => {
      const selected = isCellSelected(row, col);
      return {
        id: getCellId(row, col),
        "data-spreadsheet-cell": "true",
        "data-row": row,
        "data-col": col,
        role: "gridcell",
        tabIndex: getCellTabIndex(row, col),
        "aria-selected": selected
          ? true
          : options?.omitUnselectedAria
            ? undefined
            : false,
        onFocus: () => handleCellFocus(row, col),
        onClick: (e: MouseEvent<HTMLTableCellElement>) => handleCellClick(e, row, col),
        onContextMenu: (e: MouseEvent<HTMLTableCellElement>) =>
          handleCellContextMenu(e, row, col),
        sx: selectableCellSx(row, col),
      };
    },
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

  const handleSpreadsheetKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (editingCell || isEditableEventTarget(event.target)) return;

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
        void copyRangeToClipboard(selectionAnchor, selectionExtent);
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
      editingCell,
      selectionAnchor,
      selectionExtent,
    ],
  );

  return (
    <>
      <TableContainer
        ref={tableContainerRef}
        component={Paper}
        onKeyDown={handleSpreadsheetKeyDown}
        role="grid"
        aria-activedescendant={
          activeCell ? getCellId(activeCell.row, activeCell.col) : undefined
        }
      >
        <Table>
          <TableHead>
            <TableRow>
              {isIdiom ? (
                <>
                  <TableCell>{t("courses.idiom", "Idiom")}</TableCell>
                  <TableCell>{t("courses.meaning")}</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>{t("courses.translation")}</TableCell>
                  {showImageUrl && <TableCell>{t("courses.image", "Image")}</TableCell>}
                </>
              ) : isCollocation ? (
                <>
                  <TableCell>{t("courses.collocation")}</TableCell>
                  <TableCell>{t("courses.meaning")}</TableCell>
                  <TableCell>{t("courses.explanation")}</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>{t("courses.translation")}</TableCell>
                  {showImageUrl && <TableCell>{t("courses.image", "Image")}</TableCell>}
                </>
              ) : isKanji ? (
                <>
                  <TableCell>Kanji</TableCell>
                  <TableCell>Meaning</TableCell>
                  <TableCell>Reading</TableCell>
                  <TableCell>Examples</TableCell>
                </>
              ) : isJlpt ? (
                <>
                  <TableCell>{t("courses.word")}</TableCell>
                  <TableCell>Meaning (English)</TableCell>
                  <TableCell>Meaning (Korean)</TableCell>
                  {isJlptExampleHuriganaMode ? (
                    <>
                      <TableCell>{t("courses.example")}</TableCell>
                      <TableCell>{t("words.exampleHuriganaLabel")}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{t("courses.pronunciation")}</TableCell>
                      <TableCell>{t("courses.example")}</TableCell>
                      <TableCell>{t("words.exampleHuriganaLabel")}</TableCell>
                      <TableCell>Translation (English)</TableCell>
                      <TableCell>Translation (Korean)</TableCell>
                    </>
                  )}
                  {showImageUrl && <TableCell>{t("courses.image", "Image")}</TableCell>}
                </>
              ) : isPrefix ? (
                <>
                  <TableCell>Prefix</TableCell>
                  <TableCell>Meaning (English)</TableCell>
                  <TableCell>Meaning (Korean)</TableCell>
                  <TableCell>{t("courses.pronunciation")}</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>Translation (English)</TableCell>
                  <TableCell>Translation (Korean)</TableCell>
                </>
              ) : isPostfix ? (
                <>
                  <TableCell>Postfix</TableCell>
                  <TableCell>Meaning (English)</TableCell>
                  <TableCell>Meaning (Korean)</TableCell>
                  <TableCell>{t("courses.pronunciation")}</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
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
              ) : isExtremelyAdvanced ? (
                <>
                  <TableCell>{t("courses.word")}</TableCell>
                  <TableCell>{t("courses.meaning")}</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>{t("courses.translation")}</TableCell>
                  {showImageUrl && <TableCell>{t("courses.image", "Image")}</TableCell>}
                </>
              ) : (
                <>
                  <TableCell>{t("courses.word")}</TableCell>
                  <TableCell>{t("courses.meaning")}</TableCell>
                  {hasSynonymColumn && (
                    <TableCell>{t("courses.synonym", "Synonym")}</TableCell>
                  )}
                  <TableCell>{t("courses.pronunciation")}</TableCell>
                  <TableCell>{t("courses.example")}</TableCell>
                  <TableCell>{t("courses.translation")}</TableCell>
                  {showImageUrl && <TableCell>{t("courses.image", "Image")}</TableCell>}
                  <TableCell>{t("words.derivative", "Derivatives")}</TableCell>
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
                  id={`${rowIdPrefix}${word.id}`}
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
                      {...selectableCellProps(rowIdx, 0)}
                    >
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.collocation, {
                        emptyLabel: t("courses.missingCollocationValue"),
                        singleLine: true,
                      })}
                    </TableCell>
                    <TableCell
                      {...selectableCellProps(rowIdx, 1)}
                    >
                      {renderEditableTextCell(mergedWord, "meaning", mergedWord.meaning, {
                        emptyLabel: t("courses.missingMeaningValue"),
                        numberedList: true,
                      })}
                    </TableCell>
                    <TableCell
                      {...selectableCellProps(rowIdx, 2)}
                    >
                      {mergedWord.explanation}
                    </TableCell>
                    {!isMissingField(mergedWord, "example") ? (
                      <ExampleCell
                        text={getResolvedTextField(word.id, "example") || mergedWord.example}
                        spreadsheetProps={selectableCellProps(rowIdx, 3)}
                        onClick={(e) => handleCellClick(e, rowIdx, 3)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                        selected={isCellSelected(rowIdx, 3)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="example"
                        tooltipKey="words.generateNewExamples"
                        row={rowIdx}
                        col={3}
                      />
                    )}
                    {!isMissingField(mergedWord, "translation") ? (
                      <ExampleCell
                        text={
                          getResolvedTextField(word.id, "translation") || mergedWord.translation
                        }
                        spreadsheetProps={selectableCellProps(rowIdx, 4)}
                        onClick={(e) => handleCellClick(e, rowIdx, 4)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 4)}
                        selected={isCellSelected(rowIdx, 4)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="translation"
                        tooltipKey="words.generateNewTranslations"
                        row={rowIdx}
                        col={4}
                      />
                    )}
                    {showImageUrl && (
                    <TableCell {...selectableCellProps(rowIdx, 5, { omitUnselectedAria: true })}>
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
                              aria-label={t("words.generateNewImage")}
                              onClick={(e) => {
                                e.stopPropagation();
                                openFieldModal(word.id, "image");
                              }}
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
                  ) : isIdiomWord(mergedWord) ? (
                  <>
                    <TableCell
                      {...selectableCellProps(rowIdx, 0)}
                    >
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.idiom, {
                        emptyLabel: t("courses.missingIdiomValue", "Add idiom"),
                        singleLine: true,
                      })}
                    </TableCell>
                    <TableCell
                      {...selectableCellProps(rowIdx, 1)}
                    >
                      {renderEditableTextCell(mergedWord, "meaning", mergedWord.meaning, {
                        emptyLabel: t("courses.missingMeaningValue"),
                        numberedList: true,
                      })}
                    </TableCell>
                    {!isMissingField(mergedWord, "example") ? (
                      <ExampleCell
                        text={getResolvedTextField(word.id, "example") || mergedWord.example}
                        spreadsheetProps={selectableCellProps(rowIdx, 2)}
                        onClick={(e) => handleCellClick(e, rowIdx, 2)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 2)}
                        selected={isCellSelected(rowIdx, 2)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="example"
                        tooltipKey="words.generateNewExamples"
                        row={rowIdx}
                        col={2}
                      />
                    )}
                    {!isMissingField(mergedWord, "translation") ? (
                      <ExampleCell
                        text={
                          getResolvedTextField(word.id, "translation") || mergedWord.translation
                        }
                        spreadsheetProps={selectableCellProps(rowIdx, 3)}
                        onClick={(e) => handleCellClick(e, rowIdx, 3)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                        selected={isCellSelected(rowIdx, 3)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="translation"
                        tooltipKey="words.generateNewTranslations"
                        row={rowIdx}
                        col={3}
                      />
                    )}
                    {showImageUrl && (
                    <TableCell {...selectableCellProps(rowIdx, 4, { omitUnselectedAria: true })}>
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
                              aria-label={t("words.generateNewImage")}
                              onClick={(e) => {
                                e.stopPropagation();
                                openFieldModal(word.id, "image");
                              }}
                              sx={{ p: 0 }}
                            >
                              {!isMissingField(mergedWord, "image") ? (
                                <Box
                                  component="img"
                                  src={getResolvedImage(word.id) || mergedWord.imageUrl}
                                  alt={mergedWord.idiom}
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
                  ) : isKanjiWord(mergedWord) ? (
                  <>
                    <TableCell {...selectableCellProps(rowIdx, 0)}>
                      <Typography variant="h6" component="span" sx={singleLineWordTextSx}>
                        {mergedWord.kanji}
                      </Typography>
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 1)}>
                      <KanjiGroupCell
                        groups={mergedWord.meaning.map((meaning, index) => ({
                          title: meaning,
                          examples: getKanjiNestedGroup(mergedWord.meaningExample, index),
                          hurigana: getKanjiNestedGroup(mergedWord.meaningExampleHurigana, index),
                          english: getKanjiNestedGroup(mergedWord.meaningEnglishTranslation, index),
                          korean: formatKanjiKoreanLine(
                            mergedWord.meaningKorean?.[index],
                            mergedWord.meaningKoreanRomanize?.[index],
                            getKanjiNestedGroup(mergedWord.meaningKoreanTranslation, index),
                          ),
                        }))}
                      />
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 2)}>
                      <KanjiGroupCell
                        groups={mergedWord.reading.map((reading, index) => ({
                          title: reading,
                          examples: getKanjiNestedGroup(mergedWord.readingExample, index),
                          hurigana: getKanjiNestedGroup(mergedWord.readingExampleHurigana, index),
                          english: getKanjiNestedGroup(mergedWord.readingEnglishTranslation, index),
                          korean: formatKanjiKoreanLine(
                            mergedWord.readingKorean?.[index],
                            mergedWord.readingKoreanRomanize?.[index],
                            getKanjiNestedGroup(mergedWord.readingKoreanTranslation, index),
                          ),
                        }))}
                      />
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 3)}>
                      <KanjiExamplesCell word={mergedWord} />
                    </TableCell>
                  </>
                  ) : isJlptWord(mergedWord) ? (
                  <>
                    <TableCell
                      {...selectableCellProps(rowIdx, 0)}
                    >
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.word, {
                        emptyLabel: t("courses.missingWordValue"),
                        fontWeight: 500,
                        singleLine: true,
                      })}
                    </TableCell>
                    <TableCell
                      {...selectableCellProps(rowIdx, 1)}
                    >
                      {renderEditableTextCell(
                        mergedWord,
                        "meaningEnglish",
                        mergedWord.meaningEnglish,
                        { emptyLabel: t("courses.missingMeaningValue") },
                      )}
                    </TableCell>
                    <TableCell
                      {...selectableCellProps(rowIdx, 2)}
                    >
                      {renderEditableTextCell(
                        mergedWord,
                        "meaningKorean",
                        mergedWord.meaningKorean,
                        { emptyLabel: t("courses.missingMeaningValue") },
                      )}
                    </TableCell>
                    {isJlptExampleHuriganaMode ? (
                      <>
                        <TableCell
                          {...selectableCellProps(rowIdx, 3)}
                          onClick={(e) => handleCellClick(e, rowIdx, 3)}
                          onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                          sx={{
                            ...selectableCellSx(rowIdx, 3),
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
                        {isMissingField(mergedWord, "exampleHurigana") ? (
                          <MissingFieldTrigger
                            wordId={word.id}
                            field="exampleHurigana"
                            tooltipKey="words.fillExampleHuriganaAction"
                            row={rowIdx}
                            col={4}
                          />
                        ) : (
                          <TableCell
                            {...selectableCellProps(rowIdx, 4)}
                          >
                            <Typography variant="body2">
                              {mergedWord.exampleHurigana || t("words.none")}
                            </Typography>
                          </TableCell>
                        )}
                      </>
                    ) : (
                      <>
                        <TableCell
                          {...selectableCellProps(rowIdx, 3)}
                          onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                          sx={selectableCellSx(rowIdx, 3)}
                        >
                          {!isMissingField(mergedWord, "pronunciation") ? (
                            renderEditableTextCell(
                              mergedWord,
                              "pronunciation",
                              mergedWord.pronunciation,
                              { textVariant: "body2" },
                            )
                          ) : (
                            <MissingPronunciationButton wordId={word.id} />
                          )}
                        </TableCell>
                        <TableCell
                          {...selectableCellProps(rowIdx, 4)}
                          onClick={(e) => handleCellClick(e, rowIdx, 4)}
                          onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 4)}
                          sx={{
                            ...selectableCellSx(rowIdx, 4),
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
                        <TableCell {...selectableCellProps(rowIdx, 5)}>
                          <Typography variant="body2">
                            {mergedWord.exampleHurigana || t("words.none")}
                          </Typography>
                        </TableCell>
                        <TableCell {...selectableCellProps(rowIdx, 6)}>
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
                        <TableCell {...selectableCellProps(rowIdx, 7)}>
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
                      </>
                    )}
                    {showImageUrl && (
                    <TableCell
                      {...selectableCellProps(rowIdx, isJlptExampleHuriganaMode ? 5 : 8, {
                        omitUnselectedAria: true,
                      })}
                    >
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
                              aria-label={t("words.generateNewImage")}
                              onClick={(e) => {
                                e.stopPropagation();
                                openFieldModal(word.id, "image");
                              }}
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
                    <TableCell {...selectableCellProps(rowIdx, 0)}>
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.prefix, { emptyLabel: t("courses.missingWordValue"), fontWeight: 500, singleLine: true })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 1)}>
                      {renderEditableTextCell(mergedWord, "meaningEnglish", mergedWord.meaningEnglish, { emptyLabel: t("courses.missingMeaningValue") })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 2)}>
                      {renderEditableTextCell(mergedWord, "meaningKorean", mergedWord.meaningKorean, { emptyLabel: t("courses.missingMeaningValue") })}
                    </TableCell>
                    <TableCell
                      {...selectableCellProps(rowIdx, 3)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                      sx={selectableCellSx(rowIdx, 3)}
                    >
                      {!isMissingField(mergedWord, "pronunciation") ? (
                        renderEditableTextCell(mergedWord, "pronunciation", mergedWord.pronunciation, { textVariant: "body2" })
                      ) : (
                        <MissingPronunciationButton wordId={word.id} />
                      )}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 4)}>
                      {renderEditableTextCell(mergedWord, "example", mergedWord.example, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 5)}>
                      {renderEditableTextCell(mergedWord, "translationEnglish", mergedWord.translationEnglish, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 6)}>
                      {renderEditableTextCell(mergedWord, "translationKorean", mergedWord.translationKorean, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                  </>
                  ) : isPostfixWord(mergedWord) ? (
                  <>
                    <TableCell {...selectableCellProps(rowIdx, 0)}>
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.postfix, { emptyLabel: t("courses.missingWordValue"), fontWeight: 500, singleLine: true })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 1)}>
                      {renderEditableTextCell(mergedWord, "meaningEnglish", mergedWord.meaningEnglish, { emptyLabel: t("courses.missingMeaningValue") })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 2)}>
                      {renderEditableTextCell(mergedWord, "meaningKorean", mergedWord.meaningKorean, { emptyLabel: t("courses.missingMeaningValue") })}
                    </TableCell>
                    <TableCell
                      {...selectableCellProps(rowIdx, 3)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                      sx={selectableCellSx(rowIdx, 3)}
                    >
                      {!isMissingField(mergedWord, "pronunciation") ? (
                        renderEditableTextCell(mergedWord, "pronunciation", mergedWord.pronunciation, { textVariant: "body2" })
                      ) : (
                        <MissingPronunciationButton wordId={word.id} />
                      )}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 4)}>
                      {renderEditableTextCell(mergedWord, "example", mergedWord.example, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 5)}>
                      {renderEditableTextCell(mergedWord, "translationEnglish", mergedWord.translationEnglish, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 6)}>
                      {renderEditableTextCell(mergedWord, "translationKorean", mergedWord.translationKorean, { emptyLabel: t("words.none"), textVariant: "body2" })}
                    </TableCell>
                  </>
                  ) : isFamousQuoteWord(mergedWord) ? (
                  <>
                    <TableCell {...selectableCellProps(rowIdx, 0)}>
                      {mergedWord.quote}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 1)}>
                      {mergedWord.author}
                    </TableCell>
                    {mergedWord.translation || getResolvedTextField(word.id, "translation") ? (
                      <TableCell {...selectableCellProps(rowIdx, 2)}>
                        {getResolvedTextField(word.id, "translation") || mergedWord.translation}
                      </TableCell>
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="translation"
                        tooltipKey="words.useSharedTranslations"
                        row={rowIdx}
                        col={2}
                      />
                    )}
                    <TableCell {...selectableCellProps(rowIdx, 3)}>
                      {mergedWord.language ?? ''}
                    </TableCell>
                  </>
                  ) : isExtremelyAdvanced ? (
                  <>
                    <TableCell {...selectableCellProps(rowIdx, 0)}>
                      {renderEditableTextCell(mergedWord, "primaryText", (mergedWord as ExtremelyAdvancedWord).word, {
                        emptyLabel: t("courses.missingWordValue"),
                        fontWeight: 500,
                        singleLine: true,
                      })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 1)}>
                      {renderEditableTextCell(mergedWord, "meaning", (mergedWord as ExtremelyAdvancedWord).meaning, {
                        emptyLabel: t("courses.missingMeaningValue"),
                        numberedList: true,
                      })}
                    </TableCell>
                    {!isMissingField(mergedWord, "example") ? (
                      <ExampleCell
                        text={getResolvedTextField(word.id, "example") || (mergedWord as ExtremelyAdvancedWord).example}
                        spreadsheetProps={selectableCellProps(rowIdx, 2)}
                        onClick={(e) => handleCellClick(e, rowIdx, 2)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 2)}
                        selected={isCellSelected(rowIdx, 2)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="example"
                        tooltipKey="courses.generateExample"
                        row={rowIdx}
                        col={2}
                      />
                    )}
                    {!isMissingField(mergedWord, "translation") ? (
                      <ExampleCell
                        text={
                          getResolvedTextField(word.id, "translation") ||
                          (mergedWord as ExtremelyAdvancedWord).translation
                        }
                        spreadsheetProps={selectableCellProps(rowIdx, 3)}
                        onClick={(e) => handleCellClick(e, rowIdx, 3)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, 3)}
                        selected={isCellSelected(rowIdx, 3)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="translation"
                        tooltipKey="courses.generateTranslation"
                        row={rowIdx}
                        col={3}
                      />
                    )}
                    {showImageUrl && (
                      <TableCell {...selectableCellProps(rowIdx, 4, { omitUnselectedAria: true })}>
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
                              aria-label={t("words.generateNewImage")}
                              onClick={(e) => {
                                e.stopPropagation();
                                openFieldModal(word.id, "image");
                              }}
                              sx={{ p: 0 }}
                            >
                              {!isMissingField(mergedWord, "image") ? (
                                <Box
                                  component="img"
                                  src={getResolvedImage(word.id) || (mergedWord as ExtremelyAdvancedWord).imageUrl}
                                  alt={(mergedWord as ExtremelyAdvancedWord).word}
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
                  ) : (
                  <>
                    <TableCell {...selectableCellProps(rowIdx, 0)}>
                      {renderEditableTextCell(mergedWord, "primaryText", mergedWord.word, {
                        emptyLabel: t("courses.missingWordValue"),
                        fontWeight: 500,
                        singleLine: true,
                      })}
                    </TableCell>
                    <TableCell {...selectableCellProps(rowIdx, 1)}>
                      {renderEditableTextCell(mergedWord, "meaning", mergedWord.meaning, {
                        emptyLabel: t("courses.missingMeaningValue"),
                        numberedList: true,
                      })}
                    </TableCell>
                    {hasSynonymColumn && (
                      <TableCell {...selectableCellProps(rowIdx, 2)}>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                          {insertNumberedBreaks((mergedWord as StandardWord).synonym || "") || t("words.none")}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell
                      {...selectableCellProps(rowIdx, hasSynonymColumn ? 3 : 2)}
                      onContextMenu={(e) => handleCellContextMenu(e, rowIdx, hasSynonymColumn ? 3 : 2)}
                      sx={selectableCellSx(rowIdx, hasSynonymColumn ? 3 : 2)}
                    >
                      {!isMissingField(mergedWord, "pronunciation") ? (
                        renderEditableTextCell(
                          mergedWord,
                          "pronunciation",
                          getResolvedTextField(word.id, "pronunciation") ||
                            (mergedWord as StandardWord).pronunciation,
                          { textVariant: "body2" },
                        )
                      ) : (
                        <MissingPronunciationButton wordId={word.id} />
                      )}
                    </TableCell>
                    {!isMissingField(mergedWord, "example") ? (
                      <ExampleCell
                        text={getResolvedTextField(word.id, "example") || mergedWord.example}
                        spreadsheetProps={selectableCellProps(rowIdx, hasSynonymColumn ? 4 : 3)}
                        onClick={(e) => handleCellClick(e, rowIdx, hasSynonymColumn ? 4 : 3)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, hasSynonymColumn ? 4 : 3)}
                        selected={isCellSelected(rowIdx, hasSynonymColumn ? 4 : 3)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="example"
                        tooltipKey="courses.generateExample"
                        row={rowIdx}
                        col={hasSynonymColumn ? 4 : 3}
                      />
                    )}
                    {!isMissingField(mergedWord, "translation") ? (
                      <ExampleCell
                        text={
                          getResolvedTextField(word.id, "translation") || mergedWord.translation
                        }
                        spreadsheetProps={selectableCellProps(rowIdx, hasSynonymColumn ? 5 : 4)}
                        onClick={(e) => handleCellClick(e, rowIdx, hasSynonymColumn ? 5 : 4)}
                        onContextMenu={(e) => handleCellContextMenu(e, rowIdx, hasSynonymColumn ? 5 : 4)}
                        selected={isCellSelected(rowIdx, hasSynonymColumn ? 5 : 4)}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="translation"
                        tooltipKey="courses.generateTranslation"
                        row={rowIdx}
                        col={hasSynonymColumn ? 5 : 4}
                      />
                    )}
                    {showImageUrl && (
                      <TableCell
                        {...selectableCellProps(rowIdx, hasSynonymColumn ? 6 : 5, {
                          omitUnselectedAria: true,
                        })}
                      >
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
                              aria-label={t("words.generateNewImage")}
                              onClick={(e) => {
                                e.stopPropagation();
                                openFieldModal(word.id, "image");
                              }}
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
                    {(() => {
                      const derivatives = (mergedWord as StandardWord).derivative;
                      const hasDeriv = derivatives && derivatives.length > 0;
                      const derivativeCol = hasSynonymColumn
                        ? (showImageUrl ? 7 : 6)
                        : (showImageUrl ? 6 : 5);
                      const canGenerateDerivative =
                        supportsDerivatives &&
                        isDerivativeGenerationEligibleResult({
                          courseId: courseId as CourseId,
                          type: "standard",
                          schemaVariant: "standard",
                          primaryText: (mergedWord as StandardWord).word,
                          meaning: (mergedWord as StandardWord).meaning,
                        });
                      return (
                        <TableCell
                          {...selectableCellProps(rowIdx, derivativeCol, {
                            omitUnselectedAria: true,
                          })}
                          onContextMenu={(e) =>
                            handleCellContextMenu(
                              e,
                              rowIdx,
                              derivativeCol,
                            )
                          }
                          onClick={
                            supportsDerivatives
                              ? (e) => {
                                  e.stopPropagation();
                                  clearSelection();
                                  setDerivativeDialogWordId(word.id);
                                }
                              : undefined
                          }
                          sx={
                            supportsDerivatives
                              ? {
                                  ...selectableCellSx(rowIdx, derivativeCol),
                                  cursor: "pointer",
                                  "&:hover": { bgcolor: "action.hover" },
                                }
                              : selectableCellSx(rowIdx, derivativeCol)
                          }
                        >
                          {hasDeriv ? (
                            derivatives.map((d, i) => (
                              <Box key={i} mb={0.5}>
                                <Typography variant="body2" fontWeight={600} lineHeight={1.2}>
                                  {d.word}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.3} sx={{ whiteSpace: 'pre-line' }}>
                                  {d.meaning.replace(/\\n/g, '\n').replace(/([^\n])(\d+\.)/g, '$1\n$2').replace(/(\d+\.)\n/g, '$1 ')}
                                </Typography>
                              </Box>
                            ))
                          ) : (
                            <Tooltip
                              title={
                                canGenerateDerivative
                                  ? t("words.generateDerivatives")
                                  : t("words.contextMenuEdit", "Edit")
                              }
                            >
                              <IconButton
                                size="small"
                                aria-label={
                                  canGenerateDerivative
                                    ? t("words.generateDerivatives")
                                    : t("words.contextMenuEdit", "Edit")
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  clearSelection();
                                  setDerivativeDialogWordId(word.id);
                                }}
                              >
                                {canGenerateDerivative ? (
                                  <AutoFixHighIcon fontSize="small" />
                                ) : (
                                  <EditIcon fontSize="small" />
                                )}
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      );
                    })()}
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
        onAnalyze={
          contextMenuAnalyzeRequest ? handleContextMenuAnalyze : null
        }
        onAddFurigana={
          contextMenuAddFuriganaField ? handleContextMenuAddFurigana : null
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
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={copySnackbar.success ? "success" : "error"}
          onClose={() => setCopySnackbar((prev) => ({ ...prev, open: false }))}
        >
          {copySnackbar.success ? t("common.copied") : t("common.copyFailed")}
        </Alert>
      </Snackbar>

      {derivativeDialogWordId && (() => {
        const w = words.find((ww) => ww.id === derivativeDialogWordId);
        const merged = w ? { ...w, ...localWordUpdates[w.id] } as Word : null;
        const isStandard = merged && !isCollocationWord(merged) && !isIdiomWord(merged) && !isJlptWord(merged) && !isKanjiWord(merged) && !isPrefixWord(merged) && !isPostfixWord(merged) && !isFamousQuoteWord(merged);
        const initial = isStandard ? (merged as StandardWord).derivative ?? [] : [];
        const canGenerate = Boolean(
          isStandard &&
            courseId &&
            isDerivativeGenerationEligibleResult({
              courseId,
              type: "standard",
              schemaVariant: "standard",
              primaryText: (merged as StandardWord).word,
              meaning: (merged as StandardWord).meaning,
            }),
        );
        return (
          <DerivativeEditDialog
            open
            courseId={courseId ?? ""}
            baseWord={isStandard ? (merged as StandardWord).word : ""}
            baseMeaning={isStandard ? (merged as StandardWord).meaning : ""}
            sourceLabel={dayId ? `${courseLabel} / ${dayId}` : courseLabel}
            canGenerate={canGenerate}
            initial={initial}
            onClose={() => setDerivativeDialogWordId(null)}
            onSave={async (items) => {
              if (derivativeDialogWordId) {
                await persistDerivatives(derivativeDialogWordId, items);
              }
              setLocalWordUpdates((prev) => ({
                ...prev,
                [derivativeDialogWordId]: { ...prev[derivativeDialogWordId], derivative: items },
              }));
              onWordFieldsUpdated?.(derivativeDialogWordId, { derivative: items });
              setDerivativeDialogWordId(null);
            }}
          />
        );
      })()}
    </>
  );
}
