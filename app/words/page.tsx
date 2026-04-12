"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import DerivativeGenerationDialog from "@/components/derivatives/DerivativeGenerationDialog";
import PageLayout from "@/components/layout/PageLayout";
import WordFinderFilters from "@/components/words/WordFinderFilters";
import WordFinderMissingFieldDialog from "@/components/words/WordFinderMissingFieldDialog";
import WordFinderTable from "@/components/words/WordFinderTable";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import {
  buildDerivativePreviewRequestItems,
  buildDerivativeUpdatesFromPreview,
  requestDerivativePreview,
} from "@/lib/derivativeGeneration";
import { updateWordDerivatives } from "@/lib/firebase/firestore";
import {
  applyWordFinderResultUpdates,
  formatWordFinderLocation,
  getWordFinderResultKey,
} from "@/lib/wordFinderMissingFieldActions";
import type {
  WordFinderActionField,
  WordFinderMissingField,
  WordFinderResponse,
  WordFinderResult,
  WordFinderResultFieldUpdates,
  WordFinderType,
} from "@/types/wordFinder";
import type { DerivativePreviewItemResult } from "@/types/vocabulary";

function getSearchParamValue(value: string | null, fallback: string): string {
  return value && value.trim() ? value : fallback;
}

interface WordsPageContentProps {
  appliedSearch: string;
  appliedCourseId: string;
  appliedType: "all" | WordFinderType;
  appliedMissingField: WordFinderMissingField;
}

function WordsPageContent({
  appliedSearch,
  appliedCourseId,
  appliedType,
  appliedMissingField,
}: WordsPageContentProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const hasCriteria = useMemo(
    () =>
      Boolean(
        appliedSearch.trim() ||
          appliedCourseId !== "all" ||
          appliedType !== "all" ||
          appliedMissingField !== "all",
      ),
    [appliedCourseId, appliedMissingField, appliedSearch, appliedType],
  );

  const [search, setSearch] = useState(appliedSearch);
  const [courseId, setCourseId] = useState(appliedCourseId);
  const [type, setType] = useState<"all" | WordFinderType>(appliedType);
  const [missingField, setMissingField] =
    useState<WordFinderMissingField>(appliedMissingField);
  const [results, setResults] = useState<WordFinderResult[]>([]);
  const [loading, setLoading] = useState(hasCriteria);
  const [hasError, setHasError] = useState(false);
  const [total, setTotal] = useState(0);
  const [limited, setLimited] = useState(false);
  const [activeField, setActiveField] = useState<WordFinderActionField | null>(null);
  const [activeResultKey, setActiveResultKey] = useState("");
  const [derivativeDialogOpen, setDerivativeDialogOpen] = useState(false);
  const [derivativeDialogLoading, setDerivativeDialogLoading] = useState(false);
  const [derivativeDialogSaving, setDerivativeDialogSaving] = useState(false);
  const [derivativeDialogItems, setDerivativeDialogItems] = useState<
    DerivativePreviewItemResult[]
  >([]);
  const [derivativeDialogError, setDerivativeDialogError] = useState("");
  const [derivativeTargetKeys, setDerivativeTargetKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!hasCriteria) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();

    if (appliedSearch.trim()) {
      params.set("q", appliedSearch.trim());
    }
    if (appliedCourseId !== "all") {
      params.set("courseId", appliedCourseId);
    }
    if (appliedType !== "all") {
      params.set("type", appliedType);
    }
    if (appliedMissingField !== "all") {
      params.set("missingField", appliedMissingField);
    }

    fetch(`/api/admin/words?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error();
        }

        const data = (await response.json()) as WordFinderResponse;
        setResults(data.results);
        setTotal(data.total);
        setLimited(data.limited);
        setHasError(false);
      })
      .catch((fetchError: unknown) => {
        if (
          fetchError &&
          typeof fetchError === "object" &&
          "name" in fetchError &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setHasError(true);
        setResults([]);
        setTotal(0);
        setLimited(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    appliedCourseId,
    appliedMissingField,
    appliedSearch,
    appliedType,
    hasCriteria,
  ]);

  const handleSubmit = useCallback(() => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("q", search.trim());
    }
    if (courseId !== "all") {
      params.set("courseId", courseId);
    }
    if (type !== "all") {
      params.set("type", type);
    }
    if (missingField !== "all") {
      params.set("missingField", missingField);
    }

    const nextUrl = params.toString() ? `/words?${params.toString()}` : "/words";
    router.replace(nextUrl);
  }, [courseId, missingField, router, search, type]);

  const handleReset = useCallback(() => {
    setSearch("");
    setCourseId("all");
    setType("all");
    setMissingField("all");
    router.replace("/words");
  }, [router]);

  const activeResult = useMemo(
    () =>
      results.find((result) => getWordFinderResultKey(result) === activeResultKey) ??
      null,
    [activeResultKey, results],
  );

  const handleMissingFieldClick = useCallback(
    (result: WordFinderResult, field: WordFinderActionField) => {
      if (field === "derivative") {
        setDerivativeTargetKeys([getWordFinderResultKey(result)]);
        setDerivativeDialogOpen(true);
        setDerivativeDialogLoading(true);
        setDerivativeDialogSaving(false);
        setDerivativeDialogItems([]);
        setDerivativeDialogError("");

        void requestDerivativePreview(
          result.courseId,
          buildDerivativePreviewRequestItems([result], () =>
            formatWordFinderLocation(result, t("words.noDay")),
          ),
        )
          .then((preview) => {
            setDerivativeDialogItems(preview.items);
          })
          .catch((error) => {
            setDerivativeDialogError(
              error instanceof Error
                ? error.message
                : t("words.generateActionError"),
            );
          })
          .finally(() => {
            setDerivativeDialogLoading(false);
          });
        return;
      }

      setActiveResultKey(getWordFinderResultKey(result));
      setActiveField(field);
    },
    [t],
  );

  const handleAddFuriganaClick = useCallback(
    (
      result: WordFinderResult,
      field: Extract<WordFinderActionField, "pronunciation" | "example">,
    ) => {
      setActiveResultKey(getWordFinderResultKey(result));
      setActiveField(field);
    },
    [],
  );

  const handleModalClose = useCallback(() => {
    setActiveField(null);
    setActiveResultKey("");
  }, []);

  const handleDerivativeDialogClose = useCallback(() => {
    if (derivativeDialogSaving) return;
    setDerivativeDialogOpen(false);
    setDerivativeDialogLoading(false);
    setDerivativeDialogSaving(false);
    setDerivativeDialogItems([]);
    setDerivativeDialogError("");
    setDerivativeTargetKeys([]);
  }, [derivativeDialogSaving]);

  const handleResultResolved = useCallback(
    (updates: WordFinderResultFieldUpdates) => {
      setResults((prev) =>
        prev.map((result) =>
          getWordFinderResultKey(result) === activeResultKey
            ? applyWordFinderResultUpdates(result, updates)
            : result,
        ),
      );
    },
    [activeResultKey],
  );

  const handleDerivativeConfirm = useCallback(
    async (selectionMap: Record<string, Record<string, Record<string, boolean>>>) => {
      const targetResults = results.filter((result) =>
        derivativeTargetKeys.includes(getWordFinderResultKey(result)),
      );

      if (targetResults.length === 0) {
        handleDerivativeDialogClose();
        return;
      }

      setDerivativeDialogSaving(true);
      setDerivativeDialogError("");

      try {
        const updates = buildDerivativeUpdatesFromPreview(
          targetResults,
          derivativeDialogItems,
          selectionMap,
        );

        await Promise.all(
          updates.map(async (update) => {
            const target = targetResults.find((result) => result.id === update.id);
            if (!target?.dayId) return;
            await updateWordDerivatives(
              target.coursePath,
              target.dayId,
              target.id,
              update.derivative,
            );
          }),
        );

        const updateMap = new Map(
          updates.map((update) => [update.id, update.derivative]),
        );

        setResults((prev) =>
          prev.map((result) =>
            updateMap.has(result.id)
              ? applyWordFinderResultUpdates(result, {
                  derivative: updateMap.get(result.id) ?? [],
                })
              : result,
          ),
        );

        handleDerivativeDialogClose();
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
      derivativeDialogItems,
      derivativeTargetKeys,
      handleDerivativeDialogClose,
      results,
      t,
    ],
  );


  return (
    <PageLayout>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {t("words.title")}
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t("words.description")}
      </Typography>

      <WordFinderFilters
        search={search}
        courseId={courseId}
        type={type}
        missingField={missingField}
        isSubmitting={loading}
        onSearchChange={setSearch}
        onCourseIdChange={setCourseId}
        onTypeChange={setType}
        onMissingFieldChange={setMissingField}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {hasError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t("words.fetchError")}
        </Alert>
      )}

      {!hasCriteria ? (
        <Alert severity="info">{t("words.enterCriteria")}</Alert>
      ) : loading ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : results.length === 0 ? (
        <Alert severity="info">{t("words.noResults")}</Alert>
      ) : (
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {t("words.resultsCount", { count: total })}
          </Typography>
          {limited && <Alert severity="warning">{t("words.resultsLimited")}</Alert>}
          <WordFinderTable
            results={results}
            activeMissingField={missingField}
            onMissingFieldClick={handleMissingFieldClick}
            onAddFuriganaClick={handleAddFuriganaClick}
          />
        </Stack>
      )}

      <WordFinderMissingFieldDialog
        open={Boolean(activeField && activeResult)}
        field={activeField}
        result={activeResult}
        onClose={handleModalClose}
        onResolved={handleResultResolved}
      />

      <DerivativeGenerationDialog
        open={derivativeDialogOpen}
        loading={derivativeDialogLoading}
        saving={derivativeDialogSaving}
        items={derivativeDialogItems}
        error={derivativeDialogError}
        onClose={handleDerivativeDialogClose}
        onConfirm={handleDerivativeConfirm}
      />
    </PageLayout>
  );
}

export default function WordsPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { user, authLoading } = useAdminGuard();

  const appliedSearch = getSearchParamValue(searchParams.get("q"), "");
  const appliedCourseId = getSearchParamValue(searchParams.get("courseId"), "all");
  const appliedType = getSearchParamValue(searchParams.get("type"), "all") as
    | "all"
    | WordFinderType;
  const appliedMissingField = getSearchParamValue(
    searchParams.get("missingField"),
    "all",
  ) as WordFinderMissingField;

  if (authLoading) {
    return (
      <PageLayout>
        <Typography variant="h4" gutterBottom fontWeight={600}>
          {t("words.title")}
        </Typography>
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      </PageLayout>
    );
  }

  if (user?.role === "user") return null;

  return (
    <WordsPageContent
      key={[
        appliedSearch,
        appliedCourseId,
        appliedType,
        appliedMissingField,
      ].join("|")}
      appliedSearch={appliedSearch}
      appliedCourseId={appliedCourseId}
      appliedType={appliedType}
      appliedMissingField={appliedMissingField}
    />
  );
}
