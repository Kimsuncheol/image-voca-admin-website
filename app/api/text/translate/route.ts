import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as unknown;

  const upstream = await fetch("http://127.0.0.1:8000/text/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await upstream.json()) as unknown;
  return NextResponse.json(data, { status: upstream.status });
}
