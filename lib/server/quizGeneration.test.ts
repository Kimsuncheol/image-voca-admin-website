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

describe("quizGeneration helpers", () => {
  beforeEach(() => {
    getCourseByIdMock.mockReset();
    collectionMock.mockReset();
    docMock.mockReset();
    docGetMock.mockReset();
    countGetMock.mockReset();
    collectionGetMock.mockReset();

    docMock.mockReturnValue({
      get: docGetMock,
    });
    docGetMock.mockResolvedValue({
      data: () => ({ totalDays: 20 }),
    });
    collectionMock.mockReturnValue({
      count: () => ({ get: countGetMock }),
      get: collectionGetMock,
    });
  });

  it("resolves quiz course ids for aliases and JLPT levels", async () => {
    const { resolveQuizCourseId } = await import("./quizGeneration");

    expect(resolveQuizCourseId({ course: "CSAT_IDIOMS" })).toBe("IDIOMS");
    expect(resolveQuizCourseId({ course: "TOEFL_ITELS" })).toBe("TOEFL_IELTS");
    expect(resolveQuizCourseId({ course: "COLLOCATION" })).toBe("COLLOCATIONS");
    expect(resolveQuizCourseId({ course: "JLPT", level: "N5" })).toBe("JLPT_N5");
  });

  it("counts day words using aggregate count", async () => {
    getCourseByIdMock.mockReturnValue({
      id: "TOEIC",
      path: "courses/TOEIC",
    });
    countGetMock.mockResolvedValue({
      data: () => ({ count: 10 }),
    });

    const { countQuizDayWords } = await import("./quizGeneration");
    const result = await countQuizDayWords({
      course: "TOEIC",
      level: null,
      day: 19,
    });

    expect(collectionMock).toHaveBeenCalledWith("courses/TOEIC/Day19");
    expect(result.count).toBe(10);
    expect(result.maxDays).toBe(20);
  });

  it("falls back to collection snapshot size when aggregate count fails", async () => {
    getCourseByIdMock.mockReturnValue({
      id: "TOEIC",
      path: "courses/TOEIC",
    });
    countGetMock.mockRejectedValue(new Error("aggregate unavailable"));
    collectionGetMock.mockResolvedValue({
      size: 6,
      docs: [{}, {}, {}, {}, {}, {}],
    });

    const { countQuizDayWords } = await import("./quizGeneration");
    const result = await countQuizDayWords({
      course: "TOEIC",
      level: null,
      day: 2,
    });

    expect(result.count).toBe(6);
  });

  it("rejects days above the course total day count", async () => {
    getCourseByIdMock.mockReturnValue({
      id: "TOEIC",
      path: "courses/TOEIC",
    });
    docGetMock.mockResolvedValue({
      data: () => ({ totalDays: 5 }),
    });

    const { countQuizDayWords } = await import("./quizGeneration");

    await expect(
      countQuizDayWords({
        course: "TOEIC",
        level: null,
        day: 6,
      }),
    ).rejects.toThrow("Selected day exceeds available days.");
  });
});
