"use client";

import { FormEvent, useState } from "react";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
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
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import QuizIcon from "@mui/icons-material/Quiz";

type QuizType = "matching" | "fill_blank";
type Language = "english" | "japanese";
type Course =
  | "CSAT"
  | "CSAT_IDIOMS"
  | "TOEIC"
  | "TOEFL_ITELS"
  | "EXTREMELY_ADVANCED"
  | "COLLOCATION"
  | "JLPT";
type JlptLevel = "N1" | "N2" | "N3" | "N4" | "N5";

type MatchingItem = { id: string; text: string };
type MatchingChoice = { id: string; text: string };
type MatchingAnswerKey = { item_id: string; choice_id: string };

type MatchingQuizResponse = {
  quiz_type: "matching";
  language: Language;
  course: Course;
  level: JlptLevel | null;
  day: number;
  items: MatchingItem[];
  choices: MatchingChoice[];
  answer_key: MatchingAnswerKey[];
};

type FillBlankOption = { id: string; text: string };

type FillBlankQuestion = {
  id: string;
  sentence: string;
  translation_english?: string;
  translation_korean?: string;
  options: FillBlankOption[];
  answer_id: string;
  answer_text: string;
};

type FillBlankQuizResponse = {
  quiz_type: "fill_blank";
  language: Language;
  course: Course;
  level: JlptLevel | null;
  day: number;
  questions: FillBlankQuestion[];
};

type QuizResponse = MatchingQuizResponse | FillBlankQuizResponse;

const COURSES: Course[] = [
  "CSAT",
  "CSAT_IDIOMS",
  "TOEIC",
  "TOEFL_ITELS",
  "EXTREMELY_ADVANCED",
  "COLLOCATION",
  "JLPT",
];

const JLPT_LEVELS: JlptLevel[] = ["N1", "N2", "N3", "N4", "N5"];

function renderSentenceWithBlank(sentence: string) {
  const parts = sentence.split(/(_+)/);
  return (
    <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
      {parts.map((part, i) =>
        /^_+$/.test(part) ? (
          <Box
            key={i}
            component="span"
            sx={{
              display: "inline-block",
              minWidth: 60,
              borderBottom: "2px solid",
              borderColor: "text.primary",
              mx: 0.5,
              verticalAlign: "bottom",
            }}
          />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </Typography>
  );
}

export default function QuizGeneratorForm({
  submitLabel,
  loadingLabel,
  resetLabel,
  networkErrorMsg,
  standbyTitle,
  standbyDescription,
  processingDescription,
  quizTypeLabel,
  languageLabel,
  courseLabel,
  levelLabel,
  dayLabel,
  countLabel,
  matchingLabel,
  fillBlankLabel,
  englishLabel,
  japaneseLabel,
  itemsLabel,
  choicesLabel,
  answerKeyLabel,
  questionLabel,
  showAnswerLabel,
  hideAnswerLabel,
  addLabel,
  addingLabel,
  addSuccessMsg,
  addErrorMsg,
}: {
  submitLabel: string;
  loadingLabel: string;
  resetLabel: string;
  networkErrorMsg: string;
  standbyTitle: string;
  standbyDescription: string;
  processingDescription: string;
  quizTypeLabel: string;
  languageLabel: string;
  courseLabel: string;
  levelLabel: string;
  dayLabel: string;
  countLabel: string;
  matchingLabel: string;
  fillBlankLabel: string;
  englishLabel: string;
  japaneseLabel: string;
  itemsLabel: string;
  choicesLabel: string;
  answerKeyLabel: string;
  questionLabel: string;
  showAnswerLabel: string;
  hideAnswerLabel: string;
  addLabel: string;
  addingLabel: string;
  addSuccessMsg: string;
  addErrorMsg: string;
}) {
  const [quizType, setQuizType] = useState<QuizType>("matching");
  const [language, setLanguage] = useState<Language>("english");
  const [course, setCourse] = useState<Course>("TOEIC");
  const [level, setLevel] = useState<JlptLevel>("N3");
  const [day, setDay] = useState(1);
  const [count, setCount] = useState(10);
  const [result, setResult] = useState<QuizResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shownAnswers, setShownAnswers] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  function toggleAnswer(questionId: string) {
    setShownAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setShownAnswers(new Set());

    try {
      const response = await fetch("/api/text/quiz-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_type: quizType,
          language,
          course,
          level: course === "JLPT" ? level : null,
          day,
          count,
        }),
      });

      const data = (await response.json()) as QuizResponse;

      if (!response.ok) {
        setError(networkErrorMsg);
        return;
      }

      setResult(data);
    } catch {
      setError(networkErrorMsg);
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError("");
    setSaveError("");
    setSaveSuccess(false);
    setShownAnswers(new Set());
  }

  async function handleAdd() {
    if (!result) return;
    setAdding(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/admin/quiz-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quiz_type: result.quiz_type,
          course,
          level: course === "JLPT" ? level : null,
          day,
          quiz_data: result,
        }),
      });

      if (!response.ok) {
        setSaveError(addErrorMsg);
        return;
      }

      setSaveSuccess(true);
    } catch {
      setSaveError(addErrorMsg);
    } finally {
      setAdding(false);
    }
  }

  function renderMatchingResult(data: MatchingQuizResponse) {
    const itemMap = new Map(data.items.map((item) => [item.id, item.text]));
    const choiceMap = new Map(data.choices.map((choice) => [choice.id, choice.text]));

    return (
      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  {itemsLabel}
                </Typography>
                <Stack spacing={1}>
                  {data.items.map((item, i) => (
                    <Box
                      key={item.id}
                      sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ minWidth: 20, fontWeight: 600 }}
                      >
                        {i + 1}.
                      </Typography>
                      <Typography variant="body2">{item.text}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  {choicesLabel}
                </Typography>
                <Stack spacing={1}>
                  {data.choices.map((choice, i) => (
                    <Box
                      key={choice.id}
                      sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
                    >
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ minWidth: 20, fontWeight: 600 }}
                      >
                        {String.fromCharCode(65 + i)}.
                      </Typography>
                      <Typography variant="body2">{choice.text}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {answerKeyLabel}
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{itemsLabel}</TableCell>
                    <TableCell>{choicesLabel}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.answer_key.map((entry) => (
                    <TableRow key={entry.item_id}>
                      <TableCell>{itemMap.get(entry.item_id) ?? entry.item_id}</TableCell>
                      <TableCell>{choiceMap.get(entry.choice_id) ?? entry.choice_id}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Stack>
    );
  }

  function renderFillBlankResult(data: FillBlankQuizResponse) {
    return (
      <Stack spacing={2}>
        {data.questions.map((question, i) => {
          const shown = shownAnswers.has(question.id);
          return (
            <Card key={question.id} variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {questionLabel} {i + 1}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>{renderSentenceWithBlank(question.sentence)}</Box>
                    {(question.translation_korean ?? question.translation_english) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, fontStyle: "italic" }}
                      >
                        {question.translation_korean ?? question.translation_english}
                      </Typography>
                    )}
                  </Box>

                  <Grid container spacing={1}>
                    {question.options.map((option) => {
                      const isCorrect = option.id === question.answer_id;
                      const highlight = shown && isCorrect;
                      return (
                        <Grid key={option.id} size={{ xs: 12, sm: 6 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              p: 1,
                              borderRadius: 1,
                              border: "1px solid",
                              borderColor: highlight ? "success.main" : "divider",
                              bgcolor: highlight ? "success.light" : "transparent",
                              transition: "all 0.2s",
                            }}
                          >
                            <Chip
                              label={option.id.toUpperCase()}
                              size="small"
                              color={highlight ? "success" : "default"}
                              sx={{ minWidth: 32, fontWeight: 600 }}
                            />
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: highlight ? 600 : 400 }}
                            >
                              {option.text}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>

                  <Box>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => toggleAnswer(question.id)}
                    >
                      {shown ? hideAnswerLabel : showAnswerLabel}
                    </Button>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>
    );
  }

  function renderResult() {
    if (!result) return null;
    if (result.quiz_type === "matching") return renderMatchingResult(result);
    return renderFillBlankResult(result);
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={3}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="quiz-type-label">{quizTypeLabel}</InputLabel>
              <Select
                labelId="quiz-type-label"
                value={quizType}
                label={quizTypeLabel}
                onChange={(e) => setQuizType(e.target.value as QuizType)}
              >
                <MenuItem value="matching">{matchingLabel}</MenuItem>
                <MenuItem value="fill_blank">{fillBlankLabel}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="language-label">{languageLabel}</InputLabel>
              <Select
                labelId="language-label"
                value={language}
                label={languageLabel}
                onChange={(e) => {
                  const newLang = e.target.value as Language;
                  setLanguage(newLang);
                  if (newLang === "japanese") {
                    setCourse("JLPT");
                  } else if (newLang === "english" && course === "JLPT") {
                    setCourse("TOEIC");
                  }
                }}
              >
                <MenuItem value="english">{englishLabel}</MenuItem>
                <MenuItem value="japanese">{japaneseLabel}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="course-label">{courseLabel}</InputLabel>
              <Select
                labelId="course-label"
                value={course}
                label={courseLabel}
                onChange={(e) => {
                  setCourse(e.target.value as Course);
                }}
              >
                {COURSES.filter((c) => (language === "english" ? c !== "JLPT" : c === "JLPT")).map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {course === "JLPT" && (
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth>
                <InputLabel id="level-label">{levelLabel}</InputLabel>
                <Select
                  labelId="level-label"
                  value={level}
                  label={levelLabel}
                  onChange={(e) => setLevel(e.target.value as JlptLevel)}
                >
                  {JLPT_LEVELS.map((l) => (
                    <MenuItem key={l} value={l}>
                      {l}
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
                const val = parseInt(e.target.value, 10);
                setDay(isNaN(val) ? 1 : Math.max(1, val));
              }}
              fullWidth
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              label={countLabel}
              type="number"
              value={count}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setCount(isNaN(val) ? 1 : Math.max(1, Math.min(20, val)));
              }}
              fullWidth
              slotProps={{ htmlInput: { min: 1, max: 20 } }}
            />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={loading || adding}>
            {loading ? loadingLabel : submitLabel}
          </Button>
          <Button type="button" variant="outlined" onClick={handleReset} disabled={loading || adding}>
            {resetLabel}
          </Button>
          {result !== null && (
            <Button
              type="button"
              variant="contained"
              color="success"
              disabled={adding || loading}
              onClick={() => void handleAdd()}
            >
              {adding ? addingLabel : addLabel}
            </Button>
          )}
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {saveError ? <Alert severity="error">{saveError}</Alert> : null}

        {result === null && !error ? (
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
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 64,
                    width: 64,
                    "@keyframes geminiPulse": {
                      "0%, 100%": {
                        transform: "scale(1)",
                        filter: "drop-shadow(0 0 0px transparent)",
                      },
                      "50%": {
                        transform: "scale(1.15)",
                        filter: "drop-shadow(0 0 15px rgba(155, 114, 203, 0.5))",
                      },
                    },
                    "@keyframes geminiTwinkle": {
                      "0%, 100%": { opacity: 0.3, transform: "scale(0.8) rotate(0deg)" },
                      "50%": { opacity: 1, transform: "scale(1.1) rotate(15deg)" },
                    },
                  }}
                >
                  <Box component="svg" width="0" height="0" sx={{ position: "absolute" }}>
                    <defs>
                      <linearGradient
                        id="gemini-gradient-quiz"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="#4285f4" />
                        <stop offset="50%" stopColor="#9b72cb" />
                        <stop offset="100%" stopColor="#d96570" />
                      </linearGradient>
                    </defs>
                  </Box>

                  <QuizIcon
                    sx={{
                      fontSize: 48,
                      opacity: loading ? 1 : 0.5,
                      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                      fill: loading ? "url(#gemini-gradient-quiz)" : "currentColor",
                      animation: loading ? "geminiPulse 2s infinite ease-in-out" : "none",
                    }}
                  />

                  {loading && (
                    <>
                      <QuizIcon
                        sx={{
                          position: "absolute",
                          top: 4,
                          right: 4,
                          fontSize: 18,
                          fill: "#9b72cb",
                          animation: "geminiTwinkle 1.8s infinite ease-in-out",
                        }}
                      />
                      <QuizIcon
                        sx={{
                          position: "absolute",
                          bottom: 8,
                          left: 4,
                          fontSize: 14,
                          fill: "#4285f4",
                          animation: "geminiTwinkle 2.5s infinite ease-in-out",
                          animationDelay: "0.5s",
                        }}
                      />
                    </>
                  )}
                </Box>

                <Typography variant="subtitle1" fontWeight={600} align="center">
                  {loading ? loadingLabel : standbyTitle}
                </Typography>
                <Typography variant="body2" align="center" sx={{ maxWidth: 360 }}>
                  {loading ? processingDescription : standbyDescription}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          renderResult()
        )}
      </Stack>

      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSaveSuccess(false)}>
          {addSuccessMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
