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
  buildVocabApiUrl: (path: string) => `https://text-api.example${path}`,
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
        pop_quiz_type: "matching_game",
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
      "https://text-api.example/v1/pop-quizzes/generate",
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
      "https://text-api.example/v1/pop-quizzes/generate",
      expect.objectContaining({
        body: expect.stringContaining('"count":5'),
      }),
    );
  });

  it("caps matching game upstream count at 20", async () => {
    mockDayWordCount(30);

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 19,
        count: 30,
      }),
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://text-api.example/v1/pop-quizzes/generate",
      expect.objectContaining({
        body: expect.stringContaining('"count":20'),
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      max_count: 30,
      requested_count: 30,
    });
  });

  it("sends the pop quiz matching request schema upstream", async () => {
    mockDayWordCount(10);

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        language: "japanese",
        course: "JLPT",
        level: "N2",
        day: 3,
        count: 7,
      }),
    );

    expect(response.status).toBe(200);
    const [, init] = vi.mocked(global.fetch).mock.calls[0] ?? [];
    expect(init?.body).toBe(JSON.stringify({
      pop_quiz_type: "matching_game",
      language: "japanese",
      course: "JLPT",
      level: "N2",
      day: 3,
      count: 7,
    }));
  });

  it("keeps fill-in-the-blank generation on the legacy quiz endpoint", async () => {
    mockDayWordCount(10);
    vi.mocked(global.fetch).mockResolvedValueOnce(
      Response.json({
        quiz_type: "fill_blank",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 1,
        questions: [],
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "fill_blank",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 1,
        count: 5,
      }),
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://text-api.example/v1/quizzes/generate",
      expect.objectContaining({
        body: expect.stringContaining('"quiz_type":"fill_blank"'),
      }),
    );
  });

  it("normalizes English pop quiz matching items and choices to the existing shape", async () => {
    mockDayWordCount(10);
    vi.mocked(global.fetch).mockResolvedValueOnce(
      Response.json({
        pop_quiz_type: "matching_game",
        language: "english",
        course: "COLLOCATION",
        level: null,
        day: 12,
        items: [
          {
            id: "q1",
            text: "make a decision",
            meaning: "decide",
          },
        ],
        choices: [
          {
            id: "c1",
            text: "decide",
          },
        ],
        answer_key: [
          { item_id: "q1", choice_id: "c1" },
        ],
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        language: "english",
        course: "COLLOCATION",
        level: null,
        day: 12,
        count: 1,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      quiz_type: "matching",
      language: "english",
      course: "COLLOCATION",
      level: null,
      day: 12,
      items: [
        {
          id: "q1",
          word: "make a decision",
          meaning: "decide",
          meaningEnglish: "decide",
          meaningKorean: "decide",
        },
      ],
      choices: [
        {
          id: "c1",
          word: "decide",
          meaning: "decide",
          meaningEnglish: "decide",
          meaningKorean: "decide",
        },
      ],
      answer_key: [
        { item_id: "q1", choice_id: "c1" },
      ],
    });
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

  it("normalizes matching items and choices to word and meaning fields", async () => {
    mockDayWordCount(10);
    vi.mocked(global.fetch).mockResolvedValueOnce(
      Response.json({
        pop_quiz_type: "matching_game",
        language: "japanese",
        course: "JLPT",
        level: "N3",
        day: 1,
        items: [
          {
            id: "item-1",
            text: "食べる",
            meaningEnglish: "to eat",
            meaningKorean: "먹다",
          },
          {
            id: "item-2",
            text: "見る",
            meaningEnglish: "to see",
            meaningKorean: "보다",
          },
        ],
        choices: [
          {
            id: "choice-1",
            text: "to eat",
          },
          {
            id: "choice-2",
            text: "to see",
          },
        ],
        answer_key: [
          { item_id: "item-1", choice_id: "choice-1" },
          { item_id: "item-2", choice_id: "choice-2" },
        ],
      }),
    );

    const { POST } = await import("./route");
    const response = await POST(
      createRequest({
        quiz_type: "matching",
        language: "japanese",
        course: "JLPT",
        level: "N3",
        day: 1,
        count: 2,
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      quiz_type: "matching",
      items: [
        {
          id: "item-1",
          word: "食べる",
          meaningEnglish: "to eat",
          meaningKorean: "먹다",
        },
        {
          id: "item-2",
          word: "見る",
          meaningEnglish: "to see",
          meaningKorean: "보다",
        },
      ],
      choices: [
        {
          id: "choice-1",
          word: "to eat",
          meaningEnglish: "to eat",
          meaningKorean: "먹다",
        },
        {
          id: "choice-2",
          word: "to see",
          meaningEnglish: "to see",
          meaningKorean: "보다",
        },
      ],
      answer_key: [
        { item_id: "item-1", choice_id: "choice-1" },
        { item_id: "item-2", choice_id: "choice-2" },
      ],
    });
  });
});
