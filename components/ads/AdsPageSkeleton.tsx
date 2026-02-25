/**
 * AdsPageSkeleton
 *
 * Full-page loading skeleton shown while ads are being fetched from Firestore.
 * Mirrors the layout of AdsPage:
 *
 *  ┌──────────────────────────────────────────────────────┐
 *  │  [title skeleton]         [Refresh btn] [Add Ad btn] │
 *  │  [count label skeleton]                              │
 *  │  ┌──────────────────────────────────────────────┐    │
 *  │  │ [col header row]                             │    │
 *  │  │ [ad row skeleton] × 5                        │    │
 *  │  └──────────────────────────────────────────────┘    │
 *  └──────────────────────────────────────────────────────┘
 *
 * The page title is visually hidden (SR-only) in the skeleton so screen readers
 * still announce it while the layout uses a skeleton in its place.
 *
 * @param title - Translated page title string.
 */

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PageLayout from "@/components/layout/PageLayout";

interface AdsPageSkeletonProps {
  /** Translated page title — announced to screen readers while layout loads */
  title: string;
}

export default function AdsPageSkeleton({ title }: AdsPageSkeletonProps) {
  return (
    <PageLayout>
      {/* ── Header row: title (left) + action buttons (right) ──────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          gap: 2,
        }}
      >
        {/* Title skeleton (visually replaces the real h4) */}
        <Skeleton variant="text" width={200} height={48} />

        {/* Action button skeletons: Refresh + Add Ad */}
        <Stack direction="row" spacing={1}>
          <Skeleton variant="rounded" width={110} height={36} />
          <Skeleton variant="rounded" width={120} height={36} />
        </Stack>
      </Box>

      {/* SR-only real heading so that the page title is still accessible */}
      <Typography
        variant="h4"
        fontWeight={600}
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          p: 0,
          m: -1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {title}
      </Typography>

      {/* ── Count label skeleton ─────────────────────────────────────── */}
      <Skeleton variant="text" width={150} sx={{ mb: 1 }} />

      {/* ── Ad list table skeleton ───────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          {/* Column header row */}
          <Stack direction="row" spacing={2}>
            <Skeleton variant="text" width="12%" />
            <Skeleton variant="text" width="16%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="16%" />
            <Skeleton variant="text" width="10%" />
            <Skeleton variant="text" width="14%" />
            <Skeleton variant="text" width="10%" />
          </Stack>

          {/* Five ad row skeletons — matches the 7-column grid of AdList */}
          {Array.from({ length: 5 }).map((_, idx) => (
            <Box
              key={idx}
              sx={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(90px, 0.9fr) minmax(120px, 1.2fr) minmax(140px, 1.8fr) minmax(120px, 1.2fr) 90px 120px 70px",
                gap: 2,
                alignItems: "center",
              }}
            >
              <Skeleton variant="rounded" height={28} width={84} />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="95%" />
              <Skeleton variant="rounded" height={40} width={80} />
              <Skeleton variant="circular" width={36} height={36} />
              <Skeleton variant="text" width="85%" />
              <Skeleton variant="circular" width={32} height={32} />
            </Box>
          ))}
        </Stack>
      </Paper>
    </PageLayout>
  );
}
