"use client";

/**
 * CoursesPage
 *
 * Entry point for the Courses section of the admin dashboard.
 * Renders a responsive grid of CourseCard components, one per available course.
 *
 * Data source:
 *   - `COURSES` constant (imported from @/types/course) — a static list of all
 *     supported courses (CSAT, IELTS, TOEFL, TOEIC, COLLOCATION).
 *     No async fetch is needed here; the list never changes at runtime.
 *
 * Child components:
 *   - PageLayout   — provides the shared sidebar + content wrapper
 *   - CourseCard   — renders a single course tile with its name, icon, and
 *                    a link to /courses/[courseId]
 *
 * Navigation:
 *   Clicking a CourseCard navigates to courses/[courseId]/page.tsx, where the
 *   user can browse the days available for that course.
 */

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import { COURSES } from "@/types/course";
import CourseCard from "@/components/courses/CourseCard";

export default function CoursesPage() {
  const { t } = useTranslation();

  return (
    <PageLayout>
      {/* ── Page heading ─────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("courses.title")}
      </Typography>

      {/* ── Course grid ──────────────────────────────────────────── */}
      {/*
        Each course gets a responsive grid cell:
          xs=12  → full width on mobile (stacked)
          sm=6   → two columns on tablet
          md=4   → three columns on desktop
      */}
      <Grid container spacing={3}>
        {COURSES.map((course) => (
          <Grid key={course.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <CourseCard course={course} />
          </Grid>
        ))}
      </Grid>
    </PageLayout>
  );
}
