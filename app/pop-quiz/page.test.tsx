import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import PopQuizPage from "./page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "popQuiz.title": "Pop Quiz",
        "popQuiz.description": "Generate and save matching-game pop quizzes from vocabulary courses.",
        "popQuiz.submitLabel": "Generate Pop Quiz",
        "popQuiz.standbyTitle": "Ready to generate a pop quiz?",
        "popQuiz.standbyDescription": "Select a language, course, and day, then generate a matching game.",
        "popQuiz.processingDescription": "Generating a matching-game pop quiz using the vocabulary database. Please wait.",
      };

      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/hooks/useAdminGuard", () => ({
  useAdminGuard: () => ({
    authLoading: false,
    user: { role: "admin" },
  }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/app/quiz-generator/QuizGeneratorForm", () => ({
  default: ({
    fixedQuizType,
    hideQuizTypeSelector,
    submitLabel,
  }: {
    fixedQuizType?: string;
    hideQuizTypeSelector?: boolean;
    submitLabel: string;
  }) => (
    <div
      data-fixed-quiz-type={fixedQuizType}
      data-hide-quiz-type-selector={String(hideQuizTypeSelector)}
    >
      {submitLabel}
    </div>
  ),
}));

describe("PopQuizPage", () => {
  it("renders the pop quiz generator for admins", () => {
    const markup = renderToStaticMarkup(<PopQuizPage />);

    expect(markup).toContain("Pop Quiz");
    expect(markup).toContain("Generate and save matching-game pop quizzes from vocabulary courses.");
    expect(markup).toContain("Generate Pop Quiz");
    expect(markup).toContain('data-fixed-quiz-type="matching"');
    expect(markup).toContain('data-hide-quiz-type-selector="true"');
  });
});
