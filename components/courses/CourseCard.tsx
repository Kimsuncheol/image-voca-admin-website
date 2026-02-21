'use client';

import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import SchoolIcon from '@mui/icons-material/School';
import PublicIcon from '@mui/icons-material/Public';
import FlightIcon from '@mui/icons-material/Flight';
import WorkIcon from '@mui/icons-material/Work';
import LinkIcon from '@mui/icons-material/Link';
import type { Course, CourseId } from '@/types/course';

const courseIcons: Record<CourseId, React.ReactNode> = {
  CSAT: <SchoolIcon sx={{ fontSize: 48 }} />,
  IELTS: <PublicIcon sx={{ fontSize: 48 }} />,
  TOEFL: <FlightIcon sx={{ fontSize: 48 }} />,
  TOEIC: <WorkIcon sx={{ fontSize: 48 }} />,
  COLLOCATIONS: <LinkIcon sx={{ fontSize: 48 }} />,
};

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const router = useRouter();

  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={() => router.push(`/courses/${course.id}`)} sx={{ height: '100%' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Box sx={{ mb: 2, color: 'primary.main' }}>
            {courseIcons[course.id]}
          </Box>
          <Typography variant="h6">{course.label}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
