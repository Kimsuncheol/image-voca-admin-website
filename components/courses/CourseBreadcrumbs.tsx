/**
 * CourseBreadcrumbs
 *
 * Renders a MUI Breadcrumbs navigation bar that reflects the user's position
 * in the course hierarchy:
 *
 *   Courses > [Course Label]               — used on courses/[courseId]/page.tsx
 *   Courses > [Course Label] > [Day ID]    — used on courses/[courseId]/[dayId]/page.tsx
 *
 * Props:
 *   - courseId:    Raw route param (e.g. "TOEIC") used to build the href.
 *   - courseLabel: Human-readable course name (e.g. "TOEIC"). Falls back to courseId.
 *   - parentLabel: Optional intermediate parent crumb label (e.g. "JLPT").
 *   - parentHref:  Optional href for the intermediate parent crumb.
 *   - dayId:       Optional. When provided, adds a third crumb for the active day.
 *   - coursesLabel: Translated label for the root "Courses" link.
 *
 * The last crumb (leaf) is rendered as plain Typography (non-clickable) to
 * indicate the current page, following standard breadcrumb UX conventions.
 */

import Breadcrumbs from "@mui/material/Breadcrumbs";
import Typography from "@mui/material/Typography";
import Link from "next/link";

interface CourseBreadcrumbsProps {
  /** Raw courseId route param — used to construct /courses/:courseId href */
  courseId: string;
  /** Human-readable course label; falls back to courseId if not available */
  courseLabel?: string;
  /** Optional intermediate parent crumb label */
  parentLabel?: string;
  /** Optional intermediate parent crumb href */
  parentHref?: string;
  /** When provided, adds a third crumb for the active day */
  dayId?: string;
  /** Translated label for the root "Courses" link */
  coursesLabel: string;
}

export default function CourseBreadcrumbs({
  courseId,
  courseLabel,
  parentLabel,
  parentHref,
  dayId,
  coursesLabel,
}: CourseBreadcrumbsProps) {
  /** Display name used for the course crumb */
  const displayCourseLabel = courseLabel || courseId;

  return (
    <Breadcrumbs sx={{ mb: 2 }}>
      {/* ── Root: Courses list page ──────────────────────────────── */}
      <Link
        href="/courses"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {coursesLabel}
      </Link>

      {/* ── Optional parent crumb (e.g. JLPT) ───────────────────── */}
      {parentLabel &&
        (parentHref ? (
          <Link
            href={parentHref}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {parentLabel}
          </Link>
        ) : (
          <Typography color="text.primary">{parentLabel}</Typography>
        ))}

      {/* ── Course crumb ─────────────────────────────────────────── */}
      {dayId ? (
        // When a dayId is present this crumb is still clickable (navigates up)
        <Link
          href={`/courses/${courseId}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          {displayCourseLabel}
        </Link>
      ) : (
        // No dayId → this IS the leaf; render as non-interactive text
        <Typography color="text.primary">{displayCourseLabel}</Typography>
      )}

      {/* ── Day crumb (leaf) ─────────────────────────────────────── */}
      {/* Only rendered when a dayId is provided */}
      {dayId && <Typography color="text.primary">{dayId}</Typography>}
    </Breadcrumbs>
  );
}
