"use client";

import SearchIcon from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputAdornment from "@mui/material/InputAdornment";
import InputLabel from "@mui/material/InputLabel";
import Divider from "@mui/material/Divider";
import ListSubheader from "@mui/material/ListSubheader";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useTranslation } from "react-i18next";

import { COURSES, JLPT_LEVEL_COURSES } from "@/types/course";
import type { WordFinderMissingField, WordFinderType } from "@/types/wordFinder";

interface WordFinderFiltersProps {
  search: string;
  courseId: string;
  type: "all" | WordFinderType;
  missingField: WordFinderMissingField;
  isSubmitting: boolean;
  onSearchChange: (value: string) => void;
  onCourseIdChange: (value: string) => void;
  onTypeChange: (value: "all" | WordFinderType) => void;
  onMissingFieldChange: (value: WordFinderMissingField) => void;
  onSubmit: () => void;
  onReset: () => void;
}

export default function WordFinderFilters({
  search,
  courseId,
  type,
  missingField,
  isSubmitting,
  onSearchChange,
  onCourseIdChange,
  onTypeChange,
  onMissingFieldChange,
  onSubmit,
  onReset,
}: WordFinderFiltersProps) {
  const { t } = useTranslation();

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <TextField
          size="small"
          placeholder={t("words.searchPlaceholder")}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: 1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "10px",
            },
          }}
        />

        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 180 } }}>
          <InputLabel id="word-finder-course-label">
            {t("words.courseFilter")}
          </InputLabel>
          <Select
            labelId="word-finder-course-label"
            label={t("words.courseFilter")}
            value={courseId}
            onChange={(event) => onCourseIdChange(event.target.value)}
          >
            <MenuItem value="all">{t("words.allCourses")}</MenuItem>
            {COURSES.filter((course) => Boolean(course.path)).map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.label}
              </MenuItem>
            ))}
            <Divider />
            <ListSubheader>JLPT</ListSubheader>
            {JLPT_LEVEL_COURSES.map((course) => (
              <MenuItem key={course.id} value={course.id}>
                {course.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 180 } }}>
          <InputLabel id="word-finder-type-label">{t("words.typeFilter")}</InputLabel>
          <Select
            labelId="word-finder-type-label"
            label={t("words.typeFilter")}
            value={type}
            onChange={(event) =>
              onTypeChange(event.target.value as "all" | WordFinderType)
            }
          >
            <MenuItem value="all">{t("words.allTypes")}</MenuItem>
            <MenuItem value="standard">{t("words.typeStandard")}</MenuItem>
            <MenuItem value="collocation">{t("words.typeCollocation")}</MenuItem>
            <MenuItem value="famousQuote">{t("words.typeFamousQuote")}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 200 } }}>
          <InputLabel id="word-finder-missing-label">
            {t("words.missingFilter")}
          </InputLabel>
          <Select
            labelId="word-finder-missing-label"
            label={t("words.missingFilter")}
            value={missingField}
            onChange={(event) =>
              onMissingFieldChange(event.target.value as WordFinderMissingField)
            }
          >
            <MenuItem value="all">{t("words.missingAll")}</MenuItem>
            <MenuItem value="image">{t("words.missingImage")}</MenuItem>
            <MenuItem value="pronunciation">
              {t("words.missingPronunciation")}
            </MenuItem>
            <MenuItem value="example">{t("words.missingExample")}</MenuItem>
            <MenuItem value="exampleHurigana">
              {t("words.missingExampleHurigana")}
            </MenuItem>
            <MenuItem value="translation">{t("words.missingTranslation")}</MenuItem>
            <MenuItem value="derivative">{t("words.missingDerivative")}</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={onReset} disabled={isSubmitting} sx={{ borderRadius: "20px" }}>
          {t("words.clearFilters")}
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={isSubmitting} sx={{ borderRadius: "20px" }}>
          {t("words.searchAction")}
        </Button>
      </Stack>
    </Stack>
  );
}
