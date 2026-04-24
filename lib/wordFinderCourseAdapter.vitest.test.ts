import { describe, expect, it } from "vitest";

import {
  adaptCourseWordToWordFinderResult,
  getCourseWordMissingFields,
  getWordTableMissingActionField,
  isCourseWordFieldMissing,
} from "./wordFinderCourseAdapter";

describe("wordFinderCourseAdapter derivatives", () => {
  it("maps derivative arrays onto standard Word Finder results", () => {
    const result = adaptCourseWordToWordFinderResult({
      word: {
        id: "word-1",
        word: "use",
        meaning: "purpose",
        synonym: "function",
        pronunciation: "",
        example: "",
        translation: "",
        derivative: [{ word: "useful", meaning: "helpful or practical" }],
      },
      courseId: "TOEIC",
      courseLabel: "TOEIC",
      coursePath: "courses/TOEIC",
      dayId: "Day1",
      isCollocation: false,
    });

    expect(result.derivative).toEqual([
      { word: "useful", meaning: "helpful or practical" },
    ]);
    expect(result.synonym).toBe("function");
  });

  it("maps JLPT counters through the existing JLPT result shape", () => {
    const result = adaptCourseWordToWordFinderResult({
      word: {
        id: "counter-1",
        word: "本",
        meaningEnglish: "counter for long objects",
        meaningKorean: "긴 물건을 세는 단위",
        pronunciation: "ほん",
        pronunciationRoman: "hon",
        example: "ペンを三本買った。",
        exampleRoman: "",
        translationEnglish: "I bought three pens.",
        translationKorean: "펜을 세 자루 샀다.",
        imageUrl: "https://example.com/counter.png",
      },
      courseId: "JLPT_COUNTER",
      courseLabel: "Counters",
      coursePath: "JLPT_Counters/GWhncSjjmcrL0X47yU9j",
      isCollocation: false,
      isJlpt: true,
    });

    expect(result.schemaVariant).toBe("jlpt");
    expect(result.primaryText).toBe("本");
    expect(result.dayId).toBeNull();
    expect(result.imageUrl).toBe("https://example.com/counter.png");
  });

  it("maps Kanji rows with capitalized Korean romanization summaries", () => {
    const result = adaptCourseWordToWordFinderResult({
      word: {
        id: "kanji-1",
        kanji: "一",
        meaning: ["ひと", "ひと(つ)"],
        meaningKorean: ["one person", "one thing"],
        meaningKoreanRomanize: ["han saram", "han gae"],
        meaningExample: [{ items: ["一言", "一息"] }, { items: ["一つ"] }],
        meaningExampleHurigana: [{ items: ["ひとこと", "ひといき"] }, { items: ["ひとつ"] }],
        meaningEnglishTranslation: [{ items: ["A single word", "A breath"] }, { items: ["One"] }],
        meaningKoreanTranslation: [{ items: ["한마디 말", "한숨 돌림"] }, { items: ["한 개"] }],
        reading: ["いち"],
        readingKorean: ["ichi"],
        readingKoreanRomanize: ["ichi romanized"],
        readingExample: [{ items: ["一月"] }],
        readingExampleHurigana: [{ items: ["いちがつ"] }],
        readingEnglishTranslation: [{ items: ["January"] }],
        readingKoreanTranslation: [{ items: ["1월"] }],
        example: ["一月です。"],
        exampleEnglishTranslation: ["It is January."],
        exampleKoreanTranslation: ["1월입니다."],
        exampleHurigana: ["いちがつです。"],
      },
      courseId: "KANJI",
      courseLabel: "Kanji",
      coursePath: "courses/KANJI",
      dayId: "Day1",
      isCollocation: false,
    });

    expect(result.schemaVariant).toBe("kanji");
    expect(result.type).toBe("kanji");
    expect(result.primaryText).toBe("一");
    expect(result.meaning).toContain("Han saram");
    expect(result.meaning).toContain("Han gae");
    expect(result.pronunciation).toContain("Ichi romanized");
    expect(result.translation).toBe("1. 一月です。");
  });

  it("includes derivative as a missing field only for supported standard rows", () => {
    const missingFields = getCourseWordMissingFields(
      {
        id: "word-1",
        word: "care",
        meaning: "attention",
        pronunciation: "",
        example: "",
        translation: "",
      },
      { isCollocation: false, supportsDerivatives: true },
    );

    const unsupportedFields = getCourseWordMissingFields(
      {
        id: "word-1",
        word: "care",
        meaning: "attention",
        pronunciation: "",
        example: "",
        translation: "",
      },
      { isCollocation: false, supportsDerivatives: false },
    );

    expect(missingFields).toContain("derivative");
    expect(unsupportedFields).not.toContain("derivative");
  });

  it("exposes derivative generation as a word-table action only when supported", () => {
    const supportedActions = getWordTableMissingActionField(
      {
        id: "word-1",
        word: "care",
        meaning: "attention",
        pronunciation: "",
        example: "",
        translation: "",
      },
      { isCollocation: false, supportsDerivatives: true },
    );

    const unsupportedActions = getWordTableMissingActionField(
      {
        id: "word-1",
        word: "care",
        meaning: "attention",
        pronunciation: "",
        example: "",
        translation: "",
      },
      { isCollocation: false, supportsDerivatives: false },
    );

    expect(supportedActions).toContain("derivative");
    expect(unsupportedActions).not.toContain("derivative");
  });

  it("treats JLPT examples without parentheses markup as missing furigana", () => {
    expect(
      isCourseWordFieldMissing(
        {
          id: "jlpt-1",
          word: "猫",
          meaningEnglish: "cat",
          meaningKorean: "고양이",
          pronunciation: "ねこ",
          pronunciationRoman: "neko",
          example: "猫が好きです",
          exampleRoman: "",
          translationEnglish: "I like cats.",
          translationKorean: "고양이를 좋아합니다.",
        },
        { isCollocation: false, isJlpt: true },
        "furigana",
      ),
    ).toBe(true);

    expect(
      isCourseWordFieldMissing(
        {
          id: "jlpt-2",
          word: "猫",
          meaningEnglish: "cat",
          meaningKorean: "고양이",
          pronunciation: "ねこ",
          pronunciationRoman: "neko",
          example: "猫(ねこ)が好きです",
          exampleRoman: "",
          translationEnglish: "I like cats.",
          translationKorean: "고양이를 좋아합니다.",
        },
        { isCollocation: false, isJlpt: true },
        "furigana",
      ),
    ).toBe(false);
  });

  it("treats JLPT, prefix, and postfix pronunciation as present when only pronunciation exists", () => {
    expect(
      isCourseWordFieldMissing(
        {
          id: "jlpt-1",
          word: "猫",
          meaningEnglish: "cat",
          meaningKorean: "고양이",
          pronunciation: "ねこ",
          pronunciationRoman: "",
          example: "",
          exampleRoman: "",
          translationEnglish: "",
          translationKorean: "",
        },
        { isCollocation: false, isJlpt: true },
        "pronunciation",
      ),
    ).toBe(false);

    expect(
      isCourseWordFieldMissing(
        {
          id: "prefix-1",
          prefix: "再",
          meaningEnglish: "again",
          meaningKorean: "다시",
          pronunciation: "さい",
          pronunciationRoman: "",
          example: "",
          exampleRoman: "",
          translationEnglish: "",
          translationKorean: "",
        },
        { isCollocation: false, isPrefix: true },
        "pronunciation",
      ),
    ).toBe(false);

    expect(
      isCourseWordFieldMissing(
        {
          id: "postfix-1",
          postfix: "的",
          meaningEnglish: "-like",
          meaningKorean: "-적",
          pronunciation: "てき",
          pronunciationRoman: "",
          example: "",
          exampleRoman: "",
          translationEnglish: "",
          translationKorean: "",
        },
        { isCollocation: false, isPostfix: true },
        "pronunciation",
      ),
    ).toBe(false);
  });

  it("still treats pronunciation as missing when the pronunciation field is empty", () => {
    expect(
      isCourseWordFieldMissing(
        {
          id: "jlpt-1",
          word: "猫",
          meaningEnglish: "cat",
          meaningKorean: "고양이",
          pronunciation: "",
          pronunciationRoman: "neko",
          example: "",
          exampleRoman: "",
          translationEnglish: "",
          translationKorean: "",
        },
        { isCollocation: false, isJlpt: true },
        "pronunciation",
      ),
    ).toBe(true);
  });
});
