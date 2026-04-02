import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  batchCommitMock,
  batchSetMock,
  collectionMock,
  dbMock,
  docMock,
  getDocsMock,
} = vi.hoisted(() => ({
  batchCommitMock: vi.fn(),
  batchSetMock: vi.fn(),
  collectionMock: vi.fn((dbValue: unknown, path: string) => ({
    db: dbValue,
    path,
  })),
  dbMock: { kind: "db" },
  docMock: vi.fn((dbValue: unknown, path: string) => ({
    db: dbValue,
    path,
  })),
  getDocsMock: vi.fn(),
}));

vi.mock("./config", () => ({
  db: dbMock,
}));

vi.mock("firebase/firestore", () => ({
  collection: collectionMock,
  doc: docMock,
  getDocs: getDocsMock,
  setDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: batchSetMock,
    commit: batchCommitMock,
  })),
}));

import { resolveMangaTarget } from "@/lib/mangaPaths";
import {
  listJlptMangaItemsByLevelDay,
  listMangaItemsByCourseDay,
  saveMangaImageItems,
} from "./mangaFirestore";

describe("manga firestore helpers", () => {
  beforeEach(() => {
    batchCommitMock.mockReset();
    batchSetMock.mockReset();
    collectionMock.mockClear();
    docMock.mockClear();
    getDocsMock.mockReset();

    batchCommitMock.mockResolvedValue(undefined);
  });

  it("writes day metadata and item docs under the resolved JLPT hierarchy", async () => {
    const target = resolveMangaTarget({
      courseId: "JLPT",
      jlptLevel: "N2",
      day: 5,
    });

    await saveMangaImageItems(target, [
      {
        id: "img-1",
        batchId: "batch-1",
        courseId: "JLPT",
        jlptLevel: "N2",
        dayId: "Day5",
        createdAt: "2026-04-03T00:00:00.000Z",
        originalFileName: "panel-1.png",
        mimeType: "image/png",
        sizeBytes: 1024,
        uploadIndex: 0,
        storagePath: "manga/JLPT/N2/Day5/img-1.png",
        imageUrl: "https://example.com/1.png",
      },
    ]);

    expect(batchSetMock).toHaveBeenCalledTimes(2);
    expect(batchSetMock.mock.calls[0]?.[0]).toEqual({
      db: dbMock,
      path: "manga/JLPT/levels/N2/days/Day5",
    });
    expect(batchSetMock.mock.calls[1]?.[0]).toEqual({
      db: dbMock,
      path: "manga/JLPT/levels/N2/days/Day5/items/img-1",
    });
    expect(batchCommitMock).toHaveBeenCalledTimes(1);
  });

  it("lists non-JLPT and JLPT manga items from their hierarchy paths", async () => {
    getDocsMock
      .mockResolvedValueOnce({
        docs: [
          {
            id: "img-2",
            data: () => ({
              createdAt: "2026-04-03T00:00:00.000Z",
              uploadIndex: 1,
            }),
          },
          {
            id: "img-1",
            data: () => ({
              createdAt: "2026-04-03T00:00:00.000Z",
              uploadIndex: 0,
            }),
          },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "img-3",
            data: () => ({
              createdAt: "2026-04-03T00:00:00.000Z",
              uploadIndex: 0,
            }),
          },
        ],
      });

    const csatItems = await listMangaItemsByCourseDay({
      courseId: "CSAT",
      dayId: "Day3",
    });
    const jlptItems = await listJlptMangaItemsByLevelDay({
      jlptLevel: "N4",
      dayId: "Day5",
    });

    expect(collectionMock.mock.calls[0]?.[1]).toBe("manga/CSAT/days/Day3/items");
    expect(collectionMock.mock.calls[1]?.[1]).toBe(
      "manga/JLPT/levels/N4/days/Day5/items",
    );
    expect(csatItems.map((item) => item.id)).toEqual(["img-1", "img-2"]);
    expect(jlptItems.map((item) => item.id)).toEqual(["img-3"]);
  });
});
