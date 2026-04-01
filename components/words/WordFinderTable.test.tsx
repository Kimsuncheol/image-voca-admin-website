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
        "words.typePrefix": "Prefix",
        "words.typePostfix": "Postfix",
        "words.hasImage": "Has image",
        "words.missingImage": "Missing image",
        "words.hasPronunciation": "Has pronunciation",
        "words.missingPronunciation": "Missing pronunciation",
        "words.hasExample": "Has example",
        "words.missingExample": "Missing example",
        "words.hasTranslation": "Has translation",
        "words.missingTranslation": "Missing translation",
        "words.hasDerivative": "Has derivatives",
        "words.missingDerivative": "Missing derivatives",
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
