'use client';

import { useState, useEffect, useCallback } from 'react';
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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import TableChartIcon from '@mui/icons-material/TableChart';
import ArticleIcon from '@mui/icons-material/Article';
import CloseIcon from '@mui/icons-material/Close';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { getFamousQuotes } from '@/lib/firebase/firestore';
import FileListItem from './FileListItem';
import UploadModal, { extractDayFromFilename, resolveJlptCounterOptionIdFromFilename } from './UploadModal';
import { parseUploadFile, type ParseResult, type SchemaType } from '@/lib/utils/csvParser';
import { JLPT_COUNTER_OPTIONS, type CourseId, type JlptCounterOptionId } from '@/types/course';
import type { UploadModalConfirmPayload } from './UploadModal';

export interface CsvItem {
  id: string;
  fileName: string;
  /** Original File object kept for Storage backup upload (FR-6) */
  file: File | null;
  dayName: string;
  data: ParseResult | null;
  counterOptionId?: JlptCounterOptionId;
  counterOptionLabel?: string;
  targetCoursePath?: string;
}

interface CsvUploadTabProps {
  items: CsvItem[];
  onItemsChange: (items: CsvItem[]) => void;
  schemaType?: SchemaType;
  hideDayInput?: boolean;
  hiddenDayName?: string;
  coursePath?: string;
  courseLabel?: string;
  courseId?: CourseId | "";
  defaultDayName?: string;
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

export default function CsvUploadTab({
  items,
  onItemsChange,
  schemaType,
  hideDayInput,
  hiddenDayName,
  coursePath,
  courseLabel,
  courseId,
  defaultDayName,
}: CsvUploadTabProps) {
  const { t } = useTranslation();
  const isJlptCounterCourse = courseId === "JLPT_COUNTER";
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const newItems: CsvItem[] = [];
      for (const file of acceptedFiles) {
        const result = await parseUploadFile(file, { schemaType, courseId });
        if (!result || result.words.length === 0) continue;

        let counterOptionId: JlptCounterOptionId | undefined;
        let counterOptionLabel: string | undefined;
        let targetCoursePath: string | undefined;

        if (isJlptCounterCourse) {
          const resolvedId = resolveJlptCounterOptionIdFromFilename(file.name);
          const option = resolvedId
            ? JLPT_COUNTER_OPTIONS.find((o) => o.id === resolvedId)
            : undefined;
          counterOptionId = option?.id;
          counterOptionLabel = option?.label;
          targetCoursePath = option?.path;
        }

        const rawDayName = hideDayInput
          ? (hiddenDayName ?? crypto.randomUUID())
          : (() => {
              const extracted = extractDayFromFilename(file.name);
              return extracted !== null && extracted >= 1 ? `Day${extracted}` : '';
            })();

        const finalDayName =
          isJlptCounterCourse && counterOptionLabel ? counterOptionLabel : rawDayName;

        newItems.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          file,
          dayName: finalDayName,
          data: result,
          counterOptionId,
          counterOptionLabel,
          targetCoursePath,
        });
      }

      if (newItems.length === 0) return;

      const updated = [...items];
      for (const newItem of newItems) {
        if (!newItem.dayName) {
          updated.push(newItem);
          continue;
        }
        const existingIndex = updated.findIndex((i) => i.dayName === newItem.dayName);
        if (existingIndex !== -1) {
          updated[existingIndex] = { ...updated[existingIndex], ...newItem, id: updated[existingIndex].id };
        } else {
          updated.push(newItem);
        }
      }
      onItemsChange(updated);
    },
    [schemaType, courseId, hideDayInput, hiddenDayName, isJlptCounterCourse, items, onItemsChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: true,
    noClick: true,
  });

  useEffect(() => {
    if (!defaultDayName) return;
    setActiveIndex(-1);
    setModalOpen(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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

  const handleModalConfirm = ({
    dayName,
    data,
    file,
    counterOptionId,
    counterOptionLabel,
    targetCoursePath,
  }: UploadModalConfirmPayload) => {
    const effectiveDayName =
      isJlptCounterCourse && counterOptionLabel ? counterOptionLabel : dayName;

    if (activeIndex === -1) {
      // Adding a new item. If user confirmed Replace, overwrite the existing entry.
      const existingIndex = items.findIndex((i) => i.dayName === effectiveDayName);
      if (existingIndex !== -1) {
        const updated = [...items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          fileName: file?.name ?? updated[existingIndex].fileName,
          file: file ?? updated[existingIndex].file,
          dayName: effectiveDayName,
          data,
          counterOptionId,
          counterOptionLabel,
          targetCoursePath,
        };
        onItemsChange(updated);
      } else {
        onItemsChange([
          ...items,
          {
            id: crypto.randomUUID(),
            fileName: file?.name ?? (data.words.length > 0 ? `${effectiveDayName}.csv` : 'Untitled.csv'),
            file: file ?? null,
            dayName: effectiveDayName,
            data,
            counterOptionId,
            counterOptionLabel,
            targetCoursePath,
          },
        ]);
      }
    } else {
      // Editing an existing item; keep the previous file if no new one was selected.
      // Also drop any other item that now shares the same day name (Replace confirmed).
      const updated = [...items];
      updated[activeIndex] = {
        ...updated[activeIndex],
        dayName: effectiveDayName,
        data,
        file: file ?? updated[activeIndex].file,
        counterOptionId,
        counterOptionLabel,
        targetCoursePath,
      };
      onItemsChange(updated.filter((item, i) => i === activeIndex || item.dayName !== effectiveDayName));
    }
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          ...sectionSx,
          position: 'relative',
          outline: isDragActive ? '2px dashed' : undefined,
          outlineColor: isDragActive ? 'primary.main' : undefined,
        }}
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {isDragActive && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: 3,
              bgcolor: 'action.hover',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <Stack alignItems="center" spacing={1}>
              <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              <Typography variant="body2" color="primary.main" fontWeight={600}>
                {t('addVoca.dropzone')}
              </Typography>
            </Stack>
          </Box>
        )}
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
                secondaryLabel={item.counterOptionLabel}
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
        initialDayName={activeIndex >= 0 ? items[activeIndex]?.dayName : (defaultDayName ?? '')}
        initialData={activeIndex >= 0 ? items[activeIndex]?.data : null}
        initialCounterOptionId={activeIndex >= 0 ? items[activeIndex]?.counterOptionId : undefined}
        schemaType={schemaType}
        hideDayInput={hideDayInput}
        hiddenDayName={hiddenDayName}
        courseLabel={courseLabel}
        courseId={courseId}
        existingDayNames={items
          .filter((_, i) => i !== activeIndex)
          .map((i) => i.dayName)
          .filter(Boolean)}
      />
    </Box>
  );
}
