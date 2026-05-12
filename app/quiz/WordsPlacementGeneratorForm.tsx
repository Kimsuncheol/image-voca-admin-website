"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import ExtensionIcon from "@mui/icons-material/Extension";

import type { WordPlacementChunk, WordsPlacementGroup } from "@/lib/wordsPlacementChunkGenerator";

type Course =
  | "CSAT"
  | "CSAT_IDIOMS"
  | "TOEIC"
  | "TOEFL_ITELS"
  | "EXTREMELY_ADVANCED"
  | "COLLOCATION"
  | "JLPT"
  | "KANJI";
type Language = "english" | "japanese";
type JlptLevel = "N1" | "N2" | "N3" | "N4" | "N5";

interface WordsPlacementItem {
  wordId: string;
  word: string;
  example: string;
  wordsToPlace: WordsPlacementGroup[];
}

interface WordsPlacementSkippedItem {
  wordId: string;
  word: string;
  reason: string;
}

interface WordsPlacementResponse {
  gameType: "words_placement";
  courseId: string;
  dayId: string;
  version: 1;
  items: WordsPlacementItem[];
  skipped: WordsPlacementSkippedItem[];
  saved?: boolean;
  path?: string;
  error?: string;
}

type PreviewMeta = {
  course: Course;
  level: JlptLevel | null;
  day: number;
  language: Language;
};

interface CountResponse {
  max_days?: number;
  max_count?: number;
  error?: string;
}

const ENGLISH_COURSES: Course[] = [
  "CSAT",
  "CSAT_IDIOMS",
  "TOEIC",
  "TOEFL_ITELS",
  "EXTREMELY_ADVANCED",
  "COLLOCATION",
];
const JAPANESE_COURSES: Course[] = ["JLPT", "KANJI"];
const JLPT_LEVELS: JlptLevel[] = ["N1", "N2", "N3", "N4", "N5"];

export default function WordsPlacementGeneratorForm({
  submitLabel,
  loadingLabel,
  resetLabel,
  networkErrorMsg,
  standbyTitle,
  standbyDescription,
  processingDescription,
  languageLabel,
  courseLabel,
  levelLabel,
  dayLabel,
  englishLabel,
  japaneseLabel,
  saveLabel,
  savingLabel,
  saveSuccessMsg,
  saveErrorMsg,
}: {
  submitLabel: string;
  loadingLabel: string;
  resetLabel: string;
  networkErrorMsg: string;
  standbyTitle: string;
  standbyDescription: string;
  processingDescription: string;
  languageLabel: string;
  courseLabel: string;
  levelLabel: string;
  dayLabel: string;
  englishLabel: string;
  japaneseLabel: string;
  saveLabel: string;
  savingLabel: string;
  saveSuccessMsg: string;
  saveErrorMsg: string;
}) {
  const [language, setLanguage] = useState<Language>("english");
  const [course, setCourse] = useState<Course>("CSAT");
  const [level, setLevel] = useState<JlptLevel>("N3");
  const [day, setDay] = useState<number | string>(1);
  const [result, setResult] = useState<WordsPlacementResponse | null>(null);
  const [resultMeta, setResultMeta] = useState<PreviewMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dayTouched, setDayTouched] = useState(false);
  const [maxDays, setMaxDays] = useState<number | null>(null);
  const [dayWordCount, setDayWordCount] = useState<number | null>(null);
  const [dayAutoFilledMax, setDayAutoFilledMax] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [countError, setCountError] = useState("");
  const dayMaxErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRequestIdRef = useRef(0);

  const flashDayMaxError = useCallback(() => {
    setDayAutoFilledMax(true);
    if (dayMaxErrorTimerRef.current) clearTimeout(dayMaxErrorTimerRef.current);
    dayMaxErrorTimerRef.current = setTimeout(() => {
      setDayAutoFilledMax(false);
      dayMaxErrorTimerRef.current = null;
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (dayMaxErrorTimerRef.current) clearTimeout(dayMaxErrorTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      course,
      day: String(day),
    });
    if (course === "JLPT") params.set("level", level);

    setCountLoading(true);
    setCountError("");
    setMaxDays(null);
    setDayWordCount(null);

    fetch(`/api/text/quiz-generate/count?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as CountResponse;
        if (typeof data.max_days === "number") {
          setMaxDays(data.max_days);
          const currentDay = typeof day === "string" ? parseInt(day, 10) : day;
          if (
            Number.isInteger(currentDay) &&
            currentDay > data.max_days &&
            data.max_days > 0
          ) {
            setDay(data.max_days);
            flashDayMaxError();
          }
        }
        if (!response.ok) throw new Error(data.error || networkErrorMsg);
        setDayWordCount(typeof data.max_count === "number" ? data.max_count : null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setDayWordCount(null);
        setCountError(networkErrorMsg);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCountLoading(false);
      });

    return () => controller.abort();
  }, [course, day, flashDayMaxError, level, networkErrorMsg]);

  const dayNumber = typeof day === "string" ? parseInt(day, 10) : day;
  const invalidDay = !Number.isInteger(dayNumber) || dayNumber < 1;
  const dayExceedsMax = maxDays !== null && !invalidDay && dayNumber > maxDays;
  const selectedDayHasNoWords = dayWordCount === 0;
  const hasLimitError = invalidDay || dayExceedsMax || selectedDayHasNoWords;
  const generateDisabled = loading || saving || countLoading || dayWordCount === null || hasLimitError;

  const buildPreviewMeta = useCallback((): PreviewMeta | null => {
    if (!Number.isInteger(dayNumber) || dayNumber < 1) return null;
    return {
      course,
      level: course === "JLPT" ? level : null,
      day: dayNumber,
      language,
    };
  }, [course, dayNumber, language, level]);

  const previewMetaMatches = useCallback((left: PreviewMeta | null, right: PreviewMeta | null) => (
    Boolean(left && right) &&
    left?.course === right?.course &&
    left?.level === right?.level &&
    left?.day === right?.day &&
    left?.language === right?.language
  ), []);

  const requestGeneration = useCallback(async (save: boolean) => {
    const response = await fetch("/api/admin/words-placement/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        course,
        ...(course === "JLPT" ? { level } : {}),
        day: dayNumber,
        ...(save ? { save: true } : {}),
      }),
    });
    const data = (await response.json()) as WordsPlacementResponse;
    if (!response.ok) throw new Error(data.error || networkErrorMsg);
    return data;
  }, [course, dayNumber, level, networkErrorMsg]);

  const generatePreview = useCallback(async () => {
    if (hasLimitError || dayWordCount === null) {
      setError(selectedDayHasNoWords ? "The selected day has no words." : networkErrorMsg);
      return false;
    }

    const requestMeta = buildPreviewMeta();
    if (!requestMeta) {
      setError(networkErrorMsg);
      return false;
    }
    const requestId = ++generationRequestIdRef.current;

    setLoading(true);
    setError("");
    setSaveError("");
    setSaveSuccess(false);

    try {
      const data = await requestGeneration(false);
      if (requestId !== generationRequestIdRef.current) return false;
      setResult(data);
      setResultMeta(requestMeta);
      return true;
    } catch (err) {
      if (requestId === generationRequestIdRef.current) {
        setError(err instanceof Error ? err.message : networkErrorMsg);
      }
      return false;
    } finally {
      if (requestId === generationRequestIdRef.current) setLoading(false);
    }
  }, [
    buildPreviewMeta,
    dayWordCount,
    hasLimitError,
    networkErrorMsg,
    requestGeneration,
    selectedDayHasNoWords,
  ]);

  useEffect(() => {
    if (!dayTouched || generateDisabled) return;

    const nextMeta = buildPreviewMeta();
    if (previewMetaMatches(resultMeta, nextMeta)) {
      setDayTouched(false);
      return;
    }

    const timer = setTimeout(() => {
      setDayTouched(false);
      void generatePreview();
    }, 3000);

    return () => clearTimeout(timer);
  }, [
    buildPreviewMeta,
    dayTouched,
    generateDisabled,
    generatePreview,
    previewMetaMatches,
    resultMeta,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDayTouched(false);
    await generatePreview();
  }

  async function handleSave() {
    if (hasLimitError || dayWordCount === null) return;

    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const saved = await requestGeneration(true);
      setResult(saved);
      setResultMeta(buildPreviewMeta());
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : saveErrorMsg);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    generationRequestIdRef.current += 1;
    setResult(null);
    setResultMeta(null);
    setError("");
    setSaveError("");
    setSaveSuccess(false);
    setDayTouched(false);
  }

  function renderChunkGroup(group: WordPlacementChunk[]) {
    return (
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {group.map((chunk) => (
          <Chip
            key={chunk.id}
            label={`${chunk.order}. ${chunk.text}`}
            color={chunk.type === "answer" ? "primary" : "default"}
            variant={chunk.type === "answer" ? "filled" : "outlined"}
            size="small"
          />
        ))}
      </Stack>
    );
  }

  function renderGroupTranslations(group: WordsPlacementGroup) {
    const translations = [
      group.translation,
      group.translationEnglish,
      group.translationKorean,
      group.exampleEnglishTranslation,
      group.exampleKoreanTranslation,
    ].filter((text): text is string => Boolean(text?.trim()));

    if (translations.length === 0) return null;

    return (
      <Stack spacing={0.25} sx={{ mt: 0.5 }}>
        {translations.map((translation, index) => (
          <Typography key={`${translation}-${index}`} variant="caption" color="text.secondary">
            {translation}
          </Typography>
        ))}
      </Stack>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="words-placement-language-label">{languageLabel}</InputLabel>
              <Select
                labelId="words-placement-language-label"
                value={language}
                label={languageLabel}
                onChange={(e) => {
                  const nextLanguage = e.target.value as Language;
                  setLanguage(nextLanguage);
                  setCourse(nextLanguage === "japanese" ? "JLPT" : "CSAT");
                }}
              >
                <MenuItem value="english">{englishLabel}</MenuItem>
                <MenuItem value="japanese">{japaneseLabel}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="words-placement-course-label">{courseLabel}</InputLabel>
              <Select
                labelId="words-placement-course-label"
                value={course}
                label={courseLabel}
                onChange={(e) => setCourse(e.target.value as Course)}
              >
                {(language === "japanese" ? JAPANESE_COURSES : ENGLISH_COURSES).map((courseOption) => (
                  <MenuItem key={courseOption} value={courseOption}>
                    {courseOption}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {course === "JLPT" && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="words-placement-level-label">{levelLabel}</InputLabel>
                <Select
                  labelId="words-placement-level-label"
                  value={level}
                  label={levelLabel}
                  onChange={(e) => setLevel(e.target.value as JlptLevel)}
                >
                  {JLPT_LEVELS.map((levelOption) => (
                    <MenuItem key={levelOption} value={levelOption}>
                      {levelOption}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label={dayLabel}
              type="number"
              value={day}
              onChange={(e) => {
                const rawValue = e.target.value;
                const nextDay = parseInt(rawValue, 10);
                if (
                  maxDays !== null &&
                  Number.isInteger(nextDay) &&
                  nextDay > maxDays
                ) {
                  setDayTouched(true);
                  setDay(maxDays);
                  flashDayMaxError();
                  return;
                }
                setDayAutoFilledMax(false);
                setDayTouched(true);
                setDay(rawValue);
              }}
              onBlur={() => {
                const value = parseInt(String(day), 10);
                if (!Number.isInteger(value) || value < 1 || value !== day) {
                  setDayTouched(true);
                }
                setDay(Number.isInteger(value) && value > 0 ? value : 1);
              }}
              onFocus={(e) => e.target.select()}
              fullWidth
              error={invalidDay || dayExceedsMax || dayAutoFilledMax}
              helperText={
                invalidDay
                  ? "Enter a valid day."
                  : maxDays !== null
                    ? `Max: ${maxDays}`
                    : undefined
              }
              slotProps={{
                htmlInput: {
                  min: 1,
                  ...(maxDays !== null && maxDays > 0 ? { max: maxDays } : {}),
                  inputMode: "numeric",
                },
              }}
              sx={{
                "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": {
                  display: "none",
                },
                "& input[type=number]": {
                  MozAppearance: "textfield",
                },
              }}
            />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={generateDisabled}>
            {loading ? loadingLabel : submitLabel}
          </Button>
          <Button type="button" variant="outlined" onClick={handleReset} disabled={loading || saving}>
            {resetLabel}
          </Button>
          {result && (
            <Button type="button" variant="contained" color="success" disabled={loading || saving} onClick={() => void handleSave()}>
              {saving ? savingLabel : saveLabel}
            </Button>
          )}
        </Stack>

        {selectedDayHasNoWords ? <Alert severity="error">The selected day has no words.</Alert> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {countError ? <Alert severity="error">{countError}</Alert> : null}
        {saveError ? <Alert severity="error">{saveError}</Alert> : null}

        {!result && !error ? (
          <Card
            variant="outlined"
            sx={{
              minHeight: 200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "background.default",
            }}
          >
            <CardContent>
              <Stack spacing={1.5} alignItems="center" color="text.secondary">
                <ExtensionIcon sx={{ fontSize: 48, opacity: loading ? 1 : 0.5 }} />
                <Typography variant="subtitle1" fontWeight={600} align="center">
                  {loading ? loadingLabel : standbyTitle}
                </Typography>
                <Typography variant="body2" align="center" sx={{ maxWidth: 360 }}>
                  {loading ? processingDescription : standbyDescription}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : null}

        {result ? (
          <Stack spacing={2}>
            <Alert severity={result.items.length > 0 ? "success" : "warning"}>
              Generated {result.items.length} words placement items.
              {result.skipped.length > 0 ? ` Skipped ${result.skipped.length}.` : ""}
            </Alert>
            {result.items.map((item, index) => (
              <Card key={item.wordId} variant="outlined">
                <CardContent>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {index + 1}. {item.word}
                      </Typography>
                    </Box>
                    {item.wordsToPlace.map((group, groupIndex) => (
                      <Box key={`${item.wordId}-${groupIndex}`}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          Group {groupIndex + 1}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {group.targetExample}
                        </Typography>
                        {renderGroupTranslations(group)}
                        <Box sx={{ mt: 0.75 }}>{renderChunkGroup(group.chunks)}</Box>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : null}
      </Stack>

      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSaveSuccess(false)}>
          {saveSuccessMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
