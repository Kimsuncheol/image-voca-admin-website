"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import AddIcon from "@mui/icons-material/Add";
import { useTranslation } from "react-i18next";
import type { ParseResult } from "@/lib/utils/csvParser";
import FileListItem from "./FileListItem";
import QuoteUploadModal, { type QuoteSetInput } from "./QuoteUploadModal";

export interface QuoteItem {
  id: string;
  dayName: string;
  data: ParseResult | null;
  quoteSet: QuoteSetInput;
}

interface QuoteUploadTabProps {
  items: QuoteItem[];
  onItemsChange: (items: QuoteItem[]) => void;
}

const sectionSx = {
  borderRadius: 3,
  px: { xs: 1.75, sm: 2.25 },
  py: { xs: 1.75, sm: 2.25 },
  borderColor: "divider",
  backgroundColor: "background.paper",
};

function normalizeKeyPart(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function quoteKey(quoteSet: QuoteSetInput): string {
  return [
    normalizeKeyPart(quoteSet.quote),
    normalizeKeyPart(quoteSet.author),
    normalizeKeyPart(quoteSet.translation),
  ].join("||");
}

function toParseResult(quoteSet: QuoteSetInput): ParseResult {
  return {
    words: [
      {
        quote: quoteSet.quote,
        author: quoteSet.author,
        translation: quoteSet.translation,
      },
    ],
    schemaType: "famousQuote",
    isCollocation: false,
    errors: [],
    detectedHeaders: ["quote", "author", "translation"],
  };
}

function toLabel(quoteSet: QuoteSetInput): string {
  const preview =
    quoteSet.quote.length > 72
      ? `${quoteSet.quote.slice(0, 69)}...`
      : quoteSet.quote;
  return `${preview} - ${quoteSet.author}`;
}

export default function QuoteUploadTab({
  items,
  onItemsChange,
}: QuoteUploadTabProps) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const handleAdd = () => {
    setActiveIndex(-1);
    setModalOpen(true);
  };

  const handleItemClick = (index: number) => {
    setActiveIndex(index);
    setModalOpen(true);
  };

  const handleDelete = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const handleModalConfirm = (quoteSet: QuoteSetInput) => {
    const incomingKey = quoteKey(quoteSet);
    const parseResult = toParseResult(quoteSet);

    if (activeIndex === -1) {
      const existingIndex = items.findIndex(
        (item) => quoteKey(item.quoteSet) === incomingKey,
      );
      if (existingIndex !== -1) {
        const updated = [...items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quoteSet,
          data: parseResult,
        };
        onItemsChange(updated);
      } else {
        onItemsChange([
          ...items,
          {
            id: crypto.randomUUID(),
            dayName: crypto.randomUUID(),
            data: parseResult,
            quoteSet,
          },
        ]);
      }
      return;
    }

    const updated = [...items];
    const current = updated[activeIndex];
    if (!current) return;

    updated[activeIndex] = {
      ...current,
      quoteSet,
      data: parseResult,
    };
    const deduped = updated.filter(
      (item, i) => i === activeIndex || quoteKey(item.quoteSet) !== incomingKey,
    );
    onItemsChange(deduped);
  };

  return (
    <Box>
      <Paper variant="outlined" sx={sectionSx}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <FormatQuoteIcon fontSize="small" color="action" />
            <Typography variant="subtitle2" fontWeight={600}>
              {t("addVoca.quoteUpload")}
            </Typography>
            <Chip
              size="small"
              label={items.length}
              color={items.length > 0 ? "primary" : "default"}
              variant={items.length > 0 ? "outlined" : "filled"}
            />
          </Stack>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            onClick={handleAdd}
            sx={{
              borderRadius: 2,
              whiteSpace: "nowrap",
              minWidth: { xs: "100%", sm: 164 },
            }}
          >
            {t("addVoca.addQuoteSet")}
          </Button>
        </Stack>

        <Divider sx={{ mb: items.length > 0 ? 1 : 0 }} />

        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            {t("addVoca.noItems")}
          </Typography>
        ) : (
          <List sx={{ py: 0 }}>
            {items.map((item, index) => (
              <FileListItem
                key={item.id}
                label={toLabel(item.quoteSet)}
                hasData={!!item.data && item.data.words.length > 0}
                onClick={() => handleItemClick(index)}
                onDelete={() => handleDelete(index)}
              />
            ))}
          </List>
        )}
      </Paper>

      <QuoteUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
        initialValue={activeIndex >= 0 ? items[activeIndex]?.quoteSet : null}
      />
    </Box>
  );
}

