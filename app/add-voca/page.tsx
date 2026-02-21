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

    // FR-4: Detect pre-existing day data in Firestore
    const existingDays: string[] = [];
    for (const item of readyItems) {
      const exists = await checkDayExists(course.path, item.dayName);
      if (exists) existingDays.push(item.dayName);
    }

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
    setStatusText("");
    setProgressOpen(true);

    let success = 0;
    let failed = 0;
    const skipped = skipDays.size;

    for (const item of readyItems) {
      if (skipDays.has(item.dayName)) continue;

      updateProgressItem(item.id, { status: "processing" });
      setStatusText(`${t("addVoca.statusProcessing")} ${item.dayName}…`);

      try {
        // FR-6: Upload CSV source file to Storage (CSV items only)
        if (isCsvItem(item) && item.file) {
          setStatusText(`${t("addVoca.statusStorage")} ${item.dayName}…`);
          try {
            await uploadCsvBackup(item.file, course.id, item.dayName);
          } catch (e) {
            // Non-fatal: log and continue
            console.error("[Storage] Backup upload failed:", e);
          }
        }

        // FR-9: Words are normalised by extractVocaFields inside csvParser
        let words = item.data!.words;

        if (!isCollocation) {
          // FR-10: IPA lookup for single-word entries with missing pronunciation
          setStatusText(`${t("addVoca.statusIpa")} ${item.dayName}…`);
          words = await Promise.all(
            words.map(async (w) => {
              const sw = w as StandardWordInput;
              if (sw.pronunciation || sw.word.includes(" ")) return w;
              const ipa = await getIpaUSUK(sw.word);
              return ipa ? { ...w, pronunciation: ipa.us } : w;
            })
          );

          // FR-11: Linguistic enrichment via OpenAI (best-effort)
          setStatusText(`${t("addVoca.statusEnrich")} ${item.dayName}…`);
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

        // FR-12: Write to Firestore (upload route handles FR-8 clear + FR-13 metadata)
        setStatusText(`${t("addVoca.statusWriting")} ${item.dayName}…`);
        const uploadResp = await fetch("/api/admin/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coursePath: course.path,
            dayName: item.dayName,
            words,
          }),
        });

        if (!uploadResp.ok) throw new Error("Upload failed");

        const { count } = await uploadResp.json();
        updateProgressItem(item.id, { status: "success", wordCount: count });
        success++;
      } catch (e) {
        console.error(`[Upload] ${item.dayName} failed:`, e);
        updateProgressItem(item.id, {
          status: "failed",
          error: e instanceof Error ? e.message : String(e),
        });
        failed++;
      }

      setProgressCounts({ success, failed, skipped });
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

  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("addVoca.title")}
      </Typography>

      <CourseSelector value={selectedCourse} onChange={setSelectedCourse} />

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
