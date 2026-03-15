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
        "courses.example": "Example",
        "courses.translation": "Translation",
        "courses.image": "Image",
        "words.generateNewImage": "Generate new image",
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
});
