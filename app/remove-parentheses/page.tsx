"use client";

import { FormEvent, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import { useAdminGuard } from "@/hooks/useAdminGuard";

export default function RemoveParenthesesPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();

  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!input.trim()) {
      setError(t("removeParentheses.inputRequired"));
      return;
    }

    setLoading(true);
    setError("");
    setOutput("");

    try {
      const response = await fetch("/api/text/remove-parentheses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      const data = (await response.json()) as { result_text?: string };

      if (!response.ok) {
        setError(t("removeParentheses.networkError"));
        return;
      }

      setOutput(data.result_text ?? "");
    } catch {
      setError(t("removeParentheses.networkError"));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setInput("");
    setOutput("");
    setError("");
  }

  if (authLoading) return null;
  if (user?.role !== "admin" && user?.role !== "super-admin") return null;

  return (
    <PageLayout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {t("removeParentheses.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("removeParentheses.description")}
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label={t("removeParentheses.inputLabel")}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  multiline
                  minRows={5}
                  fullWidth
                />

                <Stack direction="row" spacing={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    {loading
                      ? t("removeParentheses.loading")
                      : t("removeParentheses.submitAction")}
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={handleReset}
                    disabled={loading}
                  >
                    {t("removeParentheses.resetAction")}
                  </Button>
                </Stack>

                {error ? <Alert severity="error">{error}</Alert> : null}

                <TextField
                  label={t("removeParentheses.outputLabel")}
                  value={output}
                  multiline
                  minRows={5}
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                />
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </PageLayout>
  );
}
