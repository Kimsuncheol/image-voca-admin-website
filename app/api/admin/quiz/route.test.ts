import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUserMock = vi.fn();
const getQuizCourseMock = vi.fn();
const docMock = vi.fn();
const docGetMock = vi.fn();
const docDeleteMock = vi.fn();
const collectionMock = vi.fn();
const collectionDocMock = vi.fn();
const collectionDocGetMock = vi.fn();
const collectionDocUpdateMock = vi.fn();
const fieldDeleteMock = vi.fn();

// @ts-expect-error Vitest supports virtual mocks at runtime, but this version's
// type signature does not expose the third argument.
vi.mock("server-only", () => ({}), { virtual: true });

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    delete: fieldDeleteMock,
  },
}));

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser: verifySessionUserMock,
}));

vi.mock("@/lib/server/quizGeneration", () => ({
  getQuizCourse: getQuizCourseMock,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    doc: docMock,
    collection: collectionMock,
  },
}));

function createRequest(query: string, method = "GET") {
  return new NextRequest(`http://localhost/api/admin/quiz?${query}`, { method });
}

describe("/api/admin/quiz", () => {
  beforeEach(() => {
    vi.resetModules();
    verifySessionUserMock.mockReset();
    getQuizCourseMock.mockReset();
    docMock.mockReset();
    docGetMock.mockReset();
    docDeleteMock.mockReset();
    collectionMock.mockReset();
    collectionDocMock.mockReset();
    collectionDocGetMock.mockReset();
    collectionDocUpdateMock.mockReset();
    fieldDeleteMock.mockReset();

    verifySessionUserMock.mockResolvedValue({ role: "admin" });
    getQuizCourseMock.mockReturnValue({ path: "courses/TOEIC" });
    docMock.mockReturnValue({ get: docGetMock, delete: docDeleteMock });
    docGetMock.mockResolvedValue({
      exists: true,
      data: () => ({ quiz_type: "matching", items: [] }),
    });
    docDeleteMock.mockResolvedValue(undefined);
    collectionMock.mockReturnValue({ doc: collectionDocMock });
    collectionDocMock.mockReturnValue({
      get: collectionDocGetMock,
      update: collectionDocUpdateMock,
    });
    collectionDocGetMock.mockResolvedValue({
      exists: true,
      data: () => ({
        courses: {
          TOEIC: {
            days: {
              "1": { quiz_type: "matching", language: "english", items: [] },
            },
          },
        },
        levels: {
          N2: {
            days: {
              "3": { quiz_type: "matching", language: "japanese", items: [] },
            },
          },
        },
      }),
    });
    collectionDocUpdateMock.mockResolvedValue(undefined);
    fieldDeleteMock.mockReturnValue("__DELETE__");

    process.env.NEXT_PUBLIC_POP_QUIZ_ENGLISH = "/pop-quiz/root/English/base/matching";
    process.env.NEXT_PUBLIC_POP_QUIZ_JAPANESE = "/pop-quiz/root/Japanese/base/matching";
  });

  it("keeps normal quiz reads on the course day quiz document", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      createRequest("quiz_type=matching&language=english&course=TOEIC&day=2"),
    );

    expect(response.status).toBe(200);
    expect(docMock).toHaveBeenCalledWith("courses/TOEIC/Day2/Day2-quiz/matching/data");
    await expect(response.json()).resolves.toEqual({ quiz_type: "matching", items: [] });
  });

  it("returns selected English pop quiz day data", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      createRequest("quiz_type=matching&save_target=pop_quiz&language=english&course=TOEIC&day=1"),
    );

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith("/pop-quiz/root/English/base/matching");
    expect(collectionDocMock).toHaveBeenCalledWith("data");
    await expect(response.json()).resolves.toEqual({
      quiz_type: "matching",
      language: "english",
      items: [],
    });
  });

  it("returns selected Japanese pop quiz day data", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      createRequest("quiz_type=matching&save_target=pop_quiz&language=japanese&course=JLPT&level=N2&day=3"),
    );

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith("/pop-quiz/root/Japanese/base/matching");
    await expect(response.json()).resolves.toEqual({
      quiz_type: "matching",
      language: "japanese",
      items: [],
    });
  });

  it("deletes selected pop quiz day with a field delete", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(
      createRequest(
        "quiz_type=matching&save_target=pop_quiz&language=english&course=TOEIC&day=1",
        "DELETE",
      ),
    );

    expect(response.status).toBe(204);
    expect(collectionMock).toHaveBeenCalledWith("/pop-quiz/root/English/base/matching");
    expect(collectionDocUpdateMock).toHaveBeenCalledWith({
      "courses.TOEIC.days.1": "__DELETE__",
    });
  });
});
