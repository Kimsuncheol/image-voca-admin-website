import "server-only";

import { adminDb } from "@/lib/firebase/admin";
import { getCourseById, type Course } from "@/types/course";

export type QuizCourseInput = {
  course?: string | null;
  level?: string | null;
};

export function resolveQuizCourseId({
  course,
  level,
}: QuizCourseInput): string {
  if (course === "JLPT" && level) return `JLPT_${level}`;

  const courseMap: Record<string, string> = {
    CSAT: "CSAT",
    CSAT_IDIOMS: "IDIOMS",
    TOEIC: "TOEIC",
    TOEFL_IELTS: "TOEFL_IELTS",
    TOEFL_ITELS: "TOEFL_IELTS",
    EXTREMELY_ADVANCED: "EXTREMELY_ADVANCED",
    COLLOCATION: "COLLOCATIONS",
    JLPT: "JLPT",
  };

  return course ? courseMap[course] ?? course : "";
}

export function getQuizCourse(input: QuizCourseInput): Course | undefined {
  return getCourseById(resolveQuizCourseId(input));
}

export function normalizeQuizDay(day: unknown): number | null {
  const dayNumber = Number(day);
  if (!Number.isInteger(dayNumber) || dayNumber < 1) return null;
  return dayNumber;
}

export function normalizeRequestedQuizCount(count: unknown): number {
  const requestedCount = Number(count);
  if (!Number.isInteger(requestedCount) || requestedCount < 1) return 1;
  return requestedCount;
}

export function clampQuizCount(requestedCount: unknown, dayWordCount: number): number {
  return Math.min(normalizeRequestedQuizCount(requestedCount), dayWordCount);
}

function normalizeTotalDays(value: unknown): number {
  const totalDays = Number(value ?? 0);
  return Number.isInteger(totalDays) && totalDays > 0 ? totalDays : 0;
}

export async function getQuizCourseTotalDays(input: QuizCourseInput): Promise<{
  course: Course;
  totalDays: number;
}> {
  const courseConfig = getQuizCourse(input);
  if (!courseConfig?.path) {
    throw new Error("Unknown quiz course.");
  }

  const courseSnap = await adminDb.doc(courseConfig.path).get();
  return {
    course: courseConfig,
    totalDays: normalizeTotalDays(courseSnap.data()?.totalDays),
  };
}

export async function getQuizDayLimits({
  course,
  level,
  day,
}: QuizCourseInput & { day: unknown }): Promise<{
  course: Course;
  day: number;
  maxDays: number;
  wordCount: number;
}> {
  const { course: courseConfig, totalDays } = await getQuizCourseTotalDays({
    course,
    level,
  });

  const normalizedDay = normalizeQuizDay(day);
  if (normalizedDay === null) {
    throw new Error("Invalid quiz day.");
  }
  if (totalDays > 0 && normalizedDay > totalDays) {
    throw new Error("Selected day exceeds available days.");
  }

  const collectionRef = adminDb.collection(
    `${courseConfig.path}/Day${normalizedDay}`,
  );

  try {
    const aggregateSnapshot = await collectionRef.count().get();
    return {
      course: courseConfig,
      day: normalizedDay,
      maxDays: totalDays,
      wordCount: Number(aggregateSnapshot.data().count ?? 0),
    };
  } catch {
    const snapshot = await collectionRef.get();
    return {
      course: courseConfig,
      day: normalizedDay,
      maxDays: totalDays,
      wordCount: snapshot.size ?? snapshot.docs.length,
    };
  }
}

export async function countQuizDayWords(
  input: QuizCourseInput & { day: unknown },
): Promise<{
  course: Course;
  day: number;
  maxDays: number;
  count: number;
}> {
  const limits = await getQuizDayLimits(input);
  return {
    course: limits.course,
    day: limits.day,
    maxDays: limits.maxDays,
    count: limits.wordCount,
  };
}
