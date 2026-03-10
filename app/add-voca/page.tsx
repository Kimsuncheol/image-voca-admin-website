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
import { getCourseById, type CourseId } from "@/types/course";
import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";
import type { SchemaType } from "@/lib/utils/csvParser";
import type {
  DerivativePreviewItemResult,
  DerivativePreviewResponse,
} from "@/types/vocabulary";

// ── Navigation guard ──────────────────────────────────────────────────
import {
  setNavigationGuard,
  clearNavigationGuard,
} from "@/lib/navigationGuard";

// ── Firebase / data helpers ───────────────────────────────────────────
import { checkDayExists } from "@/lib/firebase/firestore";
import { uploadCsvBackup } from "@/lib/firebase/storage";
import { getIpaUSUK } from "@/lib/utils/ipaLookup";
import { supportsDerivativeCourse } from "@/constants/supportedDerivativeCourses";
import {
  buildDerivativeAwareWordsForUpload,
  type DerivativeSelectionMap,
} from "@/services/vocaSaveService";
import { prepareStandardWordsForUpload } from "@/services/standardWordUpload";

// ── Feature components ────────────────────────────────────────────────
import CourseSelector from "@/components/add-voca/CourseSelector";
import CsvUploadTab, { type CsvItem } from "@/components/add-voca/CsvUploadTab";
import DerivativePreviewDialog from "@/components/add-voca/DerivativePreviewDialog";
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

export default function AddVocaPage() {
  const { t } = useTranslation();

  // ── Upload-queue state ─────────────────────────────────────────────
  // `tabIndex` selects between the CSV (0) and URL (1) input methods.
  // `selectedCourse` drives the Firestore write path and the word schema —
  // COLLOCATIONS uses a different field set than all standard courses.
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<CourseId | "">("CSAT");
  const [csvItems, setCsvItems] = useState<CsvItem[]>([]);
  const [urlItems, setUrlItems] = useState<UrlItem[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);

  // Shown briefly when the user switches courses while items are already queued
  const [courseSwitchNotice, setCourseSwitchNotice] = useState("");

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
    selectedCourse === "COLLOCATIONS"
      ? "collocation"
      : selectedCourse === "FAMOUS_QUOTE"
        ? "famousQuote"
        : "standard";
  const isFamousQuote = selectedCourse === "FAMOUS_QUOTE";

  // Items visible in the currently selected tab
  const currentItems =
    tabIndex === 0 ? csvItems : tabIndex === 1 ? urlItems : quoteItems;

  useEffect(() => {
    // The quote tab exists only for FAMOUS_QUOTE, so leave invalid tab index.
    if (!isFamousQuote && tabIndex > 1) {
      setTabIndex(0);
    }
  }, [isFamousQuote, tabIndex]);

  // Only items that have both a day name and at least one parsed word are
  // eligible for upload — the rest are silently excluded.
  const readyItems = currentItems.filter(
    (item): item is ReadyQueueItem =>
      Boolean(item.dayName && item.data && item.data.words.length > 0),
  );

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
  const runUpload = async (itemsToUpload: QueueItem[]) => {
    if (!selectedCourse || itemsToUpload.length === 0 || uploadingRef.current)
      return;

    const course = getCourseById(selectedCourse);
    if (!course) return;

    uploadingRef.current = true;

    const existsFlags = course.flat
      ? itemsToUpload.map(() => false)
      : await Promise.all(
          itemsToUpload.map((item) => checkDayExists(course.path, item.dayName)),
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

        if (schemaType === "standard") {
          words = await Promise.all(
            words.map(async (w) => {
              const sw = w as StandardWordInput;
              if (sw.pronunciation || sw.word.includes(" ")) return w;
              const ipa = await getIpaUSUK(sw.word);
              return ipa ? { ...w, pronunciation: ipa.us } : w;
            }),
          );

          try {
            const resp = await fetch("/api/admin/enrich", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                words,
                coursePath: course.path,
                dayName: item.dayName,
              }),
            });
            if (resp.ok) {
              const result = await resp.json();
              words = result.words;
            }
          } catch (e) {
            console.error("[Enrich] Failed (non-fatal):", e);
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

    const daysToUpload = queue
      .filter((item) => processedMap.has(item.id))
      .map((item) => ({
        dayName: item.dayName,
        words: processedMap.get(item.id)!,
      }));

    if (daysToUpload.length > 0) {
      setStatusText(t("addVoca.statusWriting"));
      try {
        const batchResp = await fetch("/api/admin/batch-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coursePath: course.path,
            days: daysToUpload,
            flat: course.flat ?? false,
          }),
        });
        if (!batchResp.ok) throw new Error("Batch upload failed");

        const { results } = (await batchResp.json()) as {
          results: { dayName: string; count: number; error?: string }[];
        };

        let successCount = 0;
        let failCount = errorMap.size;
        for (const r of results) {
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
    closeDerivativePreview();
    const expandedItems = buildDerivativeAwareWordsForUpload(
      pendingItems,
      previewItems,
      selections,
    );
    await runUpload(expandedItems);
  };

  const handleUpload = async () => {
    if (!selectedCourse || readyItems.length === 0 || uploadingRef.current)
      return;

    const derivativeEligible =
      schemaType === "standard" &&
      (tabIndex === 0 || tabIndex === 1) &&
      supportsDerivativeCourse(selectedCourse);

    if (!derivativeEligible) {
      await runUpload(readyItems);
      return;
    }

    const derivativeItems = readyItems as ReadyStandardQueueItem[];
    pendingDerivativeItemsRef.current = derivativeItems;
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
        await runUpload(derivativeItems);
        return;
      }

      setDerivativePreviewItems(result.items);
      setDerivativePreviewLoading(false);
    } catch (error) {
      console.error("[add-voca] Derivative preview failed:", error);
      setDerivativePreviewLoading(false);
      closeDerivativePreview();
      await runUpload(derivativeItems);
    }
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
          hideDayInput={isFamousQuote}
          coursePath={isFamousQuote ? (getCourseById(selectedCourse)?.path ?? '') : undefined}
        />
      )}
      {tabIndex === 1 && (
        <UrlUploadTab
          items={urlItems}
          onItemsChange={setUrlItems}
          schemaType={schemaType}
          hideDayInput={isFamousQuote}
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
