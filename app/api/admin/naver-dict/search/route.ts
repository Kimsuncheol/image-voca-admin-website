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

  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ error: "Query is required." }, { status: 400 });
  }

  const dictType =
    request.nextUrl.searchParams.get("dict_type")?.trim() || "english";
  const searchMode =
    request.nextUrl.searchParams.get("search_mode")?.trim() || "simple";

  const searchParams = new URLSearchParams({
    query,
    dict_type: dictType,
    search_mode: searchMode,
  });

  try {
    const { status, payload } = await fetchNaverDictPayload({
      path: "/dict/search",
      searchParams,
    });

    return NextResponse.json(payload, { status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to search dictionary.",
      },
      { status: 500 },
    );
  }
}
