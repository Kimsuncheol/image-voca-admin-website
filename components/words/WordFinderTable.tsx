"use client";

import Link from "next/link";
import LaunchIcon from "@mui/icons-material/Launch";
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

import {
  formatWordFinderLocation,
  isWordFinderFieldMissing,
} from "@/lib/wordFinderMissingFieldActions";
import type { WordFinderResult } from "@/types/wordFinder";
import type { WordFinderActionField } from "@/types/wordFinder";

interface WordFinderTableProps {
  results: WordFinderResult[];
  onMissingFieldClick?: (
    result: WordFinderResult,
    field: WordFinderActionField,
  ) => void;
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
) {
  const isMissing = isWordFinderFieldMissing(result, field);

  if (!isMissing) {
    return <Chip size="small" variant={filled ? "filled" : "outlined"} label={label} />;
  }

  return (
    <Chip
      size="small"
      variant="outlined"
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
}: WordFinderTableProps) {
  const { t } = useTranslation();

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("words.primaryText")}</TableCell>
            <TableCell>{t("words.secondaryText")}</TableCell>
            <TableCell>{t("words.translationLabel")}</TableCell>
            <TableCell>{t("words.location")}</TableCell>
            <TableCell>{t("words.status")}</TableCell>
            <TableCell align="right">{t("words.actions")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {results.map((result) => (
            <TableRow key={`${result.courseId}:${result.dayId ?? "root"}:${result.id}`}>
              <TableCell sx={{ minWidth: 220 }}>
                <Stack spacing={0.75}>
                  <Typography fontWeight={600}>{result.primaryText}</Typography>
                  <Chip
                    label={getTypeLabel(result.type, t)}
                    size="small"
                    sx={{ width: "fit-content" }}
                  />
                </Stack>
              </TableCell>
              <TableCell sx={{ minWidth: 260 }}>
                <Stack spacing={0.5}>
                  <Typography variant="body2">
                    {result.meaning || result.secondaryText || t("words.none")}
                  </Typography>
                  {result.secondaryText && result.secondaryText !== result.meaning && (
                    <Typography variant="caption" color="text.secondary">
                      {result.secondaryText}
                    </Typography>
                  )}
                </Stack>
              </TableCell>
              <TableCell sx={{ minWidth: 220 }}>
                <Typography variant="body2">
                  {result.translation || t("words.none")}
                </Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 180 }}>
                <Typography variant="body2">
                  {formatWordFinderLocation(result, t("words.noDay"))}
                </Typography>
              </TableCell>
              <TableCell sx={{ minWidth: 220 }}>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {result.type === "standard" && (
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
                    )
                  )}
                  {result.type !== "famousQuote" && (
                    renderStatusChip(
                      result,
                      "example",
                      result.example ? t("words.hasExample") : t("words.missingExample"),
                      Boolean(result.example),
                      onMissingFieldClick,
                    )
                  )}
                  {renderStatusChip(
                    result,
                    "translation",
                    result.translation
                      ? t("words.hasTranslation")
                      : t("words.missingTranslation"),
                    Boolean(result.translation),
                    onMissingFieldClick,
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
