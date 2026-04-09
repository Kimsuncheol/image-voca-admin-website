"use client";

/**
 * CourseDaysPage  —  /courses/[courseId]
 *
 * For most courses this page lists all "day" subcollections available for the
 * given course.  Each day card links to courses/[courseId]/[dayId]/page.tsx.
 *
 * ── Direct-list course exceptions ─────────────────────────────────────
 *  Some courses do not use DayN subcollections:
 *   - FAMOUS_QUOTE uses a flat collection root
 *   - JLPT prefix/postfix use a fixed single-list subcollection
 *  These courses skip the day grid and render a WordTable inline.
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
 *  success  → responsive grid of DayCard components (or inline WordTable)
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
import Button from "@mui/material/Button";
import { useTranslation } from "react-i18next";

// ── Layout & structural components ────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Course-domain types & data helpers ────────────────────────────────
import {
  getCourseById,
  isJlptCourse,
  JLPT_COUNTER_OPTIONS,
  JLPT_LEVEL_COURSES,
} from "@/types/course";
import { isSupportedImageGenerationCourseId } from "@/types/imageGeneration";
import type { Day } from "@/types/course";
import {
  FAMOUS_QUOTE_FILTER_LANGUAGES,
  type FamousQuoteFilterLanguage,
} from "@/types/famousQuote";
import type { FamousQuoteWord, Word } from "@/types/word";
import {
  getCollectionWords,
  getCourseDays,
  getSingleListWords,
  deleteDay,
} from "@/lib/firebase/firestore";
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
import CourseLoadingView from "@/components/courses/CourseLoadingView";

function SimpleEmptyState({ text }: { text: string }) {
  return (
    <Typography color="text.secondary">
      {text}
    </Typography>
  );
}

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
  const [singleListWords, setSingleListWords] = useState<Word[]>([]);
  const [collectionSections, setCollectionSections] = useState<
    Array<{ id: string; label: string; path: string; words: Word[] }>
  >([]);
  const [selectedCounterSectionId, setSelectedCounterSectionId] = useState("");
  const [languageFilter, setLanguageFilter] =
    useState<FamousQuoteFilterLanguage>("All");
  const [refreshKey, setRefreshKey] = useState(0);
  const [filling, setFilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Resolve course metadata from static list ──────────────────────
  const course = getCourseById(courseId);
  const storageMode = course?.storageMode ?? "day";
  const isFlat = storageMode === "flat";
  const isSingleList = storageMode === "singleList";
  const isCollection = storageMode === "collection";
  const isJlptCounterCourse = courseId === "JLPT_COUNTER";
  const isDirectList = isFlat || isSingleList || isCollection;
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
    if (!course || isJlptGroupRoot || isDirectList) return;

    getCourseDays(course.path)
      .then((data) => {
        console.log("Fetched course days:", data);
        setDays(data);
        setError("");
      })
      .catch(() => setError(t("courses.fetchError")))
      .finally(() => setLoading(false));
  }, [course, isDirectList, isJlptGroupRoot, t]);

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

  useEffect(() => {
    if (!course || isJlptGroupRoot || !isSingleList) return;

    let isCancelled = false;

    getSingleListWords(course.id, course.path)
      .then((data) => {
        if (isCancelled) return;
        setSingleListWords(data);
        setError("");
      })
      .catch(() => {
        if (isCancelled) return;
        setError(t("courses.fetchError"));
        setSingleListWords([]);
      })
      .finally(() => {
        if (isCancelled) return;
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [course, isJlptGroupRoot, isSingleList, t]);

  useEffect(() => {
    if (!course || isJlptGroupRoot || !isCollection) return;

    let isCancelled = false;

    Promise.all(
      JLPT_COUNTER_OPTIONS.filter((option) => Boolean(option.path)).map(async (option) => ({
        id: option.id,
        label: option.label,
        path: option.path,
        words: await getCollectionWords(option.path),
      })),
    )
      .then((sections) => {
        if (isCancelled) return;
        setCollectionSections(
          sections.filter((section) => section.words.length > 0),
        );
        setError("");
      })
      .catch(() => {
        if (isCancelled) return;
        setError(t("courses.fetchError"));
        setCollectionSections([]);
      })
      .finally(() => {
        if (isCancelled) return;
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [course, isCollection, isJlptGroupRoot, t]);

  useEffect(() => {
    if (!isJlptCounterCourse) return;

    if (collectionSections.length === 0) {
      setSelectedCounterSectionId("");
      return;
    }

    setSelectedCounterSectionId((current) =>
      collectionSections.some((section) => section.id === current)
        ? current
        : collectionSections[0]?.id ?? "",
    );
  }, [collectionSections, isJlptCounterCourse]);

  // ── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return isFlat ? (
      <FamousQuoteLoadingSkeleton />
    ) : isSingleList ? (
      <CourseLoadingView />
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
        {!isDirectList && !isJlptGroupRoot && ` — ${t("courses.days")}`}
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

      {isJlptCounterCourse && collectionSections.length > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            mb: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {collectionSections.map((section) => (
            <Chip
              key={section.id}
              label={section.label}
              size="small"
              clickable
              onClick={() => setSelectedCounterSectionId(section.id)}
              color={selectedCounterSectionId === section.id ? "primary" : "default"}
              variant={selectedCounterSectionId === section.id ? "filled" : "outlined"}
              sx={{
                borderRadius: "999px",
                fontWeight: selectedCounterSectionId === section.id ? 600 : 400,
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
      isFlat && course ? (
        quotes.length === 0 && !resolvedError ? (
          <SimpleEmptyState text={t("courses.noData")} />
        ) : (
          <WordTable
            words={quotes}
            isCollocation={false}
            isFamousQuote={true}
            courseId={course.id}
            coursePath={course?.path}
          />
        )
      ) : isSingleList && course ? (
        singleListWords.length === 0 && !resolvedError ? (
          <SimpleEmptyState text={t("courses.noData")} />
        ) : (
          <WordTable
            words={singleListWords}
            isCollocation={false}
            isIdiom={course?.schema === "idiom"}
            isJlpt={course?.schema === "jlpt"}
            isPrefix={course?.schema === "prefix"}
            isPostfix={course?.schema === "postfix"}
            showImageUrl={isSupportedImageGenerationCourseId(course.id)}
            courseId={course.id}
            coursePath={course.path}
          />
        )
      ) : isCollection && course ? (
        collectionSections.length === 0 && !resolvedError ? (
          <SimpleEmptyState text={t("courses.noData")} />
        ) : (
          <Box sx={{ display: "grid", gap: 3 }}>
            {collectionSections
              .filter((section) => section.id === selectedCounterSectionId)
              .map((section) => (
              <Box key={section.id} id={section.id}>
                <WordTable
                  words={section.words}
                  isCollocation={false}
                  isJlpt={course?.schema === "jlpt"}
                  showImageUrl={isSupportedImageGenerationCourseId(course.id)}
                  courseId={course.id}
                  coursePath={section.path}
                  rowIdPrefix={`${section.id}-`}
                />
              </Box>
            ))}
          </Box>
        )
      ) : /* ── Standard course: day-card grid ────────────────────────── */
      days.length === 0 && !resolvedError ? (
        <SimpleEmptyState text={t("courses.noData")} />
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: dayGridTemplateColumns,
          }}
        >
          {days.map((day) => (
            <DayCard
              key={day.id}
              day={day}
              courseId={courseId}
              onRemove={async () => {
                if (
                  !course ||
                  !window.confirm(`Delete all words in "${day.name}"?`)
                )
                  return;
                await deleteDay(course.path, day.id);
                setDays((prev) => prev.filter((d) => d.id !== day.id));
              }}
              onUpdate={() =>
                router.push(
                  `/add-voca?course=${courseId}&dayName=${encodeURIComponent(day.name)}`,
                )
              }
            />
          ))}
        </Box>
      )}
    </PageLayout>
  );
}
