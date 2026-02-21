"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { COURSES, type CourseId } from "@/types/course";

interface CourseSelectorProps {
  value: CourseId | "";
  onChange: (courseId: CourseId) => void;
}

export default function CourseSelector({
  value,
  onChange,
}: CourseSelectorProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t("addVoca.selectCourse")}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {COURSES.map((course) => (
          <Chip
            key={course.id}
            label={course.label}
            onClick={() => onChange(course.id)}
            color={value === course.id ? "primary" : "default"}
            variant={value === course.id ? "filled" : "outlined"}
            sx={{ fontWeight: value === course.id ? 600 : 400 }}
          />
        ))}
      </Box>
    </Box>
  );
}
