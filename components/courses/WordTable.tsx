"use client";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import type { Word } from "@/types/word";
import { isCollocationWord, isFamousQuoteWord } from "@/types/word";

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

interface WordTableProps {
  words: Word[];
  isCollocation: boolean;
  isFamousQuote?: boolean;
}

export default function WordTable({ words, isCollocation, isFamousQuote }: WordTableProps) {
  const { t } = useTranslation();

  return (
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
                  <TableCell>{word.pronunciation}</TableCell>
                  <ExampleCell text={word.example} />
                  <ExampleCell text={word.translation} />
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
