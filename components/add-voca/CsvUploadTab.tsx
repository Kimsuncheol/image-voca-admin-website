'use client';

import { useState } from 'react';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
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
      <Button startIcon={<AddIcon />} variant="outlined" onClick={handleAddFile} sx={{ mb: 2 }}>
        {t('addVoca.addFile')}
      </Button>

      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          {t('addVoca.noItems')}
        </Typography>
      ) : (
        <List>
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
