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
        "words.contextMenuEdit": "Edit",
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
});
