"use client";

import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import { type Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import type { CodeGenerationResponse, PlanType } from "@/types/promotionCode";

// ── Section sub-components ────────────────────────────────────────────
import EventPeriodFields from "./EventPeriodFields";
import PlanSelect from "./PlanSelect";
import DurationFields from "./DurationFields";
import UsageLimitFields from "./UsageLimitFields";
import GenerateSubmitButton from "./GenerateSubmitButton";

interface GenerateTabProps {
  onGenerated: (response: CodeGenerationResponse) => void;
  onError: (message: string) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

const DEFAULTS = {
  startDate: null as Dayjs | null,
  endDate: null as Dayjs | null,
  plan: "voca_unlimited" as PlanType,
  isPermanent: true,
  durationDays: "30",
  maxUses: "100",
  maxUsesPerUser: "1",
  description: "",
  count: "1",
};

export default function GenerateTab({
  onGenerated,
  onError,
  onDirtyChange,
}: GenerateTabProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  // ── Form state ────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState<Dayjs | null>(DEFAULTS.startDate);
  const [endDate, setEndDate] = useState<Dayjs | null>(DEFAULTS.endDate);
  const [plan, setPlan] = useState<PlanType>(DEFAULTS.plan);
  const [isPermanent, setIsPermanent] = useState(DEFAULTS.isPermanent);
  const [durationDays, setDurationDays] = useState(DEFAULTS.durationDays);
  const [maxUses, setMaxUses] = useState(DEFAULTS.maxUses);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState(DEFAULTS.maxUsesPerUser);
  const [description, setDescription] = useState(DEFAULTS.description);
  const [count, setCount] = useState(DEFAULTS.count);

  // ── Dirty tracking ────────────────────────────────────────────────
  const isDirty =
    startDate !== null ||
    endDate !== null ||
    plan !== DEFAULTS.plan ||
    isPermanent !== DEFAULTS.isPermanent ||
    durationDays !== DEFAULTS.durationDays ||
    maxUses !== DEFAULTS.maxUses ||
    maxUsesPerUser !== DEFAULTS.maxUsesPerUser ||
    description !== DEFAULTS.description ||
    count !== DEFAULTS.count;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!description.trim()) {
      onError(t("promotionCodes.descriptionRequired"));
      return;
    }
    const countNum = parseInt(count, 10);
    if (isNaN(countNum) || countNum < 1 || countNum > 100) {
      onError(t("promotionCodes.invalidCount"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/promotion-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventPeriod: {
            startDate: startDate?.format("YYYY-MM-DD") ?? "",
            endDate: endDate?.format("YYYY-MM-DD") ?? "",
          },
          benefit: {
            type: "subscription",
            planId: plan,
            isPermanent,
            ...(isPermanent
              ? {}
              : { durationDays: parseInt(durationDays, 10) }),
          },
          maxUses: parseInt(maxUses, 10),
          maxUsesPerUser: parseInt(maxUsesPerUser, 10),
          description: description.trim(),
          count: countNum,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t("promotionCodes.generateError"));
      }

      const data: CodeGenerationResponse = await res.json();
      onGenerated(data);
      setDescription("");
      setCount("1");
    } catch (err: unknown) {
      onError(
        err instanceof Error ? err.message : t("promotionCodes.generateError"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        {t("promotionCodes.generate")}
      </Typography>
      <Divider sx={{ mb: 3 }} />

      <Stack spacing={3} maxWidth={560}>
        {/* Event Period — start/end date pickers */}
        <EventPeriodFields
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />

        {/* Plan — subscription plan selector */}
        <PlanSelect value={plan} onChange={setPlan} />

        {/* Duration — permanent toggle + conditional days input */}
        <DurationFields
          isPermanent={isPermanent}
          durationDays={durationDays}
          onIsPermanentChange={setIsPermanent}
          onDurationDaysChange={setDurationDays}
        />

        {/* Usage Limits — max uses + max uses per user */}
        <UsageLimitFields
          maxUses={maxUses}
          maxUsesPerUser={maxUsesPerUser}
          onMaxUsesChange={setMaxUses}
          onMaxUsesPerUserChange={setMaxUsesPerUser}
        />

        {/* Description */}
        <TextField
          label={t("promotionCodes.description")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          fullWidth
          multiline
          rows={2}
        />

        {/* Count */}
        <TextField
          label={t("promotionCodes.count")}
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          fullWidth
          slotProps={{
            htmlInput: { min: 1, max: 100, style: { textAlign: "center", MozAppearance: "textfield" } },
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setCount(String(Math.max(1, Number(count) - 1)))}
                    disabled={Number(count) <= 1}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => setCount(String(Math.min(100, Number(count) + 1)))}
                    disabled={Number(count) >= 100}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{
            "& input[type=number]::-webkit-outer-spin-button": { display: "none" },
            "& input[type=number]::-webkit-inner-spin-button": { display: "none" },
          }}
        />

        {/* Submit */}
        <GenerateSubmitButton loading={loading} onClick={handleSubmit} />
      </Stack>
    </Box>
  );
}
