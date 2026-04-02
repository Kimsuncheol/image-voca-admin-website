import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteObjectMock,
  getDownloadURLMock,
  refMock,
  storageMock,
  uploadBytesMock,
} = vi.hoisted(() => ({
  deleteObjectMock: vi.fn(),
  getDownloadURLMock: vi.fn(),
  refMock: vi.fn((storageValue: unknown, path: string) => ({
    storage: storageValue,
    path,
  })),
  storageMock: { kind: "storage" },
  uploadBytesMock: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: storageMock,
}));

vi.mock("firebase/storage", () => ({
  deleteObject: deleteObjectMock,
  getDownloadURL: getDownloadURLMock,
  ref: refMock,
  uploadBytes: uploadBytesMock,
}));

import { resolveMangaTarget } from "@/lib/mangaPaths";
import {
  deleteMangaImageByStoragePath,
  uploadMangaImage,
} from "./mangaStorage";

describe("manga storage helpers", () => {
  beforeEach(() => {
    deleteObjectMock.mockReset();
    getDownloadURLMock.mockReset();
    refMock.mockClear();
    uploadBytesMock.mockReset();

    uploadBytesMock.mockResolvedValue(undefined);
    getDownloadURLMock.mockResolvedValue("https://example.com/manga.png");
    deleteObjectMock.mockResolvedValue(undefined);
  });

  it("uploads non-JLPT manga images under the course/day path", async () => {
    const result = await uploadMangaImage({
      file: new File(["file"], "panel.png", { type: "image/png" }),
      imageId: "img-1",
      target: resolveMangaTarget({
        courseId: "CSAT",
        day: 3,
      }),
    });

    expect(refMock).toHaveBeenCalledWith(storageMock, "manga/CSAT/Day3/img-1.png");
    expect(uploadBytesMock).toHaveBeenCalledWith(
      { storage: storageMock, path: "manga/CSAT/Day3/img-1.png" },
      expect.any(File),
      { contentType: "image/png" },
    );
    expect(result).toEqual({
      storagePath: "manga/CSAT/Day3/img-1.png",
      imageUrl: "https://example.com/manga.png",
    });
  });

  it("uploads JLPT manga images under the level/day path and deletes by storage path", async () => {
    await uploadMangaImage({
      file: new File(["file"], "panel.webp", { type: "image/webp" }),
      imageId: "img-2",
      target: resolveMangaTarget({
        courseId: "JLPT",
        jlptLevel: "N4",
        day: 5,
      }),
    });

    expect(refMock).toHaveBeenCalledWith(
      storageMock,
      "manga/JLPT/N4/Day5/img-2.webp",
    );

    await deleteMangaImageByStoragePath("manga/JLPT/N4/Day5/img-2.webp");
    expect(deleteObjectMock).toHaveBeenCalledWith({
      storage: storageMock,
      path: "manga/JLPT/N4/Day5/img-2.webp",
    });
  });
});
