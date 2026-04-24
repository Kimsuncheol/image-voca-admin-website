import React from "react";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import WordFinderTable from "./WordFinderTable";
import type { WordFinderResult } from "@/types/wordFinder";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      if (typeof fallback === "string") return fallback;

      const labels: Record<string, string> = {
        "words.primaryText": "Primary Text",
        "words.secondaryText": "Secondary Text",
        "words.translationLabel": "Translation",
        "courses.pronunciation": "Pronunciation",
        "courses.image": "Image",
        "words.location": "Location",
        "words.status": "Status",
        "words.actions": "Actions",
        "words.typeStandard": "Standard",
        "words.typeCollocation": "Collocation",
        "words.typeFamousQuote": "Famous Quote",
        "words.typeKanji": "Kanji",
        "words.typePrefix": "Prefix",
        "words.typePostfix": "Postfix",
        "words.hasImage": "Has image",
        "words.missingImage": "Missing image",
        "words.hasPronunciation": "Has pronunciation",
        "words.missingPronunciation": "Missing pronunciation",
        "words.hasExample": "Has example",
        "words.missingExample": "Missing example",
        "words.missingExampleHurigana": "Missing example hurigana",
        "words.hasTranslation": "Has translation",
        "words.missingTranslation": "Missing translation",
        "words.hasDerivative": "Has derivatives",
        "words.missingDerivative": "Missing derivatives",
        "words.exampleHuriganaLabel": "Example hurigana",
        "words.openSource": "Open source",
        "words.noDay": "No day",
        "words.none": "None",
      };

      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/components/shared/InlineEditableText", () => ({
  default: ({ value, emptyLabel }: { value?: string; emptyLabel?: string }) => (
    <span>{value || emptyLabel || ""}</span>
  ),
}));

function createResult(overrides: Partial<WordFinderResult>): WordFinderResult {
  return {
    id: "word-1",
    courseId: "TOEIC",
    courseLabel: "TOEIC",
    coursePath: "courses/TOEIC",
    dayId: "Day1",
    sourceHref: "/courses/TOEIC/Day1",
    schemaVariant: "standard",
    type: "standard",
    primaryText: "wander",
    secondaryText: "to move around",
    meaning: "to move around",
    translation: "돌아다니다",
    example: "We wander through the city.",
    pronunciation: "wan-der",
    imageUrl: "https://example.com/wander.png",
    ...overrides,
  };
}

describe("WordFinderTable", () => {
  it("renders the image column for standard and collocation rows but not famous quotes", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({}),
          createResult({
            id: "col-1",
            courseId: "COLLOCATIONS",
            courseLabel: "Collocations",
            coursePath: "courses/COLLOCATIONS",
            sourceHref: "/courses/COLLOCATIONS/Day2",
            dayId: "Day2",
            type: "collocation",
            primaryText: "take off",
            secondaryText: "remove clothing",
            meaning: "remove clothing",
            pronunciation: null,
            imageUrl: "https://example.com/collocation.png",
          }),
          createResult({
            id: "quote-1",
            courseId: "FAMOUS_QUOTE",
            courseLabel: "Famous Quote",
            coursePath: "famous_quotes",
            sourceHref: "/courses/FAMOUS_QUOTE",
            dayId: null,
            type: "famousQuote",
            primaryText: "Stay hungry, stay foolish.",
            secondaryText: "Steve Jobs",
            meaning: null,
            translation: "늘 갈망하고 우직하게 나아가라.",
            example: null,
            pronunciation: null,
            imageUrl: null,
          }),
        ]}
      />,
    );

    assert.ok(markup.includes("Image"));
    assert.ok(markup.includes("https://example.com/wander.png"));
    assert.ok(markup.includes("https://example.com/collocation.png"));
    expect(markup).not.toContain("Missing image");
  });

  it("renders JLPT image thumbnails in the compact finder", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({
            id: "jlpt-1",
            courseId: "JLPT",
            courseLabel: "JLPT",
            coursePath: "courses/JLPT",
            sourceHref: "/courses/JLPT/Day1",
            dayId: "Day1",
            schemaVariant: "jlpt",
            primaryText: "猫",
            secondaryText: "cat / 고양이",
            meaning: "cat / 고양이",
            meaningEnglish: "cat",
            meaningKorean: "고양이",
            pronunciation: "ねこ",
            pronunciationRoman: "neko",
            example: "猫がいる。",
            exampleRoman: "neko ga iru.",
            translation: "There is a cat. / 고양이가 있다.",
            translationEnglish: "There is a cat.",
            translationKorean: "고양이가 있다.",
            imageUrl: "https://example.com/jlpt.png",
          }),
        ]}
      />,
    );

    expect(markup).toContain("https://example.com/jlpt.png");
    expect(markup).toContain("Pronunciation");
    expect(markup).toContain("ねこ");
    expect(markup).toContain("Has image");
    expect(markup).toContain("Has example");
  });

  it("renders JLPT counter results with the existing JLPT finder layout", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({
            id: "counter-1",
            courseId: "JLPT_COUNTER",
            courseLabel: "Counters",
            coursePath: "JLPT_Counters/GWhncSjjmcrL0X47yU9j",
            sourceHref: "/courses/JLPT_COUNTER#counter-1",
            dayId: null,
            schemaVariant: "jlpt",
            primaryText: "本",
            secondaryText: "counter for long objects / 긴 물건을 세는 단위",
            meaning: "counter for long objects / 긴 물건을 세는 단위",
            meaningEnglish: "counter for long objects",
            meaningKorean: "긴 물건을 세는 단위",
            pronunciation: "ほん",
            pronunciationRoman: "hon",
            example: "ペンを三本買った。",
            exampleRoman: "pen o san-bon katta.",
            translation: "I bought three pens. / 펜을 세 자루 샀다.",
            translationEnglish: "I bought three pens.",
            translationKorean: "펜을 세 자루 샀다.",
            imageUrl: "https://example.com/counter.png",
          }),
        ]}
      />,
    );

    expect(markup).toContain("https://example.com/counter.png");
    expect(markup).toContain("本");
    expect(markup).toContain("Has pronunciation");
    expect(markup).toContain("Has example");
  });

  it("renders Kanji results with capitalized Korean romanization and no status actions", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({
            id: "kanji-1",
            courseId: "KANJI",
            courseLabel: "Kanji",
            coursePath: "courses/KANJI",
            sourceHref: "/courses/KANJI/Day1#kanji-1",
            dayId: "Day1",
            schemaVariant: "kanji",
            type: "kanji",
            primaryText: "一",
            secondaryText: "1. ひと / one person (Han saram)",
            meaning: "1. ひと / one person (Han saram)",
            pronunciation: "1. いち / ichi (Ichi romanized)",
            translation: "1. 一月です。",
            example: "1. 一月です。",
            imageUrl: null,
            meaningKoreanRomanize: ["han saram"],
            readingKoreanRomanize: ["ichi romanized"],
          }),
        ]}
      />,
    );

    expect(markup).toContain("Kanji");
    expect(markup).toContain("一");
    expect(markup).toContain("Han saram");
    expect(markup).toContain("Ichi romanized");
    expect(markup).not.toContain("Missing image");
    expect(markup).not.toContain("Has translation");
    expect(markup).not.toContain("Has example");
  });

  it("shows the exampleHurigana column only in the dedicated missing-field mode", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        activeMissingField="exampleHurigana"
        results={[
          createResult({
            id: "jlpt-eh-1",
            courseId: "JLPT",
            courseLabel: "JLPT",
            coursePath: "courses/JLPT",
            sourceHref: "/courses/JLPT/Day1",
            dayId: "Day1",
            schemaVariant: "jlpt",
            primaryText: "猫",
            secondaryText: "cat / 고양이",
            meaning: "cat / 고양이",
            meaningEnglish: "cat",
            meaningKorean: "고양이",
            example: "猫がいる。",
            exampleHurigana: "",
            pronunciation: "ねこ",
            translation: "There is a cat. / 고양이가 있다.",
            translationEnglish: "There is a cat.",
            translationKorean: "고양이가 있다.",
            imageUrl: "https://example.com/jlpt.png",
          }),
        ]}
      />,
    );

    expect(markup).toContain("Example hurigana");
    expect(markup).toContain("猫がいる。");
    expect(markup).toContain("Missing example hurigana");
    expect(markup).toContain("https://example.com/jlpt.png");
    expect(markup).not.toContain(">Translation<");
    expect(markup).not.toContain(">Status<");
  });

  it("renders a synonym column for TOEFL / IELTS standard results", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({
            id: "toefl-1",
            courseId: "TOEFL_IELTS",
            courseLabel: "TOEFL / IELTS",
            coursePath: "courses/TOEFL_IELTS",
            sourceHref: "/courses/TOEFL_IELTS/Day3",
            synonym: "concentration",
          }),
        ]}
      />,
    );

    expect(markup).toContain("Synonym");
    expect(markup).toContain("concentration");
  });

  it("renders Extremely Advanced results without pronunciation or derivative UI", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({
            id: "advanced-1",
            courseId: "EXTREMELY_ADVANCED",
            courseLabel: "Extremely Advanced",
            coursePath: "courses/EXTREMELY_ADVANCED",
            sourceHref: "/courses/EXTREMELY_ADVANCED/Day1",
            schemaVariant: "extremelyAdvanced",
            primaryText: "fuddle",
            secondaryText: "to confuse",
            meaning: "to confuse",
            pronunciation: null,
            example: "I fuddled away with old friends.",
            translation: "나는 친구들과 시간을 보냈다.",
            imageUrl: "https://example.com/fuddle.png",
          }),
        ]}
      />,
    );

    expect(markup).toContain("fuddle");
    expect(markup).toContain("to confuse");
    expect(markup).toContain("나는 친구들과 시간을 보냈다.");
    expect(markup).toContain("https://example.com/fuddle.png");
    expect(markup).not.toContain("Pronunciation");
    expect(markup).not.toContain("Missing pronunciation");
    expect(markup).not.toContain("Missing derivatives");
  });

  it("renders a prefix result without errors and shows Missing image", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({
            id: "prefix-1",
            courseId: "JLPT_PREFIX",
            courseLabel: "Prefix",
            coursePath: "courses/JLPT_PREFIX",
            sourceHref: "/courses/JLPT_PREFIX",
            dayId: null,
            schemaVariant: "prefix",
            type: "standard",
            primaryText: "再-",
            secondaryText: "again / 다시",
            meaning: "again / 다시",
            meaningEnglish: "again",
            meaningKorean: "다시",
            pronunciation: "さい",
            pronunciationRoman: "sai",
            example: "再生する",
            exampleRoman: "saisei suru",
            translation: "to regenerate / 재생하다",
            translationEnglish: "to regenerate",
            translationKorean: "재생하다",
            imageUrl: null,
          }),
        ]}
      />,
    );

    expect(markup).toContain("再-");
    expect(markup).toContain("さい");
    // prefix has no imageUrl — status column should show Missing image chip
    expect(markup).toContain("Missing image");
    // schemaVariant prefix — still type "standard" so pronunciation chip renders
    expect(markup).toContain("Has pronunciation");
  });

  it("renders a postfix result without errors and shows Missing image", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({
            id: "postfix-1",
            courseId: "JLPT_POSTFIX",
            courseLabel: "Postfix",
            coursePath: "courses/JLPT_POSTFIX",
            sourceHref: "/courses/JLPT_POSTFIX",
            dayId: null,
            schemaVariant: "postfix",
            type: "standard",
            primaryText: "-的",
            secondaryText: "-like / -적",
            meaning: "-like / -적",
            meaningEnglish: "-like",
            meaningKorean: "-적",
            pronunciation: "てき",
            pronunciationRoman: "teki",
            example: "科学的",
            exampleRoman: "kagakuteki",
            translation: "scientific / 과학적",
            translationEnglish: "scientific",
            translationKorean: "과학적",
            imageUrl: null,
          }),
        ]}
      />,
    );

    expect(markup).toContain("-的");
    expect(markup).toContain("てき");
    expect(markup).toContain("Missing image");
    expect(markup).toContain("Has pronunciation");
  });

  it("renders none in the pronunciation column when a row has no pronunciation", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({
            id: "quote-1",
            courseId: "FAMOUS_QUOTE",
            courseLabel: "Famous Quote",
            coursePath: "famous_quotes",
            sourceHref: "/courses/FAMOUS_QUOTE",
            dayId: null,
            schemaVariant: "famousQuote",
            type: "famousQuote",
            primaryText: "Stay hungry, stay foolish.",
            secondaryText: "Steve Jobs",
            meaning: null,
            translation: "늘 갈망하고 우직하게 나아가라.",
            example: null,
            pronunciation: null,
            imageUrl: null,
          }),
        ]}
      />,
    );

    expect(markup).toContain("Pronunciation");
    expect(markup).toContain("None");
  });

  it("renders derivative status only for supported standard English rows", () => {
    const markup = renderToStaticMarkup(
      <WordFinderTable
        results={[
          createResult({
            id: "toeic-standard",
            courseId: "TOEIC",
            schemaVariant: "standard",
            derivative: null,
          }),
          createResult({
            id: "toeic-derivative-present",
            courseId: "TOEIC",
            schemaVariant: "standard",
            derivative: [{ word: "wandering", meaning: "moving around aimlessly" }],
          }),
          createResult({
            id: "jlpt-standard",
            courseId: "JLPT",
            schemaVariant: "jlpt",
            derivative: null,
          }),
        ]}
      />,
    );

    expect(markup).toContain("Missing derivatives");
    expect(markup).toContain("Has derivatives");
    expect(markup).not.toContain("words.missingDerivative");
  });
});
