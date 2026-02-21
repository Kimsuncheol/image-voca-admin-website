"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "react-i18next";
import type { CodeGenerationResponse, PlanType } from "@/types/promotionCode";

interface GenerateTabProps {
  onGenerated: (response: CodeGenerationResponse) => void;
  onError: (message: string) => void;
}

export default function GenerateTab({ onGenerated, onError }: GenerateTabProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [plan, setPlan] = useState<PlanType>("voca_unlimited");
  const [isPermanent, setIsPermanent] = useState(true);
  const [durationDays, setDurationDays] = useState("30");
  const [maxUses, setMaxUses] = useState("100");
  const [maxUsesPerUser, setMaxUsesPerUser] = useState("1");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState("1");

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
          eventPeriod: { startDate, endDate },
          benefit: {
            type: "subscription",
            planId: plan,
            isPermanent,
            ...(isPermanent ? {} : { durationDays: parseInt(durationDays, 10) }),
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
      onError(err instanceof Error ? err.message : t("promotionCodes.generateError"));
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
        {/* Event Period */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label={t("promotionCodes.startDate")}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label={t("promotionCodes.endDate")}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </Stack>

        {/* Plan */}
        <FormControl fullWidth>
          <InputLabel>{t("promotionCodes.plan")}</InputLabel>
          <Select
            value={plan}
            label={t("promotionCodes.plan")}
            onChange={(e) => setPlan(e.target.value as PlanType)}
          >
            <MenuItem value="voca_unlimited">Voca Unlimited</MenuItem>
            <MenuItem value="voca_speaking">Voca Speaking</MenuItem>
          </Select>
        </FormControl>

        {/* Duration */}
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={isPermanent}
                onChange={(e) => setIsPermanent(e.target.checked)}
              />
            }
            label={t("promotionCodes.permanent")}
          />
          {!isPermanent && (
            <TextField
              label={t("promotionCodes.durationDays")}
              type="number"
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              inputProps={{ min: 1 }}
              fullWidth
              sx={{ mt: 2 }}
            />
          )}
        </Box>

        {/* Usage Limits */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label={t("promotionCodes.maxUses")}
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            inputProps={{ min: 0 }}
            fullWidth
          />
          <TextField
            label={t("promotionCodes.maxUsesPerUser")}
            type="number"
            value={maxUsesPerUser}
            onChange={(e) => setMaxUsesPerUser(e.target.value)}
            inputProps={{ min: 1 }}
            fullWidth
          />
        </Stack>

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
          inputProps={{ min: 1, max: 100 }}
          fullWidth
        />

        <Button
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {loading ? t("promotionCodes.generating") : t("promotionCodes.generateCodes")}
        </Button>
      </Stack>
    </Box>
  );
}
