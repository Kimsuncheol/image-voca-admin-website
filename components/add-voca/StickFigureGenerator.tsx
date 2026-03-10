"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useTranslation } from "react-i18next";

import {
  normalizeImageGenerationWord,
  type GenerateImageErrorCode,
  type GenerateImageResponse,
  type GenerateImageSuccessResponse,
  type ImageGenerationCourseId,
} from "@/types/imageGeneration";

interface StickFigureGeneratorProps {
  courseId: ImageGenerationCourseId;
}

const sectionSx = {
  mb: 3,
  borderRadius: 3,
  px: { xs: 1.75, sm: 2.25 },
  py: { xs: 1.75, sm: 2.25 },
  borderColor: "divider",
  backgroundColor: "background.paper",
};

const ERROR_KEY_BY_CODE: Partial<Record<GenerateImageErrorCode, string>> = {
  UNAUTHORIZED: "addVoca.imageGeneratorErrorUnauthorized",
  INVALID_WORD: "addVoca.imageGeneratorErrorInvalidWord",
  UNSUPPORTED_COURSE: "addVoca.imageGeneratorErrorUnsupportedCourse",
  MODEL_BLOCKED: "addVoca.imageGeneratorErrorModelBlocked",
  NO_IMAGE_RETURNED: "addVoca.imageGeneratorErrorNoImage",
  UPLOAD_FAILED: "addVoca.imageGeneratorErrorUploadFailed",
  INTERNAL_ERROR: "addVoca.imageGeneratorErrorInternal",
};

export default function StickFigureGenerator({
  courseId,
}: StickFigureGeneratorProps) {
  const { t } = useTranslation();
  const [word, setWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerateImageSuccessResponse | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setError("");
    setResult(null);
    setCopied(false);
  }, [courseId]);

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.imageUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failures; the URL remains visible.
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedWord = normalizeImageGenerationWord(word);
    setCopied(false);
    setError("");
    setResult(null);

    if (!normalizedWord) {
      setError(t("addVoca.imageGeneratorValidationRequired"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: normalizedWord,
          courseId,
        }),
      });

      let payload: GenerateImageResponse | null = null;
      try {
        payload = (await response.json()) as GenerateImageResponse;
      } catch {
        payload = null;
      }

      if (!response.ok || !payload || !payload.ok) {
        const code = payload && !payload.ok ? payload.code : undefined;
        const key = code ? ERROR_KEY_BY_CODE[code] : undefined;
        setError(
          key
            ? t(key)
            : payload && !payload.ok && payload.error
              ? payload.error
              : t("addVoca.imageGeneratorErrorInternal"),
        );
        return;
      }

      setWord(normalizedWord);
      setResult(payload);
    } catch {
      setError(t("addVoca.imageGeneratorErrorInternal"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper variant="outlined" sx={sectionSx}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {t("addVoca.imageGeneratorTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("addVoca.imageGeneratorDescription")}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "flex-start" }}
          >
            <TextField
              fullWidth
              label={t("courses.word")}
              placeholder={t("addVoca.imageGeneratorPlaceholder")}
              value={word}
              onChange={(event) => setWord(event.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ minWidth: { xs: "100%", md: 180 }, height: 56 }}
            >
              {loading
                ? t("common.loading")
                : t("addVoca.imageGeneratorSubmit")}
            </Button>
          </Stack>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {result && (
          <Stack spacing={2}>
            <Alert severity="success">
              {t("addVoca.imageGeneratorSuccess")}
            </Alert>

            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              alignItems={{ xs: "stretch", md: "flex-start" }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  width: { xs: "100%", md: 280 },
                  p: 1.5,
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                  bgcolor: "#fff",
                }}
              >
                <Box
                  component="img"
                  src={result.imageUrl}
                  alt={t("addVoca.imageGeneratorPreviewAlt", {
                    word: result.word,
                  })}
                  sx={{
                    display: "block",
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "contain",
                  }}
                />
              </Box>

              <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                <TextField
                  fullWidth
                  label={t("addVoca.imageGeneratorSavedUrl")}
                  value={result.imageUrl}
                  InputProps={{ readOnly: true }}
                />

                <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                  <Button
                    variant={copied ? "contained" : "outlined"}
                    color={copied ? "success" : "primary"}
                    startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                    onClick={handleCopy}
                  >
                    {copied
                      ? t("addVoca.imageGeneratorCopied")
                      : t("addVoca.imageGeneratorCopy")}
                  </Button>
                </Box>
              </Stack>
            </Stack>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
