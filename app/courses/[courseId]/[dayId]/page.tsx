"use client";

/**
 * DayWordsPage  —  /courses/[courseId]/[dayId]
 *
 * Displays all vocabulary words (or collocations) uploaded for a specific day
 * within a course.
 *
 * ── Data flow ────────────────────────────────────────────────────────
 *  1. `courseId` and `dayId` are extracted from the async Next.js params.
 *  2. `getCourseById` resolves the static course metadata (path, label).
 *  3. `getDayWords(course.path, dayId)` fetches the word documents from
 *     Firestore and stores them in local state.
 *
 * ── Collocation mode ─────────────────────────────────────────────────
 *  When courseId === "COLLOCATIONS", `isCollocation` is set to true.
 *  WordTable uses this flag to render collocation-specific columns
 *  (collocation phrase, meaning, explanation) instead of standard
 *  vocabulary columns (word, pronunciation, meaning, example).
 *
 * ── States ───────────────────────────────────────────────────────────
 *  loading  → CourseLoadingView (spinner)
 *  error    → MUI Alert with translated error message
 *  empty    → translated "no data" text
 *  success  → WordTable component
 *
 * ── Shared components used ───────────────────────────────────────────
 *  CourseLoadingView  — centered spinner inside PageLayout
 *  CourseBreadcrumbs  — Courses › [Course Label] › [Day ID]
 *  WordTable          — sortable data table for word / collocation rows
 */

import { useState, useEffect, use } from "react";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { useTranslation } from "react-i18next";

// ── Layout ────────────────────────────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Course-domain types & data helpers ────────────────────────────────
import { getCourseById } from "@/types/course";
import { isSupportedImageGenerationCourseId } from "@/types/imageGeneration";
import type { Word } from "@/types/word";
import { getDayWords } from "@/lib/firebase/firestore";

// ── Feature-specific components ───────────────────────────────────────
import WordTable from "@/components/courses/WordTable";
import CourseLoadingView from "@/components/courses/CourseLoadingView";
import CourseBreadcrumbs from "@/components/courses/CourseBreadcrumbs";

export default function DayWordsPage({
  params,
}: {
  params: Promise<{ courseId: string; dayId: string }>;
}) {
  // ── Route param extraction ─────────────────────────────────────────
  const { courseId, dayId } = use(params);

  const { t } = useTranslation();

  // ── Local state ───────────────────────────────────────────────────
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Resolve course metadata from static list ──────────────────────
  // This is a synchronous lookup — no effect needed to detect a missing course.
  const course = getCourseById(courseId);

  // ── Course type detection ─────────────────────────────────────────
  // WordTable switches its column layout based on these flags.
  const isCollocation = courseId === "COLLOCATIONS";
  const isFamousQuote = courseId === "FAMOUS_QUOTE";

  // ── Firestore data fetch ──────────────────────────────────────────
  // The effect only runs when `course` is resolved; the missing-course case
  // is handled synchronously in the render path below, avoiding cascading
  // renders caused by calling setState directly inside an effect body.
  useEffect(() => {
    if (!course) return; // guard — render path below shows the error

    getDayWords(course.path, dayId)
      .then((data) => {
        console.log("Fetched day words:", data);
        setWords(data);
      })
      .catch(() => setError(t("courses.fetchError")))
      .finally(() => setLoading(false));
  }, [course, dayId, t]);

  // ── Missing course (synchronous guard) ───────────────────────────
  // Handled here (not in the effect) to avoid synchronous setState in effects.
  if (!course) {
    return (
      <PageLayout>
        <Alert severity="error">{"Course not found"}</Alert>
      </PageLayout>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return <CourseLoadingView />;
  }

  // ── Resolved state ────────────────────────────────────────────────
  return (
    <PageLayout>
      {/* ── Breadcrumb navigation: Courses › [Course] › [Day] ───────── */}
      <CourseBreadcrumbs
        courseId={courseId}
        courseLabel={course?.label}
        dayId={dayId}
        coursesLabel={t("courses.title")}
      />

      {/* ── Page heading ─────────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("courses.words")}
      </Typography>

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── Word table / empty state ──────────────────────────────────── */}
      {words.length === 0 && !error ? (
        // Empty state: no words have been uploaded for this day yet
        <Typography color="text.secondary">{t("courses.noData")}</Typography>
      ) : (
        // WordTable renders differently depending on isCollocation:
        //   false → standard columns: word, pronunciation, meaning, example
        //   true  → collocation columns: phrase, meaning, explanation, example
        <WordTable
          words={words}
          isCollocation={isCollocation}
          isFamousQuote={isFamousQuote}
          showImageUrl={isSupportedImageGenerationCourseId(courseId)}
          courseId={courseId}
          coursePath={course.path}
          dayId={dayId}
          onWordImageUpdated={(wordId, imageUrl) =>
            setWords((prev) =>
              prev.map((w) => (w.id === wordId ? { ...w, imageUrl } : w)),
            )
          }
        />
      )}
    </PageLayout>
  );
}
