import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteMangaImageByStoragePathMock,
  saveMangaImageItemsMock,
  uploadMangaImageMock,
} = vi.hoisted(() => ({
  deleteMangaImageByStoragePathMock: vi.fn(),
  saveMangaImageItemsMock: vi.fn(),
  uploadMangaImageMock: vi.fn(),
}));

vi.mock("@/lib/firebase/mangaFirestore", () => ({
  saveMangaImageItems: saveMangaImageItemsMock,
}));

vi.mock("@/lib/firebase/mangaStorage", () => ({
  deleteMangaImageByStoragePath: deleteMangaImageByStoragePathMock,
  uploadMangaImage: uploadMangaImageMock,
}));

import { persistMangaUploadBatch } from "./mangaUpload";

describe("persistMangaUploadBatch", () => {
  const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID");

  beforeEach(() => {
    deleteMangaImageByStoragePathMock.mockReset();
    saveMangaImageItemsMock.mockReset();
    uploadMangaImageMock.mockReset();
    randomUuidSpy.mockReset();

    randomUuidSpy
      .mockReturnValueOnce("batch-1")
      .mockReturnValueOnce("img-1")
      .mockReturnValueOnce("img-2");

    uploadMangaImageMock
      .mockResolvedValueOnce({
        storagePath: "manga/CSAT/Day3/img-1.png",
        imageUrl: "https://example.com/1.png",
      })
      .mockResolvedValueOnce({
        storagePath: "manga/CSAT/Day3/img-2.png",
        imageUrl: "https://example.com/2.png",
      });

    saveMangaImageItemsMock.mockResolvedValue(undefined);
    deleteMangaImageByStoragePathMock.mockResolvedValue(undefined);
  });

  it("uploads files, persists metadata, and returns the saved items", async () => {
    const result = await persistMangaUploadBatch({
      files: [
        new File(["one"], "one.png", { type: "image/png" }),
        new File(["two"], "two.png", { type: "image/png" }),
      ],
      courseId: "CSAT",
      day: 3,
    });

    expect(uploadMangaImageMock).toHaveBeenCalledTimes(2);
    expect(saveMangaImageItemsMock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "img-1",
      batchId: "batch-1",
      courseId: "CSAT",
      dayId: "Day3",
      uploadIndex: 0,
      storagePath: "manga/CSAT/Day3/img-1.png",
    });
  });

  it("deletes already-uploaded files when a later upload fails", async () => {
    uploadMangaImageMock
      .mockReset()
      .mockResolvedValueOnce({
        storagePath: "manga/CSAT/Day3/img-1.png",
        imageUrl: "https://example.com/1.png",
      })
      .mockRejectedValueOnce(new Error("storage failed"));

    await expect(
      persistMangaUploadBatch({
        files: [
          new File(["one"], "one.png", { type: "image/png" }),
          new File(["two"], "two.png", { type: "image/png" }),
        ],
        courseId: "CSAT",
        day: 3,
      }),
    ).rejects.toThrow("storage failed");

    expect(saveMangaImageItemsMock).not.toHaveBeenCalled();
    expect(deleteMangaImageByStoragePathMock).toHaveBeenCalledWith(
      "manga/CSAT/Day3/img-1.png",
    );
  });
});
