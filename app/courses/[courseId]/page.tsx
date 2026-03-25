"use client";

/**
 * CourseDaysPage  —  /courses/[courseId]
 *
 * For most courses this page lists all "day" subcollections available for the
 * given course.  Each day card links to courses/[courseId]/[dayId]/page.tsx.
 *
 * ── FAMOUS_QUOTE exception ────────────────────────────────────────────
 *  The famous_quote Firestore collection stores quotes **flat** — documents
 *  live directly in the collection root, not inside DayN subcollections.
 *  When `course.flat === true` we skip the day grid entirely and render a
 *  WordTable of quotes inline, using the admin filtered-quote API.
 *
 * ── Data flow (standard courses) ─────────────────────────────────────
 *  1. `courseId` is extracted from Next.js params (Promise-based API).
 *  2. `getCourseById` maps the raw ID to a typed `Course` object which
 *     carries the Firestore collection path.
 *  3. `getCourseDays(course.path)` fetches all day subcollections from
 *     Firestore and stores them in local state.
 *
 * ── States ───────────────────────────────────────────────────────────
 *  loading  → CourseDaysLoadingSkeleton (responsive day-grid placeholders)
 *  error    → MUI Alert with translated error message
 *  empty    → translated "no data" text
 *  success  → responsive grid of DayCard components  (or WordTable for flat)
 *
 * ── Shared components used ───────────────────────────────────────────
 *  CourseDaysLoadingSkeleton — responsive day-grid skeleton inside PageLayout
 *  CourseBreadcrumbs  — Courses › [Course Label]
 *  DayCard            — single tile showing day ID and link to /[dayId]
 *  WordTable          — used for flat courses (FAMOUS_QUOTE)
 */

import { useState, useEffect, use } from "react";
import InboxIcon from "@mui/icons-material/Inbox";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";

// ── Layout & structural components ────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Course-domain types & data helpers ────────────────────────────────
import { getCourseById, JLPT_LEVEL_COURSES, isJlptCourse } from "@/types/course";
import type { Day } from "@/types/course";
import {
  FAMOUS_QUOTE_FILTER_LANGUAGES,
  type FamousQuoteFilterLanguage,
} from "@/types/famousQuote";
import type { FamousQuoteWord } from "@/types/word";
import { getCourseDays } from "@/lib/firebase/firestore";
import {
  fetchFilteredFamousQuotes,
  fillFamousQuotesEnglish,
  fillFamousQuotesJapanese,
} from "@/lib/famousQuoteApi";

// ── Feature-specific components ───────────────────────────────────────
import DayCard from "@/components/courses/DayCard";
import CourseDaysLoadingSkeleton from "@/components/courses/CourseDaysLoadingSkeleton";
import CourseBreadcrumbs from "@/components/courses/CourseBreadcrumbs";
import { dayGridTemplateColumns } from "@/components/courses/dayGridConfig";
import WordTable from "@/components/courses/WordTable";
import FamousQuoteLoadingSkeleton from "@/components/courses/FamousQuoteLoadingSkeleton";

export default function CourseDaysPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  // ── Route param extraction ─────────────────────────────────────────
  // Next.js 15 params are async; `use()` unwraps the Promise in a
  // Suspense-compatible way without needing an async component.
  const { courseId } = use(params);

  const { t } = useTranslation();
  const router = useRouter();

  // ── Local state ───────────────────────────────────────────────────
  const [days, setDays] = useState<Day[]>([]);
  const [quotes, setQuotes] = useState<FamousQuoteWord[]>([]);
  const [languageFilter, setLanguageFilter] =
    useState<FamousQuoteFilterLanguage>("All");
  const [refreshKey, setRefreshKey] = useState(0);
  const [filling, setFilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Resolve course metadata from static list ──────────────────────
  const course = getCourseById(courseId);
  const isFlat = course?.flat === true;
  const isJlptLevel = JLPT_LEVEL_COURSES.some((l) => l.id === courseId);
  const isJlptGroup = isJlptCourse(courseId) || isJlptLevel;
  // Generic /courses/JLPT page — redirect to the default level
  const isJlptGroupRoot = isJlptGroup && !isJlptLevel;
  const isRedirectingToDefaultJlptLevel = isJlptGroupRoot;
  const isLoading =
    isRedirectingToDefaultJlptLevel || (Boolean(course) && !isJlptGroupRoot ? loading : false);
  const resolvedError = isRedirectingToDefaultJlptLevel
    ? ""
    : course
      ? error
      : "Course not found";

  function handleLanguageFilterChange(
    nextLanguage: FamousQuoteFilterLanguage,
  ) {
    if (nextLanguage === languageFilter) return;
    setLoading(true);
    setLanguageFilter(nextLanguage);
  }

  async function handleFillEnglish() {
    if (!course || quotes.length === 0) return;
    if (
      !window.confirm(
        t(
          "courses.fillEnglishConfirm",
          `Set language = English for all ${quotes.length} quotes?`,
        ),
      )
    )
      return;
    setFilling(true);
    try {
      await fillFamousQuotesEnglish(
        course.path,
        quotes.map((q) => q.id),
      );
      setRefreshKey((k) => k + 1);
    } finally {
      setFilling(false);
    }
  }

  async function handleFillJapanese() {
    if (!course || quotes.length === 0) return;
    if (
      !window.confirm(
        t(
          "courses.fillJapaneseConfirm",
          `Set language = Japanese for all ${quotes.length} quotes?`,
        ),
      )
    )
      return;
    setFilling(true);
    try {
      await fillFamousQuotesJapanese(
        course.path,
        quotes.map((q) => q.id),
      );
      setRefreshKey((k) => k + 1);
    } finally {
      setFilling(false);
    }
  }

  useEffect(() => {
    if (!isRedirectingToDefaultJlptLevel) return;
    router.replace("/courses/JLPT_N1");
  }, [isRedirectingToDefaultJlptLevel, router]);

  // ── Standard course data fetch ────────────────────────────────────
  useEffect(() => {
    if (!course || isJlptGroupRoot || isFlat) return;

    getCourseDays(course.path)
      .then((data) => {
        console.log("Fetched course days:", data);
        setDays(data);
        setError("");
      })
      .catch(() => setError(t("courses.fetchError")))
      .finally(() => setLoading(false));
  }, [course, isFlat, isJlptGroupRoot, t]);

  // ── Famous Quote filtered fetch ───────────────────────────────────
  useEffect(() => {
    if (!course || isJlptGroupRoot || !isFlat) return;

    let isCancelled = false;

    fetchFilteredFamousQuotes(course.path, languageFilter)
      .then((data) => {
        if (isCancelled) return;
        console.log("Fetched famous quotes:", data);
        setQuotes(data);
        setError("");
      })
      .catch(() => {
        if (isCancelled) return;
        setError(t("courses.fetchError"));
        setQuotes([]);
      })
      .finally(() => {
        if (isCancelled) return;
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [course, isFlat, isJlptGroupRoot, languageFilter, refreshKey, t]);

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return isFlat ? (
      <FamousQuoteLoadingSkeleton />
    ) : (
      <CourseDaysLoadingSkeleton />
    );
  }

  // ── Resolved state (error / empty / success) ──────────────────────
  return (
    <PageLayout>
      {/* ── Breadcrumb navigation: Courses › [Course Label] ─────────── */}
      <CourseBreadcrumbs
        courseId={courseId}
        courseLabel={course?.label}
        parentLabel={isJlptLevel ? "JLPT" : undefined}
        parentHref={isJlptLevel ? "/courses/JLPT" : undefined}
        coursesLabel={t("courses.title")}
      />

      {/* ── Page heading ─────────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {isJlptLevel ? "JLPT" : (course?.label || courseId)}
        {!isFlat && !isJlptGroupRoot && ` — ${t("courses.days")}`}
      </Typography>

      {/* ── JLPT level chips ─────────────────────────────────────────── */}
      {isJlptGroup && (
        <Box sx={{ display: "flex", gap: 0.75, mb: 2, alignItems: "center" }}>
          {JLPT_LEVEL_COURSES.map((level) => (
            <Chip
              key={level.id}
              label={level.label}
              size="small"
              onClick={() => router.push(`/courses/${level.id}`)}
              color={courseId === level.id ? "primary" : "default"}
              variant={courseId === level.id ? "filled" : "outlined"}
              sx={{
                borderRadius: "999px",
                fontWeight: courseId === level.id ? 600 : 400,
                "& .MuiChip-label": { px: "8px", py: "6px" },
              }}
            />
          ))}
        </Box>
      )}

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {resolvedError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {resolvedError}
        </Alert>
      )}

      {/* ── Famous Quote language filter chips ───────────────────────── */}
      {isFlat && !resolvedError && (
        <Box sx={{ display: "flex", gap: 0.75, mb: 2, alignItems: "center" }}>
          {FAMOUS_QUOTE_FILTER_LANGUAGES.map((lang) => (
            <Chip
              key={lang}
              label={lang === "All" ? t("common.all") : lang}
              size="small"
              onClick={() => handleLanguageFilterChange(lang)}
              color={languageFilter === lang ? "primary" : "default"}
              variant={languageFilter === lang ? "filled" : "outlined"}
              sx={{
                borderRadius: "999px",
                fontWeight: languageFilter === lang ? 600 : 400,
                "& .MuiChip-label": { px: "8px", py: "6px" },
              }}
            />
          ))}
          {languageFilter === "None" && quotes.length > 0 && (
            <>
              <Button
                size="small"
                variant="outlined"
                disabled={filling}
                onClick={handleFillEnglish}
                sx={{ ml: 0.5, borderRadius: "999px", textTransform: "none" }}
              >
                {filling ? t("common.loading") : t("courses.fillEnglish", "Fill English")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                disabled={filling}
                onClick={handleFillJapanese}
                sx={{ borderRadius: "999px", textTransform: "none" }}
              >
                {filling ? t("common.loading") : t("courses.fillJapanese", "Fill Japanese")}
              </Button>
            </>
          )}
        </Box>
      )}

      {/* ── JLPT group root: level chips only, no day grid ───────────── */}
      {isJlptGroupRoot ? null : /* ── Flat course (FAMOUS_QUOTE): inline quote table ───────────── */
      isFlat ? (
        quotes.length === 0 && !resolvedError ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={1.5}
            sx={{
              py: 8,
              px: 3,
              borderRadius: 3,
              border: "1px dashed",
              borderColor: "divider",
              backgroundColor: "action.hover",
            }}
          >
            <InboxIcon sx={{ fontSize: 56, color: "text.disabled", opacity: 0.6 }} />
            <Stack alignItems="center" spacing={0.5}>
              <Typography variant="h6" color="text.secondary" fontWeight={600}>
                {t("courses.noData")}
              </Typography>
              <Typography variant="body2" color="text.disabled">
                {t("courses.noDataHint")}
              </Typography>
            </Stack>
          </Stack>
        ) : (
          <WordTable
            words={quotes}
            isCollocation={false}
            isFamousQuote={true}
            courseId={course.id}
            coursePath={course?.path}
          />
        )
      ) : /* ── Standard course: day-card grid ────────────────────────── */
      days.length === 0 && !resolvedError ? (
        // Empty state: no days uploaded yet for this course
        <Stack
          alignItems="center"
          justifyContent="center"
          spacing={1.5}
          sx={{
            py: 8,
            px: 3,
            borderRadius: 3,
            border: "1px dashed",
            borderColor: "divider",
            backgroundColor: "action.hover",
          }}
        >
          <InboxIcon sx={{ fontSize: 56, color: "text.disabled", opacity: 0.6 }} />
          <Stack alignItems="center" spacing={0.5}>
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              {t("courses.noData")}
            </Typography>
            <Typography variant="body2" color="text.disabled">
              {t("courses.noDataHint")}
            </Typography>
          </Stack>
        </Stack>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: dayGridTemplateColumns,
          }}
        >
          {days.map((day) => (
            // DayCard links to /courses/[courseId]/[dayId]
            <DayCard key={day.id} day={day} courseId={courseId} />
          ))}
        </Box>
      )}
    </PageLayout>
  );
}
