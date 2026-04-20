import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySessionUser } from "@/lib/server/sessionUser";
import { getQuizCourse } from "@/lib/server/quizGeneration";

interface QuizSaveBody {
  quiz_type: "matching" | "fill_blank";
  course: string;
  level: string | null;
  day: number;
  quiz_data: Record<string, unknown>;
}

type RawChoice = Record<string, unknown>;

function normalizeQuizData(
  quiz_type: string,
  course: string,
  quiz_data: Record<string, unknown>,
): Record<string, unknown> {
  const isJlpt = course === "JLPT";
  if (isJlpt || quiz_type !== "matching") return quiz_data;

  const choices = (quiz_data.choices as RawChoice[] | undefined) ?? [];
  const normalizedChoices = choices.map((c) => {
    const { meaningEnglish, meaningKorean, ...rest } = c;
    return {
      ...rest,
      meaning: (meaningKorean as string) || (meaningEnglish as string) || "",
    };
  });

  return { ...quiz_data, choices: normalizedChoices };
}

export async function POST(req: NextRequest) {
  const caller = await verifySessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as QuizSaveBody;
  const { quiz_type, course, level, day, quiz_data } = body;

  const courseConfig = getQuizCourse({ course, level });

  if (!courseConfig?.path) {
    return NextResponse.json({ error: "Unknown course" }, { status: 400 });
  }

  const subcollName = quiz_type === "matching" ? "matching" : "fill_in_the_blank";
  const collectionPath = `${courseConfig.path}/Day${day}/Day${day}-quiz/${subcollName}`;

  const normalized = normalizeQuizData(quiz_type, course, quiz_data);

  const docRef = adminDb.collection(collectionPath).doc("data");
  await docRef.set(normalized);

  return NextResponse.json({ id: docRef.id });
}
