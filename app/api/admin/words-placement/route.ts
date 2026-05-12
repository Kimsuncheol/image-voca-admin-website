import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { getQuizCourse } from "@/lib/server/quizGeneration";
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

function resolveWordsPlacementPath({
  course,
  level,
  day,
}: {
  course: string | null;
  level: string | null;
  day: number;
}): string | null {
  if (!course || !SUPPORTED_COURSES.has(course)) return null;
  if (course === "JLPT" && !level) return null;

  const courseConfig = getQuizCourse({
    course,
    level: course === "JLPT" ? level : null,
  });
  if (!courseConfig?.path) return null;

  const dayId = `Day${day}`;
  return `${courseConfig.path}/${dayId}/${dayId}-quiz/words_placement/data`;
}

async function verifyAdmin(req: NextRequest) {
  const caller = await verifySessionUser(req);
  if (!caller) return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { response: null };
}

function getRequestPath(req: NextRequest): string | null {
  const { searchParams } = req.nextUrl;
  const day = Number(searchParams.get("day"));
  if (!Number.isInteger(day) || day < 1) return null;
  return resolveWordsPlacementPath({
    course: searchParams.get("course"),
    level: searchParams.get("level"),
    day,
  });
}

export async function GET(req: NextRequest) {
  const { response } = await verifyAdmin(req);
  if (response) return response;

  const docPath = getRequestPath(req);
  if (!docPath) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const snap = await adminDb.doc(docPath).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(snap.data());
}

export async function DELETE(req: NextRequest) {
  const { response } = await verifyAdmin(req);
  if (response) return response;

  const docPath = getRequestPath(req);
  if (!docPath) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  await adminDb.doc(docPath).delete();
  return new NextResponse(null, { status: 204 });
}
