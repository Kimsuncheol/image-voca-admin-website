/**
 * UsersPageSkeleton
 *
 * Full-page loading skeleton shown while user data (and auth state) is being fetched.
 * Mirrors the layout of the real UsersPage so the page doesn't "jump" when data arrives:
 *
 *  ┌──────────────────────────────────┐
 *  │  [title]                         │
 *  │  [stat card] [stat card] [stat card] │
 *  │  [search bar]                    │
 *  │  [filter chips row]              │
 *  │  [table skeleton rows × 6]       │
 *  └──────────────────────────────────┘
 *
 * @param title - The translated page title displayed at the top (avoids CLS).
 */

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PageLayout from "@/components/layout/PageLayout";

interface UsersPageSkeletonProps {
  /** Translated page title — already visible while data loads */
  title: string;
}

export default function UsersPageSkeleton({ title }: UsersPageSkeletonProps) {
  return (
    <PageLayout>
      {/* ── Page heading ─────────────────────────────────────────── */}
      <Typography variant="h4" gutterBottom fontWeight={600}>
        {title}
      </Typography>

      {/* ── Stat cards row ────────────────────────────────────────── */}
      {/* Three skeleton cards representing Total / Unlimited / Free member counts */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 3 }).map((_, idx) => (
          <Card key={idx} variant="outlined" sx={{ flex: 1, minWidth: 100 }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              {/* Large number placeholder */}
              <Skeleton variant="text" width={40} height={42} />
              {/* Label placeholder */}
              <Skeleton variant="text" width={70} />
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* ── Search + filter controls ──────────────────────────────── */}
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        {/* Search text field */}
        <Skeleton variant="rounded" height={40} sx={{ maxWidth: 360 }} />
        {/* Toggle button groups (Plan filter + Role filter) */}
        <Stack
          direction="row"
          spacing={3}
          flexWrap="wrap"
          useFlexGap
          alignItems="center"
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Skeleton
              variant="rounded"
              width={60}
              height={24}
              sx={{ borderRadius: 12 }}
            />
            <Skeleton
              variant="rounded"
              width={50}
              height={24}
              sx={{ borderRadius: 12 }}
            />
            <Skeleton
              variant="rounded"
              width={110}
              height={24}
              sx={{ borderRadius: 12 }}
            />
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Skeleton
              variant="rounded"
              width={60}
              height={24}
              sx={{ borderRadius: 12 }}
            />
            <Skeleton
              variant="rounded"
              width={80}
              height={24}
              sx={{ borderRadius: 12 }}
            />
          </Stack>
        </Stack>
      </Stack>

      {/* ── Table rows ────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          {/* Six rows to approximate a typical table view */}
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} variant="text" width="100%" height={30} />
          ))}
        </Stack>
      </Paper>
    </PageLayout>
  );
}
