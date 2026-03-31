"use client";

import { FormEvent, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";

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
  originalTextLabel: string;
  notFoundTitle: string;
  invalidInputTitle: string;
  errorTitle: string;
  unknownErrorMsg: string;
  standbyTitle: string;
  standbyDescription: string;
}) {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<VocabularyBatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [visibleSections, setVisibleSections] = useState<VocabularyVisibleSections>(
    DEFAULT_VISIBLE_SECTIONS,
  );

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
    setVisibleSections(DEFAULT_VISIBLE_SECTIONS);
  }

  function toggleSection(section: keyof VocabularyVisibleSections) {
    setVisibleSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  function renderResultItem(result: VocabularyBatchResult, index: number) {
    const label = result.original_text.trim() || "—";

    if (result.status === "ok" && result.entry) {
      return (
        <Stack key={`${result.original_text}-${index}`} spacing={1.5}>
          <Stack spacing={0.25}>
            <Typography variant="caption" color="text.secondary">
              {originalTextLabel}
            </Typography>
            <Typography variant="body2">{label}</Typography>
          </Stack>

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
    }

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
            results.map((result, index) => renderResultItem(result, index))
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
