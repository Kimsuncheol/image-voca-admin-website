import { NextRequest, NextResponse } from "next/server";

import { fetchNaverDictPayload } from "@/lib/server/naverDict";
import { verifySessionUser } from "@/lib/server/sessionUser";

function isAdmin(role: string | undefined): boolean {
  return role === "admin" || role === "super-admin";
}

export async function GET(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(caller.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const { status, payload } = await fetchNaverDictPayload({
      path: "/dict/types",
    });

    return NextResponse.json(payload, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch dictionary types.",
      },
      { status: 500 },
    );
  }
}
