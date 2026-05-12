import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { getQuizCourse, getQuizCourseTotalDays } from "@/lib/server/quizGeneration";
import { verifySessionUser } from "@/lib/server/sessionUser";

const SUPPORTED_COURSES = new Set([
  "CSAT",
  "CSAT_IDIOMS",
  "TOEIC",
  "TOEFL_ITELS",
  "EXTREMELY_ADVANCED",
  "COLLOCATION",
  "JLPT",
  "KANJI",
]);

function isSupportedCourse(course: string | null): course is string {
  return Boolean(course && SUPPORTED_COURSES.has(course));
}

export async function GET(req: NextRequest) {
  const caller = await verifySessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const course = searchParams.get("course");
  const level = searchParams.get("level");

  if (!isSupportedCourse(course)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const resolvedLevel = course === "JLPT" ? level : null;
  if (course === "JLPT" && !resolvedLevel) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const courseConfig = getQuizCourse({ course, level: resolvedLevel });
  if (!courseConfig?.path) {
    return NextResponse.json({ error: "Unknown course" }, { status: 400 });
  }

  const { totalDays } = await getQuizCourseTotalDays({ course, level: resolvedLevel });
  if (totalDays === 0) return NextResponse.json({ total: 0, days: [] });

  const checks = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const dayId = `Day${day}`;
    const path = `${courseConfig.path}/${dayId}/${dayId}-quiz/words_placement/data`;
    return adminDb.doc(path).get().then((snap) => ({ day, exists: snap.exists }));
  });

  const results = await Promise.all(checks);
  return NextResponse.json({
    total: totalDays,
    days: results.filter((result) => result.exists).map((result) => result.day),
  });
}
