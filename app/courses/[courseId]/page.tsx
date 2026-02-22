"use client";

import { useState, useEffect, use } from "react";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import { getCourseById } from "@/types/course";
import type { Day } from "@/types/course";
import { getCourseDays } from "@/lib/firebase/firestore";
import DayCard from "@/components/courses/DayCard";

export default function CourseDaysPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const { t } = useTranslation();
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const course = getCourseById(courseId);

  useEffect(() => {
    if (!course) {
      setError("Course not found");
      setLoading(false);
      return;
    }

    getCourseDays(course.path)
      .then((data) => {
        console.log("Fetched course days:", data);
        setDays(data);
      })
      .catch(() => setError(t("courses.fetchError")))
      .finally(() => setLoading(false));
  }, [course, t]);

  if (loading) {
    return (
      <PageLayout>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          href="/courses"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {t("courses.title")}
        </Link>
        <Typography color="text.primary">
          {course?.label || courseId}
        </Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom fontWeight={600}>
        {course?.label || courseId} — {t("courses.days")}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {days.length === 0 && !error ? (
        <Typography color="text.secondary">{t("courses.noData")}</Typography>
      ) : (
        <Grid container spacing={2}>
          {days.map((day) => (
            <Grid key={day.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <DayCard day={day} courseId={courseId} />
            </Grid>
          ))}
        </Grid>
      )}
    </PageLayout>
  );
}
