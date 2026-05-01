import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySessionUser } from "@/lib/server/sessionUser";
import { getQuizCourse } from "@/lib/server/quizGeneration";
import {
  buildPopQuizDayMergePayload,
  getPopQuizCollectionPath,
  getPopQuizDayFieldPath,
  getPopQuizStorageEnvName,
  normalizePopQuizLanguage,
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

const POP_QUIZ_STORAGE_PATH_NOT_CONFIGURED = "POP_QUIZ_STORAGE_PATH_NOT_CONFIGURED";
const POP_QUIZ_UNSUPPORTED_QUIZ_TYPE = "POP_QUIZ_UNSUPPORTED_QUIZ_TYPE";
const POP_QUIZ_INVALID_STORAGE_KEY = "POP_QUIZ_INVALID_STORAGE_KEY";

function badPopQuizRequest(
  code: string,
  message: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json({ error: code, message, ...details }, { status: 400 });
}

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
): {
  collectionPath?: string;
  envName?: string | null;
  error?: string;
  language?: string | null;
} {
  if (quiz_type !== "matching") {
    return { error: POP_QUIZ_UNSUPPORTED_QUIZ_TYPE };
  }

  const language = quiz_data.language;
  const normalizedLanguage = normalizePopQuizLanguage(language);
  const envName = getPopQuizStorageEnvName(language);
  const basePath = getPopQuizCollectionPath(language);
  if (!basePath) {
    return {
      envName,
      error: POP_QUIZ_STORAGE_PATH_NOT_CONFIGURED,
      language: normalizedLanguage,
    };
  }

  const pathComponentCount = basePath.split("/").filter(Boolean).length;
  if (pathComponentCount % 2 === 0) {
    return {
      envName,
      error: POP_QUIZ_STORAGE_PATH_NOT_CONFIGURED,
      language: normalizedLanguage,
    };
  }

  return {
    collectionPath: basePath,
    envName,
    language: normalizedLanguage,
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
      const code = result.error ?? POP_QUIZ_INVALID_STORAGE_KEY;
      const configuredMessage = result.envName
        ? `${result.envName} is not configured or is not a Firestore collection path.`
        : "Pop quiz storage path is not configured.";
      return badPopQuizRequest(
        code,
        code === POP_QUIZ_UNSUPPORTED_QUIZ_TYPE
          ? "Pop quiz saves only support matching quizzes."
          : configuredMessage,
        {
          course,
          level,
          language: result.language ?? null,
          save_target,
        },
      );
    }
    const fieldPath = getPopQuizDayFieldPath({
      language: typeof quiz_data.language === "string" ? quiz_data.language : null,
      course,
      level,
      day,
    });
    if (!fieldPath) {
      return badPopQuizRequest(
        POP_QUIZ_INVALID_STORAGE_KEY,
        "Invalid pop quiz save request.",
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
