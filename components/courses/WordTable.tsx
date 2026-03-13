"use client";

import { useMemo, useState, type ReactNode } from "react";
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

import WordFinderMissingFieldDialog from "@/components/words/WordFinderMissingFieldDialog";
import { getCourseById, type CourseId } from "@/types/course";
import type { Word, StandardWord } from "@/types/word";
import { isCollocationWord, isFamousQuoteWord } from "@/types/word";
import {
  adaptCourseWordToWordFinderResult,
  applyCourseWordResolvedUpdates,
} from "@/lib/wordFinderCourseAdapter";
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

function ExampleCell({ text }: { text: string | undefined }) {
  if (!text) return <TableCell />;

  const lines = text.split(DIALOGUE_SPLIT_REGEX);

  return (
    <TableCell>
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

interface WordTableProps {
  words: Word[];
  isCollocation: boolean;
  isFamousQuote?: boolean;
  showImageUrl?: boolean;
  courseId?: CourseId;
  coursePath?: string;
  dayId?: string;
  onWordImageUpdated?: (wordId: string, imageUrl: string) => void;
  onWordFieldsUpdated?: (
    wordId: string,
    fields: Partial<Pick<StandardWord, "pronunciation" | "example" | "translation">>,
  ) => void;
}

export default function WordTable({
  words,
  isCollocation,
  isFamousQuote,
  showImageUrl,
  courseId,
  coursePath,
  dayId,
  onWordImageUpdated,
  onWordFieldsUpdated,
}: WordTableProps) {
  const { t } = useTranslation();
  const [localResolvedFields, setLocalResolvedFields] = useState<
    Record<string, WordFinderResultFieldUpdates>
  >({});
  const [activeWordId, setActiveWordId] = useState("");
  const [activeField, setActiveField] = useState<WordFinderActionField | null>(null);

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
    const mergedWord = { ...activeWord, ...localResolvedFields[activeWord.id] } as Word;

    return adaptCourseWordToWordFinderResult({
      word: mergedWord,
      courseId,
      courseLabel,
      coursePath,
      dayId,
      isCollocation,
      isFamousQuote,
    });
  }, [
    activeWord,
    courseId,
    courseLabel,
    coursePath,
    dayId,
    isCollocation,
    isFamousQuote,
    localResolvedFields,
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
    const resolved = localResolvedFields[wordId];
    if (field === "pronunciation") {
      return resolved?.pronunciation ?? "";
    }
    if (field === "example") {
      return resolved?.example ?? "";
    }
    return resolved?.translation ?? "";
  };

  const getResolvedImage = (wordId: string): string => {
    return localResolvedFields[wordId]?.imageUrl ?? "";
  };

  const handleResolved = (updates: WordFinderResultFieldUpdates) => {
    if (!activeWordId || !activeWord) return;

    const mappedUpdates = applyCourseWordResolvedUpdates(activeWord, updates);

    setLocalResolvedFields((prev) => ({
      ...prev,
      [activeWordId]: {
        ...prev[activeWordId],
        ...mappedUpdates,
      },
    }));

    if (typeof mappedUpdates.imageUrl === "string") {
      onWordImageUpdated?.(activeWordId, mappedUpdates.imageUrl);
    }

    const fieldUpdates: Partial<
      Pick<StandardWord, "pronunciation" | "example" | "translation">
    > = {};
    if (typeof mappedUpdates.pronunciation === "string") {
      fieldUpdates.pronunciation = mappedUpdates.pronunciation;
    }
    if (typeof mappedUpdates.example === "string") {
      fieldUpdates.example = mappedUpdates.example;
    }
    if (typeof mappedUpdates.translation === "string") {
      fieldUpdates.translation = mappedUpdates.translation;
    }

    if (Object.keys(fieldUpdates).length > 0) {
      onWordFieldsUpdated?.(activeWordId, fieldUpdates);
    }
  };

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
            {words.map((word) => (
              <TableRow key={word.id}>
                {isCollocationWord(word) ? (
                  <>
                    <TableCell>{word.collocation}</TableCell>
                    <TableCell>{word.meaning}</TableCell>
                    <TableCell>{word.explanation}</TableCell>
                    {word.example || getResolvedTextField(word.id, "example") ? (
                      <ExampleCell
                        text={getResolvedTextField(word.id, "example") || word.example}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="example"
                        tooltipKey="words.generateNewExamples"
                      />
                    )}
                    {word.translation || getResolvedTextField(word.id, "translation") ? (
                      <ExampleCell
                        text={
                          getResolvedTextField(word.id, "translation") || word.translation
                        }
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="translation"
                        tooltipKey="words.generateNewTranslations"
                      />
                    )}
                  </>
                ) : isFamousQuoteWord(word) ? (
                  <>
                    <TableCell>{word.quote}</TableCell>
                    <TableCell>{word.author}</TableCell>
                    {word.translation || getResolvedTextField(word.id, "translation") ? (
                      <TableCell>
                        {getResolvedTextField(word.id, "translation") || word.translation}
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
                    <TableCell>{word.word}</TableCell>
                    <TableCell>{word.meaning}</TableCell>
                    {word.pronunciation || getResolvedTextField(word.id, "pronunciation") ? (
                      <TableCell>
                        {getResolvedTextField(word.id, "pronunciation") || word.pronunciation}
                      </TableCell>
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="pronunciation"
                        tooltipKey="courses.generatePronunciation"
                      />
                    )}
                    {word.example || getResolvedTextField(word.id, "example") ? (
                      <ExampleCell
                        text={getResolvedTextField(word.id, "example") || word.example}
                      />
                    ) : (
                      <MissingFieldTrigger
                        wordId={word.id}
                        field="example"
                        tooltipKey="courses.generateExample"
                      />
                    )}
                    {word.translation || getResolvedTextField(word.id, "translation") ? (
                      <ExampleCell
                        text={
                          getResolvedTextField(word.id, "translation") || word.translation
                        }
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
                        {word.imageUrl || getResolvedImage(word.id) ? (
                          <Box
                            component="img"
                            src={getResolvedImage(word.id) || word.imageUrl}
                            alt={word.word}
                            sx={{
                              width: 64,
                              height: 64,
                              objectFit: "cover",
                              borderRadius: 1,
                            }}
                          />
                        ) : (
                          <Tooltip title={t("words.generateNewImage")}>
                            <IconButton
                              size="small"
                              onClick={() => openFieldModal(word.id, "image")}
                              sx={{ p: 0 }}
                            >
                              <AddPhotoAlternateIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    )}
                  </>
                )}
              </TableRow>
            ))}
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
