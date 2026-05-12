import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUser = vi.fn();
const generateWordsPlacementGame = vi.fn();
const toFirestoreWordsPlacementDoc = vi.fn();
const setMock = vi.fn();
const docMock = vi.fn(() => ({ set: setMock }));

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    doc: docMock,
  },
}));

vi.mock("@/lib/server/wordsPlacementGeneration", () => ({
  generateWordsPlacementGame,
  toFirestoreWordsPlacementDoc,
}));

describe("POST /api/admin/words-placement/generate", () => {
  beforeEach(() => {
    vi.resetModules();
    verifySessionUser.mockReset();
    generateWordsPlacementGame.mockReset();
    toFirestoreWordsPlacementDoc.mockReset();
    setMock.mockReset();
    docMock.mockClear();
  });

  it("requires admin access", async () => {
    verifySessionUser.mockResolvedValue({ role: "user" });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/words-placement/generate", {
        method: "POST",
        body: JSON.stringify({ course: "CSAT", day: 1 }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("generates and saves to the resolved path", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    const result = {
      gameType: "words_placement",
      courseId: "CSAT",
      dayId: "Day1",
      version: 1,
      items: [],
      skipped: [],
    };
    generateWordsPlacementGame.mockResolvedValue({
      result,
      savePath: "courses/csat/Day1/Day1-quiz/words_placement/data",
    });
    toFirestoreWordsPlacementDoc.mockReturnValue({ gameType: "words_placement" });

    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("http://localhost/api/admin/words-placement/generate", {
        method: "POST",
        body: JSON.stringify({ course: "CSAT", day: 1, save: true }),
      }),
    );

    expect(response.status).toBe(200);
    expect(generateWordsPlacementGame).toHaveBeenCalledWith({
      db: expect.any(Object),
      course: "CSAT",
      level: undefined,
      day: 1,
    });
    expect(docMock).toHaveBeenCalledWith("courses/csat/Day1/Day1-quiz/words_placement/data");
    expect(setMock).toHaveBeenCalledWith({ gameType: "words_placement" });
    await expect(response.json()).resolves.toMatchObject({
      saved: true,
      path: "courses/csat/Day1/Day1-quiz/words_placement/data",
    });
  });
});
