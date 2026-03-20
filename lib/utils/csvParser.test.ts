import { describe, expect, it } from "vitest";

import { parseRowArrays } from "./csvParser";

describe("csvParser language validation", () => {
  it("accepts standard rows with English word and example", () => {
    const result = parseRowArrays(
      [
        ["word", "meaning", "pronunciation", "example", "translation"],
        ["focus", "attention", "", "Focus on your goal.", "집중하다"],
      ],
      "standard",
    );

    expect(result.errors).toEqual([]);
    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toMatchObject({
      word: "focus",
      example: "Focus on your goal.",
    });
  });

  it("skips standard rows with a non-English word and reports one warning", () => {
    const result = parseRowArrays(
      [
        ["word", "meaning", "pronunciation", "example", "translation"],
        ["猫", "cat", "", "A cat appears.", "고양이"],
      ],
      "standard",
    );

    expect(result.words).toEqual([]);
    expect(result.errors).toEqual([
      "Row 1: must contain English characters in word",
    ]);
  });

  it("allows standard rows with an empty example", () => {
    const result = parseRowArrays(
      [
        ["word", "meaning", "pronunciation", "example", "translation"],
        ["focus", "attention", "", "", "집중하다"],
      ],
      "standard",
    );

    expect(result.errors).toEqual([]);
    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toMatchObject({
      word: "focus",
      example: "",
    });
  });

  it("validates collocation and example fields for collocation uploads", () => {
    const result = parseRowArrays(
      [
        ["collocation", "meaning", "explanation", "example", "translation"],
        ["take off", "remove", "", "Take off your coat.", "벗다"],
        ["七転び八起き", "persist", "", "Keep trying.", "포기하지 마라"],
      ],
      "collocation",
    );

    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toMatchObject({
      collocation: "take off",
    });
    expect(result.errors).toEqual([
      "Row 2: must contain English characters in collocation",
    ]);
  });

  it("returns valid rows and warnings together when mixed JLPT rows are imported", () => {
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
        [
          "dog",
          "dog",
          "개",
          "",
          "",
          "犬がいる。",
          "There is a dog.",
          "개가 있다.",
        ],
        [
          "犬",
          "dog",
          "개",
          "",
          "",
          "Walk the dog.",
          "Walk the dog.",
          "개를 산책시키다.",
        ],
      ],
      "jlpt",
    );

    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toMatchObject({
      word: "猫",
      example: "猫がいる。",
    });
    expect(result.errors).toEqual([
      "Row 2: must contain Japanese characters in word",
      "Row 3: must contain Japanese characters in example",
    ]);
  });
});

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
