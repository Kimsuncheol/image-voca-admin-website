'use client';

import { useState } from 'react';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import FileListItem from './FileListItem';
import UploadModal from './UploadModal';
import { fetchSheetAsCsv } from '@/lib/utils/googleSheets';
import { parseCsvString, type ParseResult } from '@/lib/utils/csvParser';

export interface UrlItem {
  id: string;
  url: string;
  dayName: string;
  data: ParseResult | null;
}

interface UrlUploadTabProps {
  items: UrlItem[];
  onItemsChange: (items: UrlItem[]) => void;
}

export default function UrlUploadTab({ items, onItemsChange }: UrlUploadTabProps) {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [fetchingUrl, setFetchingUrl] = useState(false);

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return;

    setFetchingUrl(true);
    try {
      const csvText = await fetchSheetAsCsv(urlInput);
      const data = parseCsvString(csvText);
      onItemsChange([
        ...items,
        { id: crypto.randomUUID(), url: urlInput, dayName: '', data },
      ]);
    } catch {
      onItemsChange([
        ...items,
        { id: crypto.randomUUID(), url: urlInput, dayName: '', data: null },
      ]);
    }
    setUrlInput('');
    setFetchingUrl(false);
  };

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
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={t('addVoca.urlPlaceholder')}
          fullWidth
          size="small"
        />
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={handleAddUrl}
          disabled={fetchingUrl || !urlInput.trim()}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {t('addVoca.addUrl')}
        </Button>
      </Box>

      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          {t('addVoca.noItems')}
        </Typography>
      ) : (
        <List>
          {items.map((item, index) => (
            <FileListItem
              key={item.id}
              label={item.url}
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
