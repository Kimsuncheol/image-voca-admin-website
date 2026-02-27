/**
 * CourseLoadingView
 *
 * A simple full-height centered spinner rendered inside PageLayout.
 * Used as the loading state for:
 *   - app/courses/[courseId]/[dayId]/page.tsx (fetching words for a day)
 *
 * Renders immediately (before Firestore responds) to give the user visual
 * feedback that data is on its way.
 */

import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import PageLayout from "@/components/layout/PageLayout";

export default function CourseLoadingView() {
  return (
    <PageLayout>
      {/* Vertically and horizontally centred spinner */}
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    </PageLayout>
  );
}
