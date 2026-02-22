"use client";

import { useState, useEffect, use } from "react";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
// import Link from "@mui/material/Link";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import PageLayout from "@/components/layout/PageLayout";
import { getCourseById } from "@/types/course";
import type { Word } from "@/types/word";
import { getDayWords } from "@/lib/firebase/firestore";
import WordTable from "@/components/courses/WordTable";

export default function DayWordsPage({
  params,
}: {
  params: Promise<{ courseId: string; dayId: string }>;
}) {
  const { courseId, dayId } = use(params);
  const { t } = useTranslation();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const course = getCourseById(courseId);
  const isCollocation = courseId === "COLLOCATIONS";

  useEffect(() => {
    if (!course) {
      setError("Course not found");
      setLoading(false);
      return;
    }

    getDayWords(course.path, dayId)
      .then((data) => {
        console.log("Fetched day words:", data);
        setWords(data);
      })
      .catch(() => setError(t("courses.fetchError")))
      .finally(() => setLoading(false));
  }, [course, dayId, t]);

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
        <Link
          href={`/courses/${courseId}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {course?.label || courseId}
        </Link>
        <Typography color="text.primary">{dayId}</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("courses.words")}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {words.length === 0 && !error ? (
        <Typography color="text.secondary">{t("courses.noData")}</Typography>
      ) : (
        <WordTable words={words} isCollocation={isCollocation} />
      )}
    </PageLayout>
  );
}
