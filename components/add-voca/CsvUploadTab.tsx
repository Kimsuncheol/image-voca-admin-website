'use client';

import { useState } from 'react';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import FileListItem from './FileListItem';
import UploadModal from './UploadModal';
import { type ParseResult } from '@/lib/utils/csvParser';

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
  isCollocation?: boolean;
}

const sectionSx = {
  borderRadius: 3,
  px: { xs: 1.75, sm: 2.25 },
  py: { xs: 1.75, sm: 2.25 },
  borderColor: 'divider',
  backgroundColor: 'background.paper',
};

export default function CsvUploadTab({ items, onItemsChange, isCollocation }: CsvUploadTabProps) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

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
          data,
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
            data,
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
        data,
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
                dayName={item.dayName}
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
        isCollocation={isCollocation}
        existingDayNames={items
          .filter((_, i) => i !== activeIndex)
          .map((i) => i.dayName)
          .filter(Boolean)}
      />
    </Box>
  );
}
