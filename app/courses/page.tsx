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

import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import MangaNoAiUploadModal from "@/components/manga/MangaNoAiUploadModal";
import { COURSES } from "@/types/course";
import CourseCard from "@/components/courses/CourseCard";

export default function CoursesPage() {
  const { t } = useTranslation();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  return (
    <PageLayout>
      {/* ── Page heading ─────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("courses.title")}
      </Typography>

      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#fff",
          background:
            "radial-gradient(circle at top, rgba(94,129,255,0.18), transparent 42%), linear-gradient(135deg, #0c111b 0%, #141c2a 100%)",
          boxShadow: "0 18px 46px rgba(7, 12, 24, 0.28)",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          gap: 2,
          alignItems: { xs: "flex-start", md: "center" },
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.55)",
              mb: 0.75,
            }}
          >
            Studio
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.75 }}>
            {t("manga.noAiUploadCoursesHeading", "Upload manga without AI")}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.72)", maxWidth: 560 }}>
            {t(
              "manga.noAiUploadCoursesBody",
              "Prepare a manual manga image batch with course chips, a Day field, and compact previews before backend wiring lands.",
            )}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<UploadFileOutlinedIcon />}
          onClick={() => setUploadModalOpen(true)}
          sx={{
            minWidth: 220,
            height: 48,
            borderRadius: "999px",
            px: 2.5,
            fontWeight: 700,
            color: "#fff",
            background: "linear-gradient(135deg, #4a7ae4 0%, #7ea2ff 100%)",
            boxShadow: "0 14px 32px rgba(59, 101, 210, 0.35)",
            "&:hover": {
              background: "linear-gradient(135deg, #5a87ec 0%, #8aacff 100%)",
            },
          }}
        >
          {t("manga.noAiUploadTrigger", "Upload manga (no AI)")}
        </Button>
      </Box>

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
      <MangaNoAiUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </PageLayout>
  );
}
