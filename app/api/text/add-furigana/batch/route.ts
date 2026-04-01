import { NextRequest, NextResponse } from "next/server";
import type { AddFuriganaBatchRequest, AddFuriganaBatchResponse } from "@/lib/addFurigana";
import { buildTextApiUrl } from "@/lib/server/textApi";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AddFuriganaBatchRequest;

  const upstream = await fetch(buildTextApiUrl("/text/add-furigana/batch"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await upstream.json()) as AddFuriganaBatchResponse;
  return NextResponse.json(data, { status: upstream.status });
}
