import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySessionUser } from "@/lib/server/sessionUser";
import { getQuizCourse, getQuizCourseTotalDays } from "@/lib/server/quizGeneration";
import {
  getPopQuizCollectionPath,
  getPopQuizSavedDays,
} from "@/lib/server/popQuizStorage";

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
  const language = searchParams.get("language");
  const save_target = searchParams.get("save_target");

  if (!quiz_type || !course) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  const courseConfig = getQuizCourse({ course, level });
  if (!courseConfig?.path) {
    return NextResponse.json({ error: "Unknown course" }, { status: 400 });
  }

  const { totalDays } = await getQuizCourseTotalDays({ course, level });
  if (totalDays === 0) {
    return NextResponse.json({ total: 0, days: [] });
  }

  if (save_target === "pop_quiz") {
    const collectionPath = getPopQuizCollectionPath(language);
    if (!collectionPath || quiz_type !== "matching") {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const snap = await adminDb.collection(collectionPath).doc("data").get();
    return NextResponse.json({
      total: totalDays,
      days: getPopQuizSavedDays(snap.data(), language, course, level),
    });
  }

  const subcollName = quiz_type === "matching" ? "matching" : "fill_in_the_blank";

  const checks = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const path = `${courseConfig.path}/Day${day}/Day${day}-quiz/${subcollName}/data`;
    return adminDb.doc(path).get().then((snap) => ({ day, exists: snap.exists }));
  });

  const results = await Promise.all(checks);
  const days = results.filter((r) => r.exists).map((r) => r.day);

  return NextResponse.json({ total: totalDays, days });
}
