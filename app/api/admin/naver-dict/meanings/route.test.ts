import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUser = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser,
}));

describe("POST /api/admin/naver-dict/meanings", () => {
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
      new NextRequest("http://localhost/api/admin/naver-dict/meanings", {
        method: "POST",
        body: JSON.stringify({ words: ["careful"] }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects non-admin callers", async () => {
    verifySessionUser.mockResolvedValue({ role: "user" });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meanings", {
        method: "POST",
        body: JSON.stringify({ words: ["careful"] }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("validates words", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meanings", {
        method: "POST",
        body: JSON.stringify({ words: "careful" }),
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
          items: [
            {
              word: "careful",
              meanings: ["giving close attention"],
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meanings", {
        method: "POST",
        body: JSON.stringify({ words: ["careful"] }),
      }),
    );

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      "https://example.com/dict/search?query=careful&dict_type=english&search_mode=simple",
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ word: "careful", meaning: "giving close attention" }],
    });
  });

  it("leaves a word unresolved when only non-exact matches exist", async () => {
    verifySessionUser.mockResolvedValue({ role: "super-admin" });
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              word: "carefully",
              meanings: ["in a careful way"],
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meanings", {
        method: "POST",
        body: JSON.stringify({ words: ["careful"] }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      items: [{ word: "careful", meaning: null }],
    });
  });

  it("preserves per-word failures without failing the whole batch", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: [{ word: "careful", meanings: ["giving close attention"] }],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "bad" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      );

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/naver-dict/meanings", {
        method: "POST",
        body: JSON.stringify({ words: ["careful", "usable"] }),
      }),
    );

    await expect(response.json()).resolves.toEqual({
      items: [
        { word: "careful", meaning: "giving close attention" },
        { word: "usable", meaning: null, error: "Lookup failed." },
      ],
    });
  });
});
