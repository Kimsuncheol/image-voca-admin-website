import { NextRequest, NextResponse } from "next/server";

import { lookupMeaning } from "@/lib/server/naverDictMeaning";
import { verifySessionUser } from "@/lib/server/sessionUser";

interface MeaningLookupRequestBody {
  words?: unknown;
}

function isAdmin(role: string | undefined): boolean {
  return role === "admin" || role === "super-admin";
}

function hasTrimmedText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(caller.role)) {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  let body: MeaningLookupRequestBody;
  try {
    body = (await request.json()) as MeaningLookupRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.words)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const words = Array.from(
    new Set(
      body.words
        .filter(hasTrimmedText)
        .map((word) => word.trim())
        .filter((word) => word.length > 0),
    ),
  );

  if (words.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const items = await Promise.all(words.map((word) => lookupMeaning(word)));
  return NextResponse.json({ items });
}
