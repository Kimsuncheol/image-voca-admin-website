/**
 * PromotionCodesPageSkeleton
 *
 * Full-page loading skeleton shown while auth state and promotion codes are being fetched.
 * Mirrors the Generate tab layout (first visible tab) of PromotionCodesPage:
 *
 *  ┌────────────────────────────────────────────┐
 *  │  [title]                                   │
 *  │  [tab skeleton] [tab skeleton]             │
 *  │                                            │
 *  │  ── Generate form section ──               │
 *  │  [section heading + divider]               │
 *  │  [input row × 2 (scope + quantity)]        │
 *  │  [expiry date input]                       │
 *  │  [plan restriction card]                   │
 *  │  [prefix + length inputs]                  │
 *  │  [notes textarea]                          │
 *  │  [submit button]                           │
 *  └────────────────────────────────────────────┘
 *
 * @param title - Translated page title.
 */

import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PageLayout from "@/components/layout/PageLayout";

interface PromotionCodesPageSkeletonProps {
  /** Translated page title */
  title: string;
}

export default function PromotionCodesPageSkeleton({
  title,
}: PromotionCodesPageSkeletonProps) {
  return (
    <PageLayout>
      {/* ── Page heading ─────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {title}
      </Typography>

      {/* ── Tab bar: Generate | Active Codes ──────────────────────── */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ mb: 3, pb: 1, borderBottom: 1, borderColor: "divider" }}
      >
        <Skeleton variant="rounded" width={120} height={40} />
        <Skeleton variant="rounded" width={140} height={40} />
      </Stack>

      {/* ── Generate tab form skeleton ────────────────────────────── */}
      <Stack spacing={3} maxWidth={560}>
        {/* Section heading + divider */}
        <Stack spacing={1.5}>
          <Skeleton variant="text" width={180} height={38} />
          <Divider />
        </Stack>

        {/* Scope + Quantity inputs (side by side on sm+) */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
          <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
        </Stack>

        {/* Expiry date picker */}
        <Skeleton variant="rounded" height={56} />

        {/* Plan restriction card */}
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Skeleton variant="text" width={160} />
            <Skeleton variant="rounded" height={56} />
          </Stack>
        </Card>

        {/* Prefix + code length inputs */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
          <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
        </Stack>

        {/* Notes / description textarea */}
        <Skeleton variant="rounded" height={88} />

        {/* Submit button */}
        <Skeleton variant="rounded" height={56} />

        {/* Generate button */}
        <Skeleton variant="rounded" height={44} width={220} />
      </Stack>
    </PageLayout>
  );
}
