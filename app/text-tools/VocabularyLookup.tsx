"use client";

import { FormEvent, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import VocabularyResultCard, { VocabularyEntry } from "./VocabularyResultCard";

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
  standbyTitle,
  standbyDescription,
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
  standbyTitle: string;
  standbyDescription: string;
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

  function renderResult() {
    if (!result) {
      return (
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
      );
    }

    if (!result.entry) {
      return <Alert severity="info">{emptyStateLabel}</Alert>;
    }

    return (
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
      />
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
        </Stack>

        <Box sx={{ flex: 1, width: "100%" }}>{renderResult()}</Box>
      </Stack>
    </Box>
  );
}
