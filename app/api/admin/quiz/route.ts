import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySessionUser } from "@/lib/server/sessionUser";
import { getQuizCourse } from "@/lib/server/quizGeneration";

function resolveDocPath(
  quiz_type: string,
  course: string,
  level: string | null,
  day: number,
): string | null {
  const courseConfig = getQuizCourse({ course, level });
  if (!courseConfig?.path) return null;
  const subcollName = quiz_type === "matching" ? "matching" : "fill_in_the_blank";
  return `${courseConfig.path}/Day${day}/Day${day}-quiz/${subcollName}/data`;
}

export async function GET(req: NextRequest) {
  const caller = await verifySessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const quiz_type = searchParams.get("quiz_type");
  const course = searchParams.get("course");
  const level = searchParams.get("level");
  const day = Number(searchParams.get("day"));

  if (!quiz_type || !course || !Number.isInteger(day) || day < 1) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const docPath = resolveDocPath(quiz_type, course, level, day);
  if (!docPath) {
    return NextResponse.json({ error: "Unknown course" }, { status: 400 });
  }

  const snap = await adminDb.doc(docPath).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(snap.data());
}

export async function DELETE(req: NextRequest) {
  const caller = await verifySessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const quiz_type = searchParams.get("quiz_type");
  const course = searchParams.get("course");
  const level = searchParams.get("level");
  const day = Number(searchParams.get("day"));

  if (!quiz_type || !course || !Number.isInteger(day) || day < 1) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const docPath = resolveDocPath(quiz_type, course, level, day);
  if (!docPath) {
    return NextResponse.json({ error: "Unknown course" }, { status: 400 });
  }

  await adminDb.doc(docPath).delete();

  return new NextResponse(null, { status: 204 });
}
