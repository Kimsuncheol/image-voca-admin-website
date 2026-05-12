import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUserMock = vi.fn();
const getQuizCourseMock = vi.fn();
const docMock = vi.fn();
const docGetMock = vi.fn();
const docDeleteMock = vi.fn();

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser: verifySessionUserMock,
}));

vi.mock("@/lib/server/quizGeneration", () => ({
  getQuizCourse: getQuizCourseMock,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    doc: docMock,
  },
}));

function createRequest(query: string, method = "GET") {
  return new NextRequest(`http://localhost/api/admin/words-placement?${query}`, { method });
}

describe("/api/admin/words-placement", () => {
  beforeEach(() => {
    vi.resetModules();
    verifySessionUserMock.mockReset();
    getQuizCourseMock.mockReset();
    docMock.mockReset();
    docGetMock.mockReset();
    docDeleteMock.mockReset();

    verifySessionUserMock.mockResolvedValue({ role: "admin" });
    getQuizCourseMock.mockReturnValue({ path: "courses/csat" });
    docMock.mockReturnValue({ get: docGetMock, delete: docDeleteMock });
    docGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ gameType: "words_placement", items: [] }),
    });
    docDeleteMock.mockResolvedValue(undefined);
  });

  it("returns the saved words placement document", async () => {
    const { GET } = await import("./route");
    const response = await GET(createRequest("course=CSAT&day=1"));

    expect(response.status).toBe(200);
    expect(docMock).toHaveBeenCalledWith("courses/csat/Day1/Day1-quiz/words_placement/data");
    await expect(response.json()).resolves.toEqual({
      gameType: "words_placement",
      items: [],
    });
  });

  it("deletes the exact words placement document path", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(createRequest("course=CSAT&day=2", "DELETE"));

    expect(response.status).toBe(204);
    expect(docMock).toHaveBeenCalledWith("courses/csat/Day2/Day2-quiz/words_placement/data");
    expect(docDeleteMock).toHaveBeenCalledTimes(1);
  });

  it("supports JLPT level and Kanji path resolution", async () => {
    getQuizCourseMock.mockReturnValueOnce({ path: "courses/jlpt/N2" });

    const { GET } = await import("./route");
    await GET(createRequest("course=JLPT&level=N2&day=3"));

    expect(getQuizCourseMock).toHaveBeenCalledWith({ course: "JLPT", level: "N2" });
    expect(docMock).toHaveBeenCalledWith("courses/jlpt/N2/Day3/Day3-quiz/words_placement/data");

    getQuizCourseMock.mockReturnValueOnce({ path: "courses/kanji" });
    await GET(createRequest("course=KANJI&level=N1&day=1"));
    expect(getQuizCourseMock).toHaveBeenCalledWith({ course: "KANJI", level: null });
  });

  it("rejects invalid day, missing JLPT level, and forbidden users", async () => {
    const { GET } = await import("./route");

    await expect(GET(createRequest("course=CSAT&day=0")).then((res) => res.status)).resolves.toBe(400);
    await expect(GET(createRequest("course=JLPT&day=1")).then((res) => res.status)).resolves.toBe(400);

    verifySessionUserMock.mockResolvedValueOnce({ role: "user" });
    await expect(GET(createRequest("course=CSAT&day=1")).then((res) => res.status)).resolves.toBe(403);
  });
});
