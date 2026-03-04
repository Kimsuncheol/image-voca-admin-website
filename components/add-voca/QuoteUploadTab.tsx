"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import AddIcon from "@mui/icons-material/Add";
import DownloadIcon from "@mui/icons-material/Download";
import TableChartIcon from "@mui/icons-material/TableChart";
import ArticleIcon from "@mui/icons-material/Article";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import { getFamousQuotes } from "@/lib/firebase/firestore";
import type { ParseResult } from "@/lib/utils/csvParser";
import QuoteListItem from "./QuoteListItem";
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
  coursePath: string;
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


function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export default function QuoteUploadTab({
  items,
  onItemsChange,
  coursePath,
}: QuoteUploadTabProps) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [downloadAnchor, setDownloadAnchor] = useState<HTMLButtonElement | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchQuotes = async () => {
    if (!coursePath) return [];
    return getFamousQuotes(coursePath);
  };

  const handleDownloadCsv = async () => {
    setDownloadAnchor(null);
    setDownloading(true);
    try {
      const quotes = await fetchQuotes();
      const rows = quotes.map((q) =>
        [q.quote, q.author, q.translation].map(escapeCsvCell).join(","),
      );
      const csv = ["quote,author,translation", ...rows].join("\n");
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quotes.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadXlsx = async () => {
    setDownloadAnchor(null);
    setDownloading(true);
    try {
      const quotes = await fetchQuotes();
      const data = [
        ["quote", "author", "translation"],
        ...quotes.map((q) => [q.quote, q.author, q.translation]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Quotes");
      XLSX.writeFile(wb, "quotes.xlsx");
    } finally {
      setDownloading(false);
    }
  };

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
          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: "100%", sm: "auto" } }}>
            <IconButton
              size="small"
              disabled={downloading}
              onClick={(e) => setDownloadAnchor(e.currentTarget)}
              sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={handleAdd}
              sx={{
                borderRadius: 2,
                whiteSpace: "nowrap",
                minWidth: { xs: "100%", sm: 164 },
                flex: { xs: 1, sm: "none" },
              }}
            >
              {t("addVoca.addQuoteSet")}
            </Button>
          </Stack>

          <Menu
            anchorEl={downloadAnchor}
            open={Boolean(downloadAnchor)}
            onClose={() => setDownloadAnchor(null)}
            slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160 } } }}
          >
            <MenuItem onClick={handleDownloadCsv}>
              <ListItemIcon><ArticleIcon fontSize="small" /></ListItemIcon>
              <ListItemText>CSV</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDownloadXlsx}>
              <ListItemIcon><TableChartIcon fontSize="small" /></ListItemIcon>
              <ListItemText>XLSX</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => setDownloadAnchor(null)}>
              <ListItemIcon><CloseIcon fontSize="small" /></ListItemIcon>
              <ListItemText>{t("common.cancel")}</ListItemText>
            </MenuItem>
          </Menu>
        </Stack>

        <Divider sx={{ mb: items.length > 0 ? 1 : 0 }} />

        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            {t("addVoca.noItems")}
          </Typography>
        ) : (
          <List sx={{ py: 0 }}>
            {items.map((item, index) => (
              <QuoteListItem
                key={item.id}
                quote={item.quoteSet.quote}
                author={item.quoteSet.author}
                translation={item.quoteSet.translation}
                onClick={() => handleItemClick(index)}
                onDelete={() => handleDelete(index)}
              />
            ))}
          </List>
        )}
      </Paper>

      <QuoteUploadModal
        key={activeIndex}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
        initialValue={activeIndex >= 0 ? items[activeIndex]?.quoteSet : null}
      />
    </Box>
  );
}

