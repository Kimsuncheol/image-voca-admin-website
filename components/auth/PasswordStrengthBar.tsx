'use client';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const strengthColors: Record<number, 'error' | 'warning' | 'info' | 'success'> = {
  0: 'error',
  1: 'error',
  2: 'warning',
  3: 'info',
  4: 'success',
  5: 'success',
};

const strengthKeys: Record<number, string> = {
  0: 'weak',
  1: 'weak',
  2: 'fair',
  3: 'good',
  4: 'strong',
  5: 'strong',
};

interface PasswordStrengthBarProps {
  password: string;
}

export default function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  const { t } = useTranslation();
  const strength = getPasswordStrength(password);
  const progress = (strength / 5) * 100;

  if (!password) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {t('auth.passwordStrength')}
        </Typography>
        <Typography variant="caption" color={`${strengthColors[strength]}.main`}>
          {t(`auth.${strengthKeys[strength]}`)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        color={strengthColors[strength]}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}
