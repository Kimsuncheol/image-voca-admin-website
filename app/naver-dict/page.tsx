"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import { useAdminGuard } from "@/hooks/useAdminGuard";

type SearchMode = "simple" | "detailed";
const fallbackDictType = "english";
const defaultDictTypeOptions = [
  "english",
  "korean",
  "japanese",
  "hanja",
  "chinese",
  "german",
  "french",
  "spanish",
  "russian",
  "vietnamese",
  "italian",
  "thai",
  "indonesian",
  "uzbek",
] as const;

interface ResponseState {
  loading: boolean;
  status: number | null;
  payload: unknown;
  error: string;
}

const initialResponseState: ResponseState = {
  loading: false,
  status: null,
  payload: null,
  error: "",
};

export function formatPayload(payload: unknown): string {
  if (payload === undefined) {
    return "undefined";
  }

  if (typeof payload === "string") {
    return payload;
  }

  try {
    const formatted = JSON.stringify(payload, null, 2);
    return formatted ?? String(payload);
  } catch {
    return String(payload);
  }
}

export function extractDictTypeOptions(payload: unknown): string[] {
  const rawItems = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        "types" in payload &&
        Array.isArray((payload as { types?: unknown }).types)
      ? (payload as { types: unknown[] }).types
      : [];

  return Array.from(
    new Set(
      rawItems
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

export function mergeDictTypeOptions(payload: unknown): string[] {
  return Array.from(
    new Set([...defaultDictTypeOptions, ...extractDictTypeOptions(payload)]),
  );
}

function ResponsePreview({
  title,
  state,
  emptyText,
}: {
  title: string;
  state: ResponseState;
  emptyText: string;
}) {
  const hasPayload = state.payload !== null;

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>
        {state.status !== null && (
          <Chip
            size="small"
            color={state.status >= 400 ? "error" : "success"}
            label={`HTTP ${state.status}`}
          />
        )}
      </Stack>

      {state.error ? <Alert severity="error">{state.error}</Alert> : null}

      <Box
        component="pre"
        sx={(theme) => ({
          m: 0,
          p: 2,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor:
            theme.palette.mode === "dark"
              ? "rgba(255, 255, 255, 0.06)"
              : "rgba(0, 0, 0, 0.03)",
          color: theme.palette.text.primary,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: "0.875rem",
          fontFamily: "monospace",
          overflowX: "auto",
          minHeight: 160,
        })}
      >
        {hasPayload ? formatPayload(state.payload) : emptyText}
      </Box>
    </Stack>
  );
}

export default function NaverDictPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();

  const [typesState, setTypesState] = useState<ResponseState>(initialResponseState);
  const [query, setQuery] = useState("");
  const [dictType, setDictType] = useState(fallbackDictType);
  const [dictTypeOptions, setDictTypeOptions] = useState<string[]>([
    ...defaultDictTypeOptions,
  ]);
  const [dictTypeOptionsLoading, setDictTypeOptionsLoading] = useState(false);
  const [dictTypeOptionsError, setDictTypeOptionsError] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("simple");
  const [searchState, setSearchState] =
    useState<ResponseState>(initialResponseState);

  const searchQueryString = useMemo(() => {
    const params = new URLSearchParams({
      query: query.trim(),
      dict_type: dictType.trim() || fallbackDictType,
      search_mode: searchMode,
    });

    return params.toString();
  }, [dictType, query, searchMode]);

  function applyDictTypeOptions(payload: unknown, preferDefault: boolean) {
    const extractedOptions = mergeDictTypeOptions(payload);

    if (extractedOptions.length === 0) {
      setDictTypeOptions([...defaultDictTypeOptions]);
      setDictType(fallbackDictType);
      setDictTypeOptionsError(
        t(
          "naverDict.dictTypeOptionsEmpty",
          "No additional dictionary types were returned. Using the built-in list.",
        ),
      );
      return;
    }

    setDictTypeOptions(extractedOptions);
    setDictTypeOptionsError("");
    setDictType((current) => {
      if (!preferDefault && extractedOptions.includes(current)) {
        return current;
      }

      if (extractedOptions.includes(fallbackDictType)) {
        return fallbackDictType;
      }

      return extractedOptions[0];
    });
  }

  async function fetchDictTypes(preferDefault: boolean) {
    setDictTypeOptionsLoading(true);
    setTypesState((current) => ({
      ...current,
      loading: true,
      error: "",
    }));

    try {
      const response = await fetch("/api/admin/naver-dict/types", {
        cache: "no-store",
      });
      const payload = (await response.json()) as unknown;

      applyDictTypeOptions(payload, preferDefault);

      setTypesState({
        loading: false,
        status: response.status,
        payload,
        error: "",
      });
    } catch {
      setDictTypeOptions([...defaultDictTypeOptions]);
      setDictType(fallbackDictType);
      setDictTypeOptionsError(
        t(
          "naverDict.dictTypeOptionsLoadError",
          "Couldn't load dictionary types. Using the built-in list.",
        ),
      );
      setTypesState({
        loading: false,
        status: null,
        payload: null,
        error: t("naverDict.networkError"),
      });
    } finally {
      setDictTypeOptionsLoading(false);
    }
  }

  useEffect(() => {
    void fetchDictTypes(true);
  }, []);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      setSearchState({
        loading: false,
        status: null,
        payload: null,
        error: t("naverDict.queryRequired"),
      });
      return;
    }

    setSearchState({
      loading: true,
      status: null,
      payload: null,
      error: "",
    });

    try {
      const response = await fetch(
        `/api/admin/naver-dict/search?${searchQueryString}`,
        {
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as unknown;

      setSearchState({
        loading: false,
        status: response.status,
        payload,
        error: "",
      });
    } catch {
      setSearchState({
        loading: false,
        status: null,
        payload: null,
        error: t("naverDict.networkError"),
      });
    }
  }

  function handleResetSearch() {
    setQuery("");
    setDictType(
      dictTypeOptions.includes(fallbackDictType)
        ? fallbackDictType
        : dictTypeOptions[0] ?? fallbackDictType,
    );
    setSearchMode("simple");
    setSearchState(initialResponseState);
  }

  if (authLoading) return null;
  if (user?.role !== "admin" && user?.role !== "super-admin") return null;

  return (
    <PageLayout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {t("naverDict.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("naverDict.description")}
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {t("naverDict.dictTypesTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("naverDict.dictTypesDescription")}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2} alignItems="center">
                <Button
                  variant="contained"
                  onClick={() => void fetchDictTypes(false)}
                  disabled={typesState.loading}
                >
                  {typesState.loading
                    ? t("naverDict.loading")
                    : t("naverDict.fetchTypes")}
                </Button>
              </Stack>

              <ResponsePreview
                title={t("naverDict.responseTitle")}
                state={typesState}
                emptyText={t("naverDict.emptyTypes")}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  {t("naverDict.searchTitle")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("naverDict.searchDescription")}
                </Typography>
              </Box>

              <Box component="form" onSubmit={handleSearch}>
                <Stack spacing={2}>
                  <TextField
                    label={t("naverDict.queryLabel")}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    required
                    fullWidth
                  />

                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems="stretch"
                  >
                    <TextField
                      select
                      slotProps={{ select: { native: true } }}
                      label={t("naverDict.dictTypeLabel")}
                      value={dictType}
                      onChange={(event) => setDictType(event.target.value)}
                      disabled={dictTypeOptionsLoading}
                      helperText={
                        dictTypeOptionsError
                          ? dictTypeOptionsError
                          : t(
                              "naverDict.dictTypeHelper",
                              "Choose one of the available dictionary types.",
                            )
                      }
                      fullWidth
                    >
                      {dictTypeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </TextField>

                    <TextField
                      select
                      label={t("naverDict.searchModeLabel")}
                      value={searchMode}
                      onChange={(event) =>
                        setSearchMode(event.target.value as SearchMode)
                      }
                      fullWidth
                    >
                      <MenuItem value="simple">
                        {t("naverDict.searchModeSimple")}
                      </MenuItem>
                      <MenuItem value="detailed">
                        {t("naverDict.searchModeDetailed")}
                      </MenuItem>
                    </TextField>
                  </Stack>

                  <Stack direction="row" spacing={2}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={searchState.loading}
                    >
                      {searchState.loading
                        ? t("naverDict.loading")
                        : t("naverDict.searchAction")}
                    </Button>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={handleResetSearch}
                      disabled={searchState.loading}
                    >
                      {t("naverDict.resetAction")}
                    </Button>
                  </Stack>
                </Stack>
              </Box>

              <Divider />

              <ResponsePreview
                title={t("naverDict.responseTitle")}
                state={searchState}
                emptyText={t("naverDict.emptySearch")}
              />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </PageLayout>
  );
}
