import { describe, expect, it } from "vitest";

import { parseRowArrays } from "./csvParser";

describe("csvParser JLPT schema", () => {
  it("accepts the JLPT header set and maps rows into JLPT fields", () => {
    const result = parseRowArrays(
      [
        [
          "word",
          "meaning(english)",
          "meaning(korean)",
          "pronunciation",
          "pronunciation(roman)",
          "example",
          "translation(english)",
          "translation(korean)",
        ],
        [
          "猫",
          "cat",
          "고양이",
          "ねこ",
          "neko",
          "猫がいる。",
          "There is a cat.",
          "고양이가 있다.",
        ],
      ],
      "jlpt",
    );

    expect(result.blockingError).toBeUndefined();
    expect(result.schemaType).toBe("jlpt");
    expect(result.words).toEqual([
      {
        word: "猫",
        meaningEnglish: "cat",
        meaningKorean: "고양이",
        pronunciation: "ねこ",
        pronunciationRoman: "neko",
        example: "猫がいる。",
        exampleRoman: "",
        translationEnglish: "There is a cat.",
        translationKorean: "고양이가 있다.",
        imageUrl: "",
      },
    ]);
  });

  it("rejects mismatched headers when JLPT schema is forced", () => {
    const result = parseRowArrays(
      [
        ["word", "meaning", "pronunciation", "example", "translation"],
        ["wander", "move around", "", "", ""],
      ],
      "jlpt",
    );

    expect(result.blockingError).toBe("HEADER_MISMATCH");
    expect(result.expectedHeaders).toEqual([
      "word",
      "meaning(english)",
      "meaning(korean)",
      "pronunciation",
      "pronunciation(roman)",
      "example",
      "translation(english)",
      "translation(korean)",
    ]);
  });

  it("accepts optional imageUrl and exampleRoman for JLPT uploads", () => {
    const result = parseRowArrays(
      [
        [
          "word",
          "meaning(english)",
          "meaning(korean)",
          "pronunciation",
          "pronunciation(roman)",
          "example",
          "example(roman)",
          "translation(english)",
          "translation(korean)",
          "imageUrl",
        ],
        [
          "猫",
          "cat",
          "고양이",
          "ねこ",
          "neko",
          "猫がいる。",
          "neko ga iru.",
          "There is a cat.",
          "고양이가 있다.",
          "https://example.com/jlpt.png",
        ],
      ],
      "jlpt",
    );

    expect(result.blockingError).toBeUndefined();
    expect(result.words[0]).toMatchObject({
      word: "猫",
      exampleRoman: "neko ga iru.",
      imageUrl: "https://example.com/jlpt.png",
    });
  });
});
