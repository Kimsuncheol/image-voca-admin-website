"use client";

import { FormEvent, useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

type CheckboxOptionConfig = {
  key: string;
  label: string;
  defaultValue: boolean;
  buildPayload: (checked: boolean) => Record<string, unknown>;
  onCheckboxChange?: (checked: boolean) => void;
};

function getDefaultCheckboxValues(checkboxOptions?: CheckboxOptionConfig[]) {
  return Object.fromEntries(
    (checkboxOptions ?? []).map((option) => [option.key, option.defaultValue]),
  ) as Record<string, boolean>;
}

export default function ParenthesesForm({
  apiPath,
  submitLabel,
  loadingLabel,
  resetLabel,
  inputLabel,
  outputLabel,
  inputRequiredMsg,
  networkErrorMsg,
  checkboxOptions,
  extraPayload,
  horizontal = false,
  validate,
  validateWithCheckboxes,
}: {
  apiPath: string;
  submitLabel: string;
  loadingLabel: string;
  resetLabel: string;
  inputLabel: string;
  outputLabel: string;
  inputRequiredMsg: string;
  networkErrorMsg: string;
  checkboxOptions?: CheckboxOptionConfig[];
  extraPayload?: Record<string, unknown>;
  horizontal?: boolean;
  validate?: (text: string) => string | null;
  validateWithCheckboxes?: (text: string, checkboxValues: Record<string, boolean>) => string | null;
}) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inputValidationError, setInputValidationError] = useState<string | null>(null);
  const [checkboxValues, setCheckboxValues] = useState<Record<string, boolean>>(
    getDefaultCheckboxValues(checkboxOptions),
  );
  const [copySnackbar, setCopySnackbar] = useState<{ open: boolean; success: boolean }>({
    open: false,
    success: true,
  });

  useEffect(() => {
    setCheckboxValues(getDefaultCheckboxValues(checkboxOptions));
  }, [checkboxOptions]);

  useEffect(() => {
    setInputValidationError(null);
  }, [validate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim()) {
      setError(inputRequiredMsg);
      return;
    }

    const validationMsg = validateWithCheckboxes
      ? validateWithCheckboxes(input, checkboxValues)
      : validate?.(input) ?? null;
    if (validationMsg) {
      setInputValidationError(validationMsg);
      return;
    }

    setLoading(true);
    setError("");
    setOutput("");

    try {
      const payload = {
        text: input,
        ...Object.assign(
          {},
          ...(checkboxOptions ?? []).map((option) =>
            option.buildPayload(checkboxValues[option.key] ?? option.defaultValue),
          ),
        ),
        ...(extraPayload ?? {}),
      };

      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    setInputValidationError(null);
    setCheckboxValues(getDefaultCheckboxValues(checkboxOptions));
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopySnackbar({ open: true, success: true });
    } catch {
      setCopySnackbar({ open: true, success: false });
    }
  }

  const inputSection = (
    <Stack spacing={2} flex={1}>
      <TextField
        label={inputLabel}
        value={input}
        onChange={(event) => {
          const val = event.target.value;
          setInput(val);
          if (val.trim()) {
            const msg = validateWithCheckboxes
              ? validateWithCheckboxes(val, checkboxValues)
              : validate?.(val) ?? null;
            setInputValidationError(msg);
          } else {
            setInputValidationError(null);
          }
        }}
        multiline
        minRows={5}
        fullWidth
        error={!!inputValidationError}
        helperText={inputValidationError ?? undefined}
      />

      {(checkboxOptions ?? []).map((option) => (
        <FormControlLabel
          key={option.key}
          control={
            <Checkbox
              checked={checkboxValues[option.key] ?? option.defaultValue}
              onChange={(event) => {
                const checked = event.target.checked;
                setCheckboxValues((current) => ({
                  ...current,
                  [option.key]: checked,
                }));
                option.onCheckboxChange?.(checked);
              }}
            />
          }
          label={option.label}
        />
      ))}

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
    </Stack>
  );

  const outputSection = (
    <Stack spacing={2} flex={1}>
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
          {t("common.copy")}
        </Button>
      </Box>
    </Stack>
  );

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {horizontal ? (
        <Stack direction="row" spacing={2} alignItems="flex-start">
          {inputSection}
          {outputSection}
        </Stack>
      ) : (
        <Stack spacing={2}>
          {inputSection}
          {outputSection}
        </Stack>
      )}

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
