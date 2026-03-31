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

type VocabularyEntry = {
  word: string | null;
  reading: string | null;
  romanized: string | null;
  meanings: string[];
  part_of_speech: string[];
  is_common: boolean;
};

type VocabularyLookupResponse = {
  original_text: string;
  entry: VocabularyEntry | null;
};

export default function VocabularyLookup({
  apiPath,
  submitLabel,
  loadingLabel,
  resetLabel,
  inputLabel,
  inputRequiredMsg,
  networkErrorMsg,
  emptyStateLabel,
  resultTitle,
  wordLabel,
  readingLabel,
  romanizedLabel,
  meaningsLabel,
  partOfSpeechLabel,
  commonLabel,
  uncommonLabel,
}: {
  apiPath: string;
  submitLabel: string;
  loadingLabel: string;
  resetLabel: string;
  inputLabel: string;
  inputRequiredMsg: string;
  networkErrorMsg: string;
  emptyStateLabel: string;
  resultTitle: string;
  wordLabel: string;
  readingLabel: string;
  romanizedLabel: string;
  meaningsLabel: string;
  partOfSpeechLabel: string;
  commonLabel: string;
  uncommonLabel: string;
}) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<VocabularyLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim()) {
      setError(inputRequiredMsg);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      const data = (await response.json()) as VocabularyLookupResponse;

      if (!response.ok) {
        setError(networkErrorMsg);
        return;
      }

      setResult(data);
    } catch {
      setError(networkErrorMsg);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setInput("");
    setResult(null);
    setError("");
  }

  function renderField(label: string, value: string | null) {
    if (!value) return null;

    return (
      <Stack spacing={0.5}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography>{value}</Typography>
      </Stack>
    );
  }

  function renderResult() {
    if (!result) return null;

    if (!result.entry) {
      return <Alert severity="info">{emptyStateLabel}</Alert>;
    }

    return (
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
              <Chip
                size="small"
                color={result.entry.is_common ? "success" : "default"}
                label={result.entry.is_common ? commonLabel : uncommonLabel}
              />
            </Stack>

            {renderField(wordLabel, result.entry.word)}
            {renderField(readingLabel, result.entry.reading)}
            {renderField(romanizedLabel, result.entry.romanized)}

            {result.entry.meanings.length > 0 ? (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {meaningsLabel}
                </Typography>
                <Stack spacing={0.5}>
                  {result.entry.meanings.map((meaning) => (
                    <Typography key={meaning}>{meaning}</Typography>
                  ))}
                </Stack>
              </Stack>
            ) : null}

            {result.entry.part_of_speech.length > 0 ? (
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {partOfSpeechLabel}
                </Typography>
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  {result.entry.part_of_speech.map((value) => (
                    <Chip key={value} size="small" variant="outlined" label={value} />
                  ))}
                </Stack>
              </Stack>
            ) : null}
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label={inputLabel}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          multiline
          minRows={3}
          fullWidth
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

        {renderResult()}
      </Stack>
    </Box>
  );
}
