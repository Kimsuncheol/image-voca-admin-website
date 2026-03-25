"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import {
  COURSES,
  JLPT_LEVEL_COURSES,
  type CourseId,
} from "@/types/course";

const COURSE_CHIPS = COURSES.filter((c) => c.id !== "FAMOUS_QUOTE");
const FAMOUS_QUOTE_COURSE = COURSES.find((c) => c.id === "FAMOUS_QUOTE")!;
const JLPT_COURSE = COURSES.find((c) => c.id === "JLPT")!;
const NON_JLPT_CHIPS = COURSE_CHIPS.filter((c) => c.id !== "JLPT");
const JLPT_LEVEL_CHIPS = JLPT_LEVEL_COURSES.filter((c) => c.schema === "jlpt");
const JLPT_AFFIX_CHIPS = JLPT_LEVEL_COURSES.filter((c) => c.schema === "prefix" || c.schema === "postfix");

interface CourseSelectorProps {
  value: CourseId | "";
  onChange: (courseId: CourseId) => void;
}

export default function CourseSelector({
  value,
  onChange,
}: CourseSelectorProps) {
  const { t } = useTranslation();

  const isJlptSelected = JLPT_LEVEL_COURSES.some((l) => l.id === value);

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {t("addVoca.selectCourse")}
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {NON_JLPT_CHIPS.map((course) => (
          <Chip
            key={course.id}
            label={course.label}
            onClick={() => onChange(course.id)}
            color={value === course.id ? "primary" : "default"}
            variant={value === course.id ? "filled" : "outlined"}
            sx={{ fontWeight: value === course.id ? 600 : 400 }}
          />
        ))}
        <Chip
          label={JLPT_COURSE.label}
          onClick={() => onChange("JLPT_N1")}
          color={isJlptSelected ? "primary" : "default"}
          variant={isJlptSelected ? "filled" : "outlined"}
          sx={{ fontWeight: isJlptSelected ? 600 : 400 }}
        />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Chip
          label={FAMOUS_QUOTE_COURSE.label}
          onClick={() => onChange(FAMOUS_QUOTE_COURSE.id)}
          color={value === FAMOUS_QUOTE_COURSE.id ? "secondary" : "default"}
          variant={value === FAMOUS_QUOTE_COURSE.id ? "filled" : "outlined"}
          sx={{ fontWeight: value === FAMOUS_QUOTE_COURSE.id ? 600 : 400 }}
        />
      </Box>
      {isJlptSelected && (
        <Box
          sx={{
            mt: 1,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Level
          </Typography>
          {JLPT_LEVEL_CHIPS.map((level) => (
            <Chip
              key={level.id}
              label={level.label}
              size="small"
              onClick={() => onChange(level.id)}
              color={value === level.id ? "primary" : "default"}
              variant={value === level.id ? "filled" : "outlined"}
              sx={{
                borderRadius: "999px",
                fontWeight: value === level.id ? 600 : 400,
                "& .MuiChip-label": { px: "8px", py: "6px" },
              }}
            />
          ))}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {JLPT_AFFIX_CHIPS.map((affix) => (
            <Chip
              key={affix.id}
              label={affix.label}
              size="small"
              onClick={() => onChange(affix.id)}
              color={value === affix.id ? "primary" : "default"}
              variant={value === affix.id ? "filled" : "outlined"}
              sx={{
                borderRadius: "999px",
                fontWeight: value === affix.id ? 600 : 400,
                "& .MuiChip-label": { px: "8px", py: "6px" },
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
