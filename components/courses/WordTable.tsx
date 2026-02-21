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
import { isCollocationWord } from "@/types/word";

// Detects "Name: text. Name: text" dialogue formatting.
// Supports plain names (Layne:) and numbered names (Neighbor 1:).
const DIALOGUE_SPLIT_REGEX =
  /(?<=[.?!])\s+(?!(?:Mr|Mrs|Ms|Dr|Prof)\b)(?=[A-Z][A-Za-z]+(?:\s+\d+)?:)/g;

// Matches the speaker name at the start of a dialogue line
const SPEAKER_LINE_REGEX = /^([A-Z][A-Za-z]+(?:\s+\d+)?):(.+)$/;

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
            return (
              <Box key={i} sx={{ mb: i < lines.length - 1 ? 1 : 0 }}>
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
                  sx={{ fontStyle: "italic", ml: 0.5 }}
                >
                  {match[2].trim()}
                </Typography>
              </Box>
            );
          }

          // Fallback for normal sentences
          return (
            <Typography
              key={i}
              variant="body2"
              sx={{ fontStyle: "italic", mb: i < lines.length - 1 ? 1 : 0 }}
            >
              {line}
            </Typography>
          );
        })}
      </Box>
    </TableCell>
  );
}

interface WordTableProps {
  words: Word[];
  isCollocation: boolean;
}

export default function WordTable({ words, isCollocation }: WordTableProps) {
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
