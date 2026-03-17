import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const lookupJlptPronunciations = vi.fn();
const verifySessionUser = vi.fn();

vi.mock("@/lib/server/jmdictPronunciation", () => ({
  lookupJlptPronunciations,
}));

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser,
}));

describe("POST /api/admin/jlpt-pronunciation", () => {
  beforeEach(() => {
    vi.resetModules();
    lookupJlptPronunciations.mockReset();
    verifySessionUser.mockReset();
  });

  it("returns normalized items for authorized admins", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    lookupJlptPronunciations.mockResolvedValue([
      {
        word: "猫",
        pronunciation: "ねこ",
        pronunciationRoman: "neko",
      },
    ]);

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/jlpt-pronunciation", {
        method: "POST",
        body: JSON.stringify({ words: ["猫"] }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          word: "猫",
          pronunciation: "ねこ",
          pronunciationRoman: "neko",
        },
      ],
    });
  });

  it("rejects unauthorized callers", async () => {
    verifySessionUser.mockResolvedValue(null);

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/jlpt-pronunciation", {
        method: "POST",
        body: JSON.stringify({ words: ["猫"] }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
