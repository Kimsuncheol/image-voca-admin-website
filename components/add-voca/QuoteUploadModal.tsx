"use client";

import { useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { containsEnglish, containsJapanese } from "@/lib/utils/quoteLanguage";

export interface QuoteSetInput {
  quote: string;
  author: string;
  translation: string;
  language: 'English' | 'Japanese';
}

interface QuoteUploadModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (quoteSet: QuoteSetInput) => void;
  initialValue?: QuoteSetInput | null;
}

export default function QuoteUploadModal({
  open,
  onClose,
  onConfirm,
  initialValue = null,
}: QuoteUploadModalProps) {
  const { t } = useTranslation();
  const [quote, setQuote] = useState(initialValue?.quote ?? "");
  const [author, setAuthor] = useState(initialValue?.author ?? "");
  const [translation, setTranslation] = useState(initialValue?.translation ?? "");
  const [language, setLanguage] = useState<'English' | 'Japanese'>(initialValue?.language ?? 'English');

  const quoteLanguageError = useMemo(() => {
    if (!quote.trim()) return false;
    if (language === 'English') return !containsEnglish(quote);
    return !containsJapanese(quote);
  }, [quote, language]);

  const handleClose = () => {
    const isDirty =
      quote.trim() !== (initialValue?.quote ?? "").trim() ||
      author.trim() !== (initialValue?.author ?? "").trim() ||
      translation.trim() !== (initialValue?.translation ?? "").trim() ||
      language !== (initialValue?.language ?? 'English');

    if (
      isDirty &&
      !window.confirm(
        t("addVoca.discardConfirm", "Discard parsed data and close?"),
      )
    ) {
      return;
    }
    onClose();
  };

  const handleExited = () => {
    setQuote(initialValue?.quote ?? "");
    setAuthor(initialValue?.author ?? "");
    setTranslation(initialValue?.translation ?? "");
    setLanguage(initialValue?.language ?? 'English');
  };

  const handleConfirm = () => {
    const normalized: QuoteSetInput = {
      quote: quote.trim(),
      author: author.trim(),
      translation: translation.trim(),
      language,
    };
    if (!normalized.quote || !normalized.translation) {
      return;
    }
    onConfirm(normalized);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onExited: handleExited }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>
        {t("addVoca.addQuoteSet")}
      </DialogTitle>
      <DialogContent sx={{ pt: "12px !important" }}>
        <Stack spacing={2}>
          <TextField
            label={t("courses.quote")}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            required
            fullWidth
            multiline
            minRows={3}
            error={quoteLanguageError}
            helperText={quoteLanguageError ? t("addVoca.quoteLangError") : undefined}
          />
          <TextField
            label={t("courses.author")}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            fullWidth
          />
          <Stack spacing={0.75}>
            <Typography variant="caption" color="text.secondary">
              {t("courses.language")}
            </Typography>
            <Stack direction="row" spacing={1}>
              {(["English", "Japanese"] as const).map((lang) => (
                <Chip
                  key={lang}
                  label={lang}
                  clickable
                  color={language === lang ? "primary" : "default"}
                  variant={language === lang ? "filled" : "outlined"}
                  onClick={() => setLanguage(lang)}
                />
              ))}
            </Stack>
          </Stack>
          <TextField
            label={t("courses.translation")}
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            required
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1.5 }}>
        <Button onClick={handleClose} sx={{ borderRadius: 2 }}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          sx={{ borderRadius: 2 }}
          disabled={!quote.trim() || !translation.trim() || quoteLanguageError}
        >
          {t("common.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

