"use client";

import { useState, useCallback } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { dayGridTemplateColumns } from "@/components/courses/dayGridConfig";

type QuizType = "matching" | "fill_blank";
type Language = "english" | "japanese";
type MeaningLanguage = "korean" | "english";
type JlptLevel = "N1" | "N2" | "N3" | "N4" | "N5";
type Course =
  | "CSAT"
  | "CSAT_IDIOMS"
  | "TOEIC"
  | "TOEFL_ITELS"
  | "EXTREMELY_ADVANCED"
  | "COLLOCATION"
  | "JLPT";

interface MatchingItem {
  id: string;
  word?: string;
  text?: string;
  meaning?: string;
}

interface MatchingChoice {
  id: string;
  word?: string;
  meaning?: string;         // English courses
  meaningEnglish?: string;  // JLPT
  meaningKorean?: string;   // JLPT
}

interface MatchingQuizData {
  quiz_type: "matching";
  meaning_language?: MeaningLanguage;
  items: MatchingItem[];
  choices: MatchingChoice[];
  answer_key: { item_id: string; choice_id: string }[];
}

interface FillBlankQuestion {
  id: string;
  sentence: string;
  translation_english?: string;
  translation_korean?: string;
  options: { id: string; text: string }[];
  answer_id: string;
  answer_text: string;
}

interface FillBlankQuizData {
  quiz_type: "fill_blank";
  meaning_language?: MeaningLanguage;
  questions: FillBlankQuestion[];
}

type QuizData = MatchingQuizData | FillBlankQuizData;

const ENGLISH_COURSES: Course[] = [
  "CSAT",
  "CSAT_IDIOMS",
  "TOEIC",
  "TOEFL_ITELS",
  "EXTREMELY_ADVANCED",
  "COLLOCATION",
];
const JLPT_LEVELS: JlptLevel[] = ["N1", "N2", "N3", "N4", "N5"];

interface StatusResult {
  total: number;
  days: number[];
}

interface ContextMenuState {
  top: number;
  left: number;
  day: number;
}

function resolveChoice(choice: MatchingChoice, lang: MeaningLanguage): string {
  return (
    (lang === "english" ? choice.meaningEnglish : choice.meaningKorean) ||
    choice.meaningEnglish ||
    choice.meaningKorean ||
    choice.word ||
    ""
  );
}

function resolveItem(item: MatchingItem): string {
  return item.word ?? item.text ?? item.id;
}

function MatchingTable({ data }: { data: MatchingQuizData }) {
  const { t } = useTranslation();
  const lang = data.meaning_language ?? "korean";
  const choiceMap = new Map(
    data.choices.map((c) => [c.id, resolveChoice(c, lang)]),
  );

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 48, fontWeight: 700 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("quizGenerator.items")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("quizGenerator.answerKey")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.answer_key.map((entry, i) => {
            const item = data.items.find((it) => it.id === entry.item_id);
            return (
              <TableRow key={entry.item_id} hover>
                <TableCell>{i + 1}</TableCell>
                <TableCell>
                  {item ? (
                    <Box>
                      <Typography variant="body2">{resolveItem(item)}</Typography>
                      {item.meaning && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {item.meaning}
                        </Typography>
                      )}
                    </Box>
                  ) : entry.item_id}
                </TableCell>
                <TableCell>{choiceMap.get(entry.choice_id) ?? entry.choice_id}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function FillBlankTable({ data }: { data: FillBlankQuizData }) {
  const { t } = useTranslation();
  const lang = data.meaning_language ?? "korean";

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 48, fontWeight: 700 }}>#</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("quizGenerator.question")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>{t("quizGenerator.answerKey")}</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>
              {lang === "english" ? t("quizGenerator.meaningEnglish") : t("quizGenerator.meaningKorean")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.questions.map((q, i) => (
            <TableRow key={q.id} hover>
              <TableCell>{i + 1}</TableCell>
              <TableCell sx={{ fontFamily: "monospace" }}>{q.sentence}</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>{q.answer_text}</TableCell>
              <TableCell sx={{ color: "text.secondary", fontStyle: "italic" }}>
                {lang === "english" ? (q.translation_english ?? "") : (q.translation_korean ?? "")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function QuizReviewTab() {
  const { t } = useTranslation();

  const [quizType, setQuizType] = useState<QuizType>("matching");
  const [language, setLanguage] = useState<Language>("english");
  const [course, setCourse] = useState<Course>("TOEIC");
  const [level, setLevel] = useState<JlptLevel>("N3");

  const [status, setStatus] = useState<StatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState("");

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const effectiveCourse = language === "japanese" ? "JLPT" : course;

  const buildParams = useCallback(
    (day?: number) => {
      const params = new URLSearchParams({
        quiz_type: quizType,
        language,
        course: effectiveCourse,
      });
      if (effectiveCourse === "JLPT") params.set("level", level);
      if (day !== undefined) params.set("day", String(day));
      return params;
    },
    [quizType, language, effectiveCourse, level],
  );

  async function handleLoad() {
    setLoading(true);
    setLoadError("");
    setStatus(null);
    setSelectedDay(null);
    setQuizData(null);
    try {
      const res = await fetch(`/api/admin/quiz/status?${buildParams().toString()}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as StatusResult;
      setStatus(data);
    } catch {
      setLoadError(t("quizReview.networkError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDayClick(day: number) {
    if (selectedDay === day) {
      setSelectedDay(null);
      setQuizData(null);
      return;
    }
    setSelectedDay(day);
    setQuizData(null);
    setQuizError("");
    setQuizLoading(true);
    try {
      const res = await fetch(`/api/admin/quiz?${buildParams(day).toString()}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as QuizData;
      setQuizData(data);
    } catch {
      setQuizError(t("quizReview.networkError"));
    } finally {
      setQuizLoading(false);
    }
  }

  function handleContextMenu(e: React.MouseEvent, day: number) {
    e.preventDefault();
    setContextMenu({ top: e.clientY, left: e.clientX, day });
  }

  function handleCloseMenu() {
    setContextMenu(null);
  }

  async function handleDelete() {
    if (!contextMenu || !status) return;
    const day = contextMenu.day;
    handleCloseMenu();
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/quiz?${buildParams(day).toString()}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) throw new Error();
      setStatus((prev) =>
        prev ? { ...prev, days: prev.days.filter((d) => d !== day) } : prev,
      );
      if (selectedDay === day) {
        setSelectedDay(null);
        setQuizData(null);
      }
      setDeleteSuccess(true);
    } catch {
      setDeleteError(t("quizReview.deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  const hasQuizSet = new Set(status?.days ?? []);

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="review-quiz-type-label">{t("quizGenerator.quizTypeLabel")}</InputLabel>
            <Select
              labelId="review-quiz-type-label"
              value={quizType}
              label={t("quizGenerator.quizTypeLabel")}
              onChange={(e) => { setQuizType(e.target.value as QuizType); setStatus(null); setSelectedDay(null); setQuizData(null); }}
            >
              <MenuItem value="matching">{t("quizGenerator.matching")}</MenuItem>
              <MenuItem value="fill_blank">{t("quizGenerator.fillBlank")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="review-language-label">{t("quizGenerator.languageLabel")}</InputLabel>
            <Select
              labelId="review-language-label"
              value={language}
              label={t("quizGenerator.languageLabel")}
              onChange={(e) => {
                setLanguage(e.target.value as Language);
                setStatus(null);
                setSelectedDay(null);
                setQuizData(null);
              }}
            >
              <MenuItem value="english">{t("quizGenerator.english")}</MenuItem>
              <MenuItem value="japanese">{t("quizGenerator.japanese")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {language === "english" && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="review-course-label">{t("quizGenerator.courseLabel")}</InputLabel>
              <Select
                labelId="review-course-label"
                value={course}
                label={t("quizGenerator.courseLabel")}
                onChange={(e) => { setCourse(e.target.value as Course); setStatus(null); setSelectedDay(null); setQuizData(null); }}
              >
                {ENGLISH_COURSES.map((c) => (
                  <MenuItem key={c} value={c}>{c}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

        {language === "japanese" && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="review-level-label">{t("quizGenerator.levelLabel")}</InputLabel>
              <Select
                labelId="review-level-label"
                value={level}
                label={t("quizGenerator.levelLabel")}
                onChange={(e) => { setLevel(e.target.value as JlptLevel); setStatus(null); setSelectedDay(null); setQuizData(null); }}
              >
                {JLPT_LEVELS.map((l) => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        )}

      </Grid>

      <Button
        variant="contained"
        onClick={() => void handleLoad()}
        disabled={loading || deleting}
        sx={{ mb: 3 }}
      >
        {loading ? t("quizReview.loading") : t("quizReview.loadButton")}
      </Button>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}
      {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && status !== null && (
        <>
          {status.total === 0 ? (
            <Typography color="text.secondary">{t("quizReview.noQuizzes")}</Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: dayGridTemplateColumns,
                gap: 1,
              }}
            >
              {Array.from({ length: status.total }, (_, i) => {
                const day = i + 1;
                const hasQuiz = hasQuizSet.has(day);
                const isSelected = selectedDay === day;
                return (
                  <Card
                    key={day}
                    variant="outlined"
                    sx={{
                      aspectRatio: "1 / 1",
                      borderColor: isSelected
                        ? "primary.dark"
                        : hasQuiz
                        ? "primary.main"
                        : "divider",
                      borderWidth: isSelected ? 2 : 1,
                      bgcolor: isSelected
                        ? "primary.main"
                        : hasQuiz
                        ? "primary.light"
                        : "background.paper",
                      opacity: deleting ? 0.6 : 1,
                      transition: "all 0.15s",
                    }}
                    onContextMenu={hasQuiz ? (e) => handleContextMenu(e, day) : undefined}
                  >
                    <CardActionArea
                      disabled={!hasQuiz}
                      sx={{ height: "100%" }}
                      onClick={() => void handleDayClick(day)}
                      onContextMenu={hasQuiz ? (e) => handleContextMenu(e, day) : undefined}
                    >
                      <CardContent
                        sx={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography
                          variant="h6"
                          fontWeight={hasQuiz ? 700 : 400}
                          color={
                            isSelected
                              ? "primary.contrastText"
                              : hasQuiz
                              ? "primary.dark"
                              : "text.disabled"
                          }
                        >
                          {day}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
          )}

          {selectedDay !== null && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Day {selectedDay}
              </Typography>
              {quizLoading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              )}
              {quizError && <Alert severity="error">{quizError}</Alert>}
              {!quizLoading && quizData && (
                quizData.quiz_type === "matching"
                  ? <MatchingTable data={quizData} />
                  : <FillBlankTable data={quizData} />
              )}
            </Box>
          )}
        </>
      )}

      <Menu
        open={Boolean(contextMenu)}
        onClose={handleCloseMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ?? undefined}
      >
        <MenuItem onClick={() => void handleDelete()} sx={{ color: "error.main" }}>
          {t("quizReview.deleteQuiz")}
        </MenuItem>
      </Menu>

      <Snackbar
        open={deleteSuccess}
        autoHideDuration={3000}
        onClose={() => setDeleteSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setDeleteSuccess(false)}>
          {t("quizReview.deleteSuccess")}
        </Alert>
      </Snackbar>
    </Box>
  );
}
