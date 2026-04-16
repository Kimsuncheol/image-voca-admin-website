import { NextRequest, NextResponse } from "next/server";
import { buildVocabApiUrl } from "@/lib/server/textApi";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as unknown;

  const upstream = await fetch(buildVocabApiUrl("/v1/vocab/extract-from-pairs"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await upstream.json()) as unknown;
  return NextResponse.json(data, { status: upstream.status });
}
