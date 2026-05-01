import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySessionUser } from "@/lib/server/sessionUser";
import { getQuizCourse } from "@/lib/server/quizGeneration";
import {
  buildPopQuizDayMergePayload,
  getPopQuizCollectionPath,
  getPopQuizDayFieldPath,
} from "@/lib/server/popQuizStorage";

interface QuizSaveBody {
  quiz_type: "matching" | "fill_blank";
  save_target?: "quiz" | "pop_quiz";
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

function resolvePopQuizCollectionPath(
  quiz_type: QuizSaveBody["quiz_type"],
  quiz_data: Record<string, unknown>,
): { collectionPath?: string; error?: string } {
  if (quiz_type !== "matching") {
    return { error: "Pop quiz saves only support matching quizzes." };
  }

  const language = quiz_data.language;
  const basePath = getPopQuizCollectionPath(language);
  if (!basePath) {
    return { error: "Pop quiz storage path is not configured." };
  }

  return {
    collectionPath: basePath,
  };
}

export async function POST(req: NextRequest) {
  const caller = await verifySessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as QuizSaveBody;
  const { quiz_type, save_target = "quiz", course, level, day, quiz_data } = body;

  const normalized = normalizeQuizData(quiz_type, course, quiz_data);

  if (save_target === "pop_quiz") {
    const result = resolvePopQuizCollectionPath(quiz_type, quiz_data);
    if (!result.collectionPath) {
      return NextResponse.json(
        { error: result.error ?? "Invalid pop quiz save request." },
        { status: 400 },
      );
    }
    const fieldPath = getPopQuizDayFieldPath({
      language: typeof quiz_data.language === "string" ? quiz_data.language : null,
      course,
      level,
      day,
    });
    if (!fieldPath) {
      return NextResponse.json(
        { error: "Invalid pop quiz save request." },
        { status: 400 },
      );
    }

    const docRef = adminDb.collection(result.collectionPath).doc("data");
    await docRef.set(
      buildPopQuizDayMergePayload(fieldPath, normalized),
      { merge: true },
    );

    return NextResponse.json({ id: docRef.id });
  }

  const courseConfig = getQuizCourse({ course, level });

  if (!courseConfig?.path) {
    return NextResponse.json({ error: "Unknown course" }, { status: 400 });
  }

  const subcollName = quiz_type === "matching" ? "matching" : "fill_in_the_blank";
  const collectionPath = `${courseConfig.path}/Day${day}/Day${day}-quiz/${subcollName}`;

  const docRef = adminDb.collection(collectionPath).doc("data");
  await docRef.set(normalized);

  return NextResponse.json({ id: docRef.id });
}
