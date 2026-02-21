'use client';

import Button from '@mui/material/Button';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const currentLang = i18n.language?.startsWith('ko') ? 'ko' : 'en';

  const handleToggle = () => {
    i18n.changeLanguage(currentLang === 'en' ? 'ko' : 'en');
  };

  return (
    <Button
      onClick={handleToggle}
      color="inherit"
      size="small"
      sx={{ minWidth: 'auto', fontWeight: 600 }}
    >
      {currentLang === 'en' ? 'EN' : 'KO'}
    </Button>
  );
}
