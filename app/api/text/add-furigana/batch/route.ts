import { NextRequest, NextResponse } from "next/server";
import type { AddFuriganaBatchRequest, AddFuriganaBatchResponse } from "@/lib/addFurigana";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AddFuriganaBatchRequest;

  const upstream = await fetch("http://127.0.0.1:8000/text/add-furigana/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await upstream.json()) as AddFuriganaBatchResponse;
  return NextResponse.json(data, { status: upstream.status });
}
