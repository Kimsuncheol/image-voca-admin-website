'use client';

import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/layout/PageLayout';
import { COURSES } from '@/types/course';
import CourseCard from '@/components/courses/CourseCard';

export default function CoursesPage() {
  const { t } = useTranslation();

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t('courses.title')}
      </Typography>
      <Grid container spacing={3}>
        {COURSES.map((course) => (
          <Grid key={course.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <CourseCard course={course} />
          </Grid>
        ))}
      </Grid>
    </PageLayout>
  );
}
