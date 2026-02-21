'use client';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import type { Ad } from '@/types/ad';
import { getExpiryDate } from '@/types/ad';

interface AdListProps {
  ads: Ad[];
  onDelete: (id: string) => void;
}

export default function AdList({ ads, onDelete }: AdListProps) {
  const { t } = useTranslation();

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t('ads.videoUrl')}</TableCell>
            <TableCell>{t('ads.publishedAt')}</TableCell>
            <TableCell>{t('ads.expiresAt')}</TableCell>
            <TableCell align="right">{t('users.actions')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ads.map((ad) => (
            <TableRow key={ad.id}>
              <TableCell>
                <Link href={ad.videoUrl} target="_blank" rel="noopener noreferrer">
                  {ad.videoUrl.length > 50 ? `${ad.videoUrl.slice(0, 50)}...` : ad.videoUrl}
                </Link>
              </TableCell>
              <TableCell>
                {ad.publishedAt.toDate().toLocaleDateString()}
              </TableCell>
              <TableCell>
                {getExpiryDate(ad).toLocaleDateString()}
              </TableCell>
              <TableCell align="right">
                <IconButton color="error" onClick={() => onDelete(ad.id)} aria-label={t('ads.delete')}>
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
