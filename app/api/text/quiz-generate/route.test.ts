import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCourseByIdMock = vi.fn();
const collectionMock = vi.fn();
const docMock = vi.fn();
const docGetMock = vi.fn();
const countGetMock = vi.fn();
const collectionGetMock = vi.fn();

// @ts-expect-error Vitest supports virtual mocks at runtime, but this version's
// type signature does not expose the third argument.
vi.mock("server-only", () => ({}), { virtual: true });

vi.mock("@/types/course", () => ({
  getCourseById: getCourseByIdMock,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: collectionMock,
    doc: docMock,
  },
}));

vi.mock("@/lib/server/textApi", () => ({
  buildVocabApiUrl: () => "https://text-api.example/v1/quizzes/generate",
}));

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/text/quiz-generate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockDayWordCount(count: number) {
  getCourseByIdMock.mockReturnValue({
    id: "TOEIC",
    path: "courses/TOEIC",
  });
  docGetMock.mockResolvedValue({
    data: () => ({ totalDays: 30 }),
  });
  countGetMock.mockResolvedValue({
    data: () => ({ count }),
  });
}

describe("POST /api/text/quiz-generate", () => {
  beforeEach(() => {
    vi.resetModules();
    getCourseByIdMock.mockReset();
    collectionMock.mockReset();
    docMock.mockReset();
    docGetMock.mockReset();
    countGetMock.mockReset();
    collectionGetMock.mockReset();

    docMock.mockReturnValue({
      get: docGetMock,
    });
    collectionMock.mockReturnValue({
      count: () => ({ get: countGetMock }),
      get: collectionGetMock,
    });

    global.fetch = vi.fn(async () =>
      Response.json({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 1,
        items: [],
        choices: [],
        answer_key: [],
      }),
    );
  });

  it("clamps requested count to the selected day word count", async () => {
    mockDayWordCount(10);

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 19,
        count: 20,
      }),
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://text-api.example/v1/quizzes/generate",
      expect.objectContaining({
        body: expect.stringContaining('"count":10'),
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      max_days: 30,
      max_count: 10,
      requested_count: 20,
    });
  });

  it("keeps requested count when it is below the selected day word count", async () => {
    mockDayWordCount(10);

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 19,
        count: 5,
      }),
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://text-api.example/v1/quizzes/generate",
      expect.objectContaining({
        body: expect.stringContaining('"count":5'),
      }),
    );
  });

  it("returns an error and does not call upstream when the day has no words", async () => {
    mockDayWordCount(0);

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 19,
        count: 5,
      }),
    );

    expect(response.status).toBe(422);
    expect(global.fetch).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: "The selected day has no words.",
      max_count: 0,
      requested_count: 5,
    });
  });
});
