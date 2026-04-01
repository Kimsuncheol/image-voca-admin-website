import { afterEach, describe, expect, it, vi } from "vitest";

import { applyFuriganaToJapaneseUploadWords } from "./addVocaFurigana";

const { addFuriganaTextsRobustMock } = vi.hoisted(() => ({
  addFuriganaTextsRobustMock: vi.fn(),
}));

vi.mock("./addFurigana.ts", () => ({
  addFuriganaTextsRobust: addFuriganaTextsRobustMock,
}));

describe("applyFuriganaToJapaneseUploadWords", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("applies hiragana-only pronunciation and normal example furigana for JLPT rows", async () => {
    addFuriganaTextsRobustMock
      .mockResolvedValueOnce([
        { ok: true, text: "ねこ" },
        { ok: true, text: "いぬ" },
      ])
      .mockResolvedValueOnce([{ ok: true, text: "猫(ねこ)が好(す)きです" }]);

    await expect(
      applyFuriganaToJapaneseUploadWords(
        [
          {
            word: "猫",
            meaningEnglish: "cat",
            meaningKorean: "고양이",
            pronunciation: "",
            pronunciationRoman: "neko",
            example: "猫が好きです",
            exampleRoman: "",
            translationEnglish: "",
            translationKorean: "",
          },
          {
            word: "犬",
            meaningEnglish: "dog",
            meaningKorean: "개",
            pronunciation: "",
            pronunciationRoman: "inu",
            example: "",
            exampleRoman: "",
            translationEnglish: "",
            translationKorean: "",
          },
        ],
        "jlpt",
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        pronunciation: "ねこ",
        example: "猫(ねこ)が好(す)きです",
      }),
      expect.objectContaining({
        pronunciation: "いぬ",
        example: "",
      }),
    ]);

    expect(addFuriganaTextsRobustMock).toHaveBeenNthCalledWith(
      1,
      ["猫", "犬"],
      { mode: "hiragana_only" },
    );
    expect(addFuriganaTextsRobustMock).toHaveBeenNthCalledWith(
      2,
      ["猫が好きです"],
    );
  });

  it("uses the prefix field as pronunciation source text", async () => {
    addFuriganaTextsRobustMock
      .mockResolvedValueOnce([{ ok: true, text: "さい" }])
      .mockResolvedValueOnce([{ ok: true, text: "再(さい)生(せい)する" }]);

    await applyFuriganaToJapaneseUploadWords(
      [
        {
          prefix: "再",
          meaningEnglish: "again",
          meaningKorean: "다시",
          pronunciation: "old",
          pronunciationRoman: "sai",
          example: "再生する",
          exampleRoman: "",
          translationEnglish: "",
          translationKorean: "",
        },
      ],
      "prefix",
    );

    expect(addFuriganaTextsRobustMock).toHaveBeenNthCalledWith(
      1,
      ["再"],
      { mode: "hiragana_only" },
    );
  });

  it("uses the postfix field as pronunciation source text", async () => {
    addFuriganaTextsRobustMock
      .mockResolvedValueOnce([{ ok: true, text: "てき" }])
      .mockResolvedValueOnce([]);

    await applyFuriganaToJapaneseUploadWords(
      [
        {
          postfix: "的",
          meaningEnglish: "-al",
          meaningKorean: "-적",
          pronunciation: "old",
          pronunciationRoman: "teki",
          example: "",
          exampleRoman: "",
          translationEnglish: "",
          translationKorean: "",
        },
      ],
      "postfix",
    );

    expect(addFuriganaTextsRobustMock).toHaveBeenNthCalledWith(
      1,
      ["的"],
      { mode: "hiragana_only" },
    );
  });

  it("preserves original values when furigana conversion fails", async () => {
    addFuriganaTextsRobustMock
      .mockResolvedValueOnce([{ ok: false, error: "no pronunciation" }])
      .mockResolvedValueOnce([{ ok: false, error: "no example" }]);

    await expect(
      applyFuriganaToJapaneseUploadWords(
        [
          {
            word: "猫",
            meaningEnglish: "cat",
            meaningKorean: "고양이",
            pronunciation: "existing-pronunciation",
            pronunciationRoman: "neko",
            example: "existing example",
            exampleRoman: "",
            translationEnglish: "",
            translationKorean: "",
          },
        ],
        "jlpt",
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        pronunciation: "existing-pronunciation",
        example: "existing example",
      }),
    ]);
  });
});
