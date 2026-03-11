"use client";

import { useState } from "react";
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
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTranslation } from "react-i18next";
import type { Word, StandardWord } from "@/types/word";
import { isCollocationWord, isFamousQuoteWord } from "@/types/word";
import { useAISettings } from "@/lib/hooks/useAISettings";
import WordImageModal from "./WordImageModal";
import { updateWordField } from "@/lib/firebase/firestore";

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
          // If the line has "Name: text", split and style it
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

          // Fallback for normal sentences
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
  courseId?: string;
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
  const { settings: aiSettings, loading: aiSettingsLoading } = useAISettings();
  const [imageModalWord, setImageModalWord] = useState<StandardWord | null>(null);

  // Key: `${wordId}:${field}` → 'loading' | 'error'
  const [fieldState, setFieldState] = useState<Record<string, "loading" | "error">>({});

  // Locally mirrors generated values so cells update immediately without parent re-render
  const [localFields, setLocalFields] = useState<
    Record<string, Partial<Pick<StandardWord, "pronunciation" | "example" | "translation">>>
  >({});

  const getField = (word: StandardWord, field: GeneratableField) =>
    localFields[word.id]?.[field] ?? word[field];

  const isLoading = (wordId: string, field: string) =>
    fieldState[`${wordId}:${field}`] === "loading";

  const isError = (wordId: string, field: string) =>
    fieldState[`${wordId}:${field}`] === "error";

  const handleGenerateField = async (word: StandardWord, field: GeneratableField) => {
    if (!coursePath || !dayId) return;
    if (
      (field === "example" || field === "translation") &&
      !aiSettings.enrichGenerationEnabled
    ) {
      return;
    }
    const key = `${word.id}:${field}`;
    setFieldState((prev) => ({ ...prev, [key]: "loading" }));
    try {
      const currentExample = localFields[word.id]?.example ?? word.example;
      const resp = await fetch("/api/admin/generate-word-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field,
          word: word.word,
          meaning: word.meaning,
          ...(field === "translation" ? { example: currentExample } : {}),
        }),
      });
      if (!resp.ok) throw new Error();
      const result = (await resp.json()) as {
        pronunciation?: string;
        example?: string;
        translation?: string;
      };

      const fieldsToSave: Partial<Pick<StandardWord, "pronunciation" | "example" | "translation">> =
        {};
      if (result.pronunciation) fieldsToSave.pronunciation = result.pronunciation;
      if (result.example) fieldsToSave.example = result.example;
      if (result.translation) fieldsToSave.translation = result.translation;

      await Promise.all(
        (
          Object.entries(fieldsToSave) as [GeneratableField, string][]
        ).map(([f, v]) => updateWordField(coursePath, dayId, word.id, f, v)),
      );

      setLocalFields((prev) => ({
        ...prev,
        [word.id]: { ...prev[word.id], ...fieldsToSave },
      }));
      onWordFieldsUpdated?.(word.id, fieldsToSave);

      setFieldState((prev) => {
        const next = { ...prev };
        Object.keys(fieldsToSave).forEach((f) => delete next[`${word.id}:${f}`]);
        return next;
      });
    } catch {
      setFieldState((prev) => ({ ...prev, [key]: "error" }));
    }
  };

  const canGenerate = !!(coursePath && dayId);

  function AiTriggerCell({
    word,
    field,
    tooltipKey,
  }: {
    word: StandardWord;
    field: GeneratableField;
    tooltipKey: string;
  }) {
    const isEnrichmentField = field === "example" || field === "translation";
    const disabledReason = isEnrichmentField
      ? aiSettingsLoading
        ? t("common.loading")
        : !aiSettings.enrichGenerationEnabled
          ? t("courses.enrichGenerationDisabled")
          : null
      : null;

    if (disabledReason) {
      return (
        <TableCell>
          <Tooltip title={disabledReason}>
            <span>
              <IconButton size="small" disabled sx={{ p: 0 }}>
                <AutoFixHighIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </TableCell>
      );
    }

    if (isLoading(word.id, field)) {
      return (
        <TableCell>
          <CircularProgress size={16} />
        </TableCell>
      );
    }
    if (isError(word.id, field)) {
      return (
        <TableCell>
          <Tooltip title={t("courses.generateFieldError")}>
            <IconButton size="small" onClick={() => handleGenerateField(word, field)} sx={{ p: 0 }}>
              <ErrorOutlineIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </TableCell>
      );
    }
    return (
      <TableCell>
        <Tooltip title={t(tooltipKey)}>
          <IconButton size="small" onClick={() => handleGenerateField(word, field)} sx={{ p: 0 }}>
            <AutoFixHighIcon fontSize="small" />
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
                  <ExampleCell text={word.example} />
                  <ExampleCell text={word.translation} />
                </>
              ) : isFamousQuoteWord(word) ? (
                <>
                  <TableCell>{word.quote}</TableCell>
                  <TableCell>{word.author}</TableCell>
                  <TableCell>{word.translation}</TableCell>
                </>
              ) : (
                <>
                  <TableCell>{word.word}</TableCell>
                  <TableCell>{word.meaning}</TableCell>
                  {canGenerate && !getField(word, "pronunciation") ? (
                    <AiTriggerCell
                      word={word}
                      field="pronunciation"
                      tooltipKey="courses.generatePronunciation"
                    />
                  ) : (
                    <TableCell>{getField(word, "pronunciation")}</TableCell>
                  )}
                  {canGenerate && !getField(word, "example") ? (
                    <AiTriggerCell
                      word={word}
                      field="example"
                      tooltipKey="courses.generateExample"
                    />
                  ) : (
                    <ExampleCell text={getField(word, "example")} />
                  )}
                  {canGenerate && !getField(word, "translation") ? (
                    <AiTriggerCell
                      word={word}
                      field="translation"
                      tooltipKey="courses.generateTranslation"
                    />
                  ) : (
                    <ExampleCell text={getField(word, "translation")} />
                  )}
                  {showImageUrl && (
                    <TableCell>
                      <IconButton size="small" onClick={() => setImageModalWord(word)} sx={{ p: 0 }}>
                        {word.imageUrl ? (
                          <Box
                            component="img"
                            src={word.imageUrl}
                            alt={word.word}
                            sx={{ width: 64, height: 64, objectFit: "cover", borderRadius: 1 }}
                          />
                        ) : (
                          <AddPhotoAlternateIcon fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                  )}
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>

      {imageModalWord && courseId && coursePath && dayId && (
        <WordImageModal
          open={true}
          word={imageModalWord}
          courseId={courseId}
          coursePath={coursePath}
          dayId={dayId}
          onClose={() => setImageModalWord(null)}
          onImageSaved={(wordId, imageUrl) => {
            onWordImageUpdated?.(wordId, imageUrl);
            setImageModalWord(null);
          }}
        />
      )}
    </>
  );
}
