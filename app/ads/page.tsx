'use client';

import { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/layout/PageLayout';
import type { Ad } from '@/types/ad';
import { addAd, deleteAd, deleteExpiredAds, subscribeToAds } from '@/lib/firebase/ads';
import AdList from '@/components/ads/AdList';
import AddAdModal from '@/components/ads/AddAdModal';

export default function AdsPage() {
  const { t } = useTranslation();
  const [ads, setAds] = useState<Ad[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAds(setAds);

    const interval = setInterval(() => {
      deleteExpiredAds().catch(() => {});
    }, 60_000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const handleAdd = async (videoUrl: string) => {
    try {
      await addAd(videoUrl);
      setMessage({ type: 'success', text: t('ads.addSuccess') });
    } catch {
      setMessage({ type: 'error', text: t('ads.addError') });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAd(id);
    } catch {
      setMessage({ type: 'error', text: t('ads.addError') });
    }
  };

  return (
    <PageLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          {t('ads.title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setModalOpen(true)}>
          {t('ads.addAd')}
        </Button>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {ads.length === 0 ? (
        <Typography color="text.secondary">{t('ads.noAds')}</Typography>
      ) : (
        <AdList ads={ads} onDelete={handleDelete} />
      )}

      <AddAdModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={handleAdd} />
    </PageLayout>
  );
}
