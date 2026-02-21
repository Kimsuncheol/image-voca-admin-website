'use client';

import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Box from '@mui/material/Box';
import type { Day } from '@/types/course';

interface DayCardProps {
  day: Day;
  courseId: string;
}

export default function DayCard({ day, courseId }: DayCardProps) {
  const router = useRouter();

  return (
    <Card>
      <CardActionArea onClick={() => router.push(`/courses/${courseId}/${day.id}`)}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{day.name}</Typography>
            {day.wordCount !== undefined && (
              <Chip
                label={`${day.wordCount} words`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
