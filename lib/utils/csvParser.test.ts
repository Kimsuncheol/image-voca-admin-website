import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseRowArrays, parseUploadFile } from "./csvParser";

function containsFirestoreNestedArray(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(Array.isArray) || value.some(containsFirestoreNestedArray);
  }

  if (typeof value !== "object" || value === null) return false;

  return Object.values(value).some(containsFirestoreNestedArray);
}

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

  it("accepts Extremely Advanced rows with optional imageUrl", () => {
    const result = parseRowArrays(
      [
        ["word", "meaning", "example", "translation", "imageUrl"],
        [
          "fuddle",
          "to confuse",
          "I fuddled away with old friends.",
          "나는 친구들과 시간을 보냈다.",
          "https://example.com/fuddle.png",
        ],
      ],
      "extremelyAdvanced",
    );

    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toEqual([]);
    expect(result.expectedHeaders).toBeUndefined();
    expect(result.words[0]).toMatchObject({
      word: "fuddle",
      meaning: "to confuse",
      example: "I fuddled away with old friends.",
      translation: "나는 친구들과 시간을 보냈다.",
      imageUrl: "https://example.com/fuddle.png",
    });
  });

  it("rejects standard pronunciation headers for Extremely Advanced uploads", () => {
    const result = parseRowArrays(
      [
        ["word", "meaning", "pronunciation", "example", "translation"],
        ["fuddle", "to confuse", "", "I fuddled away with old friends.", "나는 친구들과 시간을 보냈다."],
      ],
      "extremelyAdvanced",
    );

    expect(result.blockingError).toBe("HEADER_MISMATCH");
    expect(result.expectedHeaders).toEqual([
      "word",
      "meaning",
      "example",
      "translation",
    ]);
    expect(result.words).toEqual([]);
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
          "examplehurigana",
          "translation(english)",
          "translation(korean)",
        ],
        [
          "猫",
          "cat",
          "고양이",
          "ねこ",
          "猫がいる。",
          "ねこがいる。",
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
        exampleHurigana: "ねこがいる。",
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
      "examplehurigana",
      "translation(english)",
      "translation(korean)",
    ]);
  });

  it("skips a stray JLPT header row that slips into the data", () => {
    const headerRow = [
      "word", "meaning(english)", "meaning(korean)", "pronunciation",
      "example", "examplehurigana", "translation(english)", "translation(korean)",
    ];
    const result = parseRowArrays([headerRow, headerRow, ["猫","cat","고양이","ねこ","猫がいる。","ねこがいる。","There is a cat.","고양이가 있다."]], "jlpt");

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
          "example",
          "examplehurigana",
          "pronunciation(roman)",
          "translation(english)",
          "translation(korean)",
        ],
        [
          "猫",
          "cat",
          "고양이",
          "ねこ",
          "猫がいる。",
          "ねこがいる。",
          "neko",
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
          "examplehurigana",
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
          "ねこがいる。",
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
          "examplehurigana",
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
          "ねこがいる。",
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
      exampleHurigana: "ねこがいる。",
      exampleRoman: "",
      imageUrl: "https://example.com/jlpt.png",
    });
  });
});

const KANJI_HEADERS = [
  "",
  "kanji",
  "meaning",
  "meaningKorean",
  "meaningKoreanRomanize",
  "meaningExample",
  "meaningExampleHurigana",
  "meaningEnglishTranslation",
  "meaningKoreanTranslation",
  "reading",
  "readingKorean",
  "readingKoreanRomanize",
  "readingExample",
  "readingExampleHurigana",
  "readingEnglishTranslation",
  "readingKoreanTranslation",
  "example",
  "exampleEnglishTranslation",
  "exampleKoreanTranslation",
  "exampleHurigana",
];

const KANJI_SAMPLE_ROW = [
  "",
  "一",
  "1. ひと\n2. ひと(つ)",
  "1. one person\n2. one thing",
  "1. han saram\n2. han gae",
  "1. (一言), (一息), (一筋)\n2. (一つ)",
  "1. (ひとこと), (ひといき), (ひとす)\n2. (ひとつ)",
  "1. (A single word, A brief remark), (A breath, a pause, a puff), (A line)\n2. (One (general counter for objects))",
  "1. (한마디 말), (한숨 돌림), (한 줄기, 외곬)\n2. (한 개)",
  "1. いち 2. いつ",
  "1. ichi\n2. itsu",
  "1. ichi romanized\n2. itsu romanized",
  "1. (一月), (一年), (一日), (一度)\n2. (同一), (統一)、 (一回)、(一般)",
  "1. (いちがつ), (いちねん), (いちにち), (いちど)\n2. (どういつ), (とういつ)、 (いちかい)、(いっぱん)",
  "1. (January), (One year), (One day), (Once)\n2. (Identical), (Unity), (1 time, 1 round), (General, Ordinary)",
  "1. (1월), (한 해, 1년), (하루), (한 번)\n2. (동일), (통일), (1회), (일반)",
  "1. これはいつでいくらですか。\n2. 一月新しい一年の始まりだ。",
  "1. How much is this one?\n2. January is the beginning of a new year.",
  "1. 이것은 한 개에 얼마입니까?\n2. 1월은 새로운 한 해의 시작이다.",
  "1. これはいつでいくらですか。\n2. いちがつあたらしいいちねんのはじまりだ。",
];

const KANJI_PRE_ROMANIZATION_HEADERS = [
  "",
  "kanji",
  "meaning",
  "meaningKorean",
  "meaningExample",
  "meaningExampleHurigana",
  "meaningEnglishTranslation",
  "meaningKoreanTranslation",
  "reading",
  "readingKorean",
  "readingExample",
  "readingExampleHurigana",
  "readingEnglishTranslation",
  "readingKoreanTranslation",
  "example",
  "exampleEnglishTranslation",
  "exampleKoreanTranslation",
  "exampleHurigana",
];

const KANJI_PRE_ROMANIZATION_SAMPLE_ROW = [
  "",
  "一",
  "1. ひと\n2. ひと(つ)",
  "1. one person\n2. one thing",
  "1. (一言), (一息), (一筋)\n2. (一つ)",
  "1. (ひとこと), (ひといき), (ひとす)\n2. (ひとつ)",
  "1. (A single word, A brief remark), (A breath, a pause, a puff), (A line)\n2. (One (general counter for objects))",
  "1. (한마디 말), (한숨 돌림), (한 줄기, 외곬)\n2. (한 개)",
  "1. いち 2. いつ",
  "1. ichi\n2. itsu",
  "1. (一月), (一年), (一日), (一度)\n2. (同一), (統一)、 (一回)、(一般)",
  "1. (いちがつ), (いちねん), (いちにち), (いちど)\n2. (どういつ), (とういつ)、 (いちかい)、(いっぱん)",
  "1. (January), (One year), (One day), (Once)\n2. (Identical), (Unity), (1 time, 1 round), (General, Ordinary)",
  "1. (1월), (한 해, 1년), (하루), (한 번)\n2. (동일), (통일), (1회), (일반)",
  "1. これはいつでいくらですか。\n2. 一月新しい一年の始まりだ。",
  "1. How much is this one?\n2. January is the beginning of a new year.",
  "1. 이것은 한 개에 얼마입니까?\n2. 1월은 새로운 한 해의 시작이다.",
  "1. これはいつでいくらですか。\n2. いちがつあたらしいいちねんのはじまりだ。",
];

const KANJI_LEGACY_HEADERS = [
  "",
  "kanji",
  "meaning",
  "meaningExample",
  "meaningExampleHurigana",
  "meaningEnglishTranslation",
  "meaningKoreanTranslation",
  "reading",
  "readingExample",
  "readingExampleHurigana",
  "readingEnglishTranslation",
  "readingKoreanTranslation",
  "example",
  "exampleEnglishTranslation",
  "exampleKoreanTranslation",
  "exampleHurigana",
];

const KANJI_LEGACY_SAMPLE_ROW = [
  "",
  "一",
  "1. ひと\n2. ひと(つ)",
  "1. (一言), (一息), (一筋)\n2. (一つ)",
  "1. (ひとこと), (ひといき), (ひとす)\n2. (ひとつ)",
  "1. (A single word, A brief remark), (A breath, a pause, a puff), (A line)\n2. (One (general counter for objects))",
  "1. (한마디 말), (한숨 돌림), (한 줄기, 외곬)\n2. (한 개)",
  "1. いち 2. いつ",
  "1. (一月), (一年), (一日), (一度)\n2. (同一), (統一)、 (一回)、(一般)",
  "1. (いちがつ), (いちねん), (いちにち), (いちど)\n2. (どういつ), (とういつ)、 (いちかい)、(いっぱん)",
  "1. (January), (One year), (One day), (Once)\n2. (Identical), (Unity), (1 time, 1 round), (General, Ordinary)",
  "1. (1월), (한 해, 1년), (하루), (한 번)\n2. (동일), (통일), (1회), (일반)",
  "1. これはいつでいくらですか。\n2. 一月新しい一年の始まりだ。",
  "1. How much is this one?\n2. January is the beginning of a new year.",
  "1. 이것은 한 개에 얼마입니까?\n2. 1월은 새로운 한 해의 시작이다.",
  "1. これはいつでいくらですか。\n2. いちがつあたらしいいちねんのはじまりだ。",
];

describe("csvParser Kanji schema", () => {
  it("parses the sample workbook row into Firestore-safe Kanji groups", () => {
    const result = parseRowArrays([KANJI_HEADERS, KANJI_SAMPLE_ROW], "kanji");

    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toEqual([]);
    expect(result.schemaType).toBe("kanji");
    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toMatchObject({
      kanji: "一",
      meaning: ["ひと", "ひと(つ)"],
      meaningKorean: ["one person", "one thing"],
      meaningKoreanRomanize: ["han saram", "han gae"],
      meaningExample: [{ items: ["一言", "一息", "一筋"] }, { items: ["一つ"] }],
      meaningExampleHurigana: [{ items: ["ひとこと", "ひといき", "ひとす"] }, { items: ["ひとつ"] }],
      meaningEnglishTranslation: [
        { items: ["A single word, A brief remark", "A breath, a pause, a puff", "A line"] },
        { items: ["One (general counter for objects)"] },
      ],
      meaningKoreanTranslation: [
        { items: ["한마디 말", "한숨 돌림", "한 줄기, 외곬"] },
        { items: ["한 개"] },
      ],
      reading: ["いち", "いつ"],
      readingKorean: ["ichi", "itsu"],
      readingKoreanRomanize: ["ichi romanized", "itsu romanized"],
      readingExample: [
        { items: ["一月", "一年", "一日", "一度"] },
        { items: ["同一", "統一", "一回", "一般"] },
      ],
      readingEnglishTranslation: [
        { items: ["January", "One year", "One day", "Once"] },
        { items: ["Identical", "Unity", "1 time, 1 round", "General, Ordinary"] },
      ],
      example: ["これはいつでいくらですか。", "一月新しい一年の始まりだ。"],
      exampleEnglishTranslation: [
        "How much is this one?",
        "January is the beginning of a new year.",
      ],
    });
    expect(containsFirestoreNestedArray(result.words[0])).toBe(false);
  });

  it("parses pre-romanization Kanji rows and defaults romanization columns", () => {
    const result = parseRowArrays(
      [KANJI_PRE_ROMANIZATION_HEADERS, KANJI_PRE_ROMANIZATION_SAMPLE_ROW],
      "kanji",
    );

    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toEqual([]);
    expect(result.words[0]).toMatchObject({
      kanji: "一",
      meaningKorean: ["one person", "one thing"],
      meaningKoreanRomanize: [],
      readingKorean: ["ichi", "itsu"],
      readingKoreanRomanize: [],
    });
    expect(containsFirestoreNestedArray(result.words[0])).toBe(false);
  });

  it("parses legacy Kanji rows without Korean meaning and reading columns", () => {
    const result = parseRowArrays([KANJI_LEGACY_HEADERS, KANJI_LEGACY_SAMPLE_ROW], "kanji");

    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toEqual([]);
    expect(result.words[0]).toMatchObject({
      kanji: "一",
      meaning: ["ひと", "ひと(つ)"],
      meaningKorean: [],
      meaningKoreanRomanize: [],
      reading: ["いち", "いつ"],
      readingKorean: [],
      readingKoreanRomanize: [],
      readingExample: [
        { items: ["一月", "一年", "一日", "一度"] },
        { items: ["同一", "統一", "一回", "一般"] },
      ],
    });
    expect(containsFirestoreNestedArray(result.words[0])).toBe(false);
  });

  it("keeps top-level nested splits while preserving commas inside parentheses", () => {
    const result = parseRowArrays([KANJI_HEADERS, KANJI_SAMPLE_ROW], "kanji");

    expect(result.words[0]).toMatchObject({
      meaningEnglishTranslation: [
        { items: ["A single word, A brief remark", "A breath, a pause, a puff", "A line"] },
        { items: ["One (general counter for objects)"] },
      ],
      readingExample: [
        { items: ["一月", "一年", "一日", "一度"] },
        { items: ["同一", "統一", "一回", "一般"] },
      ],
    });
  });

  it("rejects mismatched headers when Kanji schema is forced", () => {
    const result = parseRowArrays(
      [
        ["word", "meaning", "pronunciation", "example", "translation"],
        ["一", "one", "いち", "一月", "January"],
      ],
      "kanji",
    );

    expect(result.blockingError).toBe("HEADER_MISMATCH");
    expect(result.words).toEqual([]);
  });

  it("reports a row error when kanji is missing", () => {
    const result = parseRowArrays(
      [KANJI_HEADERS, ["", "", ...KANJI_SAMPLE_ROW.slice(2)]],
      "kanji",
    );

    expect(result.words).toEqual([]);
    expect(result.errors[0]).toMatch(/Row 1/);
  });

  it("parses Kanji rows from XLSX uploads", async () => {
    const worksheet = XLSX.utils.aoa_to_sheet([KANJI_HEADERS, KANJI_SAMPLE_ROW]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "KANJI_Day1");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const file = new File([buffer], "KANJI_Day1.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const result = await parseUploadFile(file, "kanji");

    expect(result.blockingError).toBeUndefined();
    expect(result.errors).toEqual([]);
    expect(result.words[0]).toMatchObject({
      kanji: "一",
      reading: ["いち", "いつ"],
      readingKorean: ["ichi", "itsu"],
      readingKoreanRomanize: ["ichi romanized", "itsu romanized"],
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
