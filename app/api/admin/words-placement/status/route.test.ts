import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUserMock = vi.fn();
const getQuizCourseMock = vi.fn();
const getQuizCourseTotalDaysMock = vi.fn();
const docMock = vi.fn();
const docGetMock = vi.fn();

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser: verifySessionUserMock,
}));

vi.mock("@/lib/server/quizGeneration", () => ({
  getQuizCourse: getQuizCourseMock,
  getQuizCourseTotalDays: getQuizCourseTotalDaysMock,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    doc: docMock,
  },
}));

function createRequest(query: string) {
  return new NextRequest(`http://localhost/api/admin/words-placement/status?${query}`);
}

describe("GET /api/admin/words-placement/status", () => {
  beforeEach(() => {
    vi.resetModules();
    verifySessionUserMock.mockReset();
    getQuizCourseMock.mockReset();
    getQuizCourseTotalDaysMock.mockReset();
    docMock.mockReset();
    docGetMock.mockReset();

    verifySessionUserMock.mockResolvedValue({ role: "admin" });
    getQuizCourseMock.mockReturnValue({ path: "courses/csat" });
    getQuizCourseTotalDaysMock.mockResolvedValue({ totalDays: 3 });
    docMock.mockReturnValue({ get: docGetMock });
    docGetMock.mockResolvedValue({ exists: false });
  });

  it("returns saved English words placement days", async () => {
    docGetMock
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: true });

    const { GET } = await import("./route");
    const response = await GET(createRequest("course=CSAT"));

    expect(response.status).toBe(200);
    expect(docMock).toHaveBeenCalledWith("courses/csat/Day1/Day1-quiz/words_placement/data");
    expect(docMock).toHaveBeenCalledWith("courses/csat/Day2/Day2-quiz/words_placement/data");
    await expect(response.json()).resolves.toEqual({ total: 3, days: [1, 3] });
  });

  it("supports JLPT with a level", async () => {
    getQuizCourseMock.mockReturnValue({ path: "courses/jlpt/N3" });
    getQuizCourseTotalDaysMock.mockResolvedValue({ totalDays: 1 });
    docGetMock.mockResolvedValueOnce({ exists: true });

    const { GET } = await import("./route");
    const response = await GET(createRequest("course=JLPT&level=N3"));

    expect(response.status).toBe(200);
    expect(getQuizCourseMock).toHaveBeenCalledWith({ course: "JLPT", level: "N3" });
    expect(docMock).toHaveBeenCalledWith("courses/jlpt/N3/Day1/Day1-quiz/words_placement/data");
    await expect(response.json()).resolves.toEqual({ total: 1, days: [1] });
  });

  it("supports Kanji without a level", async () => {
    getQuizCourseMock.mockReturnValue({ path: "courses/kanji" });
    getQuizCourseTotalDaysMock.mockResolvedValue({ totalDays: 1 });

    const { GET } = await import("./route");
    const response = await GET(createRequest("course=KANJI"));

    expect(response.status).toBe(200);
    expect(getQuizCourseMock).toHaveBeenCalledWith({ course: "KANJI", level: null });
  });

  it("rejects unsupported courses and non-admin users", async () => {
    const { GET } = await import("./route");
    await expect(GET(createRequest("course=FAMOUS_QUOTE")).then((res) => res.status)).resolves.toBe(400);

    verifySessionUserMock.mockResolvedValueOnce({ role: "user" });
    await expect(GET(createRequest("course=CSAT")).then((res) => res.status)).resolves.toBe(403);
  });
});
