"use client";

import { FormEvent, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import { useAdminGuard } from "@/hooks/useAdminGuard";

type TabIndex = 0 | 1;

function ParenthesesForm({
  apiPath,
  submitLabel,
  loadingLabel,
  resetLabel,
  inputLabel,
  outputLabel,
  inputRequiredMsg,
  networkErrorMsg,
}: {
  apiPath: string;
  submitLabel: string;
  loadingLabel: string;
  resetLabel: string;
  inputLabel: string;
  outputLabel: string;
  inputRequiredMsg: string;
  networkErrorMsg: string;
}) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
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
    setOutput("");

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      const data = (await response.json()) as { result_text?: string };

      if (!response.ok) {
        setError(networkErrorMsg);
        return;
      }

      setOutput(data.result_text ?? "");
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
      </Stack>
    </Box>
  );
}

export default function ParenthesesToolPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();

  const [tab, setTab] = useState<TabIndex>(0);

  if (authLoading) return null;
  if (user?.role !== "admin" && user?.role !== "super-admin") return null;

  const sharedFormProps = {
    loadingLabel: t("parenthesesTool.loading"),
    resetLabel: t("parenthesesTool.resetAction"),
    inputLabel: t("parenthesesTool.inputLabel"),
    outputLabel: t("parenthesesTool.outputLabel"),
    inputRequiredMsg: t("parenthesesTool.inputRequired"),
    networkErrorMsg: t("parenthesesTool.networkError"),
  };

  return (
    <PageLayout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {t("parenthesesTool.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("parenthesesTool.description")}
          </Typography>
        </Box>

        <Card>
          <Tabs
            value={tab}
            onChange={(_, value: TabIndex) => setTab(value)}
            sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}
          >
            <Tab label={t("parenthesesTool.tabRemoval")} />
            <Tab label={t("parenthesesTool.tabGeneration")} />
          </Tabs>

          <CardContent>
            {tab === 0 && (
              <ParenthesesForm
                apiPath="/api/text/remove-parentheses"
                submitLabel={t("parenthesesTool.removeAction")}
                {...sharedFormProps}
              />
            )}
            {tab === 1 && (
              <ParenthesesForm
                apiPath="/api/text/generate-parentheses"
                submitLabel={t("parenthesesTool.generateAction")}
                {...sharedFormProps}
              />
            )}
          </CardContent>
        </Card>
      </Stack>
    </PageLayout>
  );
}
