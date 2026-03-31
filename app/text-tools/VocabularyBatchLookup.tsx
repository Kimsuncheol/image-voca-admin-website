"use client";

import { FocusEvent, FormEvent, KeyboardEvent, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useTranslation } from "react-i18next";

import VocabularyResultCard, {
  VocabularyEntry,
  VocabularyVisibleSections,
} from "./VocabularyResultCard";

type VocabularyBatchResult = {
  original_text: string;
  status: string;
  entry: VocabularyEntry | null;
  error: string | null;
};

type VocabularyBatchLookupResponse = {
  original_texts: string[];
  results: VocabularyBatchResult[];
};

type BatchLayout = "card" | "table";

const DEFAULT_VISIBLE_SECTIONS: VocabularyVisibleSections = {
  meanings: true,
  reading: true,
  romanized: true,
  partOfSpeech: true,
};

export default function VocabularyBatchLookup({
  apiPath,
  submitLabel,
  loadingLabel,
  resetLabel,
  inputLabel,
  inputHelpText,
  inputRequiredMsg,
  networkErrorMsg,
  resultTitle,
  wordLabel,
  readingLabel,
  romanizedLabel,
  meaningsLabel,
  partOfSpeechLabel,
  commonLabel,
  uncommonLabel,
  filterMeaningsLabel,
  filterReadingLabel,
  filterRomanizedLabel,
  filterPartOfSpeechLabel,
  layoutCardLabel,
  layoutTableLabel,
  originalTextLabel,
  notFoundTitle,
  invalidInputTitle,
  errorTitle,
  unknownErrorMsg,
  standbyTitle,
  standbyDescription,
}: {
  apiPath: string;
  submitLabel: string;
  loadingLabel: string;
  resetLabel: string;
  inputLabel: string;
  inputHelpText: string;
  inputRequiredMsg: string;
  networkErrorMsg: string;
  resultTitle: string;
  wordLabel: string;
  readingLabel: string;
  romanizedLabel: string;
  meaningsLabel: string;
  partOfSpeechLabel: string;
  commonLabel: string;
  uncommonLabel: string;
  filterMeaningsLabel: string;
  filterReadingLabel: string;
  filterRomanizedLabel: string;
  filterPartOfSpeechLabel: string;
  layoutCardLabel: string;
  layoutTableLabel: string;
  originalTextLabel: string;
  notFoundTitle: string;
  invalidInputTitle: string;
  errorTitle: string;
  unknownErrorMsg: string;
  standbyTitle: string;
  standbyDescription: string;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [results, setResults] = useState<VocabularyBatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState<BatchLayout>("table");
  const [visibleSections, setVisibleSections] = useState<VocabularyVisibleSections>(
    DEFAULT_VISIBLE_SECTIONS,
  );
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const [activeMeaning, setActiveMeaning] = useState<string | null>(null);
  const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; success: boolean }>({
    open: false,
    success: true,
  });

  function parseTexts(value: string) {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const texts = parseTexts(input);

    if (texts.length === 0) {
      setError(inputRequiredMsg);
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });

      const data = (await response.json()) as VocabularyBatchLookupResponse;

      if (!response.ok) {
        setError(networkErrorMsg);
        return;
      }

      setResults(data.results);
    } catch {
      setError(networkErrorMsg);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setInput("");
    setResults([]);
    setError("");
    setLayout("table");
    setVisibleSections(DEFAULT_VISIBLE_SECTIONS);
    setActiveCell(null);
    setActiveMeaning(null);
  }

  function toggleSection(section: keyof VocabularyVisibleSections) {
    setVisibleSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopySnackbar({ open: true, success: true });
    } catch {
      setCopySnackbar({ open: true, success: false });
    }
  }

  function handleCellBlur(
    event: FocusEvent<HTMLDivElement>,
    cellId: string,
  ) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setActiveCell((current) => (current === cellId ? null : current));
  }

  function handleMeaningBlur(
    event: FocusEvent<HTMLDivElement>,
    meaningId: string,
  ) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setActiveMeaning((current) => (current === meaningId ? null : current));
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

  function renderCellContent({
    cellId,
    copyValue,
    children,
  }: {
    cellId: string;
    copyValue: string;
    children: React.ReactNode;
  }) {
    const isActive = activeCell === cellId;

    return (
      <Box
        data-testid={`vocabulary-batch-cell-${cellId}`}
        onMouseOver={() => setActiveCell(cellId)}
        onMouseOut={() =>
          setActiveCell((current) => (current === cellId ? null : current))
        }
        onFocusCapture={() => setActiveCell(cellId)}
        onBlurCapture={(event: FocusEvent<HTMLDivElement>) =>
          handleCellBlur(event, cellId)
        }
        sx={{ position: "relative", pr: 5 }}
      >
        {isActive ? (
          <IconButton
            size="small"
            aria-label={t("promotionCodes.copyCode", "Copy")}
            data-testid={`vocabulary-batch-copy-${cellId}`}
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

        {children}
      </Box>
    );
  }

  function renderNonSuccessResultItem(result: VocabularyBatchResult, index: number) {
    const label = result.original_text.trim() || "—";

    let severity: "info" | "warning" | "error" = "info";
    let message = notFoundTitle;

    if (result.status === "invalid_input") {
      severity = "warning";
      message = invalidInputTitle;
    } else if (result.status !== "ok") {
      severity = "error";
      message = result.error || unknownErrorMsg;
    }

    return (
      <Card key={`${result.original_text}-${index}`} variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Stack spacing={0.25}>
              <Typography variant="caption" color="text.secondary">
                {originalTextLabel}
              </Typography>
              <Typography variant="body2">{label}</Typography>
            </Stack>

            <Alert severity={severity}>
              <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  {severity === "error" ? errorTitle : message}
                </Typography>
                {severity === "error" ? (
                  <Typography variant="body2">{message}</Typography>
                ) : null}
              </Stack>
            </Alert>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  function renderSuccessCards() {
    const successResults = results.filter(
      (result): result is VocabularyBatchResult & { entry: VocabularyEntry } =>
        result.status === "ok" && result.entry !== null,
    );

    if (successResults.length === 0) {
      return null;
    }

    return (
      <Stack spacing={2}>
        {successResults.map((result, index) => {
          const original = result.original_text.trim();
          const word = result.entry.word?.trim() ?? "";
          const showOriginalContext = Boolean(original && word && original !== word);

          return (
            <Stack key={`${result.original_text}-${index}`} spacing={1.5}>
              {showOriginalContext ? (
                <Stack spacing={0.25}>
                  <Typography variant="caption" color="text.secondary">
                    {originalTextLabel}
                  </Typography>
                  <Typography variant="body2">{original}</Typography>
                </Stack>
              ) : null}

              <VocabularyResultCard
                entry={result.entry}
                resultTitle={resultTitle}
                wordLabel={wordLabel}
                readingLabel={readingLabel}
                romanizedLabel={romanizedLabel}
                meaningsLabel={meaningsLabel}
                partOfSpeechLabel={partOfSpeechLabel}
                commonLabel={commonLabel}
                uncommonLabel={uncommonLabel}
                visibleSections={visibleSections}
              />
            </Stack>
          );
        })}
      </Stack>
    );
  }

  function renderSuccessTable() {
    const successResults = results.filter(
      (result): result is VocabularyBatchResult & { entry: VocabularyEntry } =>
        result.status === "ok" && result.entry !== null,
    );

    if (successResults.length === 0) {
      return null;
    }

    const originalTextNotes = successResults.filter((result) => {
      const original = result.original_text.trim();
      const word = result.entry.word?.trim() ?? "";
      return original && word && original !== word;
    });

    return (
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6">{resultTitle}</Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>word</TableCell>
                    {visibleSections.reading ? <TableCell>reading</TableCell> : null}
                    {visibleSections.romanized ? <TableCell>romanized</TableCell> : null}
                    {visibleSections.meanings ? <TableCell>meanings</TableCell> : null}
                    {visibleSections.partOfSpeech ? <TableCell>part of speech</TableCell> : null}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {successResults.map((result, rowIndex) => (
                    <TableRow key={`${result.original_text}-${rowIndex}`}>
                      <TableCell>
                        {renderCellContent({
                          cellId: `word-${rowIndex}`,
                          copyValue: result.entry.word ?? "",
                          children: (
                            <Stack spacing={0.5}>
                              <Typography>{result.entry.word}</Typography>
                              <Chip
                                size="small"
                                color={result.entry.is_common ? "success" : "default"}
                                label={result.entry.is_common ? commonLabel : uncommonLabel}
                                sx={{ alignSelf: "flex-start" }}
                              />
                            </Stack>
                          ),
                        })}
                      </TableCell>

                      {visibleSections.reading ? (
                        <TableCell>
                          {renderCellContent({
                            cellId: `reading-${rowIndex}`,
                            copyValue: result.entry.reading ?? "",
                            children: <Typography>{result.entry.reading}</Typography>,
                          })}
                        </TableCell>
                      ) : null}

                      {visibleSections.romanized ? (
                        <TableCell>
                          {renderCellContent({
                            cellId: `romanized-${rowIndex}`,
                            copyValue: result.entry.romanized ?? "",
                            children: <Typography>{result.entry.romanized}</Typography>,
                          })}
                        </TableCell>
                      ) : null}

                      {visibleSections.meanings ? (
                        <TableCell>
                          {renderCellContent({
                            cellId: `meanings-${rowIndex}`,
                            copyValue: result.entry.meanings.join("\n"),
                            children: (
                              <Stack spacing={0.5}>
                                {result.entry.meanings.map((meaning, meaningIndex) => {
                                  const meaningId = `${rowIndex}-${meaningIndex}`;

                                  return (
                                    <Box
                                      key={meaningId}
                                      role="button"
                                      tabIndex={0}
                                      data-testid={`vocabulary-meaning-${meaningId}`}
                                      onMouseOver={() => setActiveMeaning(meaningId)}
                                      onMouseOut={() =>
                                        setActiveMeaning((current) =>
                                          current === meaningId ? null : current,
                                        )
                                      }
                                      onFocusCapture={() => setActiveMeaning(meaningId)}
                                      onBlurCapture={(event: FocusEvent<HTMLDivElement>) =>
                                        handleMeaningBlur(event, meaningId)
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
                                      {activeMeaning === meaningId ? (
                                        <IconButton
                                          size="small"
                                          aria-label={t("promotionCodes.copyCode", "Copy")}
                                          data-testid={`vocabulary-meaning-copy-${meaningId}`}
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
                                  );
                                })}
                              </Stack>
                            ),
                          })}
                        </TableCell>
                      ) : null}

                      {visibleSections.partOfSpeech ? (
                        <TableCell>
                          {renderCellContent({
                            cellId: `part-of-speech-${rowIndex}`,
                            copyValue: result.entry.part_of_speech.join(", "),
                            children: (
                              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                {result.entry.part_of_speech.map((value) => (
                                  <Chip key={value} size="small" variant="outlined" label={value} />
                                ))}
                              </Stack>
                            ),
                          })}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {originalTextNotes.length > 0 ? (
              <Stack spacing={0.5}>
                {originalTextNotes.map((result, index) => (
                  <Typography
                    key={`${result.original_text}-${index}-original`}
                    variant="caption"
                    color="text.secondary"
                  >
                    {originalTextLabel}: {result.original_text} {"->"} {result.entry.word}
                  </Typography>
                ))}
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
        <Stack spacing={2} sx={{ flex: 1, width: "100%" }}>
          <TextField
            label={inputLabel}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            multiline
            minRows={6}
            fullWidth
            helperText={inputHelpText}
          />

          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? loadingLabel : submitLabel}
            </Button>
            <Button type="button" variant="outlined" onClick={handleReset} disabled={loading}>
              {resetLabel}
            </Button>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>

        <Stack spacing={2} sx={{ flex: 1, width: "100%" }}>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            data-testid="vocabulary-layout-options"
          >
            {[
              { value: "card" as const, label: layoutCardLabel },
              { value: "table" as const, label: layoutTableLabel },
            ].map((option) => {
              const selected = layout === option.value;

              return (
                <Chip
                  key={option.value}
                  label={option.label}
                  clickable
                  color={selected ? "primary" : "default"}
                  variant={selected ? "filled" : "outlined"}
                  data-testid={`vocabulary-layout-${option.value}`}
                  data-selected={selected ? "true" : "false"}
                  onClick={() => setLayout(option.value)}
                  sx={{
                    borderRadius: 999,
                    fontWeight: selected ? 600 : 500,
                    px: 0.5,
                    height: 34,
                    bgcolor: selected ? undefined : "background.paper",
                    borderColor: selected ? "primary.main" : "divider",
                  }}
                />
              );
            })}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            flexWrap="wrap"
            data-testid="vocabulary-filters"
          >
            {[
              {
                key: "meanings" as const,
                label: filterMeaningsLabel,
                selected: visibleSections.meanings,
              },
              {
                key: "reading" as const,
                label: filterReadingLabel,
                selected: visibleSections.reading,
              },
              {
                key: "romanized" as const,
                label: filterRomanizedLabel,
                selected: visibleSections.romanized,
              },
              {
                key: "partOfSpeech" as const,
                label: filterPartOfSpeechLabel,
                selected: visibleSections.partOfSpeech,
              },
            ].map((filter) => (
              <Chip
                key={filter.key}
                label={filter.label}
                clickable
                color={filter.selected ? "primary" : "default"}
                variant={filter.selected ? "filled" : "outlined"}
                data-testid={`vocabulary-filter-${filter.key}`}
                data-selected={filter.selected ? "true" : "false"}
                onClick={() => toggleSection(filter.key)}
                sx={{
                  borderRadius: 999,
                  fontWeight: filter.selected ? 600 : 500,
                  px: 0.5,
                  height: 34,
                  bgcolor: filter.selected ? undefined : "background.paper",
                  borderColor: filter.selected ? "primary.main" : "divider",
                }}
              />
            ))}
          </Stack>

          {results.length === 0 ? (
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                minHeight: 250,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.default",
              }}
            >
              <CardContent>
                <Stack spacing={1.5} alignItems="center" color="text.secondary">
                  <SearchIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                  <Typography variant="subtitle1" fontWeight={600} align="center">
                    {standbyTitle}
                  </Typography>
                  <Typography variant="body2" align="center" sx={{ maxWidth: 300 }}>
                    {standbyDescription}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <>
              {layout === "table" ? renderSuccessTable() : renderSuccessCards()}
              {results
                .filter((result) => result.status !== "ok" || result.entry === null)
                .map((result, index) => renderNonSuccessResultItem(result, index))}
            </>
          )}
        </Stack>
      </Stack>

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
    </Box>
  );
}
