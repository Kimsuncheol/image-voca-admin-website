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
import InboxIcon from "@mui/icons-material/Inbox";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import DerivativeGenerationDialog from "@/components/derivatives/DerivativeGenerationDialog";
// ── Layout ────────────────────────────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Course-domain types & data helpers ────────────────────────────────
import { getCourseById } from "@/types/course";
import { supportsDerivativeCourse } from "@/constants/supportedDerivativeCourses";
import {
  isSupportedImageGenerationCourseId,
  type GenerateImagesSuccessResponse,
} from "@/types/imageGeneration";
import type { Word } from "@/types/word";
import {
  getDayWords,
  updateWordDerivatives,
  updateWordField,
  updateWordImageUrl,
} from "@/lib/firebase/firestore";
import {
  buildDerivativePreviewRequestItems,
  buildDerivativeUpdatesFromPreview,
  requestDerivativePreview,
} from "@/lib/derivativeGeneration";
import {
  createCourseDayGenerateWordFieldRequest,
  createCourseDayImageGenerationWords,
  createJlptExampleBatchCorrectionItems,
  extractCourseDayGenerateWordFieldUpdates,
  getCourseDayBulkAction,
  hasTrimmedText,
  mapCourseDayGeneratedImages,
  planCourseDayBulkGeneration,
  type CourseDayBulkAction,
  type CourseDayBulkGeneratableField,
  type CourseDayBulkPreviewField,
  type CourseDayBulkSkippedItem,
} from "@/lib/courseDayBulkGeneration";
import {
  adaptCourseWordToWordFinderResult,
  applyCourseWordResolvedUpdates,
  isCourseWordFieldMissing,
} from "@/lib/wordFinderCourseAdapter";
import { addFuriganaTextsRobust } from "@/lib/addFurigana";
import { hasParentheticalFurigana } from "@/lib/furigana";
import { useAdminAIAccess } from "@/lib/hooks/useAdminAccess";
import { formatPersistedPronunciation, getIpaUSUKBatch } from "@/lib/utils/ipaLookup";
import { containsKorean } from "@/lib/utils/korean";
import type { CourseDayMissingField } from "@/types/courseDayMissingField";
import type { WordFinderResult, WordFinderResultFieldUpdates } from "@/types/wordFinder";
import type { DerivativePreviewItemResult } from "@/types/vocabulary";

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
  isIdiom: boolean,
  isJlpt: boolean,
  showImageUrl: boolean,
  supportsDerivatives: boolean,
  t: (key: string, options?: Record<string, unknown>) => string,
): Array<{ value: CourseDayMissingField; label: string }> {
  const primaryTextLabel = isCollocation
    ? t("courses.missingCollocation")
    : isIdiom
      ? t("courses.missingIdiom")
      : t("courses.missingWord");
  const options: Array<{ value: CourseDayMissingField; label: string }> = [
    { value: "all", label: t("courses.missingAll") },
    { value: "primaryText", label: primaryTextLabel },
    { value: "meaning", label: t("courses.missingMeaning") },
  ];

  if (!isCollocation && !isIdiom) {
    options.push({
      value: "pronunciation",
      label: t("courses.missingPronunciation"),
    });
  }

  options.push(
    { value: "example", label: t("courses.missingExample") },
    { value: "translation", label: t("courses.missingTranslation") },
  );

  if (supportsDerivatives) {
    options.push({
      value: "derivative",
      label: t("courses.missingDerivative"),
    });
  }

  if (showImageUrl) {
    options.push({ value: "image", label: t("courses.missingImage") });
  }

  if (isJlpt) {
    options.push({ value: "furigana", label: t("courses.missingFurigana") });
    options.push({ value: "exampleHasKorean", label: t("courses.exampleHasKorean") });
  }

  return options;
}

function getBulkActionLabel(
  action: CourseDayBulkAction,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (action.kind === "add-furigana") {
    return t("words.addFuriganaAction");
  }

  if (action.kind === "jlpt-example-correction") {
    return t("courses.correctExamplesWithDeepL");
  }

  switch (action.field) {
    case "pronunciation":
      return t("courses.generateMissingPronunciations");
    case "example":
      return t("courses.generateMissingExamples");
    case "translation":
      return t("courses.generateMissingTranslations");
    case "derivative":
      return t("courses.generateMissingDerivatives");
    case "image":
      return t("courses.generateMissingImages");
    default:
      return t("words.generateAction");
  }
}

function getBulkDisabledReason(
  action: CourseDayBulkAction | null,
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
  if (!action) return null;

  if (action.kind === "jlpt-example-correction") {
    if (options.aiAccessLoading) {
      return t("common.loading");
    }
    if (options.exampleTranslationBlockedBySettings) {
      return t("courses.enrichGenerationDisabled");
    }
    if (options.exampleTranslationBlockedByPermissions) {
      return t("courses.enrichGenerationPermissionDenied");
    }
    return null;
  }

  if (action.kind === "derivative-preview") {
    return null;
  }

  if (action.kind === "add-furigana") {
    return null;
  }

  const field = action.field;

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
  const router = useRouter();
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
  const [exitingWordIds, setExitingWordIds] = useState<Set<string>>(new Set());
  const [bulkLoadingField, setBulkLoadingField] =
    useState<CourseDayBulkGeneratableField | CourseDayBulkPreviewField | "furigana" | null>(null);
  const [jlptExampleCorrectionLoading, setJlptExampleCorrectionLoading] =
    useState(false);
  const [bulkFeedback, setBulkFeedback] = useState<BulkFeedback | null>(null);
  const [derivativeDialogOpen, setDerivativeDialogOpen] = useState(false);
  const [derivativeDialogLoading, setDerivativeDialogLoading] = useState(false);
  const [derivativeDialogSaving, setDerivativeDialogSaving] = useState(false);
  const [derivativeDialogItems, setDerivativeDialogItems] = useState<
    DerivativePreviewItemResult[]
  >([]);
  const [derivativeDialogError, setDerivativeDialogError] = useState("");
  const [derivativeTargets, setDerivativeTargets] = useState<WordFinderResult[]>([]);

  // ── Resolve course metadata from static list ──────────────────────
  // This is a synchronous lookup — no effect needed to detect a missing course.
  const course = getCourseById(courseId);
  const isJlptLevel = courseId.startsWith("JLPT_N");
  const shouldRedirectToCourseRoot = course?.storageMode === "singleList";

  // ── Course type detection ─────────────────────────────────────────
  // WordTable switches its column layout based on these flags.
  const isCollocation = course?.schema === "collocation";
  const isIdiom = course?.schema === "idiom";
  const isJlpt = course?.schema === "jlpt";
  const isFamousQuote = course?.schema === "famousQuote";
  const showImageUrl = isSupportedImageGenerationCourseId(courseId);
  const supportsDerivatives =
    course?.schema === "standard" && supportsDerivativeCourse(course.id);

  const missingFieldOptions = useMemo(
    () =>
      getMissingFieldOptions(
        isCollocation,
        isIdiom,
        isJlpt,
        showImageUrl,
        supportsDerivatives,
        t,
      ),
    [isCollocation, isIdiom, isJlpt, showImageUrl, supportsDerivatives, t],
  );

  const filteredWords = useMemo(
    () =>
      words.filter((word) => {
        if (missingField === "all") return true;
        if (exitingWordIds.has(word.id)) return true;
        if (missingField === "exampleHasKorean") {
          return containsKorean((word as unknown as { example?: string }).example);
        }
        return isCourseWordFieldMissing(
          word,
          {
            isCollocation,
            isIdiom,
            isJlpt,
            isFamousQuote,
            showImageUrl,
            supportsDerivatives,
          },
          missingField,
        );
      }),
    [
      isCollocation,
      isIdiom,
      isJlpt,
      isFamousQuote,
      missingField,
      showImageUrl,
      supportsDerivatives,
      words,
      exitingWordIds,
    ],
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
              isIdiom,
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
      isIdiom,
      isJlpt,
      isFamousQuote,
    ],
  );

  const bulkAction = useMemo(
    () => getCourseDayBulkAction(missingField, isJlpt, supportsDerivatives),
    [isJlpt, missingField, supportsDerivatives],
  );
  const bulkField = bulkAction?.kind === "generate" ? bulkAction.field : null;
  const isJlptExampleCorrection =
    bulkAction?.kind === "jlpt-example-correction";
  const isBulkLoading = Boolean(bulkLoadingField) || jlptExampleCorrectionLoading;

  const bulkDisabledReason = useMemo(
    () =>
      getBulkDisabledReason(
        bulkAction,
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
      bulkAction,
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

  const closeDerivativeDialog = useCallback(() => {
    if (derivativeDialogSaving) return;
    setDerivativeDialogOpen(false);
    setDerivativeDialogLoading(false);
    setDerivativeDialogSaving(false);
    setDerivativeDialogItems([]);
    setDerivativeDialogError("");
    setDerivativeTargets([]);
  }, [derivativeDialogSaving]);

  const handleDerivativeDialogConfirm = useCallback(
    async (selectionMap: Record<string, Record<string, Record<string, boolean>>>) => {
      if (derivativeTargets.length === 0) {
        closeDerivativeDialog();
        return;
      }

      setDerivativeDialogSaving(true);
      setDerivativeDialogError("");

      try {
        const updates = buildDerivativeUpdatesFromPreview(
          derivativeTargets,
          derivativeDialogItems,
          selectionMap,
        );

        await Promise.all(
          updates.map(async (update) => {
            const target = derivativeTargets.find((result) => result.id === update.id);
            if (!target?.dayId) return;
            await updateWordDerivatives(
              target.coursePath,
              target.dayId,
              target.id,
              update.derivative,
            );
            applyResolvedUpdatesToState(target.id, {
              derivative: update.derivative,
            });
          }),
        );

        const { skipped } = planCourseDayBulkGeneration(derivativeTargets, "derivative");
        setBulkFeedback(
          formatBulkSummary(t, {
            updated: updates.length,
            skipped,
            failed: 0,
          }),
        );
        closeDerivativeDialog();
      } catch (error) {
        setDerivativeDialogError(
          error instanceof Error
            ? error.message
            : t("words.generateActionError"),
        );
      } finally {
        setDerivativeDialogSaving(false);
      }
    },
    [
      applyResolvedUpdatesToState,
      closeDerivativeDialog,
      derivativeDialogItems,
      derivativeTargets,
      t,
    ],
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
    isJlpt,
    persistResolvedUpdates,
    settings,
    t,
  ]);

  const handleDerivativeBulkGenerate = useCallback(async () => {
    if (
      bulkAction?.kind !== "derivative-preview" ||
      bulkDisabledReason ||
      bulkLoadingField
    ) {
      return;
    }

    const snapshot = filteredResults;
    const { eligible, skipped } = planCourseDayBulkGeneration(
      snapshot,
      "derivative",
    );

    if (eligible.length === 0) {
      setBulkFeedback({
        severity: "warning",
        message: t("courses.bulkGenerateNoEligible"),
      });
      return;
    }

    setBulkLoadingField("derivative");
    setBulkFeedback(null);
    setDerivativeTargets(eligible);
    setDerivativeDialogOpen(true);
    setDerivativeDialogLoading(true);
    setDerivativeDialogSaving(false);
    setDerivativeDialogItems([]);
    setDerivativeDialogError("");

    try {
      const preview = await requestDerivativePreview(
        course?.id ?? "CSAT",
        buildDerivativePreviewRequestItems(
          eligible,
          () => `${course?.label ?? courseId} / ${dayId}`,
        ),
      );
      setDerivativeDialogItems(preview.items);

      if (
        skipped.length > 0 &&
        !preview.items.some((item) =>
          item.words.some((word) => word.candidates.length > 0),
        )
      ) {
        setBulkFeedback(formatBulkSummary(t, { updated: 0, skipped, failed: 0 }));
      }
    } catch (error) {
      setDerivativeDialogError(
        error instanceof Error
          ? error.message
          : t("words.generateActionError"),
      );
    } finally {
      setDerivativeDialogLoading(false);
      setBulkLoadingField(null);
    }
  }, [
    bulkAction,
    bulkDisabledReason,
    bulkLoadingField,
    course?.id,
    course?.label,
    courseId,
    dayId,
    filteredResults,
    t,
  ]);

  const handleJlptExampleCorrection = useCallback(async () => {
    if (!isJlptExampleCorrection || bulkDisabledReason || jlptExampleCorrectionLoading) {
      return;
    }

    const snapshot = filteredResults;
    if (snapshot.length === 0) {
      setBulkFeedback({
        severity: "warning",
        message: t("courses.bulkGenerateNoEligible"),
      });
      return;
    }

    setJlptExampleCorrectionLoading(true);
    setBulkFeedback(null);

    let updated = 0;
    let failed = 0;

    try {
      const response = await fetch("/api/admin/translate-word-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "jlpt-example-batch",
          provider: "deepl",
          items: createJlptExampleBatchCorrectionItems(snapshot),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        items?: Array<{ id: string; example: string }>;
        failures?: Array<{ id: string; error: string }>;
      };

      if (!response.ok) {
        throw new Error(payload.error || t("words.generateActionError"));
      }

      failed += payload.failures?.length ?? 0;
      const resultMap = new Map(snapshot.map((result) => [result.id, result]));

      for (const item of payload.items ?? []) {
        const result = resultMap.get(item.id);
        if (!result) {
          failed += 1;
          continue;
        }

        try {
          await persistResolvedUpdates(result, { example: item.example });
          applyResolvedUpdatesToState(result.id, { example: item.example });
          updated += 1;
        } catch {
          failed += 1;
        }
      }

      setBulkFeedback(
        formatBulkSummary(t, { updated, skipped: [], failed }),
      );
    } catch (bulkError) {
      setBulkFeedback({
        severity: "error",
        message:
          bulkError instanceof Error
            ? bulkError.message
            : t("words.generateActionError"),
      });
    } finally {
      setJlptExampleCorrectionLoading(false);
    }
  }, [
    applyResolvedUpdatesToState,
    bulkDisabledReason,
    filteredResults,
    isJlptExampleCorrection,
    jlptExampleCorrectionLoading,
    persistResolvedUpdates,
    t,
  ]);

  const handleAddFuriganaBulk = useCallback(async () => {
    if (bulkAction?.kind !== "add-furigana" || bulkLoadingField || bulkDisabledReason) {
      return;
    }

    const eligible = filteredResults.filter(
      (result) =>
        result.schemaVariant === "jlpt" &&
        hasTrimmedText(result.example) &&
        !hasParentheticalFurigana(result.example),
    );

    if (eligible.length === 0) {
      setBulkFeedback({
        severity: "warning",
        message: t("courses.bulkGenerateNoEligible"),
      });
      return;
    }

    setBulkLoadingField("furigana");
    setBulkFeedback(null);

    try {
      const results = await addFuriganaTextsRobust(
        eligible.map((result) => result.example!),
      );

      let updated = 0;
      let failed = 0;

      for (const [index, outcome] of results.entries()) {
        const result = eligible[index];
        if (!result) continue;

        if (!outcome.ok) {
          failed += 1;
          continue;
        }

        try {
          const example = outcome.text;
          await persistResolvedUpdates(result, { example });
          applyResolvedUpdatesToState(result.id, { example });
          updated += 1;
        } catch {
          failed += 1;
        }
      }

      setBulkFeedback(
        formatBulkSummary(t, { updated, skipped: [], failed }),
      );
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
    bulkAction,
    bulkDisabledReason,
    bulkLoadingField,
    filteredResults,
    persistResolvedUpdates,
    t,
  ]);

  useEffect(() => {
    if (!shouldRedirectToCourseRoot) return;
    router.replace(`/courses/${courseId}`);
  }, [courseId, router, shouldRedirectToCourseRoot]);

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

  // ── Scroll to word anchor after words load ────────────────────────
  useEffect(() => {
    if (loading || !words.length) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, words]);

  // ── Missing course (synchronous guard) ───────────────────────────
  // Handled here (not in the effect) to avoid synchronous setState in effects.
  if (!course) {
    return (
      <PageLayout>
        <Alert severity="error">{"Course not found"}</Alert>
      </PageLayout>
    );
  }

  if (shouldRedirectToCourseRoot) {
    return <CourseLoadingView />;
  }

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return <CourseLoadingView />;
  }

  // ── Resolved state ────────────────────────────────────────────────
  return (
    <PageLayout maxWidth={1280}>
      {/* ── Breadcrumb navigation: Courses › [Course] › [Day] ───────── */}
      <CourseBreadcrumbs
        courseId={courseId}
        courseLabel={course?.label}
        parentLabel={isJlptLevel ? "JLPT" : undefined}
        parentHref={isJlptLevel ? "/courses/JLPT" : undefined}
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
            disabled={missingField === "all" || isBulkLoading}
          >
            {t("words.clearFilters")}
          </Button>

          {bulkAction && (
            <Button
              variant="contained"
              onClick={() => {
                if (bulkAction.kind === "generate") {
                  void handleBulkGenerate();
                  return;
                }

                if (bulkAction.kind === "derivative-preview") {
                  void handleDerivativeBulkGenerate();
                  return;
                }

                if (bulkAction.kind === "add-furigana") {
                  void handleAddFuriganaBulk();
                  return;
                }

                void handleJlptExampleCorrection();
              }}
              sx={{ borderRadius: "20px" }}
              disabled={
                isBulkLoading ||
                Boolean(bulkDisabledReason) ||
                filteredResults.length === 0
              }
              startIcon={
                ((bulkAction.kind === "generate" ||
                  bulkAction.kind === "derivative-preview") &&
                  bulkLoadingField === bulkAction.field) ||
                (bulkAction.kind === "add-furigana" &&
                  bulkLoadingField === "furigana") ||
                (bulkAction.kind === "jlpt-example-correction" &&
                  jlptExampleCorrectionLoading) ? (
                  <CircularProgress size={16} color="inherit" />
                ) : undefined
              }
            >
              <Stack alignItems="flex-start" spacing={0}>
                <span>{getBulkActionLabel(bulkAction, t)}</span>
                {bulkAction.kind === "generate" &&
                  bulkAction.field === "pronunciation" &&
                  !bulkDisabledReason && (
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

      {bulkAction && bulkDisabledReason && (
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

      <DerivativeGenerationDialog
        open={derivativeDialogOpen}
        loading={derivativeDialogLoading}
        saving={derivativeDialogSaving}
        items={derivativeDialogItems}
        error={derivativeDialogError}
        onClose={closeDerivativeDialog}
        onConfirm={handleDerivativeDialogConfirm}
      />

      {/* ── Word table / empty state ──────────────────────────────────── */}
      {filteredWords.length === 0 && !error ? (
        // Empty state: no words have been uploaded for this day yet
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
              {missingField === "all"
                ? t("courses.noDataHint")
                : t("courses.noDataFilteredHint")}
            </Typography>
          </Stack>
        </Stack>
      ) : (
        // WordTable renders differently depending on isCollocation:
        //   false → standard columns: word, pronunciation, meaning, example
        //   true  → collocation columns: phrase, meaning, explanation, example
        <WordTable
          words={filteredWords}
      isCollocation={isCollocation}
      isIdiom={isIdiom}
      isJlpt={isJlpt}
      isFamousQuote={isFamousQuote}
      showImageUrl={showImageUrl}
      courseId={course.id}
      coursePath={course.path}
      dayId={dayId}
      exitingWordIds={exitingWordIds}
          onWordImageUpdated={(wordId, imageUrl) =>
            setWords((prev) =>
              prev.map((w) => (w.id === wordId ? { ...w, imageUrl } : w)),
            )
          }
          onWordFieldsUpdated={(wordId, fields) => {
            if (
              missingField === "exampleHasKorean" &&
              !jlptExampleCorrectionLoading &&
              "example" in fields &&
              typeof fields.example === "string" &&
              !containsKorean(fields.example)
            ) {
              setExitingWordIds((prev) => new Set([...prev, wordId]));
              setTimeout(() => {
                setExitingWordIds((prev) => {
                  const next = new Set(prev);
                  next.delete(wordId);
                  return next;
                });
              }, 400);
            }
            applyResolvedUpdatesToState(wordId, fields);
          }}
        />
      )}
    </PageLayout>
  );
}
