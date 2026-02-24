"use client";

import { useState, useRef } from "react";
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
import PageLayout from "@/components/layout/PageLayout";
import CourseSelector from "@/components/add-voca/CourseSelector";
import CsvUploadTab, { type CsvItem } from "@/components/add-voca/CsvUploadTab";
import UrlUploadTab, { type UrlItem } from "@/components/add-voca/UrlUploadTab";
import UploadProgressModal, {
  type ProgressItem,
} from "@/components/add-voca/UploadProgressModal";
import { getCourseById, type CourseId } from "@/types/course";
import { checkDayExists } from "@/lib/firebase/firestore";
import { uploadCsvBackup } from "@/lib/firebase/storage";
import { getIpaUSUK } from "@/lib/utils/ipaLookup";
import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";

type QueueItem = CsvItem | UrlItem;

function isCsvItem(item: QueueItem): item is CsvItem {
  return "fileName" in item;
}

export default function AddVocaPage() {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<CourseId | "">("CSAT");
  const [csvItems, setCsvItems] = useState<CsvItem[]>([]);
  const [urlItems, setUrlItems] = useState<UrlItem[]>([]);
  const [courseSwitchNotice, setCourseSwitchNotice] = useState("");

  // FR-14: Progress modal state
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [progressCounts, setProgressCounts] = useState({
    success: 0,
    failed: 0,
    skipped: 0,
  });
  const [progressDone, setProgressDone] = useState(false);
  const [statusText, setStatusText] = useState("");

  // FR-5: Overwrite confirmation — promise-based so handleUpload can await it
  const [overwriteDialog, setOverwriteDialog] = useState<{
    existingDays: string[];
    resolve: (decision: "overwrite" | "skip" | "cancel") => void;
  } | null>(null);

  const uploadingRef = useRef(false);

  const isCollocation = selectedCourse === 'COLLOCATIONS';
  const currentItems = tabIndex === 0 ? csvItems : urlItems;
  const readyItems = currentItems.filter(
    (item) => item.dayName && item.data && item.data.words.length > 0
  );

  const showOverwriteConfirm = (
    existingDays: string[]
  ): Promise<"overwrite" | "skip" | "cancel"> =>
    new Promise((resolve) => setOverwriteDialog({ existingDays, resolve }));

  const resolveOverwrite = (decision: "overwrite" | "skip" | "cancel") => {
    overwriteDialog?.resolve(decision);
    setOverwriteDialog(null);
  };

  const updateProgressItem = (id: string, patch: Partial<ProgressItem>) => {
    setProgressItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleUpload = async () => {
    if (!selectedCourse || readyItems.length === 0 || uploadingRef.current)
      return;

    const course = getCourseById(selectedCourse);
    if (!course) return;

    uploadingRef.current = true;

    // FR-4: Detect pre-existing day data in Firestore (parallel)
    const existsFlags = await Promise.all(
      readyItems.map((item) => checkDayExists(course.path, item.dayName))
    );
    const existingDays: string[] = readyItems
      .filter((_, i) => existsFlags[i])
      .map((item) => item.dayName);

    // FR-5: Require user confirmation before overwriting
    let skipDays = new Set<string>();
    if (existingDays.length > 0) {
      const decision = await showOverwriteConfirm(existingDays);
      if (decision === "cancel") {
        uploadingRef.current = false;
        return;
      }
      if (decision === "skip") skipDays = new Set(existingDays);
    }

    // Initialise progress modal
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

    // Items to process (excludes skipped)
    const queue = readyItems.filter((item) => !skipDays.has(item.dayName));

    // PHASE 1: Pre-process (Storage backup + IPA + Enrich) with concurrency pool.
    // Enriched words are buffered into processedMap instead of uploaded immediately.
    const CONCURRENCY = 3;
    const processedMap = new Map<string, unknown[]>();
    const errorMap = new Map<string, string>();

    const preprocessItem = async (item: QueueItem) => {
      updateProgressItem(item.id, { status: "processing" });
      try {
        // FR-6: Upload CSV source file to Storage (CSV items only)
        if (isCsvItem(item) && item.file) {
          try {
            await uploadCsvBackup(item.file, course.id, item.dayName);
          } catch (e) {
            console.error("[Storage] Backup upload failed:", e);
          }
        }

        // FR-9: Words are normalised by extractVocaFields inside csvParser
        let words = item.data!.words;

        if (!isCollocation) {
          // FR-10: IPA lookup for single-word entries with missing pronunciation
          words = await Promise.all(
            words.map(async (w) => {
              const sw = w as StandardWordInput;
              if (sw.pronunciation || sw.word.includes(" ")) return w;
              const ipa = await getIpaUSUK(sw.word);
              return ipa ? { ...w, pronunciation: ipa.us } : w;
            })
          );

          // FR-11: Linguistic enrichment via OpenAI (best-effort)
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

    if (queue.length > 0) {
      const pool = [...queue]; // mutable copy consumed by shift()
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

    // Reflect pre-processing failures in count
    if (errorMap.size > 0) {
      setProgressCounts((prev) => ({ ...prev, failed: errorMap.size }));
    }

    // PHASE 2: FR-12 — single batch upload for all successfully pre-processed days.
    // Reduces N individual Firestore write round-trips to one HTTP call.
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

  // Remove succeeded items from queue; keep failed/skipped for retry
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

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("addVoca.title")}
      </Typography>

      <CourseSelector value={selectedCourse} onChange={handleCourseChange} />
      {courseSwitchNotice && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          onClose={() => setCourseSwitchNotice("")}
        >
          {courseSwitchNotice}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
          <Tab label={t("addVoca.csvUpload")} />
          <Tab label={t("addVoca.urlUpload")} />
        </Tabs>
      </Box>

      {tabIndex === 0 && (
        <CsvUploadTab items={csvItems} onItemsChange={setCsvItems} isCollocation={isCollocation} />
      )}
      {tabIndex === 1 && (
        <UrlUploadTab items={urlItems} onItemsChange={setUrlItems} isCollocation={isCollocation} />
      )}

      {/* FR-9: Alert when items exist but none have a day name set */}
      {readyItems.length === 0 && currentItems.length > 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t("addVoca.noDayName")}
        </Alert>
      )}

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

      {/* FR-5: Overwrite confirmation dialog */}
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

      {/* FR-14: Upload progress modal */}
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
