"use client";

import {
  FocusEvent,
  KeyboardEvent,
  ReactNode,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

export type VocabularyEntry = {
  word: string | null;
  reading: string | null;
  romanized: string | null;
  meanings: string[];
  part_of_speech: string[];
  is_common: boolean;
};

export type VocabularyVisibleSections = {
  meanings: boolean;
  reading: boolean;
  romanized: boolean;
  partOfSpeech: boolean;
};

export default function VocabularyResultCard({
  entry,
  resultTitle,
  wordLabel,
  readingLabel,
  romanizedLabel,
  meaningsLabel,
  partOfSpeechLabel,
  commonLabel,
  uncommonLabel,
  visibleSections,
}: {
  entry: VocabularyEntry;
  resultTitle: string;
  wordLabel: string;
  readingLabel: string;
  romanizedLabel: string;
  meaningsLabel: string;
  partOfSpeechLabel: string;
  commonLabel: string;
  uncommonLabel: string;
  visibleSections?: VocabularyVisibleSections;
}) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [activeMeaningIndex, setActiveMeaningIndex] = useState<number | null>(null);
  const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; success: boolean }>({
    open: false,
    success: true,
  });

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopySnackbar({ open: true, success: true });
    } catch {
      setCopySnackbar({ open: true, success: false });
    }
  }

  function handleSectionBlur(
    event: FocusEvent<HTMLDivElement>,
    sectionId: string,
  ) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setActiveSection((current) => (current === sectionId ? null : current));
  }

  function handleMeaningKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    meaning: string,
  ) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    void handleCopy(meaning);
  }

  function handleMeaningBlur(
    event: FocusEvent<HTMLDivElement>,
    meaningIndex: number,
  ) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setActiveMeaningIndex((current) => (current === meaningIndex ? null : current));
  }

  function renderCopySection({
    sectionId,
    label,
    copyValue,
    children,
  }: {
    sectionId: string;
    label?: string;
    copyValue: string;
    children: ReactNode;
  }) {
    const isActive = activeSection === sectionId;

    return (
      <Box
        data-testid={`vocabulary-section-${sectionId}`}
        onMouseOver={() => setActiveSection(sectionId)}
        onMouseOut={() =>
          setActiveSection((current) => (current === sectionId ? null : current))
        }
        onFocusCapture={() => setActiveSection(sectionId)}
        onBlurCapture={(event: FocusEvent<HTMLDivElement>) =>
          handleSectionBlur(event, sectionId)
        }
        sx={{ position: "relative", pr: 7 }}
      >
        {isActive ? (
          <IconButton
            size="small"
            aria-label={t("promotionCodes.copyCode", "Copy")}
            data-testid={`vocabulary-copy-${sectionId}`}
            onClick={() => void handleCopy(copyValue)}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              p: 1,
              color: "text.secondary",
            }}
          >
            <ContentCopyIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}

        <Stack spacing={0.5}>
          {label ? (
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          ) : null}
          {children}
        </Stack>
      </Box>
    );
  }

  function renderField(sectionId: string, label: string, value: string | null) {
    if (!value) return null;

    return renderCopySection({
      sectionId,
      label,
      copyValue: value,
      children: <Typography>{value}</Typography>,
    });
  }

  return (
    <>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
            >
              <Typography variant="h6">{resultTitle}</Typography>
              {renderCopySection({
                sectionId: "status",
                copyValue: entry.is_common ? commonLabel : uncommonLabel,
                children: (
                  <Chip
                    size="small"
                    color={entry.is_common ? "success" : "default"}
                    label={entry.is_common ? commonLabel : uncommonLabel}
                  />
                ),
              })}
            </Stack>

            {renderField("word", wordLabel, entry.word)}
            {visibleSections?.reading !== false
              ? renderField("reading", readingLabel, entry.reading)
              : null}
            {visibleSections?.romanized !== false
              ? renderField("romanized", romanizedLabel, entry.romanized)
              : null}

            {visibleSections?.meanings !== false && entry.meanings.length > 0
              ? renderCopySection({
                  sectionId: "meanings",
                  label: meaningsLabel,
                  copyValue: entry.meanings.join("\n"),
                  children: (
                    <Stack spacing={0.5}>
                      {entry.meanings.map((meaning, index) => (
                        <Box
                          key={`${meaning}-${index}`}
                          role="button"
                          tabIndex={0}
                          data-testid={`vocabulary-meaning-${index}`}
                          onMouseOver={() => setActiveMeaningIndex(index)}
                          onMouseOut={() =>
                            setActiveMeaningIndex((current) =>
                              current === index ? null : current,
                            )
                          }
                          onFocusCapture={() => setActiveMeaningIndex(index)}
                          onBlurCapture={(event: FocusEvent<HTMLDivElement>) =>
                            handleMeaningBlur(event, index)
                          }
                          onClick={() => void handleCopy(meaning)}
                          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) =>
                            handleMeaningKeyDown(event, meaning)
                          }
                          sx={{
                            userSelect: "none",
                            position: "relative",
                            borderRadius: 1,
                            px: 0.75,
                            py: 0.5,
                            ml: -0.75,
                            mr: -0.75,
                            pr: 4,
                            transition: "background-color 0.15s ease",
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                            "&:focus-visible": {
                              outline: "2px solid",
                              outlineColor: "primary.main",
                              outlineOffset: 1,
                            },
                          }}
                        >
                          {activeMeaningIndex === index ? (
                            <IconButton
                              size="small"
                              aria-label={t("promotionCodes.copyCode", "Copy")}
                              data-testid={`vocabulary-meaning-copy-${index}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCopy(meaning);
                              }}
                              sx={{
                                position: "absolute",
                                top: "50%",
                                right: 2,
                                transform: "translateY(-50%)",
                                p: 1.5,
                                color: "text.secondary",
                              }}
                            >
                              <ContentCopyIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          ) : null}
                          <Typography>{meaning}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  ),
                })
              : null}

            {visibleSections?.partOfSpeech !== false &&
            entry.part_of_speech.length > 0
              ? renderCopySection({
                  sectionId: "part-of-speech",
                  label: partOfSpeechLabel,
                  copyValue: entry.part_of_speech.join(", "),
                  children: (
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                      {entry.part_of_speech.map((value) => (
                        <Chip key={value} size="small" variant="outlined" label={value} />
                      ))}
                    </Stack>
                  ),
                })
              : null}
          </Stack>
        </CardContent>
      </Card>

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
    </>
  );
}
