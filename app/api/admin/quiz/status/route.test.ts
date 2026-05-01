import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUserMock = vi.fn();
const getQuizCourseMock = vi.fn();
const getQuizCourseTotalDaysMock = vi.fn();
const docMock = vi.fn();
const docGetMock = vi.fn();
const collectionMock = vi.fn();
const collectionDocMock = vi.fn();
const collectionDocGetMock = vi.fn();

// @ts-expect-error Vitest supports virtual mocks at runtime, but this version's
// type signature does not expose the third argument.
vi.mock("server-only", () => ({}), { virtual: true });

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
    collection: collectionMock,
  },
}));

function createRequest(query: string) {
  return new NextRequest(`http://localhost/api/admin/quiz/status?${query}`);
}

describe("GET /api/admin/quiz/status", () => {
  beforeEach(() => {
    vi.resetModules();
    verifySessionUserMock.mockReset();
    getQuizCourseMock.mockReset();
    getQuizCourseTotalDaysMock.mockReset();
    docMock.mockReset();
    docGetMock.mockReset();
    collectionMock.mockReset();
    collectionDocMock.mockReset();
    collectionDocGetMock.mockReset();

    verifySessionUserMock.mockResolvedValue({ role: "admin" });
    getQuizCourseMock.mockReturnValue({ path: "courses/TOEIC" });
    getQuizCourseTotalDaysMock.mockResolvedValue({ totalDays: 3 });
    docMock.mockReturnValue({ get: docGetMock });
    docGetMock.mockResolvedValue({ exists: false });
    collectionMock.mockReturnValue({ doc: collectionDocMock });
    collectionDocMock.mockReturnValue({ get: collectionDocGetMock });
    collectionDocGetMock.mockResolvedValue({
      data: () => ({
        courses: {
          TOEIC: {
            days: {
              "1": { quiz_type: "matching" },
              "3": { quiz_type: "matching" },
            },
          },
        },
        levels: {
          N2: {
            days: {
              "2": { quiz_type: "matching" },
            },
          },
        },
      }),
    });

    process.env.NEXT_PUBLIC_POP_QUIZ_ENGLISH = "/pop-quiz/root/English/base/matching";
    process.env.NEXT_PUBLIC_POP_QUIZ_JAPANESE = "/pop-quiz/root/Japanese/base/matching";
  });

  it("keeps normal quiz status on course day quiz documents", async () => {
    docGetMock
      .mockResolvedValueOnce({ exists: true })
      .mockResolvedValueOnce({ exists: false })
      .mockResolvedValueOnce({ exists: true });

    const { GET } = await import("./route");
    const response = await GET(
      createRequest("quiz_type=matching&language=english&course=TOEIC"),
    );

    expect(response.status).toBe(200);
    expect(docMock).toHaveBeenCalledWith("courses/TOEIC/Day1/Day1-quiz/matching/data");
    expect(docMock).toHaveBeenCalledWith("courses/TOEIC/Day2/Day2-quiz/matching/data");
    await expect(response.json()).resolves.toEqual({ total: 3, days: [1, 3] });
  });

  it("returns saved pop quiz days for the selected English course", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      createRequest("quiz_type=matching&save_target=pop_quiz&language=English&course=TOEIC"),
    );

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith("/pop-quiz/root/English/base/matching");
    expect(collectionDocMock).toHaveBeenCalledWith("data");
    await expect(response.json()).resolves.toEqual({ total: 3, days: [1, 3] });
  });

  it("returns saved pop quiz days for the selected Japanese level", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      createRequest("quiz_type=matching&save_target=pop_quiz&language=Japanese&course=JLPT&level=N2"),
    );

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith("/pop-quiz/root/Japanese/base/matching");
    await expect(response.json()).resolves.toEqual({ total: 3, days: [2] });
  });
});
