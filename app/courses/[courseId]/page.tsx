"use client";

/**
 * CourseDaysPage  —  /courses/[courseId]
 *
 * Lists all "day" subcollections available for a given course.
 * Each day card links to courses/[courseId]/[dayId]/page.tsx.
 *
 * ── Data flow ────────────────────────────────────────────────────────
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
 *  success  → responsive grid of DayCard components
 *
 * ── Shared components used ───────────────────────────────────────────
 *  CourseDaysLoadingSkeleton — responsive day-grid skeleton inside PageLayout
 *  CourseBreadcrumbs  — Courses › [Course Label]
 *  DayCard            — single tile showing day ID and link to /[dayId]
 */

import { useState, useEffect, use } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import { useTranslation } from "react-i18next";

// ── Layout & structural components ────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Course-domain types & data helpers ────────────────────────────────
import { getCourseById } from "@/types/course";
import type { Day } from "@/types/course";
import { getCourseDays } from "@/lib/firebase/firestore";

// ── Feature-specific components ───────────────────────────────────────
import DayCard from "@/components/courses/DayCard";
import CourseDaysLoadingSkeleton from "@/components/courses/CourseDaysLoadingSkeleton";
import CourseBreadcrumbs from "@/components/courses/CourseBreadcrumbs";
import { dayGridTemplateColumns } from "@/components/courses/dayGridConfig";

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

  // ── Local state ───────────────────────────────────────────────────
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Resolve course metadata from static list ──────────────────────
  // Returns undefined when the courseId doesn't match any known course.
  const course = getCourseById(courseId);
  const isLoading = course ? loading : false;
  const resolvedError = course ? error : "Course not found";

  // ── Firestore data fetch ──────────────────────────────────────────
  useEffect(() => {
    if (!course) return;

    getCourseDays(course.path)
      .then((data) => {
        console.log("Fetched course days:", data);
        setDays(data);
      })
      .catch(() => setError(t("courses.fetchError")))
      .finally(() => setLoading(false));
  }, [course, t]);

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return <CourseDaysLoadingSkeleton />;
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
        {course?.label || courseId} — {t("courses.days")}
      </Typography>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {resolvedError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {resolvedError}
        </Alert>
      )}

      {/* ── Day cards grid ───────────────────────────────────────────── */}
      {days.length === 0 && !resolvedError ? (
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
