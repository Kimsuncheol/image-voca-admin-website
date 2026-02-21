'use client';

import { useState, useCallback } from 'react';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import FileListItem from './FileListItem';
import UploadModal from './UploadModal';
import { parseCsvFile, type ParseResult } from '@/lib/utils/csvParser';

export interface CsvItem {
  id: string;
  fileName: string;
  dayName: string;
  data: ParseResult | null;
}

interface CsvUploadTabProps {
  items: CsvItem[];
  onItemsChange: (items: CsvItem[]) => void;
}

export default function CsvUploadTab({ items, onItemsChange }: CsvUploadTabProps) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const handleAddFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;

      const newItems: CsvItem[] = [];
      for (const file of Array.from(files)) {
        const data = await parseCsvFile(file);
        newItems.push({
          id: crypto.randomUUID(),
          fileName: file.name,
          dayName: '',
          data,
        });
      }
      onItemsChange([...items, ...newItems]);
    };
    input.click();
  }, [items, onItemsChange]);

  const handleItemClick = (index: number) => {
    setActiveIndex(index);
    setModalOpen(true);
  };

  const handleDelete = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const handleModalConfirm = (dayName: string, data: ParseResult) => {
    const updated = [...items];
    updated[activeIndex] = { ...updated[activeIndex], dayName, data };
    onItemsChange(updated);
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
      />
    </Box>
  );
}
