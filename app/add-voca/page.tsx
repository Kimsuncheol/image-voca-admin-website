'use client';

import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/layout/PageLayout';
import CourseSelector from '@/components/add-voca/CourseSelector';
import CsvUploadTab, { type CsvItem } from '@/components/add-voca/CsvUploadTab';
import UrlUploadTab, { type UrlItem } from '@/components/add-voca/UrlUploadTab';
import { getCourseById, type CourseId } from '@/types/course';

export default function AddVocaPage() {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<CourseId | ''>('');
  const [csvItems, setCsvItems] = useState<CsvItem[]>([]);
  const [urlItems, setUrlItems] = useState<UrlItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentItems = tabIndex === 0 ? csvItems : urlItems;
  const readyItems = currentItems.filter(
    (item) => item.dayName && item.data && item.data.words.length > 0
  );

  const handleUpload = async () => {
    if (!selectedCourse || readyItems.length === 0) return;

    const course = getCourseById(selectedCourse);
    if (!course) return;

    setUploading(true);
    setMessage(null);

    try {
      for (const item of readyItems) {
        await fetch('/api/admin/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coursePath: course.path,
            dayName: item.dayName,
            words: item.data!.words,
          }),
        });
      }
      setMessage({ type: 'success', text: t('addVoca.uploadSuccess') });
      setCsvItems([]);
      setUrlItems([]);
    } catch {
      setMessage({ type: 'error', text: t('addVoca.uploadError') });
    } finally {
      setUploading(false);
    }
  };

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t('addVoca.title')}
      </Typography>

      <CourseSelector value={selectedCourse} onChange={setSelectedCourse} />

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
          <Tab label={t('addVoca.csvUpload')} />
          <Tab label={t('addVoca.urlUpload')} />
        </Tabs>
      </Box>

      {tabIndex === 0 && <CsvUploadTab items={csvItems} onItemsChange={setCsvItems} />}
      {tabIndex === 1 && <UrlUploadTab items={urlItems} onItemsChange={setUrlItems} />}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUploadIcon />}
          onClick={handleUpload}
          disabled={uploading || !selectedCourse || readyItems.length === 0}
        >
          {uploading ? t('addVoca.uploading') : t('addVoca.upload')}
        </Button>
      </Box>
    </PageLayout>
  );
}
