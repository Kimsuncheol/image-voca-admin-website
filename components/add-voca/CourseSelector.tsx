'use client';

import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { useTranslation } from 'react-i18next';
import { COURSES, type CourseId } from '@/types/course';

interface CourseSelectorProps {
  value: CourseId | '';
  onChange: (courseId: CourseId) => void;
}

export default function CourseSelector({ value, onChange }: CourseSelectorProps) {
  const { t } = useTranslation();

  const handleChange = (e: SelectChangeEvent) => {
    onChange(e.target.value as CourseId);
  };

  return (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <InputLabel>{t('addVoca.selectCourse')}</InputLabel>
      <Select value={value} onChange={handleChange} label={t('addVoca.selectCourse')}>
        {COURSES.map((course) => (
          <MenuItem key={course.id} value={course.id}>
            {course.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
