import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUser = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser,
}));

describe("POST /api/admin/naver-dict/meaning", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NAVER_DICT_API_BASE_URL", "https://example.com");
  });

  it("rejects unauthenticated callers", async () => {
    verifySessionUser.mockResolvedValue(null);

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "careful" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects non-admin callers", async () => {
    verifySessionUser.mockResolvedValue({ role: "user" });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "careful" }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("validates word", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "   " }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid data" });
  });

  it("uses english/simple and returns a meaning for an exact match", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ word: "careful", meanings: ["giving close attention"] }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "careful" }),
      }),
    );

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://example.com/dict/search?query=careful&dict_type=english&search_mode=simple",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      word: "careful",
      meaning: "giving close attention",
    });
  });

  it("returns a null meaning when only non-exact matches exist", async () => {
    verifySessionUser.mockResolvedValue({ role: "super-admin" });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ word: "carefully", meanings: ["in a careful way"] }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "careful" }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      word: "careful",
      meaning: null,
    });
  });

  it("returns an error payload for upstream failures", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "bad" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meaning", {
        method: "POST",
        body: JSON.stringify({ word: "careful" }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      word: "careful",
      meaning: null,
      error: "Lookup failed.",
    });
  });
});
