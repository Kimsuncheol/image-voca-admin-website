"use client";

/**
 * AddVocaPage  —  /add-voca
 *
 * Admin page for bulk-uploading vocabulary day data into Firestore.
 * Supports CSV upload, Google Sheets URL import, and (for FAMOUS_QUOTE)
 * manual quote-set entry.
 *
 * ── Upload pipeline ───────────────────────────────────────────────────
 *  Phase 0 — Queue       : user adds CSV files or Google Sheets URLs and
 *                          assigns a "day name" to each item
 *  Phase 1 — Pre-process : for each queued item (up to 3 concurrently):
 *                            1. Back up source CSV to Firebase Storage (FR-6)
 *                            2. Look up IPA pronunciation for single words (FR-10)
 *                            3. Enrich words via OpenAI API (FR-11, best-effort)
 *  Phase 2 — Batch upload: send all successfully pre-processed days to
 *                          /api/admin/batch-upload in a single request (FR-12)
 *
 * ── FR references ─────────────────────────────────────────────────────
 *  FR-4  — detect existing day data before writing
 *  FR-5  — prompt user before overwriting existing days
 *  FR-6  — archive original CSV in Firebase Storage
 *  FR-9  — normalise word fields via csvParser.extractVocaFields
 *  FR-10 — auto-fill IPA pronunciation from dictionary API
 *  FR-11 — linguistic enrichment (example sentence, notes) via OpenAI
 *  FR-12 — single batch Firestore write instead of N individual writes
 *  FR-14 — real-time progress modal with per-item status chips
 *
 * ── States ────────────────────────────────────────────────────────────
 *  idle        → CourseSelector + tab panel (CSV or URL queue)
 *  overwriting → OverwriteDialog blocking modal (awaited via promise)
 *  uploading   → UploadProgressModal with live item status updates
 *
 * ── Child components ──────────────────────────────────────────────────
 *  CourseSelector      — dropdown for choosing the target course
 *  CsvUploadTab        — drag-and-drop CSV queue with day name inputs
 *  UrlUploadTab        — Google Sheets URL queue with day name inputs
 *  QuoteUploadTab      — manual quote-set queue (quote/author/translation)
 *  UploadProgressModal — live status list shown during / after upload
 */

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useTranslation } from "react-i18next";

// ── Layout ────────────────────────────────────────────────────────────
import PageLayout from "@/components/layout/PageLayout";

// ── Types ─────────────────────────────────────────────────────────────
import {
  getCourseById,
  getSingleListSubcollectionByCourseId,
  isFamousQuoteCourse,
  isCollectionCourse,
  isSingleListCourse,
  type CourseId,
} from "@/types/course";
import type {
  JlptWordInput,
  PostfixWordInput,
  PrefixWordInput,
  StandardWordInput,
} from "@/lib/schemas/vocaSchemas";
import type { SchemaType } from "@/lib/utils/csvParser";
import type {
  DerivativePreviewItemResult,
  DerivativePreviewResponse,
} from "@/types/vocabulary";
// import { isSupportedImageGenerationCourseId } from "@/types/imageGeneration";

// ── Navigation guard ──────────────────────────────────────────────────
import {
  setNavigationGuard,
  clearNavigationGuard,
} from "@/lib/navigationGuard";

// ── Firebase / data helpers ───────────────────────────────────────────
import {
  checkDayExists,
  checkCollectionExists,
  checkSingleListExists,
} from "@/lib/firebase/firestore";
import { uploadCsvBackup } from "@/lib/firebase/storage";
import { getIpaUSUKBatch } from "@/lib/utils/ipaLookup";
import { supportsDerivativeCourse } from "@/constants/supportedDerivativeCourses";
import {
  buildDerivativeAwareWordsForUpload,
  type DerivativeSelectionMap,
} from "@/services/vocaSaveService";
import { assignDeterministicUploadIdsForItems } from "@/lib/uploadWordIds";
import { prepareStandardWordsForUpload } from "@/services/standardWordUpload";
import { useAdminAIAccess } from "@/lib/hooks/useAdminAccess";
import {
  getUploadOptionState,
  type UploadOptions,
} from "@/lib/addVocaUploadOptions";
import { applyFuriganaToJapaneseUploadWords } from "@/lib/addVocaFurigana";
import { validateUploadCourse } from "@/lib/addVocaUploadPreflight";

// ── Feature components ────────────────────────────────────────────────
import CourseSelector from "@/components/add-voca/CourseSelector";
import CsvUploadTab, { type CsvItem } from "@/components/add-voca/CsvUploadTab";
import DerivativePreviewDialog from "@/components/add-voca/DerivativePreviewDialog";
// import StickFigureGenerator from "@/components/add-voca/StickFigureGenerator";
import UploadOptionsModal from "@/components/add-voca/UploadOptionsModal";
import UrlUploadTab, { type UrlItem } from "@/components/add-voca/UrlUploadTab";
import QuoteUploadTab, {
  type QuoteItem,
} from "@/components/add-voca/QuoteUploadTab";
import UploadProgressModal, {
  type ProgressItem,
} from "@/components/add-voca/UploadProgressModal";

// ── Local type alias ───────────────────────────────────────────────────
// An item in the upload queue is either a parsed CSV or a resolved URL entry.
type QueueItem = CsvItem | UrlItem | QuoteItem;
type StandardQueueItem = CsvItem | UrlItem;
type ReadyQueueItem = QueueItem & { data: NonNullable<QueueItem["data"]> };
type ReadyStandardQueueItem = StandardQueueItem & {
  data: { words: StandardWordInput[] };
};

type ReadyUploadItem = ReadyQueueItem & { targetCoursePath?: string };

/**
 * Type guard — returns true when `item` originated from a CSV file upload.
 * CSV items carry a `fileName` property; URL items carry a `url` property.
 * Used to conditionally back up the source file to Firebase Storage (FR-6).
 */
function isCsvItem(item: QueueItem): item is CsvItem {
  return "fileName" in item;
}

function isUrlItem(item: QueueItem): item is UrlItem {
  return "url" in item;
}

function resolveQueueItemTargetCoursePath(
  item: ReadyUploadItem,
  fallbackCoursePath: string,
): string {
  return item.targetCoursePath?.trim() || fallbackCoursePath;
}

export default function AddVocaPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const paramCourse = searchParams.get("course") as CourseId | null;
  const paramDayName = searchParams.get("dayName") ?? "";
  const {
    settings,
    canUseImageGeneration,
    canUseExampleTranslationGeneration,
    imageGenerationBlockedByPermissions,
    exampleTranslationBlockedByPermissions,
  } = useAdminAIAccess();

  // ── Upload-queue state ─────────────────────────────────────────────
  // `tabIndex` selects between the CSV (0) and URL (1) input methods.
  // `selectedCourse` drives the Firestore write path and the word schema —
  // COLLOCATIONS uses a different field set than all standard courses.
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<CourseId | "">(
    paramCourse ?? "CSAT",
  );
  const [csvItems, setCsvItems] = useState<CsvItem[]>([]);
  const [urlItems, setUrlItems] = useState<UrlItem[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  // Shown briefly when the user switches courses while items are already queued
  const [courseSwitchNotice, setCourseSwitchNotice] = useState("");
  const [uploadError, setUploadError] = useState("");

  // ── Progress modal state (FR-14) ──────────────────────────────────
  // These are mutated throughout the two-phase upload to give live feedback.
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [progressCounts, setProgressCounts] = useState({
    success: 0,
    failed: 0,
    skipped: 0,
  });
  const [progressDone, setProgressDone] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [uploadOptionsOpen, setUploadOptionsOpen] = useState(false);
  const [uploadOptions, setUploadOptions] = useState<UploadOptions>(
    {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    },
  );
  const [derivativePreviewOpen, setDerivativePreviewOpen] = useState(false);
  const [derivativePreviewLoading, setDerivativePreviewLoading] =
    useState(false);
  const [derivativePreviewItems, setDerivativePreviewItems] = useState<
    DerivativePreviewItemResult[]
  >([]);
  const [derivativePreviewError, setDerivativePreviewError] = useState("");

  // ── Overwrite confirmation state (FR-5) ───────────────────────────
  // The dialog is driven by a promise so `handleUpload` can `await` the
  // user's decision before continuing. `resolve` is stored in state and
  // called from `resolveOverwrite` when the user clicks a button.
  const [overwriteDialog, setOverwriteDialog] = useState<{
    existingDays: string[];
    resolve: (decision: "overwrite" | "skip" | "cancel") => void;
  } | null>(null);

  // Prevents re-entrant calls to handleUpload while an upload is in progress
  const uploadingRef = useRef(false);
  const pendingDerivativeItemsRef = useRef<ReadyStandardQueueItem[]>([]);
  const pendingUploadOptionsRef = useRef<UploadOptions>(
    {
      images: false,
      examples: false,
      translations: false,
      furigana: false,
      preserveExistingImages: false,
    },
  );

  // ── Browser unload guard ───────────────────────────────────────────
  // Show a native "Leave site?" prompt when the user tries to refresh or
  // close the tab while items are queued or an upload is in progress.
  useEffect(() => {
    const hasUnsaved =
      csvItems.length > 0 ||
      urlItems.length > 0 ||
      quoteItems.length > 0 ||
      progressOpen;

    if (!hasUnsaved) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [csvItems.length, urlItems.length, quoteItems.length, progressOpen]);

  // ── Client-side navigation guard ──────────────────────────────────────
  // Patching window.history.pushState is unreliable in Next.js App Router:
  // router.push() starts a React transition that renders the new page
  // *before* pushState is called to sync the URL, so blocking pushState
  // only prevents the URL update — the page content has already changed.
  //
  // Instead, we register a synchronous guard function via the module-level
  // singleton in lib/navigationGuard.ts. AppNavSidebar calls
  // checkNavigationGuard() before invoking router.push(), so navigation
  // is blocked at the call-site, before any React transition begins.
  useEffect(() => {
    const hasUnsaved =
      csvItems.length > 0 ||
      urlItems.length > 0 ||
      quoteItems.length > 0 ||
      progressOpen;

    if (hasUnsaved) {
      setNavigationGuard(() =>
        window.confirm(
          t(
            "addVoca.leaveConfirm",
            "You have items waiting to upload. If you leave, they will be lost.",
          ),
        ),
      );
    } else {
      clearNavigationGuard();
    }

    return () => clearNavigationGuard();
  }, [csvItems.length, urlItems.length, quoteItems.length, progressOpen, t]);

  // ── Derived state ──────────────────────────────────────────────────
  // `schemaType` drives CSV header validation and word field mapping.
  const schemaType: SchemaType =
    getCourseById(selectedCourse)?.schema ?? "standard";
  const isFamousQuote = isFamousQuoteCourse(selectedCourse);
  const isSingleList = isSingleListCourse(selectedCourse);
  const isCollection = isCollectionCourse(selectedCourse);
  const singleListSubcollection = isSingleList
    ? getSingleListSubcollectionByCourseId(selectedCourse)
    : null;
  // const showImageGenerator = shouldIncludeImageUrl(selectedCourse);
  // const imageGenerationCourseId = isSupportedImageGenerationCourseId(
  //   selectedCourse,
  // )
  //   ? selectedCourse
  //   : null;

  // Items visible in the currently selected tab
  const currentItems =
    tabIndex === 0 ? csvItems : tabIndex === 1 ? urlItems : quoteItems;
  const selectedCourseLabel = getCourseById(selectedCourse)?.label;

  useEffect(() => {
    // The quote tab exists only for FAMOUS_QUOTE, so leave invalid tab index.
    if (!isFamousQuote && tabIndex > 1) {
      setTabIndex(0);
    }
  }, [isFamousQuote, tabIndex]);

  // Only items that have both a day name and at least one parsed word are
  // eligible for upload — the rest are silently excluded.
  const readyItems = currentItems.filter((item): item is ReadyQueueItem =>
    Boolean(item.dayName && item.data && item.data.words.length > 0),
  );
  const hasAnyImageUrl = readyItems.some((item) =>
    item.data.words.some(
      (w) => Boolean((w as { imageUrl?: string }).imageUrl?.trim()),
    ),
  );
  const uploadOptionState = getUploadOptionState({
    selectedCourse,
    imageGenerationEnabled: canUseImageGeneration,
    enrichGenerationEnabled: canUseExampleTranslationGeneration,
    hasAnyImageUrl,
    uploadWords:
      schemaType === "jlpt" || schemaType === "prefix" || schemaType === "postfix"
        ? readyItems.flatMap((item) => item.data.words) as
            | JlptWordInput[]
            | PrefixWordInput[]
            | PostfixWordInput[]
        : undefined,
  });
  const {
    isImageGenerationEnabled,
    isExampleAndTranslationGenerationEnabled,
    isFuriganaEnabled,
    isPreserveExistingImagesEnabled,
    shouldShowModal: shouldShowUploadOptionsModal,
    defaultOptions: defaultUploadOptions,
  } = uploadOptionState;

  // ── Overwrite dialog helpers ───────────────────────────────────────

  /**
   * Opens the overwrite confirmation dialog and returns a Promise that
   * resolves once the user clicks one of the three action buttons.
   * `handleUpload` awaits this promise to pause the upload pipeline.
   */
  const showOverwriteConfirm = (
    existingDays: string[],
  ): Promise<"overwrite" | "skip" | "cancel"> =>
    new Promise((resolve) => setOverwriteDialog({ existingDays, resolve }));

  /**
   * Resolves the pending overwrite promise and closes the dialog.
   * Must be called for every dialog button (including cancel) to prevent
   * the upload pipeline from being suspended indefinitely.
   */
  const resolveOverwrite = (decision: "overwrite" | "skip" | "cancel") => {
    overwriteDialog?.resolve(decision);
    setOverwriteDialog(null);
  };

  // ── Progress item helper ───────────────────────────────────────────

  /**
   * Applies a partial patch to a single progress item by its `id`.
   * Called from inside the concurrency pool to update each item's status
   * (pending → processing → success | failed) as the pipeline advances.
   */
  const updateProgressItem = (id: string, patch: Partial<ProgressItem>) => {
    setProgressItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  };

  // ── Upload orchestration ───────────────────────────────────────────

  /**
   * Main upload executor. Orchestrates the two-phase pipeline:
   *
   * Phase 1 — Pre-process (runs with concurrency = 3):
   *   For each queued item:
   *   a) Back up source CSV to Firebase Storage (CSV items only, FR-6)
   *   b) Resolve IPA pronunciation for single-word entries (FR-10)
   *   c) Enrich words via POST /api/admin/enrich (FR-11, best-effort)
   *
   * Phase 2 — Batch upload (single HTTP round-trip, FR-12):
   *   All successfully pre-processed days are sent to
   *   POST /api/admin/batch-upload in one request.
   *   Results are written back into progressItems individually.
   */
  const runUpload = async (
    itemsToUpload: QueueItem[],
    options: UploadOptions,
  ) => {
    if (!selectedCourse || itemsToUpload.length === 0 || uploadingRef.current)
      return;

    setUploadError("");

    const courseValidation = validateUploadCourse(getCourseById(selectedCourse));
    if (!courseValidation.ok) {
      setUploadError(
        t(
          "addVoca.invalidCoursePath",
          "This course is not configured for uploads yet. Please check the course path settings.",
        ),
      );
      return;
    }

    const { course } = courseValidation;

    uploadingRef.current = true;

    const existsFlags =
      course.storageMode === "flat"
        ? itemsToUpload.map(() => false)
        : course.storageMode === "collection"
          ? await Promise.all(
              itemsToUpload.map((item) =>
                checkCollectionExists(
                  resolveQueueItemTargetCoursePath(
                    item as ReadyUploadItem,
                    course.path,
                  ),
                ),
              ),
            )
        : course.storageMode === "singleList"
          ? await Promise.all(
              itemsToUpload.map(() => checkSingleListExists(course.id, course.path)),
            )
          : await Promise.all(
              itemsToUpload.map((item) =>
                checkDayExists(course.path, item.dayName),
              ),
            );
    const existingDays: string[] = itemsToUpload
      .filter((_, i) => existsFlags[i])
      .map((item) => item.dayName);

    let skipDays = new Set<string>();
    if (existingDays.length > 0) {
      const decision = await showOverwriteConfirm(existingDays);
      if (decision === "cancel") {
        uploadingRef.current = false;
        return;
      }
      if (decision === "skip") skipDays = new Set(existingDays);
    }

    const initial: ProgressItem[] = itemsToUpload.map((item) => ({
      id: item.id,
      label: isCsvItem(item)
        ? item.fileName
        : isUrlItem(item)
          ? item.url
          : `${item.quoteSet.quote.slice(0, 48)}${item.quoteSet.quote.length > 48 ? "..." : ""} - ${item.quoteSet.author}`,
      dayName: item.dayName,
      status: skipDays.has(item.dayName) ? "skipped" : "pending",
    }));
    setProgressItems(initial);
    setProgressCounts({ success: 0, failed: 0, skipped: skipDays.size });
    setProgressDone(false);
    setStatusText(t("addVoca.statusProcessing"));
    setProgressOpen(true);

    const queue = itemsToUpload.filter((item) => !skipDays.has(item.dayName));
    const CONCURRENCY = 3;
    const processedMap = new Map<string, unknown[]>();
    const errorMap = new Map<string, string>();

    const preprocessItem = async (item: QueueItem) => {
      updateProgressItem(item.id, { status: "processing" });
      try {
        if (isCsvItem(item) && item.file) {
          try {
            await uploadCsvBackup(item.file, course.id, item.dayName);
          } catch (e) {
            console.error("[Storage] Backup upload failed:", e);
          }
        }

        let words = item.data!.words;

        if (schemaType === "jlpt") {
          let jlptWords = words as JlptWordInput[];
          const wordsNeedingPronunciation = jlptWords
            .filter(
              (w) =>
                w.word.trim().length > 0 &&
                !w.pronunciation.trim(),
            )
            .map((w) => w.word);

          if (wordsNeedingPronunciation.length > 0) {
            try {
              const response = await fetch("/api/admin/jlpt-pronunciation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ words: wordsNeedingPronunciation }),
              });
              const payload = (await response.json()) as {
                error?: string;
                items?: Array<{
                  word: string;
                  pronunciation: string;
                  pronunciationRoman: string;
                }>;
              };

              if (response.ok && Array.isArray(payload.items)) {
                const pronunciationMap = new Map(
                  payload.items.map((item) => [
                    item.word,
                    {
                      pronunciation: item.pronunciation,
                      pronunciationRoman: item.pronunciationRoman,
                    },
                  ]),
                );

                jlptWords = jlptWords.map((w) => {
                  const resolved = pronunciationMap.get(w.word);
                  if (!resolved) return w;
                  return {
                    ...w,
                    pronunciation: resolved.pronunciation,
                    pronunciationRoman: resolved.pronunciationRoman,
                  };
                });
              } else {
                console.warn("[JLPT] Pronunciation lookup failed:", payload.error ?? response.status);
              }
            } catch (err) {
              console.warn("[JLPT] Pronunciation lookup error:", err);
            }
          }

          if (options.images && isImageGenerationEnabled) {
            setStatusText(t("addVoca.statusImage"));
            try {
              const imageResp = await fetch("/api/admin/generate-images", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  courseId: selectedCourse,
                  words: jlptWords,
                }),
              });

              if (imageResp.ok) {
                const result = (await imageResp.json()) as {
                  words: JlptWordInput[];
                  failures?: { word: string; error: string }[];
                };
                jlptWords = result.words;
              }
            } catch (e) {
              console.error("[Image Generation] Failed (non-fatal):", e);
            }
          }

          if (options.furigana) {
            setStatusText(
              t("addVoca.statusFurigana", "Adding furigana"),
            );
            jlptWords = await applyFuriganaToJapaneseUploadWords(
              jlptWords,
              "jlpt",
            );
          }

          words = prepareStandardWordsForUpload(
            jlptWords,
            selectedCourse,
          );
        } else if (schemaType === "prefix") {
          let prefixWords = words as PrefixWordInput[];

          if (options.furigana) {
            setStatusText(
              t("addVoca.statusFurigana", "Adding furigana"),
            );
            prefixWords = await applyFuriganaToJapaneseUploadWords(
              prefixWords,
              "prefix",
            );
          }

          words = prefixWords;
        } else if (schemaType === "postfix") {
          let postfixWords = words as PostfixWordInput[];

          if (options.furigana) {
            setStatusText(
              t("addVoca.statusFurigana", "Adding furigana"),
            );
            postfixWords = await applyFuriganaToJapaneseUploadWords(
              postfixWords,
              "postfix",
            );
          }

          words = postfixWords;
        } else if (schemaType === "standard") {
          const wordsNeedingIpa = (words as StandardWordInput[])
            .filter((w) => !w.pronunciation && !w.word.includes(" "))
            .map((w) => w.word);
          if (wordsNeedingIpa.length > 0) {
            const ipaMap = await getIpaUSUKBatch(wordsNeedingIpa, settings);
            words = (words as StandardWordInput[]).map((w) =>
              w.pronunciation || w.word.includes(" ")
                ? w
                : { ...w, pronunciation: ipaMap.get(w.word)?.us ?? w.pronunciation },
            );
          }

          if (
            isExampleAndTranslationGenerationEnabled &&
            (options.examples || options.translations)
          ) {
            setStatusText(t("addVoca.statusEnrich"));
            try {
              const resp = await fetch("/api/admin/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  words,
                  coursePath: course.path,
                  dayName: item.dayName,
                  generateExample: options.examples,
                  generateTranslation: options.translations,
                }),
              });
              if (resp.ok) {
                const result = await resp.json();
                words = result.words;
                console.log(
                  `[Enrich] ${item.dayName}`,
                  (words as StandardWordInput[]).map((w) => ({
                    word: w.word,
                    example: w.example,
                    translation: w.translation,
                  })),
                );
              }
            } catch (e) {
              console.error("[Enrich] Failed (non-fatal):", e);
            }
          }

          if (options.images && isImageGenerationEnabled) {
            setStatusText(t("addVoca.statusImage"));
            try {
              const imageResp = await fetch("/api/admin/generate-images", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  courseId: selectedCourse,
                  words,
                }),
              });

              if (imageResp.ok) {
                const result = (await imageResp.json()) as {
                  words: StandardWordInput[];
                  failures?: { word: string; error: string }[];
                };
                words = result.words;

                if (result.failures && result.failures.length > 0) {
                  console.warn(
                    `[Image Generation] ${item.dayName} partial failures:`,
                    result.failures,
                  );
                }
              }
            } catch (e) {
              console.error("[Image Generation] Failed (non-fatal):", e);
            }
          }

          words = prepareStandardWordsForUpload(
            words as StandardWordInput[],
            selectedCourse,
          );
        }

        processedMap.set(item.id, words);
      } catch (e) {
        console.error(`[Preprocess] ${item.dayName} failed:`, e);
        const msg = e instanceof Error ? e.message : String(e);
        errorMap.set(item.id, msg);
        updateProgressItem(item.id, { status: "failed", error: msg });
      }
    };

    if (queue.length > 0) {
      const pool = [...queue];
      const total = pool.length;
      let done = 0;
      let resolveAll!: () => void;
      const allDone = new Promise<void>((res) => {
        resolveAll = res;
      });
      const inFlight = new Set<Promise<void>>();

      const launchNext = () => {
        while (inFlight.size < CONCURRENCY && pool.length > 0) {
          const item = pool.shift()!;
          const p: Promise<void> = preprocessItem(item).finally(() => {
            inFlight.delete(p);
            done++;
            if (done === total) resolveAll();
            else launchNext();
          });
          inFlight.add(p);
        }
      };

      launchNext();
      await allDone;
    }

    if (errorMap.size > 0) {
      setProgressCounts((prev) => ({ ...prev, failed: errorMap.size }));
    }

    let daysToUpload = queue
      .filter((item) => processedMap.has(item.id))
      .map((item) => ({
        dayName: item.dayName,
        words: processedMap.get(item.id)!,
      }));

    if (
      daysToUpload.length > 0 &&
      (schemaType === "standard" ||
        schemaType === "jlpt" ||
        schemaType === "collocation" ||
        schemaType === "idiom" ||
        schemaType === "prefix" ||
        schemaType === "postfix")
    ) {
      const startedAt = Date.now();
      const normalizedDays = assignDeterministicUploadIdsForItems(
        daysToUpload as Array<{
          dayName: string;
          words: NonNullable<QueueItem["data"]>["words"];
        }>,
        schemaType,
        course.label,
      );
      const totalWordCount = normalizedDays.reduce(
        (sum, day) => sum + day.words.length,
        0,
      );
      console.log("[add-voca] Batched word ID generation", {
        itemCount: normalizedDays.length,
        totalWordCount,
        durationMs: Date.now() - startedAt,
      });
      daysToUpload = normalizedDays;
    }

    if (daysToUpload.length > 0) {
      setStatusText(t("addVoca.statusWriting"));
      try {
        const uploadGroups =
          course.storageMode === "collection"
            ? Array.from(
                daysToUpload.reduce(
                  (groups, day) => {
                    const matchingItem = queue.find(
                      (item) => item.dayName === day.dayName,
                    ) as ReadyUploadItem | undefined;
                    const targetCoursePath = resolveQueueItemTargetCoursePath(
                      matchingItem ?? { dayName: day.dayName, targetCoursePath: course.path } as ReadyUploadItem,
                      course.path,
                    );
                    const existingGroup = groups.get(targetCoursePath) ?? [];
                    existingGroup.push(day);
                    groups.set(targetCoursePath, existingGroup);
                    return groups;
                  },
                  new Map<string, typeof daysToUpload>(),
                ),
              )
            : [[course.path, daysToUpload] as const];

        const allResults: Array<{ dayName: string; count: number; error?: string }> = [];
        for (const [targetCoursePath, groupedDays] of uploadGroups) {
          const batchResp = await fetch("/api/admin/batch-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              coursePath: targetCoursePath,
              days: groupedDays,
              storageMode: course.storageMode,
              preserveExistingImages: options.preserveExistingImages,
            }),
          });
          if (!batchResp.ok) {
            const payload = (await batchResp.json().catch(() => null)) as
              | { error?: string }
              | null;
            throw new Error(payload?.error || "Batch upload failed");
          }

          const { results } = (await batchResp.json()) as {
            results: { dayName: string; count: number; error?: string }[];
          };
          allResults.push(...results);
        }

        let successCount = 0;
        let failCount = errorMap.size;
        for (const r of allResults) {
          const item = queue.find((q) => q.dayName === r.dayName);
          if (!item) continue;
          if (r.error) {
            updateProgressItem(item.id, { status: "failed", error: r.error });
            failCount++;
          } else {
            updateProgressItem(item.id, {
              status: "success",
              wordCount: r.count,
            });
            successCount++;
          }
        }
        setProgressCounts((prev) => ({
          ...prev,
          success: successCount,
          failed: failCount,
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setUploadError(msg);
        for (const item of queue) {
          if (processedMap.has(item.id)) {
            updateProgressItem(item.id, { status: "failed", error: msg });
          }
        }
        setProgressCounts((prev) => ({
          ...prev,
          failed: errorMap.size + daysToUpload.length,
        }));
      }
    }

    setStatusText("");
    setProgressDone(true);
    uploadingRef.current = false;
  };

  const closeDerivativePreview = () => {
    pendingDerivativeItemsRef.current = [];
    setDerivativePreviewOpen(false);
    setDerivativePreviewLoading(false);
    setDerivativePreviewItems([]);
    setDerivativePreviewError("");
  };

  const handleDerivativePreviewConfirm = async (
    selections: DerivativeSelectionMap,
  ) => {
    const pendingItems = pendingDerivativeItemsRef.current;
    const previewItems = derivativePreviewItems;
    const options = pendingUploadOptionsRef.current;
    closeDerivativePreview();
    const expandedItems = buildDerivativeAwareWordsForUpload(
      pendingItems,
      previewItems,
      selections,
    );
    await runUpload(expandedItems, options);
  };

  const startStandardUpload = async (options: UploadOptions) => {
    const derivativeEligible =
      schemaType === "standard" &&
      (tabIndex === 0 || tabIndex === 1) &&
      supportsDerivativeCourse(selectedCourse);

    if (!derivativeEligible) {
      await runUpload(readyItems, options);
      return;
    }

    const derivativeItems = readyItems as ReadyStandardQueueItem[];
    pendingDerivativeItemsRef.current = derivativeItems;
    pendingUploadOptionsRef.current = options;
    setDerivativePreviewOpen(true);
    setDerivativePreviewLoading(true);
    setDerivativePreviewItems([]);
    setDerivativePreviewError("");

    try {
      const response = await fetch("/api/admin/derivatives/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourse,
          items: derivativeItems.map((item) => ({
            itemId: item.id,
            dayName: item.dayName,
            words: item.data!.words as StandardWordInput[],
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Derivative preview failed");
      }

      const result = (await response.json()) as DerivativePreviewResponse;
      const hasCandidates = result.items.some((item) =>
        item.words.some((word) => word.candidates.length > 0),
      );

      if (!hasCandidates) {
        setDerivativePreviewLoading(false);
        closeDerivativePreview();
        await runUpload(derivativeItems, options);
        return;
      }

      setDerivativePreviewItems(result.items);
      setDerivativePreviewLoading(false);
    } catch (error) {
      console.error("[add-voca] Derivative preview failed:", error);
      setDerivativePreviewLoading(false);
      closeDerivativePreview();
      await runUpload(derivativeItems, options);
    }
  };

  const handleUploadOptionsConfirm = async (options: UploadOptions) => {
    setUploadOptions(options);
    setUploadOptionsOpen(false);
    await startStandardUpload(options);
  };

  const handleUpload = async () => {
    if (!selectedCourse || readyItems.length === 0 || uploadingRef.current)
      return;

    setUploadError("");

    const courseValidation = validateUploadCourse(getCourseById(selectedCourse));
    if (!courseValidation.ok) {
      setUploadError(
        t(
          "addVoca.invalidCoursePath",
          "This course is not configured for uploads yet. Please check the course path settings.",
        ),
      );
      return;
    }

    const isOptionBasedUploadFlow =
      (schemaType === "standard" ||
        schemaType === "jlpt" ||
        schemaType === "prefix" ||
        schemaType === "postfix") &&
      (tabIndex === 0 || tabIndex === 1);

    if (isOptionBasedUploadFlow) {
      setUploadOptions(defaultUploadOptions);

      if (!shouldShowUploadOptionsModal) {
        await startStandardUpload(defaultUploadOptions);
        return;
      }

      setUploadOptionsOpen(true);
      return;
    }

    await runUpload(readyItems, defaultUploadOptions);
  };

  // ── Event handlers ─────────────────────────────────────────────────

  /**
   * Called when the progress modal is closed after upload completes.
   * Removes successfully uploaded items from both queues so they don't
   * reappear on the next visit. Failed or skipped items are kept for retry.
   */
  const handleProgressClose = () => {
    const succeededDays = new Set(
      progressItems.filter((p) => p.status === "success").map((p) => p.dayName),
    );
    setCsvItems((prev) => prev.filter((i) => !succeededDays.has(i.dayName)));
    setUrlItems((prev) => prev.filter((i) => !succeededDays.has(i.dayName)));
    setQuoteItems((prev) => prev.filter((i) => !succeededDays.has(i.dayName)));
    setProgressOpen(false);
  };

  /**
   * Called when the user selects a different course from CourseSelector.
   * Clears both queues because word schemas differ between courses —
   * keeping items from the old course would cause schema mismatches on write.
   * Shows an info notice if any items were discarded.
   */
  const handleCourseChange = (courseId: CourseId) => {
    if (courseId === selectedCourse) return;
    const hasQueuedItems =
      csvItems.length > 0 || urlItems.length > 0 || quoteItems.length > 0;
    if (
      hasQueuedItems &&
      !window.confirm(
        t(
          "addVoca.courseSwitchConfirm",
          "Switching courses will clear the queue. Continue?",
        ),
      )
    ) {
      return; // user cancelled — leave course and queue unchanged
    }
    setSelectedCourse(courseId);
    setTabIndex(0);
    setCsvItems([]);
    setUrlItems([]);
    setQuoteItems([]);
    setUploadError("");
    closeDerivativePreview();
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <PageLayout>
      {/* ── Page heading ─────────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("addVoca.title")}
      </Typography>

      {/* ── Course selector ────────────────────────────────────────────── */}
      {/*
       * Changing course clears the queue — CourseSelector fires
       * handleCourseChange which resets csvItems + urlItems.
       */}
      <CourseSelector value={selectedCourse} onChange={handleCourseChange} />

      {/* showImageGenerator && imageGenerationCourseId && (
        <StickFigureGenerator courseId={imageGenerationCourseId} />
      ) */}

      {/* Course-switch notice: shown when items were cleared by a course change */}
      {courseSwitchNotice && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          onClose={() => setCourseSwitchNotice("")}
        >
          {courseSwitchNotice}
        </Alert>
      )}

      {uploadError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUploadError("")}>
          {uploadError}
        </Alert>
      )}

      {imageGenerationBlockedByPermissions && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("addVoca.generateImagesPermissionDenied")}
        </Alert>
      )}

      {exampleTranslationBlockedByPermissions && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t("addVoca.generateEnrichPermissionDenied")}
        </Alert>
      )}

      {/* ── Input method tabs ──────────────────────────────────────────── */}
      {/*
       * Tab 0 — CSV Upload : drag-and-drop CSV files, one per day
       * Tab 1 — URL Upload : paste Google Sheets URLs, one per day
       * Both tabs share the same queue pattern (dayName + parsed words).
       */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
          <Tab label={t("addVoca.csvUpload")} />
          <Tab label={t("addVoca.urlUpload")} />
          {isFamousQuote && <Tab label={t("addVoca.quoteUpload")} />}
        </Tabs>
      </Box>

      {/* ── Tab panels ─────────────────────────────────────────────────── */}
      {tabIndex === 0 && (
        <CsvUploadTab
          items={csvItems}
          onItemsChange={setCsvItems}
          schemaType={schemaType}
          courseId={selectedCourse}
          hideDayInput={isFamousQuote || isSingleList || isCollection}
          hiddenDayName={singleListSubcollection ?? undefined}
          courseLabel={selectedCourseLabel}
          coursePath={
            isFamousQuote
              ? (getCourseById(selectedCourse)?.path ?? "")
              : undefined
          }
          defaultDayName={paramDayName || undefined}
        />
      )}
      {tabIndex === 1 && (
        <UrlUploadTab
          items={urlItems}
          onItemsChange={setUrlItems}
          schemaType={schemaType}
          courseId={selectedCourse}
          hideDayInput={isFamousQuote || isSingleList || isCollection}
          hiddenDayName={singleListSubcollection ?? undefined}
          courseLabel={selectedCourseLabel}
          defaultDayName={paramDayName || undefined}
        />
      )}
      {isFamousQuote && tabIndex === 2 && (
        <QuoteUploadTab
          items={quoteItems}
          onItemsChange={setQuoteItems}
          coursePath={getCourseById(selectedCourse)?.path ?? ""}
        />
      )}

      {/* ── Validation notice ──────────────────────────────────────────── */}
      {/* FR-9: warn when files are queued but none have a day name assigned */}
      {readyItems.length === 0 && currentItems.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t("addVoca.noDayName")}
        </Alert>
      )}

      {/* ── Upload button ──────────────────────────────────────────────── */}
      {/* Disabled until at least one item is ready (has a day name + words) */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CloudUploadIcon />}
          onClick={handleUpload}
          disabled={
            !selectedCourse ||
            readyItems.length === 0 ||
            derivativePreviewLoading
          }
        >
          {t("addVoca.upload")}
        </Button>
      </Box>

      <DerivativePreviewDialog
        key={
          derivativePreviewLoading
            ? "derivative-preview-loading"
            : derivativePreviewItems
                .map((item) =>
                  [
                    item.itemId,
                    item.words
                      .map(
                        (word) =>
                          `${word.baseWord}:${word.candidates
                            .map((candidate) => candidate.word)
                            .join(",")}`,
                      )
                      .join("|"),
                  ].join("::"),
                )
                .join("||")
        }
        open={derivativePreviewOpen}
        loading={derivativePreviewLoading}
        items={derivativePreviewItems}
        error={derivativePreviewError}
        onClose={closeDerivativePreview}
        onConfirm={handleDerivativePreviewConfirm}
      />

      <UploadOptionsModal
        open={uploadOptionsOpen}
        selectedOptions={uploadOptions}
        isImageGenerationEnabled={isImageGenerationEnabled}
        isExampleAndTranslationGenerationEnabled={
          isExampleAndTranslationGenerationEnabled
        }
        isFuriganaEnabled={isFuriganaEnabled}
        isPreserveExistingImagesEnabled={isPreserveExistingImagesEnabled}
        onClose={() => setUploadOptionsOpen(false)}
        onConfirm={handleUploadOptionsConfirm}
      />

      {/* ── Overwrite confirmation dialog (FR-5) ──────────────────────── */}
      {/*
       * Shown when one or more queued day names already exist in Firestore.
       * The user can choose to:
       *   - Overwrite all  → existing Firestore data is replaced
       *   - Skip existing  → only new days are written, existing ones kept
       *   - Cancel         → abort the entire upload
       * The dialog is promise-driven: handleUpload awaits resolveOverwrite.
       */}
      <Dialog
        open={!!overwriteDialog}
        onClose={() => resolveOverwrite("cancel")}
      >
        <DialogTitle>{t("addVoca.overwriteTitle")}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t("addVoca.overwriteMessage")}</DialogContentText>
          <Box component="ul" sx={{ mt: 1, pl: 2 }}>
            {overwriteDialog?.existingDays.map((d) => (
              <li key={d}>
                <Typography variant="body2">{d}</Typography>
              </li>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => resolveOverwrite("cancel")}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => resolveOverwrite("skip")} color="warning">
            {t("addVoca.skipExisting")}
          </Button>
          <Button
            onClick={() => resolveOverwrite("overwrite")}
            variant="contained"
            color="error"
          >
            {t("addVoca.overwriteAll")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Upload progress modal (FR-14) ─────────────────────────────── */}
      {/*
       * Displays real-time upload status for each item in the queue.
       * Always mounted so MUI handles open/close animation via the `open` prop.
       * On close, handleProgressClose removes succeeded items from the queue.
       */}
      <UploadProgressModal
        open={progressOpen}
        items={progressItems}
        successCount={progressCounts.success}
        failCount={progressCounts.failed}
        skipCount={progressCounts.skipped}
        done={progressDone}
        statusText={statusText}
        onClose={handleProgressClose}
      />
    </PageLayout>
  );
}
