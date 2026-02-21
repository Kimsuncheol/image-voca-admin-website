'use client';

import { useState } from 'react';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import AddIcon from '@mui/icons-material/Add';
import GoogleIcon from '@mui/icons-material/Google';
import { useTranslation } from 'react-i18next';
import FileListItem from './FileListItem';
import UploadModal from './UploadModal';
import { fetchSheetWithToken } from '@/lib/utils/sheetsApi';
import { useGoogleSheetsAuth } from '@/lib/hooks/useGoogleSheetsAuth';
import type { ParseResult } from '@/lib/utils/csvParser';

export interface UrlItem {
  id: string;
  url: string;
  dayName: string;
  data: ParseResult | null;
}

interface UrlUploadTabProps {
  items: UrlItem[];
  onItemsChange: (items: UrlItem[]) => void;
  isCollocation?: boolean;
}

export default function UrlUploadTab({ items, onItemsChange, isCollocation }: UrlUploadTabProps) {
  const { t } = useTranslation();
  const { token, loading: tokenLoading, configured, requestToken } = useGoogleSheetsAuth();
  const [urlInput, setUrlInput] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleConnectGoogle = async () => {
    setAuthError('');
    try {
      await requestToken();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddUrl = async () => {
    if (!urlInput.trim() || !token) return;
    setFetchingUrl(true);
    try {
      const data = await fetchSheetWithToken(urlInput, token, isCollocation);
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
      {/* Google Auth row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {!configured ? (
          <Alert severity="info" sx={{ flex: 1 }}>
            {t('addVoca.googleNotConfigured')}
          </Alert>
        ) : token ? (
          <Chip
            icon={<GoogleIcon />}
            label={t('addVoca.connected')}
            color="success"
            variant="outlined"
          />
        ) : (
          <Button
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleConnectGoogle}
            disabled={tokenLoading}
          >
            {tokenLoading ? t('common.loading') : t('addVoca.connectGoogle')}
          </Button>
        )}
      </Box>

      {authError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAuthError('')}>
          {authError}
        </Alert>
      )}

      {/* URL input row */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={t('addVoca.urlPlaceholder')}
          fullWidth
          size="small"
          disabled={!token}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && token && urlInput.trim()) handleAddUrl();
          }}
        />
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          onClick={handleAddUrl}
          disabled={fetchingUrl || !urlInput.trim() || !token}
          sx={{ whiteSpace: 'nowrap' }}
        >
          {fetchingUrl ? t('addVoca.fetchingSheets') : t('addVoca.addUrl')}
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
        isCollocation={isCollocation}
      />
    </Box>
  );
}
