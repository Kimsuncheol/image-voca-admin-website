import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const collectionMock = vi.fn();
const docMock = vi.fn();
const setMock = vi.fn();
const verifySessionUserMock = vi.fn();
const getQuizCourseMock = vi.fn();

// @ts-expect-error Vitest supports virtual mocks at runtime, but this version's
// type signature does not expose the third argument.
vi.mock("server-only", () => ({}), { virtual: true });

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: collectionMock,
  },
}));

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser: verifySessionUserMock,
}));

vi.mock("@/lib/server/quizGeneration", () => ({
  getQuizCourse: getQuizCourseMock,
}));

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/quiz-save", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/quiz-save", () => {
  const originalEnglishPath = process.env.NEXT_PUBLIC_POP_QUIZ_ENGLISH;
  const originalJapanesePath = process.env.NEXT_PUBLIC_POP_QUIZ_JAPANESE;

  beforeEach(() => {
    vi.resetModules();
    collectionMock.mockReset();
    docMock.mockReset();
    setMock.mockReset();
    verifySessionUserMock.mockReset();
    getQuizCourseMock.mockReset();

    verifySessionUserMock.mockResolvedValue({ role: "admin" });
    getQuizCourseMock.mockReturnValue({ path: "courses/TOEIC" });
    collectionMock.mockReturnValue({ doc: docMock });
    docMock.mockReturnValue({ set: setMock, id: "data" });
    setMock.mockResolvedValue(undefined);

    process.env.NEXT_PUBLIC_POP_QUIZ_ENGLISH = "/pop-quiz/root/English/base/matching";
    process.env.NEXT_PUBLIC_POP_QUIZ_JAPANESE = "/pop-quiz/root/Japanese/base/matching";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_POP_QUIZ_ENGLISH = originalEnglishPath;
    process.env.NEXT_PUBLIC_POP_QUIZ_JAPANESE = originalJapanesePath;
  });

  it("keeps normal quiz saves on the course day quiz path", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        course: "TOEIC",
        level: null,
        day: 2,
        quiz_data: {
          quiz_type: "matching",
          language: "english",
          choices: [],
        },
      }),
    );

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith(
      "courses/TOEIC/Day2/Day2-quiz/matching",
    );
    expect(docMock).toHaveBeenCalledWith("data");
  });

  it("saves English pop quizzes into the configured matching collection data document", async () => {
    const quizData = {
      quiz_type: "matching",
      language: "English",
      items: [],
      choices: [],
      answer_key: [],
    };

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        save_target: "pop_quiz",
        course: "TOEIC",
        level: null,
        day: 1,
        quiz_data: quizData,
      }),
    );

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith(
      "/pop-quiz/root/English/base/matching",
    );
    expect(docMock).toHaveBeenCalledWith("data");
    expect(setMock).toHaveBeenCalledWith(
      {
        courses: {
          TOEIC: {
            days: {
              "1": quizData,
            },
          },
        },
      },
      { merge: true },
    );
  });

  it("saves Japanese pop quizzes into the configured matching collection data document", async () => {
    const quizData = {
      quiz_type: "matching",
      language: "Japanese",
      items: [],
      choices: [],
      answer_key: [],
    };

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        save_target: "pop_quiz",
        course: "JLPT",
        level: "N2",
        day: 3,
        quiz_data: quizData,
      }),
    );

    expect(response.status).toBe(200);
    expect(collectionMock).toHaveBeenCalledWith(
      "/pop-quiz/root/Japanese/base/matching",
    );
    expect(docMock).toHaveBeenCalledWith("data");
    expect(setMock).toHaveBeenCalledWith(
      {
        levels: {
          N2: {
            days: {
              "3": quizData,
            },
          },
        },
      },
      { merge: true },
    );
  });

  it("returns 400 when the required pop quiz env path is missing", async () => {
    delete process.env.NEXT_PUBLIC_POP_QUIZ_ENGLISH;

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        save_target: "pop_quiz",
        course: "TOEIC",
        level: null,
        day: 1,
        quiz_data: {
          quiz_type: "matching",
          language: "english",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(collectionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "POP_QUIZ_STORAGE_PATH_NOT_CONFIGURED",
      message: "NEXT_PUBLIC_POP_QUIZ_ENGLISH is not configured or is not a Firestore collection path.",
      language: "english",
      course: "TOEIC",
      level: null,
      save_target: "pop_quiz",
    });
  });

  it("returns 400 when the pop quiz env path is not a collection path", async () => {
    process.env.NEXT_PUBLIC_POP_QUIZ_ENGLISH = "/pop-quiz/root/English/base";

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        save_target: "pop_quiz",
        course: "TOEIC",
        level: null,
        day: 1,
        quiz_data: {
          quiz_type: "matching",
          language: "english",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(collectionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "POP_QUIZ_STORAGE_PATH_NOT_CONFIGURED",
      message: "NEXT_PUBLIC_POP_QUIZ_ENGLISH is not configured or is not a Firestore collection path.",
      language: "english",
      course: "TOEIC",
      level: null,
      save_target: "pop_quiz",
    });
  });

  it("returns 400 when a Japanese pop quiz save has no level key", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        save_target: "pop_quiz",
        course: "JLPT",
        level: null,
        day: 1,
        quiz_data: {
          quiz_type: "matching",
          language: "japanese",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(collectionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "POP_QUIZ_INVALID_STORAGE_KEY",
      message: "Invalid pop quiz save request.",
    });
  });

  it("returns 400 for non-matching pop quiz saves", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "fill_blank",
        save_target: "pop_quiz",
        course: "TOEIC",
        level: null,
        day: 1,
        quiz_data: {
          quiz_type: "fill_blank",
          language: "english",
        },
      }),
    );

    expect(response.status).toBe(400);
    expect(collectionMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "POP_QUIZ_UNSUPPORTED_QUIZ_TYPE",
      message: "Pop quiz saves only support matching quizzes.",
    });
  });
});
