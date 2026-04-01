import { NextRequest, NextResponse } from "next/server";

import { lookupMeaning } from "@/lib/server/naverDictMeaning";
import { verifySessionUser } from "@/lib/server/sessionUser";

interface MeaningLookupRequestBody {
  word?: unknown;
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

  if (!hasTrimmedText(body.word)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const result = await lookupMeaning(body.word.trim());
  return NextResponse.json(result);
}
