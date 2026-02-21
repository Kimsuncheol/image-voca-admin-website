'use client';

import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';

interface AddAdModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (videoUrl: string) => void;
}

export default function AddAdModal({ open, onClose, onAdd }: AddAdModalProps) {
  const { t } = useTranslation();
  const [videoUrl, setVideoUrl] = useState('');

  const handleAdd = () => {
    if (videoUrl.trim()) {
      onAdd(videoUrl.trim());
      setVideoUrl('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('ads.addAd')}</DialogTitle>
      <DialogContent>
        <TextField
          label={t('ads.videoUrl')}
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          fullWidth
          margin="normal"
          placeholder={t('ads.urlPlaceholder')}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button onClick={handleAdd} variant="contained" disabled={!videoUrl.trim()}>
          {t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
