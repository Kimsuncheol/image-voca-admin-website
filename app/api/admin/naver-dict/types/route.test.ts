import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUser = vi.fn();
const fetchMock = vi.fn<typeof fetch>();

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser,
}));

describe("GET /api/admin/naver-dict/types", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NAVER_DICT_API_BASE_URL", "https://example.com");
  });

  it("returns 401 for unauthenticated callers", async () => {
    verifySessionUser.mockResolvedValue(null);

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/naver-dict/types"),
    );

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 403 for non-admin callers", async () => {
    verifySessionUser.mockResolvedValue({ role: "user" });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/naver-dict/types"),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards upstream payloads and status", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ types: ["english", "korean"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/naver-dict/types"),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      types: ["english", "korean"],
    });
    expect(fetchMock).toHaveBeenCalledWith("https://example.com/dict/types", {
      cache: "no-store",
    });
  });

  it("returns a config error when NAVER_DICT_API_BASE_URL is missing", async () => {
    verifySessionUser.mockResolvedValue({ role: "super-admin" });
    vi.stubEnv("NAVER_DICT_API_BASE_URL", "");

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("http://localhost/api/admin/naver-dict/types"),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "NAVER_DICT_API_BASE_URL is not configured.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
