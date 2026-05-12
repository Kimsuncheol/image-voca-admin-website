"use client";

import { useCallback, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import Grid from "@mui/material/Grid";
import InputLabel from "@mui/material/InputLabel";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import { dayGridTemplateColumns } from "@/components/courses/dayGridConfig";
import type { WordPlacementChunk, WordsPlacementGroup } from "@/lib/wordsPlacementChunkGenerator";

type Language = "english" | "japanese";
type JlptLevel = "N1" | "N2" | "N3" | "N4" | "N5";
type Course =
  | "CSAT"
  | "CSAT_IDIOMS"
  | "TOEIC"
  | "TOEFL_ITELS"
  | "EXTREMELY_ADVANCED"
  | "COLLOCATION"
  | "JLPT"
  | "KANJI";

interface WordsPlacementItem {
  wordId: string;
  word: string;
  example: string;
  wordsToPlace: WordsPlacementGroup[];
}

interface WordsPlacementGameDoc {
  gameType: "words_placement";
  courseId: string;
  dayId: string;
  version: 1;
  items: WordsPlacementItem[];
}

interface StatusResult {
  total: number;
  days: number[];
}

interface ContextMenuState {
  top: number;
  left: number;
  day: number;
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

function getGroupTranslations(group: WordsPlacementGroup): string[] {
  return [
    group.translation,
    group.translationEnglish,
    group.translationKorean,
    group.exampleEnglishTranslation,
    group.exampleKoreanTranslation,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function getGroupCount(data: WordsPlacementGameDoc): number {
  return data.items.reduce((total, item) => total + item.wordsToPlace.length, 0);
}

function renderChunks(chunks: WordPlacementChunk[]) {
  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
      {[...chunks].sort((a, b) => a.order - b.order).map((chunk) => (
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

function WordsPlacementPreview({ data }: { data: WordsPlacementGameDoc }) {
  return (
    <Stack spacing={2}>
      <Alert severity="info">
        {data.items.length} items, {getGroupCount(data)} groups
      </Alert>
      {data.items.map((item, itemIndex) => (
        <Card key={item.wordId} variant="outlined">
          <CardContent>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {itemIndex + 1}. {item.word}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {item.wordId}
                </Typography>
              </Box>
              {item.wordsToPlace.map((group, groupIndex) => (
                <Box key={`${item.wordId}-${groupIndex}`}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Group {groupIndex + 1}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.25 }}>
                    {group.targetExample}
                  </Typography>
                  <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                    {getGroupTranslations(group).map((translation, index) => (
                      <Typography
                        key={`${translation}-${index}`}
                        variant="caption"
                        color="text.secondary"
                      >
                        {translation}
                      </Typography>
                    ))}
                  </Stack>
                  <Box sx={{ mt: 0.75 }}>{renderChunks(group.chunks)}</Box>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

export default function WordsPlacementReviewTab() {
  const { t } = useTranslation();

  const [language, setLanguage] = useState<Language>("english");
  const [course, setCourse] = useState<Course>("CSAT");
  const [level, setLevel] = useState<JlptLevel>("N3");
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [gameData, setGameData] = useState<WordsPlacementGameDoc | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const buildParams = useCallback(
    (day?: number) => {
      const params = new URLSearchParams({ course });
      if (course === "JLPT") params.set("level", level);
      if (day !== undefined) params.set("day", String(day));
      return params;
    },
    [course, level],
  );

  function resetLoadedState() {
    setStatus(null);
    setSelectedDay(null);
    setGameData(null);
    setGameError("");
    setDeleteError("");
  }

  async function handleLoad() {
    setLoading(true);
    setLoadError("");
    resetLoadedState();
    try {
      const response = await fetch(`/api/admin/words-placement/status?${buildParams().toString()}`);
      if (!response.ok) throw new Error();
      setStatus((await response.json()) as StatusResult);
    } catch {
      setLoadError(t("quizReview.networkError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDayClick(day: number) {
    if (selectedDay === day) {
      setSelectedDay(null);
      setGameData(null);
      return;
    }

    setSelectedDay(day);
    setGameData(null);
    setGameError("");
    setGameLoading(true);
    try {
      const response = await fetch(`/api/admin/words-placement?${buildParams(day).toString()}`);
      if (!response.ok) throw new Error();
      setGameData((await response.json()) as WordsPlacementGameDoc);
    } catch {
      setGameError(t("quizReview.networkError"));
    } finally {
      setGameLoading(false);
    }
  }

  function handleContextMenu(event: React.MouseEvent, day: number) {
    event.preventDefault();
    setContextMenu({ top: event.clientY, left: event.clientX, day });
  }

  function handleCloseMenu() {
    setContextMenu(null);
  }

  async function handleDeleteDay(day: number) {
    if (!status) return;
    handleCloseMenu();
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch(`/api/admin/words-placement?${buildParams(day).toString()}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) throw new Error();
      setStatus((prev) =>
        prev ? { ...prev, days: prev.days.filter((savedDay) => savedDay !== day) } : prev,
      );
      if (selectedDay === day) {
        setSelectedDay(null);
        setGameData(null);
      }
      setDeleteSuccess(true);
    } catch {
      setDeleteError(t("quizReview.deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDelete() {
    if (!contextMenu) return;
    await handleDeleteDay(contextMenu.day);
  }

  const hasGameSet = new Set(status?.days ?? []);

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="words-placement-review-language-label">
              {t("quizGenerator.languageLabel")}
            </InputLabel>
            <Select
              labelId="words-placement-review-language-label"
              value={language}
              label={t("quizGenerator.languageLabel")}
              onChange={(event) => {
                const nextLanguage = event.target.value as Language;
                setLanguage(nextLanguage);
                setCourse(nextLanguage === "japanese" ? "JLPT" : "CSAT");
                resetLoadedState();
              }}
            >
              <MenuItem value="english">{t("quizGenerator.english")}</MenuItem>
              <MenuItem value="japanese">{t("quizGenerator.japanese")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="words-placement-review-course-label">
              {t("quizGenerator.courseLabel")}
            </InputLabel>
            <Select
              labelId="words-placement-review-course-label"
              value={course}
              label={t("quizGenerator.courseLabel")}
              onChange={(event) => {
                setCourse(event.target.value as Course);
                resetLoadedState();
              }}
            >
              {(language === "japanese" ? JAPANESE_COURSES : ENGLISH_COURSES).map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {course === "JLPT" && (
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel id="words-placement-review-level-label">
                {t("quizGenerator.levelLabel")}
              </InputLabel>
              <Select
                labelId="words-placement-review-level-label"
                value={level}
                label={t("quizGenerator.levelLabel")}
                onChange={(event) => {
                  setLevel(event.target.value as JlptLevel);
                  resetLoadedState();
                }}
              >
                {JLPT_LEVELS.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
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

      {loadError ? <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert> : null}
      {deleteError ? <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {!loading && status !== null ? (
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
                const hasGame = hasGameSet.has(day);
                const isSelected = selectedDay === day;
                return (
                  <Card
                    key={day}
                    variant="outlined"
                    sx={{
                      aspectRatio: "1 / 1",
                      borderColor: isSelected
                        ? "primary.dark"
                        : hasGame
                          ? "primary.main"
                          : "divider",
                      borderWidth: isSelected ? 2 : 1,
                      bgcolor: isSelected
                        ? "primary.main"
                        : hasGame
                          ? "primary.light"
                          : "background.paper",
                      opacity: deleting ? 0.6 : 1,
                      transition: "all 0.15s",
                    }}
                    onContextMenu={hasGame ? (event) => handleContextMenu(event, day) : undefined}
                  >
                    <CardActionArea
                      disabled={!hasGame}
                      sx={{ height: "100%" }}
                      onClick={() => void handleDayClick(day)}
                      onContextMenu={hasGame ? (event) => handleContextMenu(event, day) : undefined}
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
                          fontWeight={hasGame ? 700 : 400}
                          color={
                            isSelected
                              ? "primary.contrastText"
                              : hasGame
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

          {selectedDay !== null ? (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                Day {selectedDay}
              </Typography>
              <Button
                type="button"
                color="error"
                variant="outlined"
                size="small"
                disabled={deleting}
                onClick={() => void handleDeleteDay(selectedDay)}
                sx={{ mb: 2 }}
              >
                {t("quizReview.deleteQuiz")}
              </Button>
              {gameLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : null}
              {gameError ? <Alert severity="error">{gameError}</Alert> : null}
              {!gameLoading && gameData ? <WordsPlacementPreview data={gameData} /> : null}
            </Box>
          ) : null}
        </>
      ) : null}

      <Menu
        open={Boolean(contextMenu)}
        onClose={handleCloseMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.top, left: contextMenu.left } : undefined
        }
      >
        <MenuItem onClick={() => void handleDelete()}>{t("quizReview.deleteQuiz")}</MenuItem>
      </Menu>

      <Snackbar
        open={deleteSuccess}
        autoHideDuration={2500}
        onClose={() => setDeleteSuccess(false)}
      >
        <Alert severity="success" onClose={() => setDeleteSuccess(false)}>
          {t("quizReview.deleteSuccess")}
        </Alert>
      </Snackbar>
    </Box>
  );
}
