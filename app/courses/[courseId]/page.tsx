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
 *  WordTable of quotes inline, using `getFamousQuotes`.
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
import { useRouter } from "next/navigation";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import { useTranslation } from "react-i18next";

// ── Layout & structural components ────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Course-domain types & data helpers ────────────────────────────────
import { getCourseById, JLPT_LEVEL_COURSES, isJlptCourse } from "@/types/course";
import type { Day } from "@/types/course";
import type { FamousQuoteWord } from "@/types/word";
import { getCourseDays, getFamousQuotes } from "@/lib/firebase/firestore";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Resolve course metadata from static list ──────────────────────
  const course = getCourseById(courseId);
  const isFlat = course?.flat === true;
  const isJlptGroup = isJlptCourse(courseId);
  const isJlptLevel = JLPT_LEVEL_COURSES.some((l) => l.id === courseId);
  // Generic /courses/JLPT page — show level chips only, no day fetch
  const isJlptGroupRoot = isJlptGroup && !isJlptLevel;
  const isLoading = course && !isJlptGroupRoot ? loading : false;
  const resolvedError = course ? error : "Course not found";

  // ── Firestore data fetch ──────────────────────────────────────────
  useEffect(() => {
    if (!course || isJlptGroupRoot) {
      setLoading(false);
      return;
    }

    if (isFlat) {
      // ── Flat course: fetch quotes directly from the collection root ──
      getFamousQuotes(course.path)
        .then((data) => {
          console.log("Fetched famous quotes:", data);
          setQuotes(data);
        })
        .catch(() => setError(t("courses.fetchError")))
        .finally(() => setLoading(false));
    } else {
      // ── Standard course: derive day list from totalDays counter ──────
      getCourseDays(course.path)
        .then((data) => {
          console.log("Fetched course days:", data);
          setDays(data);
        })
        .catch(() => setError(t("courses.fetchError")))
        .finally(() => setLoading(false));
    }
  }, [course, isFlat, isJlptGroupRoot, t]);

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
                "& .MuiChip-label": { px: "4px", py: "2px" },
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

      {/* ── JLPT group root: level chips only, no day grid ───────────── */}
      {isJlptGroupRoot ? null : /* ── Flat course (FAMOUS_QUOTE): inline quote table ───────────── */
      isFlat ? (
        quotes.length === 0 && !resolvedError ? (
          <Typography color="text.secondary">{t("courses.noData")}</Typography>
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
        <Typography color="text.secondary">{t("courses.noData")}</Typography>
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
