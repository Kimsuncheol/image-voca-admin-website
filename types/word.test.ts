import { describe, it, expect } from "vitest";
import {
  isJlptWord,
  isPrefixWord,
  isPostfixWord,
  isCollocationWord,
  isFamousQuoteWord,
  type Word,
  type StandardWord,
  type JlptWord,
  type PrefixWord,
  type PostfixWord,
  type CollocationWord,
  type FamousQuoteWord,
} from "./word";

const standardWord: StandardWord = {
  id: "1",
  word: "run",
  meaning: "走る",
  pronunciation: "rʌn",
  example: "I run every day.",
  translation: "私は毎日走る。",
};

const jlptWord: JlptWord = {
  id: "2",
  word: "猫",
  meaningEnglish: "cat",
  meaningKorean: "고양이",
  pronunciation: "ねこ",
  pronunciationRoman: "neko",
  example: "猫がいる。",
  exampleRoman: "Neko ga iru.",
  translationEnglish: "There is a cat.",
  translationKorean: "고양이가 있다.",
};

const prefixWord: PrefixWord = {
  id: "3",
  prefix: "再-",
  meaningEnglish: "again",
  meaningKorean: "다시",
  pronunciation: "さい",
  pronunciationRoman: "sai",
  example: "再生する",
  exampleRoman: "saisei suru",
  translationEnglish: "to regenerate",
  translationKorean: "재생하다",
};

const postfixWord: PostfixWord = {
  id: "4",
  postfix: "-的",
  meaningEnglish: "-like / -al",
  meaningKorean: "-적",
  pronunciation: "てき",
  pronunciationRoman: "teki",
  example: "科学的",
  exampleRoman: "kagakuteki",
  translationEnglish: "scientific",
  translationKorean: "과학적",
};

const collocationWord: CollocationWord = {
  id: "5",
  collocation: "take off",
  meaning: "remove",
  explanation: "to remove clothing",
  example: "Take off your coat.",
  translation: "코트를 벗어라.",
};

const famousQuoteWord: FamousQuoteWord = {
  id: "6",
  quote: "Stay hungry, stay foolish.",
  author: "Steve Jobs",
  translation: "항상 배고파라, 항상 우직해라.",
};

// ── isJlptWord ──────────────────────────────────────────────────────────────

describe("isJlptWord", () => {
  it("returns true for JlptWord", () => {
    expect(isJlptWord(jlptWord as Word)).toBe(true);
  });

  it("returns false for StandardWord (no meaningEnglish)", () => {
    expect(isJlptWord(standardWord as Word)).toBe(false);
  });

  it("returns false for PrefixWord (no 'word' field)", () => {
    // Critical: before the fix, isJlptWord only checked meaningEnglish
    // which PrefixWord also has — verify the guard no longer false-positives.
    expect(isJlptWord(prefixWord as Word)).toBe(false);
  });

  it("returns false for PostfixWord (no 'word' field)", () => {
    expect(isJlptWord(postfixWord as Word)).toBe(false);
  });

  it("returns false for CollocationWord", () => {
    expect(isJlptWord(collocationWord as Word)).toBe(false);
  });

  it("returns false for FamousQuoteWord", () => {
    expect(isJlptWord(famousQuoteWord as Word)).toBe(false);
  });
});

// ── isPrefixWord ────────────────────────────────────────────────────────────

describe("isPrefixWord", () => {
  it("returns true for PrefixWord", () => {
    expect(isPrefixWord(prefixWord as Word)).toBe(true);
  });

  it("returns false for JlptWord", () => {
    expect(isPrefixWord(jlptWord as Word)).toBe(false);
  });

  it("returns false for PostfixWord", () => {
    expect(isPrefixWord(postfixWord as Word)).toBe(false);
  });

  it("returns false for StandardWord", () => {
    expect(isPrefixWord(standardWord as Word)).toBe(false);
  });

  it("returns false for CollocationWord", () => {
    expect(isPrefixWord(collocationWord as Word)).toBe(false);
  });
});

// ── isPostfixWord ───────────────────────────────────────────────────────────

describe("isPostfixWord", () => {
  it("returns true for PostfixWord", () => {
    expect(isPostfixWord(postfixWord as Word)).toBe(true);
  });

  it("returns false for JlptWord", () => {
    expect(isPostfixWord(jlptWord as Word)).toBe(false);
  });

  it("returns false for PrefixWord", () => {
    expect(isPostfixWord(prefixWord as Word)).toBe(false);
  });

  it("returns false for StandardWord", () => {
    expect(isPostfixWord(standardWord as Word)).toBe(false);
  });

  it("returns false for CollocationWord", () => {
    expect(isPostfixWord(collocationWord as Word)).toBe(false);
  });
});

// ── Existing guards unaffected ──────────────────────────────────────────────

describe("isCollocationWord", () => {
  it("returns true for CollocationWord", () => {
    expect(isCollocationWord(collocationWord as Word)).toBe(true);
  });

  it("returns false for StandardWord", () => {
    expect(isCollocationWord(standardWord as Word)).toBe(false);
  });

  it("returns false for PrefixWord", () => {
    expect(isCollocationWord(prefixWord as Word)).toBe(false);
  });
});

describe("isFamousQuoteWord", () => {
  it("returns true for FamousQuoteWord", () => {
    expect(isFamousQuoteWord(famousQuoteWord as Word)).toBe(true);
  });

  it("returns false for StandardWord", () => {
    expect(isFamousQuoteWord(standardWord as Word)).toBe(false);
  });

  it("returns false for PrefixWord", () => {
    expect(isFamousQuoteWord(prefixWord as Word)).toBe(false);
  });
});

// ── Mutual exclusivity ──────────────────────────────────────────────────────

describe("type guards are mutually exclusive for prefix/postfix/jlpt", () => {
  it("prefix word matches only isPrefixWord", () => {
    expect(isPrefixWord(prefixWord as Word)).toBe(true);
    expect(isPostfixWord(prefixWord as Word)).toBe(false);
    expect(isJlptWord(prefixWord as Word)).toBe(false);
  });

  it("postfix word matches only isPostfixWord", () => {
    expect(isPostfixWord(postfixWord as Word)).toBe(true);
    expect(isPrefixWord(postfixWord as Word)).toBe(false);
    expect(isJlptWord(postfixWord as Word)).toBe(false);
  });

  it("jlpt word matches only isJlptWord", () => {
    expect(isJlptWord(jlptWord as Word)).toBe(true);
    expect(isPrefixWord(jlptWord as Word)).toBe(false);
    expect(isPostfixWord(jlptWord as Word)).toBe(false);
  });
});
