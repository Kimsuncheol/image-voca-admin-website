"use client";

/**
 * AddVocaPage  —  /add-voca
 *
 * Admin page for bulk-uploading vocabulary day data into Firestore.
 * Supports two input methods: CSV file upload and Google Sheets URL import.
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

// ── Navigation guard ──────────────────────────────────────────────────
import {
  setNavigationGuard,
  clearNavigationGuard,
} from "@/lib/navigationGuard";

// ── Firebase / data helpers ───────────────────────────────────────────
import { checkDayExists } from "@/lib/firebase/firestore";
import { uploadCsvBackup } from "@/lib/firebase/storage";
import { getIpaUSUK } from "@/lib/utils/ipaLookup";

// ── Feature components ────────────────────────────────────────────────
import CourseSelector from "@/components/add-voca/CourseSelector";
import CsvUploadTab, { type CsvItem } from "@/components/add-voca/CsvUploadTab";
import UrlUploadTab, { type UrlItem } from "@/components/add-voca/UrlUploadTab";
import UploadProgressModal, {
  type ProgressItem,
} from "@/components/add-voca/UploadProgressModal";

// ── Local type alias ───────────────────────────────────────────────────
// An item in the upload queue is either a parsed CSV or a resolved URL entry.
type QueueItem = CsvItem | UrlItem;

/**
 * Type guard — returns true when `item` originated from a CSV file upload.
 * CSV items carry a `fileName` property; URL items carry a `url` property.
 * Used to conditionally back up the source file to Firebase Storage (FR-6).
 */
function isCsvItem(item: QueueItem): item is CsvItem {
  return "fileName" in item;
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

  // ── Browser unload guard ───────────────────────────────────────────
  // Show a native "Leave site?" prompt when the user tries to refresh or
  // close the tab while items are queued or an upload is in progress.
  useEffect(() => {
    const hasUnsaved =
      csvItems.length > 0 || urlItems.length > 0 || progressOpen;

    if (!hasUnsaved) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // returnValue is required for legacy browsers; modern ones ignore the string.
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [csvItems.length, urlItems.length, progressOpen]);

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
      csvItems.length > 0 || urlItems.length > 0 || progressOpen;

    if (hasUnsaved) {
      setNavigationGuard(() =>
        window.confirm(
          t(
            "addVoca.leaveConfirm",
            "You have items waiting to upload. If you leave, they will be lost."
          )
        )
      );
    } else {
      clearNavigationGuard();
    }

    return () => clearNavigationGuard();
  }, [csvItems.length, urlItems.length, progressOpen, t]);

  // ── Derived state ──────────────────────────────────────────────────
  // `isCollocation` skips IPA lookup + OpenAI enrichment (different schema)
  const isCollocation = selectedCourse === "COLLOCATIONS";

  // Items visible in the currently selected tab
  const currentItems = tabIndex === 0 ? csvItems : urlItems;

  // Only items that have both a day name and at least one parsed word are
  // eligible for upload — the rest are silently excluded.
  const readyItems = currentItems.filter(
    (item) => item.dayName && item.data && item.data.words.length > 0
  );

  // ── Overwrite dialog helpers ───────────────────────────────────────

  /**
   * Opens the overwrite confirmation dialog and returns a Promise that
   * resolves once the user clicks one of the three action buttons.
   * `handleUpload` awaits this promise to pause the upload pipeline.
   */
  const showOverwriteConfirm = (
    existingDays: string[]
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
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  // ── Upload orchestration ───────────────────────────────────────────

  /**
   * Main upload handler. Orchestrates the two-phase pipeline:
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
   *
   * Guards:
   *   - Requires a selected course and at least one ready item.
   *   - `uploadingRef` prevents re-entrant calls.
   *   - If existing days are detected (FR-4), the overwrite dialog is
   *     shown and awaited before proceeding (FR-5).
   */
  const handleUpload = async () => {
    if (!selectedCourse || readyItems.length === 0 || uploadingRef.current)
      return;

    const course = getCourseById(selectedCourse);
    if (!course) return;

    uploadingRef.current = true;

    // FR-4: Check which day names already exist in Firestore (parallel)
    const existsFlags = await Promise.all(
      readyItems.map((item) => checkDayExists(course.path, item.dayName))
    );
    const existingDays: string[] = readyItems
      .filter((_, i) => existsFlags[i])
      .map((item) => item.dayName);

    // FR-5: If any days already exist, ask the user what to do
    let skipDays = new Set<string>();
    if (existingDays.length > 0) {
      const decision = await showOverwriteConfirm(existingDays);
      if (decision === "cancel") {
        uploadingRef.current = false;
        return;
      }
      if (decision === "skip") skipDays = new Set(existingDays);
    }

    // Initialise progress modal with one entry per ready item.
    // Items in skipDays start as "skipped" immediately.
    const initial: ProgressItem[] = readyItems.map((item) => ({
      id: item.id,
      label: isCsvItem(item) ? item.fileName : item.url,
      dayName: item.dayName,
      status: skipDays.has(item.dayName) ? "skipped" : "pending",
    }));
    setProgressItems(initial);
    setProgressCounts({ success: 0, failed: 0, skipped: skipDays.size });
    setProgressDone(false);
    setStatusText(t("addVoca.statusProcessing"));
    setProgressOpen(true);

    // Items that need actual processing (skipped days are excluded)
    const queue = readyItems.filter((item) => !skipDays.has(item.dayName));

    // ── PHASE 1: Pre-processing ────────────────────────────────────
    // Each item is pre-processed in a rolling concurrency pool of size 3.
    // Results are buffered in processedMap; failures are tracked in errorMap.
    const CONCURRENCY = 3;
    const processedMap = new Map<string, unknown[]>();
    const errorMap = new Map<string, string>();

    /**
     * Pre-processes a single queue item:
     *   1. Optionally backs up its source CSV to Firebase Storage (FR-6).
     *   2. Resolves IPA for standard (non-collocation) words (FR-10).
     *   3. Enriches standard words via OpenAI (best-effort, FR-11).
     * On success, the enriched word array is stored in `processedMap`.
     * On failure, the error message is stored in `errorMap`.
     */
    const preprocessItem = async (item: QueueItem) => {
      updateProgressItem(item.id, { status: "processing" });
      try {
        // FR-6: Upload the original CSV file to Storage as an audit backup.
        // Non-fatal: a failed backup does not abort the upload pipeline.
        if (isCsvItem(item) && item.file) {
          try {
            await uploadCsvBackup(item.file, course.id, item.dayName);
          } catch (e) {
            console.error("[Storage] Backup upload failed:", e);
          }
        }

        // FR-9: Words arrive pre-normalised by extractVocaFields in csvParser
        let words = item.data!.words;

        if (!isCollocation) {
          // FR-10: Auto-fill pronunciation for simple (single-word) entries.
          // Multi-word phrases are skipped because IPA lookup is word-level.
          words = await Promise.all(
            words.map(async (w) => {
              const sw = w as StandardWordInput;
              if (sw.pronunciation || sw.word.includes(" ")) return w;
              const ipa = await getIpaUSUK(sw.word);
              return ipa ? { ...w, pronunciation: ipa.us } : w;
            })
          );

          // FR-11: Send words to OpenAI for linguistic enrichment.
          // Non-fatal: a failed enrichment does not abort the upload pipeline.
          try {
            const resp = await fetch("/api/admin/enrich", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ words }),
            });
            if (resp.ok) {
              const result = await resp.json();
              words = result.words;
            }
          } catch (e) {
            console.error("[Enrich] Failed (non-fatal):", e);
          }
        }

        processedMap.set(item.id, words);
      } catch (e) {
        console.error(`[Preprocess] ${item.dayName} failed:`, e);
        const msg = e instanceof Error ? e.message : String(e);
        errorMap.set(item.id, msg);
        updateProgressItem(item.id, { status: "failed", error: msg });
      }
    };

    // Rolling concurrency pool: keeps up to CONCURRENCY tasks in-flight.
    // When a task finishes, the next one from `pool` is started immediately,
    // rather than waiting for an entire batch to finish. This is more
    // efficient for items with variable latency (e.g. network I/O).
    if (queue.length > 0) {
      const pool = [...queue]; // mutable copy consumed via shift()
      const total = pool.length;
      let done = 0;
      let resolveAll!: () => void;
      const allDone = new Promise<void>((res) => { resolveAll = res; });
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

    // Surface pre-processing failures in the progress counter
    if (errorMap.size > 0) {
      setProgressCounts((prev) => ({ ...prev, failed: errorMap.size }));
    }

    // ── PHASE 2: Batch upload (FR-12) ──────────────────────────────
    // Collect all items that survived pre-processing, then POST them all
    // in a single request to reduce Firestore round-trips from N→1.
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
          body: JSON.stringify({ coursePath: course.path, days: daysToUpload }),
        });
        if (!batchResp.ok) throw new Error("Batch upload failed");

        const { results } = (await batchResp.json()) as {
          results: { dayName: string; count: number; error?: string }[];
        };

        // Apply per-day results back to the progress list
        let successCount = 0;
        let failCount = errorMap.size;
        for (const r of results) {
          const item = queue.find((q) => q.dayName === r.dayName);
          if (!item) continue;
          if (r.error) {
            updateProgressItem(item.id, { status: "failed", error: r.error });
            failCount++;
          } else {
            updateProgressItem(item.id, { status: "success", wordCount: r.count });
            successCount++;
          }
        }
        setProgressCounts((prev) => ({
          ...prev,
          success: successCount,
          failed: failCount,
        }));
      } catch (e) {
        // Treat a batch-level failure as a failure for every pending day
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

  // ── Event handlers ─────────────────────────────────────────────────

  /**
   * Called when the progress modal is closed after upload completes.
   * Removes successfully uploaded items from both queues so they don't
   * reappear on the next visit. Failed or skipped items are kept for retry.
   */
  const handleProgressClose = () => {
    const succeededDays = new Set(
      progressItems
        .filter((p) => p.status === "success")
        .map((p) => p.dayName)
    );
    setCsvItems((prev) => prev.filter((i) => !succeededDays.has(i.dayName)));
    setUrlItems((prev) => prev.filter((i) => !succeededDays.has(i.dayName)));
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
    const hasQueuedItems = csvItems.length > 0 || urlItems.length > 0;
    setSelectedCourse(courseId);
    setCsvItems([]);
    setUrlItems([]);
    setCourseSwitchNotice(
      hasQueuedItems ? t("addVoca.queueClearedOnCourseChange") : ""
    );
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
        </Tabs>
      </Box>

      {/* ── Tab panels ─────────────────────────────────────────────────── */}
      {tabIndex === 0 && (
        <CsvUploadTab items={csvItems} onItemsChange={setCsvItems} isCollocation={isCollocation} />
      )}
      {tabIndex === 1 && (
        <UrlUploadTab items={urlItems} onItemsChange={setUrlItems} isCollocation={isCollocation} />
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
          disabled={!selectedCourse || readyItems.length === 0}
        >
          {t("addVoca.upload")}
        </Button>
      </Box>

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
