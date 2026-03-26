import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUser = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser,
}));

describe("GET /api/admin/naver-dict/search", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NAVER_DICT_API_BASE_URL", "https://example.com");
  });

  it("returns 400 when query is missing", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/naver-dict/search"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Query is required.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards default dict_type and search_mode values", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [{ word: "apple" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/naver-dict/search?query=apple",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ word: "apple" }],
    });

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).toBe(
      "https://example.com/dict/search?query=apple&dict_type=english&search_mode=simple",
    );
  });

  it("forwards successful upstream responses with explicit params", async () => {
    verifySessionUser.mockResolvedValue({ role: "super-admin" });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [{ word: "猫" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/naver-dict/search?query=%E7%8C%AB&dict_type=japanese&search_mode=detailed",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ word: "猫" }],
    });
  });

  it("preserves non-200 upstream status for JSON error bodies", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Validation Error" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/naver-dict/search?query=apple&search_mode=detailed",
      ),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      detail: "Validation Error",
    });
  });
});
