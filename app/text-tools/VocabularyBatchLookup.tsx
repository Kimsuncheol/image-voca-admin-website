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

import { VocabularyEntry } from "./VocabularyResultCard";

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
    setActiveCell(null);
    setActiveMeaning(null);
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
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>word</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>reading</TableCell>
                    <TableCell>romanized</TableCell>
                    <TableCell>meanings</TableCell>
                    {/* <TableCell>part of speech</TableCell> */}
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

                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {renderCellContent({
                          cellId: `reading-${rowIndex}`,
                          copyValue: result.entry.reading ?? "",
                          children: (
                            <Typography sx={{ whiteSpace: "nowrap" }}>
                              {result.entry.reading}
                            </Typography>
                          ),
                        })}
                      </TableCell>

                      <TableCell>
                        {renderCellContent({
                          cellId: `romanized-${rowIndex}`,
                          copyValue: result.entry.romanized ?? "",
                          children: <Typography>{result.entry.romanized}</Typography>,
                        })}
                      </TableCell>

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

                      {/* <TableCell>
                        {renderCellContent({
                          cellId: `part-of-speech-${rowIndex}`,
                          copyValue: result.entry.part_of_speech.join(", "),
                          children: (
                            <Stack spacing={0.75} alignItems="flex-start">
                              {result.entry.part_of_speech.map((value, partIndex) => (
                                <Chip
                                  key={`${value}-${partIndex}`}
                                  size="small"
                                  variant="outlined"
                                  label={value}
                                  data-testid={`vocabulary-batch-part-of-speech-${rowIndex}-${partIndex}`}
                                />
                              ))}
                            </Stack>
                          ),
                        })}
                      </TableCell> */}
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
              {renderSuccessTable()}
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
