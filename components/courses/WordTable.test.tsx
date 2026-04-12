import React from "react";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import WordTable from "./WordTable";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      if (typeof fallback === "string") return fallback;

      const labels: Record<string, string> = {
        "courses.collocation": "Collocation",
        "courses.meaning": "Meaning",
        "courses.explanation": "Explanation",
        "courses.word": "Word",
        "courses.pronunciation": "Pronunciation",
        "courses.example": "Example",
        "courses.translation": "Translation",
        "courses.image": "Image",
        "words.generateNewImage": "Generate new image",
        "courses.generatePronunciation": "Generate pronunciation",
        "courses.missingWordValue": "Missing word",
        "courses.missingMeaningValue": "Missing meaning",
        "words.derivative": "Derivatives",
        "words.generateDerivatives": "Generate derivatives",
        "words.exampleHuriganaLabel": "Example hurigana",
        "words.fillExampleHuriganaAction": "Fill example hurigana",
        "words.contextMenuEdit": "Edit",
        "words.none": "None",
      };

      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/components/shared/InlineEditableText", () => ({
  default: ({
    value,
    emptyLabel,
    sx,
  }: {
    value?: string;
    emptyLabel?: string;
    sx?: Array<Record<string, string>> | Record<string, string>;
  }) => {
    const styles = Array.isArray(sx) ? sx : sx ? [sx] : [];
    const hasNoWrapStyle = styles.some(
      (style) =>
        style.whiteSpace === "nowrap" &&
        style.overflowWrap === "normal" &&
        style.wordBreak === "keep-all",
    );

    return <span data-nowrap={hasNoWrapStyle ? "true" : "false"}>{value || emptyLabel || ""}</span>;
  },
}));

vi.mock("@/lib/firebase/firestore", () => ({
  updateWordTextField: vi.fn(),
}));

vi.mock("@/components/words/WordFinderMissingFieldDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/derivatives/DerivativeGenerationDialog", () => ({
  default: () => null,
}));

describe("WordTable", () => {
  it("renders the image column for collocation rows when image support is enabled", () => {
    const markup = renderToStaticMarkup(
      <WordTable
        words={[
          {
            id: "col-1",
            collocation: "take off",
            meaning: "remove clothing",
            explanation: "remove clothing from your body",
            example: "Take off your jacket.",
            translation: "재킷을 벗어라.",
            imageUrl: "https://example.com/collocation.png",
          },
        ]}
        isCollocation
        showImageUrl
        courseId="COLLOCATIONS"
        coursePath="courses/COLLOCATIONS"
        dayId="Day1"
      />,
    );

    assert.ok(markup.includes("Image"));
    assert.ok(markup.includes("https://example.com/collocation.png"));
    expect(markup).toContain("take off");
    expect(markup).toContain('data-nowrap="true">take off<');
  });

  it("renders JLPT-specific columns and values", () => {
    const markup = renderToStaticMarkup(
      <WordTable
        words={[
          {
            id: "jlpt-1",
            word: "猫",
            meaningEnglish: "cat",
            meaningKorean: "고양이",
            pronunciation: "ねこ",
            pronunciationRoman: "",
            example: "猫がいる。",
            exampleRoman: "",
            translationEnglish: "There is a cat.",
            translationKorean: "고양이가 있다.",
            imageUrl: "https://example.com/jlpt.png",
          },
        ]}
        isCollocation={false}
        isJlpt
        showImageUrl
        courseId="JLPT"
        coursePath="courses/JLPT"
        dayId="Day1"
      />,
    );

    expect(markup).toContain("Meaning (English)");
    expect(markup).toContain("Meaning (Korean)");
    expect(markup).toContain("Translation (English)");
    expect(markup).toContain("Translation (Korean)");
    expect(markup).toContain("Image");
    expect(markup).toContain("猫");
    expect(markup).toContain("ねこ");
    expect(markup).toContain("猫がいる。");
    expect(markup).toContain("https://example.com/jlpt.png");
    expect(markup).toContain('data-nowrap="true">猫<');
  });

  it("renders JLPT counter rows with the existing JLPT layout", () => {
    const markup = renderToStaticMarkup(
      <WordTable
        words={[
          {
            id: "counter-1",
            word: "本",
            meaningEnglish: "counter for long cylindrical objects",
            meaningKorean: "긴 물건을 세는 단위",
            pronunciation: "ほん",
            pronunciationRoman: "hon",
            example: "ペンを三本買った。",
            exampleRoman: "",
            translationEnglish: "I bought three pens.",
            translationKorean: "펜을 세 자루 샀다.",
            imageUrl: "https://example.com/counter.png",
          },
        ]}
        isCollocation={false}
        isJlpt
        showImageUrl
        courseId="JLPT_COUNTER"
        coursePath="JLPT_Counters/GWhncSjjmcrL0X47yU9j"
      />,
    );

    expect(markup).toContain("Meaning (English)");
    expect(markup).toContain("Meaning (Korean)");
    expect(markup).toContain("Image");
    expect(markup).toContain("本");
    expect(markup).toContain("ほん");
    expect(markup).toContain("https://example.com/counter.png");
  });

  it("renders the exampleHurigana-focused JLPT layout when that chip is active", () => {
    const markup = renderToStaticMarkup(
      <WordTable
        words={[
          {
            id: "jlpt-hurigana-1",
            word: "猫",
            meaningEnglish: "cat",
            meaningKorean: "고양이",
            pronunciation: "ねこ",
            pronunciationRoman: "",
            example: "猫がいる。",
            exampleHurigana: "",
            exampleRoman: "",
            translationEnglish: "There is a cat.",
            translationKorean: "고양이가 있다.",
            imageUrl: "https://example.com/jlpt.png",
          },
        ]}
        isCollocation={false}
        isJlpt
        activeMissingField="exampleHurigana"
        showImageUrl
        courseId="JLPT"
        coursePath="courses/JLPT"
        dayId="Day1"
      />,
    );

    expect(markup).toContain("Example hurigana");
    expect(markup).toContain("猫がいる。");
    expect(markup).toContain("https://example.com/jlpt.png");
    expect(markup).not.toContain("Translation (English)");
  });

  it("renders derivative content and a generate affordance for supported standard rows", () => {
    const markup = renderToStaticMarkup(
      <WordTable
        words={[
          {
            id: "std-1",
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
          {
            id: "std-2",
            word: "use",
            meaning: "purpose",
            pronunciation: "",
            example: "",
            translation: "",
            derivative: [{ word: "useful", meaning: "helpful or practical" }],
          },
        ]}
        isCollocation={false}
        showImageUrl={false}
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    expect(markup).toContain("Derivatives");
    expect(markup).toContain("Generate derivatives");
    expect(markup).toContain("useful");
  });

  it("renders a synonym column for TOEFL / IELTS standard rows", () => {
    const markup = renderToStaticMarkup(
      <WordTable
        words={[
          {
            id: "toefl-1",
            word: "focus",
            meaning: "attention",
            synonym: "concentration",
            pronunciation: "foh-kus",
            example: "Focus on the main argument.",
            translation: "집중",
          },
        ]}
        isCollocation={false}
        showImageUrl={false}
        courseId="TOEFL_IELTS"
        coursePath="courses/TOEFL_IELTS"
        dayId="Day3"
      />,
    );

    expect(markup).toContain("Synonym");
    expect(markup).toContain("concentration");
    expect(markup).toContain('data-nowrap="true">focus<');
  });

  it("renders Extremely Advanced rows without pronunciation or derivative columns", () => {
    const markup = renderToStaticMarkup(
      <WordTable
        words={[
          {
            id: "advanced-1",
            word: "fuddle",
            meaning: "to confuse",
            example: "I fuddled away with old friends.",
            translation: "나는 친구들과 시간을 보냈다.",
            imageUrl: "https://example.com/fuddle.png",
          },
        ]}
        isCollocation={false}
        isExtremelyAdvanced
        showImageUrl
        courseId="EXTREMELY_ADVANCED"
        coursePath="courses/EXTREMELY_ADVANCED"
        dayId="Day1"
      />,
    );

    expect(markup).toContain("Word");
    expect(markup).toContain("Meaning");
    expect(markup).toContain("Example");
    expect(markup).toContain("Translation");
    expect(markup).toContain("Image");
    expect(markup).not.toContain("Pronunciation");
    expect(markup).not.toContain("Derivatives");
    expect(markup).toContain("fuddle");
    expect(markup).toContain("I fuddled away with old friends.");
    expect(markup).toContain("https://example.com/fuddle.png");
  });
});
