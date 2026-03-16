import type { CourseId } from "@/types/course";

export const SUPPORTED_DERIVATIVE_COURSES = [
  "CSAT",
  "TOEIC",
  "TOEFL_IELTS",
] as const satisfies readonly CourseId[];

export type SupportedDerivativeCourseId =
  (typeof SUPPORTED_DERIVATIVE_COURSES)[number];

export function supportsDerivativeCourse(
  courseId: CourseId | "",
): courseId is SupportedDerivativeCourseId {
  return SUPPORTED_DERIVATIVE_COURSES.includes(
    courseId as SupportedDerivativeCourseId,
  );
}
