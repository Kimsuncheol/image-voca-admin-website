import { describe, expect, it } from "vitest";

import {
  normalizeKanjiNestedListGroups,
  normalizeKanjiWordsNestedLists,
} from "./kanjiNestedList";

describe("Kanji nested list normalization", () => {
  it("converts legacy raw nested arrays to grouped objects", () => {
    expect(normalizeKanjiNestedListGroups([["一言", "一息"], ["一つ"]])).toEqual([
      { items: ["一言", "一息"] },
      { items: ["一つ"] },
    ]);
  });

  it("normalizes all Kanji nested fields before upload", () => {
    const [word] = normalizeKanjiWordsNestedLists([
      {
        id: "KANJI_Day1_1",
        kanji: "一",
        meaningExample: [["一言"]],
        meaningExampleHurigana: [["ひとこと"]],
        meaningEnglishTranslation: [["A single word"]],
        meaningKoreanTranslation: [["한마디 말"]],
        meaningKoreanRomanize: ["achim", "han saram"],
        readingExample: [["一月"]],
        readingExampleHurigana: [["いちがつ"]],
        readingEnglishTranslation: [["January"]],
        readingKoreanTranslation: [["1월"]],
        readingKoreanRomanize: ["jo", "(il)"],
      },
    ]);

    expect(word.meaningExample).toEqual([{ items: ["一言"] }]);
    expect(word.readingExample).toEqual([{ items: ["一月"] }]);
    expect(word.meaningKoreanRomanize).toEqual(["Achim", "Han saram"]);
    expect(word.readingKoreanRomanize).toEqual(["Jo", "(Il)"]);
    expect(Object.values(word).some((value) => Array.isArray(value) && value.some(Array.isArray))).toBe(false);
  });
});
