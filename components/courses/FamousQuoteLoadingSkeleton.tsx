"use client";

/**
 * FamousQuoteLoadingSkeleton
 *
 * Shown while `getFamousQuotes` is in-flight on the
 * /courses/FAMOUS_QUOTE page.
 *
 * Mirrors the WordTable layout for famous quotes:
 *   ┌────────────────────────────────┬────────────┬──────────────────┐
 *   │ Quote                          │ Author     │ Translation      │
 *   ├────────────────────────────────┼────────────┼──────────────────┤
 *   │ ████████████████████████████   │ ██████     │ ████████████     │
 *   │ …                              │ …          │ …                │
 *   └────────────────────────────────┴────────────┴──────────────────┘
 */

import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import PageLayout from "@/components/layout/PageLayout";

const SKELETON_ROWS = 8;

// Approximate column width ratios: quote is the widest
const COL_WIDTHS = [
  { min: 120, max: 320 }, // quote
  { min: 60, max: 120 }, // author
  { min: 80, max: 200 }, // translation
];

/** Returns a deterministic-looking pseudo-random width for each row/col slot. */
function seedWidth(row: number, col: number): string {
  const { min, max } = COL_WIDTHS[col];
  // Simple linear congruential step to vary widths without Math.random
  const spread = max - min;
  const pct = ((row * 3 + col * 7) % 10) / 10; // 0.0 – 0.9
  return `${Math.round(min + spread * pct)}px`;
}

export default function FamousQuoteLoadingSkeleton() {
  return (
    <PageLayout>
      <Stack spacing={2}>
        {/* Breadcrumb placeholder */}
        <Skeleton variant="text" width={200} height={24} />

        {/* Page heading placeholder */}
        <Skeleton variant="text" width={260} height={44} />

        {/* Table skeleton */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {/* Header cells — fixed widths matching column roles */}
                <TableCell>
                  <Skeleton variant="text" width={60} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={52} />
                </TableCell>
                <TableCell>
                  <Skeleton variant="text" width={80} />
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: SKELETON_ROWS }).map((_, row) => (
                <TableRow key={row}>
                  {[0, 1, 2].map((col) => (
                    <TableCell key={col}>
                      <Skeleton variant="text" width={seedWidth(row, col)} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </PageLayout>
  );
}
