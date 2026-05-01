import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/textApi", () => ({
  buildTextApiRootUrl: (path: string) => `https://text-api.example${path}`,
}));

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/text/analyze", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/text/analyze", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn(async () =>
      Response.json({
        masked_sentence: "[MASK]て、また[MASK]ました。",
        matches: [
          { answer: "食べ", start: 0, end: 2 },
          { answer: "食べ", start: 6, end: 8 },
        ],
      }),
    );
  });

  it("proxies analyze requests to the root upstream analyze endpoint", async () => {
    const body = {
      language: "ja",
      sentence: "食べて、また食べました。",
      target_base_form: "食べる",
    };

    const { POST } = await import("./route");
    const response = await POST(createRequest(body));

    expect(global.fetch).toHaveBeenCalledWith("https://text-api.example/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      masked_sentence: "[MASK]て、また[MASK]ました。",
      matches: [
        { answer: "食べ", start: 0, end: 2 },
        { answer: "食べ", start: 6, end: 8 },
      ],
    });
  });
});
