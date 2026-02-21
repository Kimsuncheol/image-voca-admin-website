"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTranslation } from "react-i18next";
import type { PromotionCode } from "@/types/promotionCode";
import DeactivateConfirmDialog from "./DeactivateConfirmDialog";

interface ActiveCodesTabProps {
  codes: PromotionCode[];
  loading: boolean;
  onRefresh: () => void;
  onDeactivateSuccess: () => void;
  onError: (message: string) => void;
}

const STATUS_COLOR: Record<string, "success" | "default" | "warning"> = {
  active: "success",
  inactive: "default",
  expired: "warning",
};

export default function ActiveCodesTab({
  codes,
  loading,
  onRefresh,
  onDeactivateSuccess,
  onError,
}: ActiveCodesTabProps) {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<PromotionCode | null>(null);

  const handleCopy = async (code: PromotionCode) => {
    try {
      await navigator.clipboard.writeText(code.code);
      setCopiedId(code.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={600}>
          {t("promotionCodes.activeCodes")}
        </Typography>
        <Button
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={onRefresh}
          disabled={loading}
          variant="outlined"
          size="small"
        >
          {t("promotionCodes.refresh")}
        </Button>
      </Stack>
      <Divider sx={{ mb: 3 }} />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : codes.length === 0 ? (
        <Typography color="text.secondary">{t("promotionCodes.noCodes")}</Typography>
      ) : (
        <Stack spacing={2}>
          {codes.map((promo) => (
            <Card key={promo.id} variant="outlined">
              <CardContent>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ sm: "flex-start" }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  {/* Left: code + info */}
                  <Box flex={1}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography fontFamily="monospace" fontWeight={700} letterSpacing={1}>
                        {promo.code}
                      </Typography>
                      <IconButton size="small" onClick={() => handleCopy(promo)}>
                        {copiedId === promo.id ? (
                          <CheckIcon fontSize="small" color="success" />
                        ) : (
                          <ContentCopyIcon fontSize="small" />
                        )}
                      </IconButton>
                      <Chip
                        label={t(`promotionCodes.status${promo.status.charAt(0).toUpperCase()}${promo.status.slice(1)}`)}
                        color={STATUS_COLOR[promo.status] ?? "default"}
                        size="small"
                      />
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      {promo.description}
                    </Typography>

                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary">
                        {t("promotionCodes.plan")}:{" "}
                        <strong>
                          {promo.benefit.planId === "voca_unlimited"
                            ? "Voca Unlimited"
                            : "Voca Speaking"}
                        </strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t("promotionCodes.usage")}:{" "}
                        <strong>
                          {promo.currentUses} / {promo.maxUses}
                        </strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t("promotionCodes.expires")}:{" "}
                        <strong>{promo.eventPeriod.endDate || "—"}</strong>
                      </Typography>
                    </Stack>
                  </Box>

                  {/* Right: deactivate button */}
                  {promo.status === "active" && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => setDeactivateTarget(promo)}
                      sx={{ flexShrink: 0 }}
                    >
                      {t("promotionCodes.deactivate")}
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {deactivateTarget && (
        <DeactivateConfirmDialog
          open={!!deactivateTarget}
          codeId={deactivateTarget.id}
          codeText={deactivateTarget.code}
          onClose={() => setDeactivateTarget(null)}
          onSuccess={onDeactivateSuccess}
          onError={onError}
        />
      )}
    </Box>
  );
}
