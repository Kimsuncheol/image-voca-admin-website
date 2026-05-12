import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/server/quizGeneration", () => ({
  getQuizCourse: vi.fn(({ course, level }: { course: string; level?: string | null }) => {
    const map: Record<string, { id: string; path: string }> = {
      CSAT: { id: "CSAT", path: "courses/csat" },
      JLPT: { id: `JLPT_${level ?? "N3"}`, path: `courses/jlpt/${level ?? "N3"}` },
      KANJI: { id: "KANJI", path: "courses/kanji" },
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
    expect(result.items[0]?.wordsToPlace[1]).toMatchObject({
      targetExample: "Valid experiments also must have data that are measurable.",
    });
    expect(result.items[0]?.wordsToPlace[1]?.chunks.at(-1)).toMatchObject({
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
        course: "FAMOUS_QUOTE",
        day: 1,
      }),
    ).rejects.toThrow("Words placement supports English, JLPT, and Kanji day-based courses only.");
  });

  it("supports JLPT generation with a level path", async () => {
    const collection = vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        docs: [
          {
            id: "jlpt-1",
            data: () => ({
              word: "間",
              example: "家(いえ)と学(がっ)校(こう)の間(あいだ)に公(こう)園(えん)がある。",
            }),
          },
        ],
      }),
    }));

    const { result, savePath } = await generateWordsPlacementGame({
      db: { collection } as never,
      course: "JLPT",
      level: "N3",
      day: 1,
    });

    expect(collection).toHaveBeenCalledWith("courses/jlpt/N3/Day1");
    expect(savePath).toBe("courses/jlpt/N3/Day1/Day1-quiz/words_placement/data");
    expect(result.courseId).toBe("JLPT_N3");
    expect(result.items[0]?.wordsToPlace[0]).toEqual({
      targetExample: "家と学校の間に公園がある。",
      chunks: [
        { id: "jlpt-1-1-chunk-1", text: "家と", type: "sentence_chunk", order: 1 },
        { id: "jlpt-1-1-chunk-2", text: "学校の", type: "sentence_chunk", order: 2 },
        { id: "jlpt-1-1-chunk-3", text: "間に", type: "answer", order: 3 },
        { id: "jlpt-1-1-chunk-4", text: "公園が", type: "sentence_chunk", order: 4 },
        { id: "jlpt-1-1-chunk-5", text: "ある。", type: "sentence_chunk", order: 5 },
      ],
    });
  });

  it("supports Kanji generation from marked example arrays", async () => {
    const collection = vi.fn(() => ({
      get: vi.fn().mockResolvedValue({
        docs: [
          {
            id: "kanji-1",
            data: () => ({
              kanji: "一",
              example: [
                "これは[[[いつ]]]でいくらですか。",
                "[[[一]]]月(いちがつ)新(あたら)しい一(いち)年(ねん)の始(はじ)まりだ。",
              ],
            }),
          },
        ],
      }),
    }));

    const { result, savePath } = await generateWordsPlacementGame({
      db: { collection } as never,
      course: "KANJI",
      day: 1,
    });

    expect(collection).toHaveBeenCalledWith("courses/kanji/Day1");
    expect(savePath).toBe("courses/kanji/Day1/Day1-quiz/words_placement/data");
    expect(result.courseId).toBe("KANJI");
    expect(result.items[0]?.wordsToPlace).toHaveLength(2);
    expect(result.items[0]?.wordsToPlace[0]).toMatchObject({
      targetExample: "これはいつでいくらですか。",
    });
    expect(result.items[0]?.wordsToPlace[0]?.chunks[1]).toMatchObject({
      text: "いつで",
      type: "answer",
    });
    expect(result.items[0]?.wordsToPlace[1]).toMatchObject({
      targetExample: "一月新しい一年の始まりだ。",
    });
    expect(result.items[0]?.wordsToPlace[1]?.chunks[0]).toMatchObject({
      text: "一月",
      type: "answer",
    });
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
    expect(savePath).toBe("courses/csat/Day1/Day1-quiz/words_placement/data");
    expect(doc.items[0]?.wordsToPlace).toEqual([
      {
        targetExample: "Too much help may spoil your child.",
        chunks: [
          { id: "word-1-1-chunk-1", text: "Too much help may", type: "sentence_chunk", order: 1 },
          { id: "word-1-1-chunk-2", text: "spoil", type: "answer", order: 2 },
          { id: "word-1-1-chunk-3", text: "your child.", type: "sentence_chunk", order: 3 },
        ],
      },
    ]);
  });
});
