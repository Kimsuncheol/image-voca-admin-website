import { NextRequest, NextResponse } from "next/server";

import { lookupJlptPronunciations } from "@/lib/server/jmdictPronunciation";
import { verifySessionUser } from "@/lib/server/sessionUser";

interface RequestBody {
  words?: unknown;
}

export async function POST(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.words)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const words = body.words.filter(
    (word): word is string => typeof word === "string" && word.trim().length > 0,
  );
  if (words.length === 0) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await lookupJlptPronunciations(words);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch JLPT pronunciation.",
      },
      { status: 500 },
    );
  }
}
