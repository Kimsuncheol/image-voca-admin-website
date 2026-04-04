import { describe, expect, it } from "vitest";

import { parseRowArrays } from "./csvParser";

describe("csvParser language validation", () => {
  it("accepts the optional synonym header for TOEFL / IELTS standard uploads", () => {
    const result = parseRowArrays(
      [
        ["word", "meaning", "synonym", "pronunciation", "example", "translation"],
        ["focus", "attention", "concentration", "", "Focus on your goal.", "집중하다"],
      ],
      { schemaType: "standard", courseId: "TOEFL_IELTS" },
    );

    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toEqual([]);
    expect(result.words[0]).toMatchObject({
      word: "focus",
      synonym: "concentration",
      translation: "집중하다",
    });
  });

  it("rejects synonym headers for non-TOEFL standard uploads", () => {
    const result = parseRowArrays(
      [
        ["word", "meaning", "synonym", "pronunciation", "example", "translation"],
        ["focus", "attention", "concentration", "", "Focus on your goal.", "집중하다"],
      ],
      { schemaType: "standard", courseId: "CSAT" },
    );

    expect(result.blockingError).toBe("HEADER_MISMATCH");
    expect(result.words).toEqual([]);
  });

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
          "example",
          "translation(english)",
          "translation(korean)",
        ],
        [
          "猫",
          "cat",
          "고양이",
          "ねこ",
          "猫がいる。",
          "There is a cat.",
          "고양이가 있다.",
        ],
        [
          "dog",
          "dog",
          "개",
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
          "example",
          "translation(english)",
          "translation(korean)",
        ],
        [
          "猫",
          "cat",
          "고양이",
          "ねこ",
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
        pronunciationRoman: "",
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
      "example",
      "translation(english)",
      "translation(korean)",
    ]);
  });

  it("skips a stray JLPT header row that slips into the data", () => {
    const headerRow = [
      "word", "meaning(english)", "meaning(korean)", "pronunciation",
      "example", "translation(english)", "translation(korean)",
    ];
    const result = parseRowArrays([headerRow, headerRow, ["猫","cat","고양이","ねこ","猫がいる。","There is a cat.","고양이가 있다."]], "jlpt");

    expect(result.errors).toHaveLength(0);
    expect(result.words).toHaveLength(1);
  });

  it("rejects JLPT uploads that include pronunciation(roman)", () => {
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

    expect(result.blockingError).toBe("HEADER_MISMATCH");
  });

  it("rejects JLPT uploads that include example(roman)", () => {
    const result = parseRowArrays(
      [
        [
          "word",
          "meaning(english)",
          "meaning(korean)",
          "pronunciation",
          "example",
          "example(roman)",
          "translation(english)",
          "translation(korean)",
        ],
        [
          "猫",
          "cat",
          "고양이",
          "ねこ",
          "猫がいる。",
          "neko ga iru.",
          "There is a cat.",
          "고양이가 있다.",
        ],
      ],
      "jlpt",
    );

    expect(result.blockingError).toBe("HEADER_MISMATCH");
  });

  it("accepts optional imageUrl for JLPT uploads", () => {
    const result = parseRowArrays(
      [
        [
          "word",
          "meaning(english)",
          "meaning(korean)",
          "pronunciation",
          "example",
          "translation(english)",
          "translation(korean)",
          "imageUrl",
        ],
        [
          "猫",
          "cat",
          "고양이",
          "ねこ",
          "猫がいる。",
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
      pronunciationRoman: "",
      exampleRoman: "",
      imageUrl: "https://example.com/jlpt.png",
    });
  });
});

const PREFIX_HEADERS = [
  "prefix", "meaning(english)", "meaning(korean)", "pronunciation",
  "pronunciation(roman)", "example", "translation(english)", "translation(korean)",
];
const POSTFIX_HEADERS = [
  "postfix", "meaning(english)", "meaning(korean)", "pronunciation",
  "pronunciation(roman)", "example", "translation(english)", "translation(korean)",
];
const VALID_PREFIX_ROW = ["再-", "again", "다시", "さい", "sai", "再生する", "to regenerate", "재생하다"];
const VALID_POSTFIX_ROW = ["-的", "-like", "-적", "てき", "teki", "科学的", "scientific", "과학적"];

describe("csvParser prefix schema", () => {
  it("parses a valid prefix CSV into one word", () => {
    const result = parseRowArrays([PREFIX_HEADERS, VALID_PREFIX_ROW], "prefix");

    expect(result.schemaType).toBe("prefix");
    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toHaveLength(0);
    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toMatchObject({
      prefix: "再-",
      meaningEnglish: "again",
      meaningKorean: "다시",
      pronunciation: "さい",
      pronunciationRoman: "sai",
      example: "再生する",
      translationEnglish: "to regenerate",
      translationKorean: "재생하다",
    });
  });

  it("accepts the optional example(roman) header", () => {
    const result = parseRowArrays(
      [[...PREFIX_HEADERS, "example(roman)"], [...VALID_PREFIX_ROW, "saisei suru"]],
      "prefix",
    );

    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toHaveLength(0);
    expect(result.words[0]).toMatchObject({ exampleRoman: "saisei suru" });
  });

  it("returns HEADER_MISMATCH when standard headers are provided instead", () => {
    const result = parseRowArrays(
      [["prefix", "meaning", "pronunciation", "example", "translation"], VALID_PREFIX_ROW],
      "prefix",
    );

    expect(result.blockingError).toBe("HEADER_MISMATCH");
    expect(result.words).toHaveLength(0);
  });

  it("returns HEADER_REQUIRED when no recognisable header row is present", () => {
    // None of these cells are in KNOWN_FIELDS so matchCount < 2
    const result = parseRowArrays([["再-", "again", "다시", "さい", "sai", "再生する", "재생하다", "재생하다"]], "prefix");

    expect(result.blockingError).toBe("HEADER_REQUIRED");
    expect(result.words).toHaveLength(0);
  });

  it("rejects a non-Japanese prefix with a language error", () => {
    const latinRow = ["re-", "again", "다시", "ri", "ri", "restart", "to restart", "재시작"];
    const result = parseRowArrays([PREFIX_HEADERS, latinRow], "prefix");

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Row 1.*Japanese/);
    expect(result.words).toHaveLength(0);
  });

  it("skips a stray prefix header row in the data", () => {
    const result = parseRowArrays([PREFIX_HEADERS, PREFIX_HEADERS, VALID_PREFIX_ROW], "prefix");

    expect(result.errors).toHaveLength(0);
    expect(result.words).toHaveLength(1);
  });

  it("parses multiple rows and reports per-row errors", () => {
    const row2 = ["未-", "not yet", "아직", "み", "mi", "未完成", "unfinished", "미완성"];
    const badRow = ["re-", "again", "다시", "ri", "ri", "restart", "to restart", "재시작"];
    const result = parseRowArrays([PREFIX_HEADERS, VALID_PREFIX_ROW, row2, badRow], "prefix");

    expect(result.words).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Row 3/);
  });

  it("isCollocation is false for prefix", () => {
    const result = parseRowArrays([PREFIX_HEADERS, VALID_PREFIX_ROW], "prefix");
    expect(result.isCollocation).toBe(false);
  });
});

describe("csvParser postfix schema", () => {
  it("parses a valid postfix CSV into one word", () => {
    const result = parseRowArrays([POSTFIX_HEADERS, VALID_POSTFIX_ROW], "postfix");

    expect(result.schemaType).toBe("postfix");
    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toHaveLength(0);
    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toMatchObject({
      postfix: "-的",
      meaningEnglish: "-like",
      meaningKorean: "-적",
    });
  });

  it("accepts the optional example(roman) header", () => {
    const result = parseRowArrays(
      [[...POSTFIX_HEADERS, "example(roman)"], [...VALID_POSTFIX_ROW, "kagakuteki"]],
      "postfix",
    );

    expect(result.blockingError).toBeUndefined();
    expect(result.words[0]).toMatchObject({ exampleRoman: "kagakuteki" });
  });

  it("returns HEADER_MISMATCH when wrong headers are provided", () => {
    const result = parseRowArrays(
      [["postfix", "meaning", "pronunciation", "example", "translation"], VALID_POSTFIX_ROW],
      "postfix",
    );

    expect(result.blockingError).toBe("HEADER_MISMATCH");
  });

  it("rejects a non-Japanese postfix with a language error", () => {
    const latinRow = ["-ness", "state", "상태", "nesu", "nesu", "goodness", "goodness", "선함"];
    const result = parseRowArrays([POSTFIX_HEADERS, latinRow], "postfix");

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatch(/Row 1.*Japanese/);
    expect(result.words).toHaveLength(0);
  });

  it("skips a stray postfix header row in the data", () => {
    const result = parseRowArrays([POSTFIX_HEADERS, POSTFIX_HEADERS, VALID_POSTFIX_ROW], "postfix");

    expect(result.errors).toHaveLength(0);
    expect(result.words).toHaveLength(1);
  });

  it("isCollocation is false for postfix", () => {
    const result = parseRowArrays([POSTFIX_HEADERS, VALID_POSTFIX_ROW], "postfix");
    expect(result.isCollocation).toBe(false);
  });
});
