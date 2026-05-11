import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySessionUser } from "@/lib/server/sessionUser";
import {
  generateWordsPlacementGame,
  toFirestoreWordsPlacementDoc,
} from "@/lib/server/wordsPlacementGeneration";

interface WordsPlacementGenerateBody {
  course?: string;
  day?: number;
  save?: boolean;
}

export async function POST(req: NextRequest) {
  const caller = await verifySessionUser(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: WordsPlacementGenerateBody;
  try {
    body = (await req.json()) as WordsPlacementGenerateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { result, savePath } = await generateWordsPlacementGame({
      db: adminDb,
      course: body.course,
      day: body.day,
    });

    if (body.save) {
      await adminDb.doc(savePath).set(toFirestoreWordsPlacementDoc(result));
    }

    return NextResponse.json({
      ...result,
      ...(body.save ? { saved: true, path: savePath } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate words placement game.",
      },
      { status: 400 },
    );
  }
}
