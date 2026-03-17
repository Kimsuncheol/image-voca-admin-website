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

import { useState, useEffect, use, useCallback, useMemo } from "react";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { useTranslation } from "react-i18next";

// ── Layout ────────────────────────────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Course-domain types & data helpers ────────────────────────────────
import { getCourseById } from "@/types/course";
import {
  isSupportedImageGenerationCourseId,
  type GenerateImagesSuccessResponse,
} from "@/types/imageGeneration";
import type { Word } from "@/types/word";
import { getDayWords, updateWordField, updateWordImageUrl } from "@/lib/firebase/firestore";
import {
  createCourseDayGenerateWordFieldRequest,
  createCourseDayImageGenerationWords,
  extractCourseDayGenerateWordFieldUpdates,
  isCourseDayBulkGeneratableField,
  mapCourseDayGeneratedImages,
  planCourseDayBulkGeneration,
  type CourseDayBulkGeneratableField,
  type CourseDayBulkSkippedItem,
} from "@/lib/courseDayBulkGeneration";
import {
  adaptCourseWordToWordFinderResult,
  applyCourseWordResolvedUpdates,
  isCourseWordFieldMissing,
} from "@/lib/wordFinderCourseAdapter";
import { useAdminAIAccess } from "@/lib/hooks/useAdminAccess";
import { formatPersistedPronunciation, getIpaUSUKBatch } from "@/lib/utils/ipaLookup";
import type { CourseDayMissingField } from "@/types/courseDayMissingField";
import type { WordFinderResult, WordFinderResultFieldUpdates } from "@/types/wordFinder";

// ── Feature-specific components ───────────────────────────────────────
import WordTable from "@/components/courses/WordTable";
import CourseLoadingView from "@/components/courses/CourseLoadingView";
import CourseBreadcrumbs from "@/components/courses/CourseBreadcrumbs";

interface BulkFeedback {
  severity: "success" | "warning" | "error";
  message: string;
}

function getMissingFieldOptions(
  isCollocation: boolean,
  showImageUrl: boolean,
  t: (key: string, options?: Record<string, unknown>) => string,
): Array<{ value: CourseDayMissingField; label: string }> {
  const primaryTextLabel = isCollocation
    ? t("courses.missingCollocation")
    : t("courses.missingWord");
  const options: Array<{ value: CourseDayMissingField; label: string }> = [
    { value: "all", label: t("courses.missingAll") },
    { value: "primaryText", label: primaryTextLabel },
    { value: "meaning", label: t("courses.missingMeaning") },
  ];

  if (!isCollocation) {
    options.push({
      value: "pronunciation",
      label: t("courses.missingPronunciation"),
    });
  }

  options.push(
    { value: "example", label: t("courses.missingExample") },
    { value: "translation", label: t("courses.missingTranslation") },
  );

  if (showImageUrl) {
    options.push({ value: "image", label: t("courses.missingImage") });
  }

  return options;
}

function getBulkActionLabel(
  field: CourseDayBulkGeneratableField,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (field) {
    case "pronunciation":
      return t("courses.generateMissingPronunciations");
    case "example":
      return t("courses.generateMissingExamples");
    case "translation":
      return t("courses.generateMissingTranslations");
    case "image":
      return t("courses.generateMissingImages");
    default:
      return t("words.generateAction");
  }
}

function getBulkDisabledReason(
  field: CourseDayBulkGeneratableField | null,
  options: {
    aiAccessLoading: boolean;
    imageGenerationBlockedByPermissions: boolean;
    imageGenerationBlockedBySettings: boolean;
    exampleTranslationBlockedByPermissions: boolean;
    exampleTranslationBlockedBySettings: boolean;
    showImageUrl: boolean;
  },
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  if (!field) return null;

  if (field === "pronunciation") {
    return null;
  }

  if (options.aiAccessLoading) {
    return t("common.loading");
  }

  if (field === "image") {
    if (!options.showImageUrl) {
      return t("addVoca.generateImagesUnsupported");
    }
    if (options.imageGenerationBlockedBySettings) {
      return t("courses.imageGenerationDisabled");
    }
    if (options.imageGenerationBlockedByPermissions) {
      return t("courses.imageGenerationPermissionDenied");
    }
    return null;
  }

  if (options.exampleTranslationBlockedBySettings) {
    return t("courses.enrichGenerationDisabled");
  }
  if (options.exampleTranslationBlockedByPermissions) {
    return t("courses.enrichGenerationPermissionDenied");
  }
  return null;
}

function formatBulkSummary(
  t: (key: string, options?: Record<string, unknown>) => string,
  counts: {
    updated: number;
    skipped: CourseDayBulkSkippedItem[];
    failed: number;
  },
): BulkFeedback {
  const { updated, skipped, failed } = counts;
  const skippedByReason = skipped.reduce(
    (acc, item) => {
      acc[item.reason] += 1;
      return acc;
    },
    { missingMeaning: 0, multiWord: 0 },
  );

  const details: string[] = [];
  if (skippedByReason.missingMeaning > 0) {
    details.push(
      t("courses.bulkGenerateSkippedMissingMeaning", {
        count: skippedByReason.missingMeaning,
      }),
    );
  }
  if (skippedByReason.multiWord > 0) {
    details.push(
      t("courses.bulkGenerateSkippedMultiWord", {
        count: skippedByReason.multiWord,
      }),
    );
  }
  if (failed > 0) {
    details.push(t("courses.bulkGenerateFailedCount", { count: failed }));
  }

  return {
    severity: skipped.length > 0 || failed > 0 ? "warning" : "success",
    message: [
      t("courses.bulkGenerateSummary", {
        updated,
        skipped: skipped.length,
        failed,
      }),
      details.length > 0
        ? t("courses.bulkGenerateSummaryDetails", {
            details: details.join(", "),
          })
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export default function DayWordsPage({
  params,
}: {
  params: Promise<{ courseId: string; dayId: string }>;
}) {
  // ── Route param extraction ─────────────────────────────────────────
  const { courseId, dayId } = use(params);

  const { t } = useTranslation();
  const {
    loading: aiAccessLoading,
    settings,
    imageGenerationBlockedByPermissions,
    imageGenerationBlockedBySettings,
    exampleTranslationBlockedByPermissions,
    exampleTranslationBlockedBySettings,
  } = useAdminAIAccess();

  // ── Local state ───────────────────────────────────────────────────
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missingField, setMissingField] = useState<CourseDayMissingField>("all");
  const [bulkLoadingField, setBulkLoadingField] =
    useState<CourseDayBulkGeneratableField | null>(null);
  const [bulkFeedback, setBulkFeedback] = useState<BulkFeedback | null>(null);

  // ── Resolve course metadata from static list ──────────────────────
  // This is a synchronous lookup — no effect needed to detect a missing course.
  const course = getCourseById(courseId);

  // ── Course type detection ─────────────────────────────────────────
  // WordTable switches its column layout based on these flags.
  const isCollocation = course?.schema === "collocation";
  const isJlpt = course?.schema === "jlpt";
  const isFamousQuote = course?.schema === "famousQuote";
  const showImageUrl = isSupportedImageGenerationCourseId(courseId);

  const missingFieldOptions = useMemo(
    () => getMissingFieldOptions(isCollocation, showImageUrl, t),
    [isCollocation, showImageUrl, t],
  );

  const filteredWords = useMemo(
    () =>
      words.filter((word) =>
        missingField === "all"
          ? true
          : isCourseWordFieldMissing(
              word,
              { isCollocation, isJlpt, isFamousQuote, showImageUrl },
              missingField,
            ),
      ),
    [isCollocation, isJlpt, isFamousQuote, missingField, showImageUrl, words],
  );

  const filteredResults = useMemo(
    () =>
      course
        ? filteredWords.map((word) =>
            adaptCourseWordToWordFinderResult({
              word,
              courseId: course.id,
              courseLabel: course.label,
              coursePath: course.path,
              dayId,
              isCollocation,
              isJlpt,
              isFamousQuote,
            }),
          )
        : [],
    [
      course,
      dayId,
      filteredWords,
      isCollocation,
      isJlpt,
      isFamousQuote,
    ],
  );

  const bulkField =
    isCourseDayBulkGeneratableField(missingField) &&
    (!isJlpt || missingField === "pronunciation" || missingField === "image")
      ? missingField
      : null;

  const bulkDisabledReason = useMemo(
    () =>
      getBulkDisabledReason(
        bulkField,
        {
          aiAccessLoading,
          imageGenerationBlockedByPermissions,
          imageGenerationBlockedBySettings,
          exampleTranslationBlockedByPermissions,
          exampleTranslationBlockedBySettings,
          showImageUrl,
        },
        t,
      ),
    [
      aiAccessLoading,
      bulkField,
      exampleTranslationBlockedByPermissions,
      exampleTranslationBlockedBySettings,
      imageGenerationBlockedByPermissions,
      imageGenerationBlockedBySettings,
      showImageUrl,
      t,
    ],
  );

  const applyResolvedUpdatesToState = useCallback(
    (wordId: string, updates: WordFinderResultFieldUpdates) => {
      setWords((prev) =>
        prev.map((word) =>
          word.id === wordId
            ? { ...word, ...applyCourseWordResolvedUpdates(word, updates) }
            : word,
        ),
      );
    },
    [],
  );

  const persistResolvedUpdates = useCallback(
    async (result: WordFinderResult, updates: WordFinderResultFieldUpdates) => {
      const tasks: Promise<void>[] = [];

      if (typeof updates.pronunciation === "string" && result.dayId) {
        tasks.push(
          updateWordField(
            result.coursePath,
            result.dayId,
            result.id,
            "pronunciation",
            updates.pronunciation,
          ),
        );
      }
      if (
        typeof updates.pronunciationRoman === "string" &&
        result.dayId
      ) {
        tasks.push(
          updateWordField(
            result.coursePath,
            result.dayId,
            result.id,
            "pronunciationRoman",
            updates.pronunciationRoman,
          ),
        );
      }
      if (typeof updates.example === "string" && result.dayId) {
        tasks.push(
          updateWordField(
            result.coursePath,
            result.dayId,
            result.id,
            "example",
            updates.example,
          ),
        );
      }
      if (typeof updates.exampleRoman === "string" && result.dayId) {
        tasks.push(
          updateWordField(
            result.coursePath,
            result.dayId,
            result.id,
            "exampleRoman",
            updates.exampleRoman,
          ),
        );
      }
      if (typeof updates.translation === "string" && result.dayId) {
        tasks.push(
          updateWordField(
            result.coursePath,
            result.dayId,
            result.id,
            "translation",
            updates.translation,
          ),
        );
      }
      if (
        typeof updates.translationEnglish === "string" &&
        result.dayId
      ) {
        tasks.push(
          updateWordField(
            result.coursePath,
            result.dayId,
            result.id,
            "translationEnglish",
            updates.translationEnglish,
          ),
        );
      }
      if (
        typeof updates.translationKorean === "string" &&
        result.dayId
      ) {
        tasks.push(
          updateWordField(
            result.coursePath,
            result.dayId,
            result.id,
            "translationKorean",
            updates.translationKorean,
          ),
        );
      }
      if (typeof updates.imageUrl === "string" && result.dayId) {
        tasks.push(
          updateWordImageUrl(
            result.coursePath,
            result.dayId,
            result.id,
            updates.imageUrl,
          ),
        );
      }

      await Promise.all(tasks);
    },
    [],
  );

  const handleBulkGenerate = useCallback(async () => {
    if (!bulkField || bulkDisabledReason || bulkLoadingField) return;

    const snapshot = filteredResults;
    const { eligible, skipped } = planCourseDayBulkGeneration(snapshot, bulkField);

    if (eligible.length === 0) {
      setBulkFeedback({
        severity: "warning",
        message: t("courses.bulkGenerateNoEligible"),
      });
      return;
    }

    setBulkLoadingField(bulkField);
    setBulkFeedback(null);

    let updated = 0;
    let failed = 0;

    try {
      if (bulkField === "image") {
        const response = await fetch("/api/admin/generate-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            words: createCourseDayImageGenerationWords(eligible),
          }),
        });
        const payload = (await response.json()) as
          | GenerateImagesSuccessResponse
          | { error?: string };

        if (!response.ok || !("words" in payload)) {
          throw new Error(
            ("error" in payload ? payload.error : undefined) ||
              t("words.generateActionError"),
          );
        }

        const mapped = mapCourseDayGeneratedImages(eligible, payload);
        failed += mapped.failures.length;

        for (const item of mapped.updates) {
          try {
            await persistResolvedUpdates(item.result, { imageUrl: item.imageUrl });
            applyResolvedUpdatesToState(item.result.id, { imageUrl: item.imageUrl });
            updated += 1;
          } catch {
            failed += 1;
          }
        }
      } else if (bulkField === "pronunciation") {
        if (isJlpt) {
          const response = await fetch("/api/admin/jlpt-pronunciation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              words: eligible.map((result) => result.primaryText),
            }),
          });
          const payload = (await response.json()) as {
            error?: string;
            items?: Array<{
              word: string;
              pronunciation: string;
              pronunciationRoman: string;
            }>;
          };

          if (!response.ok) {
            throw new Error(payload.error || t("words.generateActionError"));
          }

          const pronunciationMap = new Map(
            (payload.items ?? []).map((item) => [
              item.word,
              {
                pronunciation: item.pronunciation,
                pronunciationRoman: item.pronunciationRoman,
              },
            ]),
          );

          await Promise.all(
            eligible.map(async (result) => {
              try {
                const pronunciation = pronunciationMap.get(result.primaryText);
                if (!pronunciation) {
                  failed += 1;
                  return;
                }

                await persistResolvedUpdates(result, pronunciation);
                applyResolvedUpdatesToState(result.id, pronunciation);
                updated += 1;
              } catch {
                failed += 1;
              }
            }),
          );
        } else {
          const ipaMap = await getIpaUSUKBatch(
            eligible.map((r) => r.primaryText),
            settings,
          );
          await Promise.all(
            eligible.map(async (result) => {
              try {
                const ipa = ipaMap.get(result.primaryText);
                if (!ipa) {
                  failed += 1;
                  return;
                }
                const pronunciation = formatPersistedPronunciation(ipa);
                await persistResolvedUpdates(result, { pronunciation });
                applyResolvedUpdatesToState(result.id, { pronunciation });
                updated += 1;
              } catch {
                failed += 1;
              }
            }),
          );
        }
      } else {
        for (const result of eligible) {
          const requestBody = createCourseDayGenerateWordFieldRequest(
            result,
            bulkField,
          );

          if (!requestBody) {
            failed += 1;
            continue;
          }

          try {
            const response = await fetch("/api/admin/generate-word-field", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(requestBody),
            });
            const payload = (await response.json()) as {
              error?: string;
              example?: string;
              translation?: string;
            };

            if (!response.ok) {
              throw new Error(payload.error || t("words.generateActionError"));
            }

            const updates = extractCourseDayGenerateWordFieldUpdates(
              bulkField,
              payload,
            );
            if (!updates) {
              failed += 1;
              continue;
            }

            await persistResolvedUpdates(result, updates);
            applyResolvedUpdatesToState(result.id, updates);
            updated += 1;
          } catch {
            failed += 1;
          }
        }
      }

      setBulkFeedback(formatBulkSummary(t, { updated, skipped, failed }));
    } catch (bulkError) {
      setBulkFeedback({
        severity: "error",
        message:
          bulkError instanceof Error
            ? bulkError.message
            : t("words.generateActionError"),
      });
    } finally {
      setBulkLoadingField(null);
    }
  }, [
    applyResolvedUpdatesToState,
    bulkDisabledReason,
    bulkField,
    bulkLoadingField,
    courseId,
    filteredResults,
    persistResolvedUpdates,
    settings,
    t,
  ]);

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

      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {t("courses.missingFilter")}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {missingFieldOptions.map((option) => {
              const selected = missingField === option.value;

              return (
                <Chip
                  key={option.value}
                  label={option.label}
                  clickable={!selected}
                  color={selected ? "primary" : "default"}
                  variant={selected ? "filled" : "outlined"}
                  onClick={() => {
                    if (selected) return;
                    setMissingField(option.value as CourseDayMissingField);
                    setBulkFeedback(null);
                  }}
                />
              );
            })}
          </Stack>
        </Stack>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          justifyContent="flex-start"
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <Button
            onClick={() => {
              setMissingField("all");
              setBulkFeedback(null);
            }}
            sx={{ borderRadius: "20px" }}
            disabled={missingField === "all" || Boolean(bulkLoadingField)}
          >
            {t("words.clearFilters")}
          </Button>

          {bulkField && (
            <Button
              variant="contained"
              onClick={() => {
                void handleBulkGenerate();
              }}
              sx={{ borderRadius: "20px" }}
              disabled={
                Boolean(bulkLoadingField) ||
                Boolean(bulkDisabledReason) ||
                filteredResults.length === 0
              }
              startIcon={
                bulkLoadingField === bulkField ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              <Stack alignItems="flex-start" spacing={0}>
                <span>{getBulkActionLabel(bulkField, t)}</span>
                {bulkField === "pronunciation" && !bulkDisabledReason && (
                  <Typography component="span" sx={{ fontSize: "0.65rem", opacity: 0.8, lineHeight: 1.2 }}>
                    {isJlpt
                      ? "JMdict"
                      : settings.pronunciationApi === "oxford"
                      ? t("settings.pronunciationApiOxford")
                      : t("settings.pronunciationApiFreeDictionary")}
                  </Typography>
                )}
              </Stack>
            </Button>
          )}
        </Stack>
      </Stack>

      {bulkField && bulkDisabledReason && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {bulkDisabledReason}
        </Alert>
      )}

      {/* ── Error banner ─────────────────────────────────────────────── */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {bulkFeedback && (
        <Alert severity={bulkFeedback.severity} sx={{ mb: 2 }}>
          {bulkFeedback.message}
        </Alert>
      )}

      {/* ── Word table / empty state ──────────────────────────────────── */}
      {filteredWords.length === 0 && !error ? (
        // Empty state: no words have been uploaded for this day yet
        <Typography color="text.secondary">{t("courses.noData")}</Typography>
      ) : (
        // WordTable renders differently depending on isCollocation:
        //   false → standard columns: word, pronunciation, meaning, example
        //   true  → collocation columns: phrase, meaning, explanation, example
        <WordTable
          words={filteredWords}
      isCollocation={isCollocation}
      isJlpt={isJlpt}
      isFamousQuote={isFamousQuote}
      showImageUrl={showImageUrl}
      courseId={course.id}
      coursePath={course.path}
      dayId={dayId}
          onWordImageUpdated={(wordId, imageUrl) =>
            setWords((prev) =>
              prev.map((w) => (w.id === wordId ? { ...w, imageUrl } : w)),
            )
          }
          onWordFieldsUpdated={(wordId, fields) =>
            setWords((prev) =>
              prev.map((w) => {
                if (w.id !== wordId) return w;

                const nextFields = Object.fromEntries(
                  Object.entries(fields).filter(
                    (entry): entry is [string, string] =>
                      typeof entry[1] === "string",
                  ),
                );
                return { ...w, ...nextFields };
              }),
            )
          }
        />
      )}
    </PageLayout>
  );
}
