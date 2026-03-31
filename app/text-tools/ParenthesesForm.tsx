"use client";

import { FormEvent, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

type BooleanOptionConfig = {
  key: string;
  label: string;
  defaultValue: boolean;
};

export default function ParenthesesForm({
  apiPath,
  submitLabel,
  loadingLabel,
  resetLabel,
  inputLabel,
  outputLabel,
  inputRequiredMsg,
  networkErrorMsg,
  booleanOption,
}: {
  apiPath: string;
  submitLabel: string;
  loadingLabel: string;
  resetLabel: string;
  inputLabel: string;
  outputLabel: string;
  inputRequiredMsg: string;
  networkErrorMsg: string;
  booleanOption?: BooleanOptionConfig;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booleanOptionValue, setBooleanOptionValue] = useState(
    booleanOption?.defaultValue ?? false,
  );
  const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; success: boolean }>({
    open: false,
    success: true,
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim()) {
      setError(inputRequiredMsg);
      return;
    }

    setLoading(true);
    setError("");
    setOutput("");

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          ...(booleanOption ? { [booleanOption.key]: booleanOptionValue } : {}),
        }),
      });

      const data = (await response.json()) as {
        result_text?: string;
        romanized_text?: string;
      };

      if (!response.ok) {
        setError(networkErrorMsg);
        return;
      }

      setOutput(data.result_text ?? data.romanized_text ?? "");
    } catch {
      setError(networkErrorMsg);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setInput("");
    setOutput("");
    setError("");
    setBooleanOptionValue(booleanOption?.defaultValue ?? false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopySnackbar({ open: true, success: true });
    } catch {
      setCopySnackbar({ open: true, success: false });
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2}>
        <TextField
          label={inputLabel}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          multiline
          minRows={5}
          fullWidth
        />

        {booleanOption ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={booleanOptionValue}
                onChange={(event) => setBooleanOptionValue(event.target.checked)}
              />
            }
            label={booleanOption.label}
          />
        ) : null}

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? loadingLabel : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outlined"
            onClick={handleReset}
            disabled={loading}
          >
            {resetLabel}
          </Button>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <TextField
          label={outputLabel}
          value={output}
          multiline
          minRows={5}
          fullWidth
          slotProps={{ input: { readOnly: true } }}
        />

        <Box>
          <Button
            variant="outlined"
            size="small"
            disabled={!output}
            onClick={() => void handleCopy()}
          >
            Copy
          </Button>
        </Box>

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
      </Stack>
    </Box>
  );
}
