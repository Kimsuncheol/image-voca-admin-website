import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySessionUser } from "@/lib/server/sessionUser";
import { getCourseById } from "@/types/course";

interface QuizSaveBody {
  quiz_type: "matching" | "fill_blank";
  course: string;
  level: string | null;
  day: number;
  quiz_data: Record<string, unknown>;
}

function resolveCourseId(course: string, level: string | null): string {
  if (course === "JLPT" && level) return `JLPT_${level}`;
  const map: Record<string, string> = {
    CSAT: "CSAT",
    CSAT_IDIOMS: "IDIOMS",
    TOEIC: "TOEIC",
    TOEFL_IELTS: "TOEFL_IELTS",
    TOEFL_ITELS: "TOEFL_IELTS",
    EXTREMELY_ADVANCED: "EXTREMELY_ADVANCED",
    COLLOCATION: "COLLOCATIONS",
    JLPT: "JLPT",
  };
  return map[course] ?? course;
}

export async function POST(req: NextRequest) {
  const caller = await verifySessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as QuizSaveBody;
  const { quiz_type, course, level, day, quiz_data } = body;

  const courseId = resolveCourseId(course, level);
  const courseConfig = getCourseById(courseId);

  if (!courseConfig?.path) {
    return NextResponse.json({ error: "Unknown course" }, { status: 400 });
  }

  const subcollName = quiz_type === "matching" ? "matching" : "fill_in_the_blank";
  const collectionPath = `${courseConfig.path}/Day${day}/Day${day}-quiz/${subcollName}`;

  const docRef = await adminDb.collection(collectionPath).add(quiz_data);

  return NextResponse.json({ id: docRef.id });
}
