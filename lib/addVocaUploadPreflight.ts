import { normalizeCoursePath } from "@/lib/coursePath";
import type { Course } from "@/types/course";

type ValidUploadCourse = Course & { path: string };

export type UploadCourseValidationResult =
  | { ok: true; course: ValidUploadCourse }
  | { ok: false; reason: "missing-course" | "missing-path" };

export function validateUploadCourse(
  course: Course | undefined,
): UploadCourseValidationResult {
  if (!course) {
    return { ok: false, reason: "missing-course" };
  }

  const normalizedPath = normalizeCoursePath(course.path);
  if (!normalizedPath) {
    return { ok: false, reason: "missing-path" };
  }

  return {
    ok: true,
    course: {
      ...course,
      path: normalizedPath,
    },
  };
}
