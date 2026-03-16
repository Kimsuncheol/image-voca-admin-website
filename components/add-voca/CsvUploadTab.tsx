'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArticleIcon from '@mui/icons-material/Article';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { getFamousQuotes } from '@/lib/firebase/firestore';
import FileListItem from './FileListItem';
import UploadModal from './UploadModal';
import { type ParseResult, type SchemaType } from '@/lib/utils/csvParser';
import { assignDeterministicUploadIdsForSchema } from '@/lib/uploadWordIds';

export interface CsvItem {
  id: string;
  fileName: string;
  /** Original File object kept for Storage backup upload (FR-6) */
  file: File | null;
  dayName: string;
  data: ParseResult | null;
}

interface CsvUploadTabProps {
  items: CsvItem[];
  onItemsChange: (items: CsvItem[]) => void;
  schemaType?: SchemaType;
  hideDayInput?: boolean;
  coursePath?: string;
  courseLabel?: string;
}

const sectionSx = {
  borderRadius: 3,
  px: { xs: 1.75, sm: 2.25 },
  py: { xs: 1.75, sm: 2.25 },
  borderColor: 'divider',
  backgroundColor: 'background.paper',
};

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function shouldAssignUploadIds(
  schemaType: SchemaType | undefined,
  hideDayInput: boolean,
  courseLabel: string | undefined,
): boolean {
  return Boolean(
    courseLabel &&
      !hideDayInput &&
      (schemaType === 'standard' || schemaType === 'collocation'),
  );
}

export default function CsvUploadTab({
  items,
  onItemsChange,
  schemaType,
  hideDayInput,
  coursePath,
  courseLabel,
}: CsvUploadTabProps) {
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
        [q.quote, q.author, q.translation].map(escapeCsvCell).join(','),
      );
      const csv = ['quote,author,translation', ...rows].join('\n');
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'quotes.csv';
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
        ['quote', 'author', 'translation'],
        ...quotes.map((q) => [q.quote, q.author, q.translation]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Quotes');
      XLSX.writeFile(wb, 'quotes.xlsx');
    } finally {
      setDownloading(false);
    }
  };

  const handleAddFile = () => {
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

  const handleModalConfirm = (dayName: string, data: ParseResult, file?: File) => {
    const resolvedSchemaType = schemaType ?? data.schemaType;
    const nextData =
      shouldAssignUploadIds(resolvedSchemaType, Boolean(hideDayInput), courseLabel)
        ? {
            ...data,
            words: assignDeterministicUploadIdsForSchema(
              data.words,
              resolvedSchemaType,
              courseLabel!,
              dayName,
            ),
          }
        : data;

    if (activeIndex === -1) {
      // Adding a new item. If user confirmed Replace, overwrite the existing entry.
      const existingIndex = items.findIndex((i) => i.dayName === dayName);
      if (existingIndex !== -1) {
        const updated = [...items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          fileName: file?.name ?? updated[existingIndex].fileName,
          file: file ?? updated[existingIndex].file,
          dayName,
          data: nextData,
        };
        onItemsChange(updated);
      } else {
        onItemsChange([
          ...items,
          {
            id: crypto.randomUUID(),
            fileName: file?.name ?? (data.words.length > 0 ? `${dayName}.csv` : 'Untitled.csv'),
            file: file ?? null,
            dayName,
            data: nextData,
          },
        ]);
      }
    } else {
      // Editing an existing item; keep the previous file if no new one was selected.
      // Also drop any other item that now shares the same day name (Replace confirmed).
      let updated = [...items];
      updated[activeIndex] = {
        ...updated[activeIndex],
        dayName,
        data: nextData,
        file: file ?? updated[activeIndex].file,
      };
      updated = updated.filter((item, i) => i === activeIndex || item.dayName !== dayName);
      onItemsChange(updated);
    }
  };

  return (
    <Box>
      <Paper variant="outlined" sx={sectionSx}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" fontWeight={600}>
              {t('addVoca.csvUpload')}
            </Typography>
            <Chip
              size="small"
              label={items.length}
              color={items.length > 0 ? 'primary' : 'default'}
              variant={items.length > 0 ? 'outlined' : 'filled'}
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' } }}>
            {coursePath && (
              <IconButton
                size="small"
                disabled={downloading}
                onClick={(e) => setDownloadAnchor(e.currentTarget)}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <DownloadIcon fontSize="small" />
              </IconButton>
            )}
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={handleAddFile}
              sx={{
                borderRadius: 2,
                whiteSpace: 'nowrap',
                minWidth: { xs: '100%', sm: 138 },
              }}
            >
              {t('addVoca.addFile')}
            </Button>
          </Stack>
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
            <ListItemText>{t('common.cancel')}</ListItemText>
          </MenuItem>
        </Menu>

        <Divider sx={{ mb: items.length > 0 ? 1 : 0 }} />

        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            {t('addVoca.noItems')}
          </Typography>
        ) : (
          <List sx={{ py: 0 }}>
            {items.map((item, index) => (
              <FileListItem
                key={item.id}
                label={item.fileName}
                dayName={hideDayInput ? undefined : item.dayName}
                hasData={!!item.data && item.data.words.length > 0}
                onClick={() => handleItemClick(index)}
                onDelete={() => handleDelete(index)}
              />
            ))}
          </List>
        )}
      </Paper>

      <UploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleModalConfirm}
        initialDayName={activeIndex >= 0 ? items[activeIndex]?.dayName : ''}
        initialData={activeIndex >= 0 ? items[activeIndex]?.data : null}
        schemaType={schemaType}
        hideDayInput={hideDayInput}
        existingDayNames={items
          .filter((_, i) => i !== activeIndex)
          .map((i) => i.dayName)
          .filter(Boolean)}
      />
    </Box>
  );
}
