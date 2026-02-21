'use client';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { useTranslation } from 'react-i18next';
import type { Word } from '@/types/word';
import { isCollocationWord } from '@/types/word';

interface WordTableProps {
  words: Word[];
  isCollocation: boolean;
}

export default function WordTable({ words, isCollocation }: WordTableProps) {
  const { t } = useTranslation();

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {isCollocation ? (
              <>
                <TableCell>{t('courses.collocation')}</TableCell>
                <TableCell>{t('courses.meaning')}</TableCell>
                <TableCell>{t('courses.explanation')}</TableCell>
                <TableCell>{t('courses.example')}</TableCell>
                <TableCell>{t('courses.translation')}</TableCell>
              </>
            ) : (
              <>
                <TableCell>{t('courses.word')}</TableCell>
                <TableCell>{t('courses.meaning')}</TableCell>
                <TableCell>{t('courses.pronunciation')}</TableCell>
                <TableCell>{t('courses.example')}</TableCell>
                <TableCell>{t('courses.translation')}</TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {words.map((word) => (
            <TableRow key={word.id}>
              {isCollocationWord(word) ? (
                <>
                  <TableCell>{word.collocation}</TableCell>
                  <TableCell>{word.meaning}</TableCell>
                  <TableCell>{word.explanation}</TableCell>
                  <TableCell>{word.example}</TableCell>
                  <TableCell>{word.translation}</TableCell>
                </>
              ) : (
                <>
                  <TableCell>{word.word}</TableCell>
                  <TableCell>{word.meaning}</TableCell>
                  <TableCell>{word.pronunciation}</TableCell>
                  <TableCell>{word.example}</TableCell>
                  <TableCell>{word.translation}</TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
