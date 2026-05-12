import { describe, expect, it } from "vitest";

import {
  generateJapaneseWordsPlacementChunks,
  generateKanjiWordsPlacementChunks,
  stripJapaneseReadings,
} from "./japaneseWordsPlacementChunkGenerator";

describe("Japanese words placement chunk generator", () => {
  it("strips Japanese reading parentheses", () => {
    expect(stripJapaneseReadings("家(いえ)と学(がっ)校(こう)")).toBe("家と学校");
  });

  it("generates JLPT chunks with a cleaned target example", async () => {
    await expect(
      generateJapaneseWordsPlacementChunks({
        word: "間",
        example: "家(いえ)と学(がっ)校(こう)の間(あいだ)に公(こう)園(えん)がある。",
        wordId: "jlpt-1",
      }),
    ).resolves.toEqual([
      {
        targetExample: "家と学校の間に公園がある。",
        chunks: [
          { id: "jlpt-1-1-chunk-1", text: "家と", type: "sentence_chunk", order: 1 },
          { id: "jlpt-1-1-chunk-2", text: "学校の", type: "sentence_chunk", order: 2 },
          { id: "jlpt-1-1-chunk-3", text: "間に", type: "answer", order: 3 },
          { id: "jlpt-1-1-chunk-4", text: "公園が", type: "sentence_chunk", order: 4 },
          { id: "jlpt-1-1-chunk-5", text: "ある。", type: "sentence_chunk", order: 5 },
        ],
      },
    ]);
  });

  it("generates JLPT chunks for noun and verb targets", async () => {
    await expect(
      generateJapaneseWordsPlacementChunks({
        word: "会社",
        example: "一週間会社を休む。",
        wordId: "jlpt-2",
      }),
    ).resolves.toEqual([
      {
        targetExample: "一週間会社を休む。",
        chunks: [
          { id: "jlpt-2-1-chunk-1", text: "一週間", type: "sentence_chunk", order: 1 },
          { id: "jlpt-2-1-chunk-2", text: "会社を", type: "answer", order: 2 },
          { id: "jlpt-2-1-chunk-3", text: "休む。", type: "sentence_chunk", order: 3 },
        ],
      },
    ]);
  });

  it("generates JLPT chunks for numbered examples with compounds", async () => {
    await expect(
      generateJapaneseWordsPlacementChunks({
        word: "夕",
        example: `1. 夕食はオムライスにしませんか。
2. 今夕は祭りに行くつもりだ。`,
        wordId: "jlpt-3",
      }),
    ).resolves.toEqual([
      {
        targetExample: "夕食はオムライスにしませんか。",
        chunks: [
          { id: "jlpt-3-1-chunk-1", text: "夕食は", type: "answer", order: 1 },
          { id: "jlpt-3-1-chunk-2", text: "オムライスに", type: "sentence_chunk", order: 2 },
          { id: "jlpt-3-1-chunk-3", text: "しませんか。", type: "sentence_chunk", order: 3 },
        ],
      },
      {
        targetExample: "今夕は祭りに行くつもりだ。",
        chunks: [
          { id: "jlpt-3-2-chunk-1", text: "今夕は", type: "answer", order: 1 },
          { id: "jlpt-3-2-chunk-2", text: "祭りに", type: "sentence_chunk", order: 2 },
          { id: "jlpt-3-2-chunk-3", text: "行く", type: "sentence_chunk", order: 3 },
          { id: "jlpt-3-2-chunk-4", text: "つもりだ。", type: "sentence_chunk", order: 4 },
        ],
      },
    ]);
  });
});

describe("Kanji words placement chunk generator", () => {
  it("uses explicit markers and creates a clean target example", () => {
    expect(
      generateKanjiWordsPlacementChunks({
        example: "これは[[[いつ]]]でいくらですか。",
        wordId: "kanji-1",
      }),
    ).toEqual([
      {
        targetExample: "これはいつでいくらですか。",
        chunks: [
          { id: "kanji-1-1-chunk-1", text: "これは", type: "sentence_chunk", order: 1 },
          { id: "kanji-1-1-chunk-2", text: "いつで", type: "answer", order: 2 },
          { id: "kanji-1-1-chunk-3", text: "いくらですか。", type: "sentence_chunk", order: 3 },
        ],
      },
    ]);
  });

  it("expands marked kanji into compounds and strips readings", () => {
    expect(
      generateKanjiWordsPlacementChunks({
        example: "[[[一]]]月(いちがつ)新(あたら)しい一(いち)年(ねん)の始(はじ)まりだ。",
        wordId: "kanji-2",
      }),
    ).toEqual([
      {
        targetExample: "一月新しい一年の始まりだ。",
        chunks: [
          { id: "kanji-2-1-chunk-1", text: "一月", type: "answer", order: 1 },
          { id: "kanji-2-1-chunk-2", text: "新しい一年の", type: "sentence_chunk", order: 2 },
          { id: "kanji-2-1-chunk-3", text: "始まりだ。", type: "sentence_chunk", order: 3 },
        ],
      },
    ]);
  });

  it("skips unmarked Kanji examples", () => {
    expect(
      generateKanjiWordsPlacementChunks({
        example: "一月新しい一年の始まりだ。",
        wordId: "kanji-3",
      }),
    ).toEqual([]);
  });
});
