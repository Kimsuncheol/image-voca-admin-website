'use client';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import SyncIcon from '@mui/icons-material/Sync';
import { useTranslation } from 'react-i18next';

export type ProgressStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed'
  | 'skipped';

export interface ProgressItem {
  id: string;
  label: string;
  dayName: string;
  status: ProgressStatus;
  error?: string;
  wordCount?: number;
}

interface UploadProgressModalProps {
  open: boolean;
  items: ProgressItem[];
  successCount: number;
  failCount: number;
  skipCount: number;
  done: boolean;
  statusText: string;
  onClose: () => void;
}

const statusIcon: Record<ProgressStatus, React.ReactNode> = {
  pending: <HourglassEmptyIcon fontSize="small" color="disabled" />,
  processing: <SyncIcon fontSize="small" color="primary" />,
  success: <CheckCircleIcon fontSize="small" color="success" />,
  failed: <ErrorIcon fontSize="small" color="error" />,
  skipped: <SkipNextIcon fontSize="small" color="disabled" />,
};

const statusColor: Record<
  ProgressStatus,
  'default' | 'primary' | 'success' | 'error' | 'warning'
> = {
  pending: 'default',
  processing: 'primary',
  success: 'success',
  failed: 'error',
  skipped: 'default',
};

export default function UploadProgressModal({
  open,
  items,
  successCount,
  failCount,
  skipCount,
  done,
  statusText,
  onClose,
}: UploadProgressModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} maxWidth="sm" fullWidth disableEscapeKeyDown={!done}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {!done && <CircularProgress size={20} />}
        {t('addVoca.progressTitle')}
      </DialogTitle>

      <DialogContent>
        {/* Live status text */}
        {statusText && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, minHeight: 20 }}
          >
            {statusText}
          </Typography>
        )}

        {/* Per-item list */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          {items.map((item) => (
            <Box
              key={item.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              {statusIcon[item.status]}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {item.label}
                </Typography>
                {item.dayName && (
                  <Typography variant="caption" color="text.secondary">
                    {item.dayName}
                    {item.wordCount != null && ` · ${item.wordCount} words`}
                  </Typography>
                )}
                {item.error && (
                  <Typography variant="caption" color="error.main" display="block">
                    {item.error}
                  </Typography>
                )}
              </Box>
              <Chip
                label={t(`addVoca.status_${item.status}`)}
                size="small"
                color={statusColor[item.status]}
                variant="outlined"
              />
            </Box>
          ))}
        </Stack>

        {/* Summary counts */}
        {(successCount > 0 || failCount > 0 || skipCount > 0) && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Stack direction="row" spacing={2} justifyContent="center">
              <Chip
                icon={<CheckCircleIcon />}
                label={`${successCount} ${t('addVoca.success')}`}
                color="success"
                variant="outlined"
              />
              {failCount > 0 && (
                <Chip
                  icon={<ErrorIcon />}
                  label={`${failCount} ${t('addVoca.failed')}`}
                  color="error"
                  variant="outlined"
                />
              )}
              {skipCount > 0 && (
                <Chip
                  icon={<SkipNextIcon />}
                  label={`${skipCount} ${t('addVoca.skipped')}`}
                  variant="outlined"
                />
              )}
            </Stack>
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={!done} variant={done ? 'contained' : 'text'}>
          {done ? t('addVoca.done') : t('common.loading')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
