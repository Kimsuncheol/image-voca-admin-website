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

  const handleModalConfirm = (dayName: string, data: ParseResult) => {
    if (activeIndex === -1) {
      // Adding a new item from the modal
      const newItem: CsvItem = {
        id: crypto.randomUUID(),
        fileName: data.words.length > 0 ? `${dayName}.csv` : 'Untitled.csv',
        dayName,
        data,
      };
      onItemsChange([...items, newItem]);
    } else {
      // Editing an existing item
      const updated = [...items];
      updated[activeIndex] = { ...updated[activeIndex], dayName, data };
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
      />
    </Box>
  );
}
