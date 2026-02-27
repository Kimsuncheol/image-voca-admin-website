"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import PageLayout from "@/components/layout/PageLayout";
import {
  dayGridTemplateColumns,
  getDayGridColumnCount,
} from "@/components/courses/dayGridConfig";

const SKELETON_ROWS = 2;

export default function CourseDaysLoadingSkeleton() {
  const theme = useTheme();
  const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const isLgUp = useMediaQuery(theme.breakpoints.up("lg"));
  const isXlUp = useMediaQuery(theme.breakpoints.up("xl"));

  const columns = getDayGridColumnCount({
    sm: isSmUp,
    md: isMdUp,
    lg: isLgUp,
    xl: isXlUp,
  });
  const placeholderCount = useMemo(
    () => columns * SKELETON_ROWS,
    [columns],
  );

  return (
    <PageLayout>
      <Stack spacing={2}>
        <Skeleton variant="text" width={220} height={30} />
        <Skeleton variant="text" width={260} height={48} />

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: dayGridTemplateColumns,
          }}
        >
          {Array.from({ length: placeholderCount }).map((_, idx) => (
            <Skeleton
              key={idx}
              variant="rounded"
              sx={{
                width: "100%",
                aspectRatio: "1 / 1",
              }}
            />
          ))}
        </Box>
      </Stack>
    </PageLayout>
  );
}
