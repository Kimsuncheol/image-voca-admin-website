import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  batchSetMock,
  batchCommitMock,
  getDocMock,
  setDocMock,
  dbMock,
} = vi.hoisted(() => ({
  batchSetMock: vi.fn(),
  batchCommitMock: vi.fn(),
  getDocMock: vi.fn(),
  setDocMock: vi.fn(),
  dbMock: { kind: "db" },
}));

vi.mock("./config", () => ({
  db: dbMock,
}));

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((parent: unknown, path: string) => ({
    kind: "collection",
    parent,
    path,
  })),
  doc: vi.fn((...args: unknown[]) => {
    if (args.length === 2 && args[0] === dbMock) {
      return { kind: "courseRef", path: args[1] };
    }

    if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
      return { kind: "wordRef", parent: args[0] };
    }

    return { kind: "docRef", args };
  }),
  getDoc: getDocMock,
  getDocs: vi.fn(),
  query: vi.fn(),
  limit: vi.fn(),
  setDoc: setDocMock,
  updateDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: batchSetMock,
    commit: batchCommitMock,
  })),
}));

import { addWordsToDay } from "./firestore";

describe("addWordsToDay", () => {
  beforeEach(() => {
    batchSetMock.mockReset();
    batchCommitMock.mockReset();
    getDocMock.mockReset();
    setDocMock.mockReset();

    batchCommitMock.mockResolvedValue(undefined);
    getDocMock.mockResolvedValue({
      data: () => ({ totalDays: 1 }),
    });
    setDocMock.mockResolvedValue(undefined);
  });

  it("preserves derivative arrays when writing standard words", async () => {
    const derivative = [{ word: "careful", meaning: "showing care" }];

    await addWordsToDay("courses/csat", "Day3", [
      {
        word: "care",
        meaning: "attention",
        pronunciation: "",
        example: "",
        translation: "",
        derivative,
      },
    ]);

    expect(batchSetMock).toHaveBeenCalledTimes(1);
    expect(batchSetMock.mock.calls[0]?.[1]).toMatchObject({
      word: "care",
      derivative,
    });
    expect(setDocMock).toHaveBeenCalledWith(
      { kind: "courseRef", path: "courses/csat" },
      expect.objectContaining({
        lastUploadedDayId: "Day3",
        totalDays: 3,
      }),
      { merge: true },
    );
  });
});
