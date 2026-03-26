import {
  getSingleListSubcollectionByCourseId,
  getSingleListSubcollectionByCoursePath,
  type CourseId,
  type SingleListSubcollectionName,
} from "@/types/course";

export type { SingleListSubcollectionName } from "@/types/course";

export function requireSingleListSubcollectionByCourseId(
  courseId: CourseId,
): SingleListSubcollectionName {
  const subcollection = getSingleListSubcollectionByCourseId(courseId);
  if (!subcollection) {
    throw new Error(`Course ${courseId} is not configured for single-list storage`);
  }
  return subcollection;
}

export function requireSingleListSubcollectionByCoursePath(
  coursePath: string,
): SingleListSubcollectionName {
  const subcollection = getSingleListSubcollectionByCoursePath(coursePath);
  if (!subcollection) {
    throw new Error(`Course path ${coursePath} is not configured for single-list storage`);
  }
  return subcollection;
}
