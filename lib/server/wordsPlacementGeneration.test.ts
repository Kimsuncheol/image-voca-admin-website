import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/quizGeneration", () => ({
  getQuizCourse: vi.fn(({ course }: { course: string }) => {
    const map: Record<string, { id: string; path: string }> = {
      CSAT: { id: "CSAT", path: "courses/csat" },
      JLPT: { id: "JLPT", path: "courses/jlpt" },
    };
    return map[course];
  }),
}));

import {
  buildWordsPlacementResult,
  generateWordsPlacementGame,
  toFirestoreWordsPlacementDoc,
} from "./wordsPlacementGeneration";

describe("words placement generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates items from English day words and skips unusable words", () => {
    const result = buildWordsPlacementResult({
      courseId: "CSAT",
      day: 1,
      words: [
        {
          id: "word-1",
          word: "measure",
          example: `1. He measured the width of the floor.
2. Valid experiments also must have data that are measurable.`,
        },
        { id: "word-2", word: "empty", example: "" },
        { id: "word-3", word: "absent", example: "Nothing matches here." },
      ],
    });

    expect(result).toMatchObject({
      gameType: "words_placement",
      courseId: "CSAT",
      dayId: "Day1",
      version: 1,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.wordsToPlace).toHaveLength(2);
    expect(result.items[0]?.wordsToPlace[1]?.at(-1)).toMatchObject({
      text: "measurable.",
      type: "answer",
    });
    expect(result.skipped).toEqual([
      { wordId: "word-2", word: "empty", reason: "Missing example." },
      {
        wordId: "word-3",
        word: "absent",
        reason: "No matching word form found in example.",
      },
    ]);
  });

  it("rejects unsupported courses", async () => {
    await expect(
      generateWordsPlacementGame({
        db: {
          collection: vi.fn(),
        } as never,
        course: "JLPT",
        day: 1,
      }),
    ).rejects.toThrow("Words placement supports English day-based courses only.");
  });

  it("returns the exact save path and a Firestore-safe document", async () => {
    const collection = vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        docs: [
          {
            id: "word-1",
            data: () => ({
              word: "spoil",
              example: "Too much help may spoil your child.",
            }),
          },
        ],
      }),
    }));

    const { result, savePath } = await generateWordsPlacementGame({
      db: { collection } as never,
      course: "CSAT",
      day: 1,
    });
    const doc = toFirestoreWordsPlacementDoc(result);

    expect(collection).toHaveBeenCalledWith("courses/csat/Day1");
    expect(savePath).toBe("courses/csat/Day1/Day1-game/words_placement/data");
    expect(doc.items[0]?.wordsToPlace).toEqual([
      {
        chunks: [
          { id: "word-1-1-chunk-1", text: "Too much help may", type: "sentence_chunk", order: 1 },
          { id: "word-1-1-chunk-2", text: "spoil", type: "answer", order: 2 },
          { id: "word-1-1-chunk-3", text: "your child.", type: "sentence_chunk", order: 3 },
        ],
      },
    ]);
  });
});
