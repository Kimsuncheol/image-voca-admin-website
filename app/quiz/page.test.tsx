// @vitest-environment jsdom

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import QuizPage from "./page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "quiz.title": "Quiz",
        "quiz.description": "Generate and review quizzes from vocabulary courses.",
        "quiz.generatorTab": "Generator",
        "quiz.reviewTab": "Review",
        "popQuiz.title": "Pop Quiz",
        "wordsPlacement.title": "Words Placement",
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
    saveTarget,
    hideQuizTypeSelector,
  }: {
    fixedQuizType?: string;
    saveTarget?: string;
    hideQuizTypeSelector?: boolean;
  }) => (
    <div
      data-fixed-quiz-type={fixedQuizType ?? ""}
      data-save-target={saveTarget ?? "quiz"}
      data-hide-quiz-type-selector={String(Boolean(hideQuizTypeSelector))}
    >
      Generator Form
    </div>
  ),
}));

vi.mock("./QuizReviewTab", () => ({
  default: ({
    saveTarget,
    fixedQuizType,
    hideQuizTypeSelector,
  }: {
    saveTarget?: string;
    fixedQuizType?: string;
    hideQuizTypeSelector?: boolean;
  }) => (
    <div
      data-review-save-target={saveTarget ?? "quiz"}
      data-review-fixed-quiz-type={fixedQuizType ?? ""}
      data-review-hide-quiz-type-selector={String(Boolean(hideQuizTypeSelector))}
    >
      Review Tab
    </div>
  ),
}));

vi.mock("./WordsPlacementGeneratorForm", () => ({
  default: () => <div>Words Placement Generator Form</div>,
}));

vi.mock("./WordsPlacementReviewTab", () => ({
  default: () => <div>Words Placement Review Tab</div>,
}));

describe("QuizPage", () => {
  it("renders Quiz, Pop Quiz, and Words Placement top tabs with generator/review chips", () => {
    const markup = renderToStaticMarkup(<QuizPage />);

    expect(markup).toContain("Quiz");
    expect(markup).toContain("Pop Quiz");
    expect(markup).toContain("Words Placement");
    expect(markup).toContain("Generator");
    expect(markup).toContain("Review");
    expect(markup).toContain('data-save-target="quiz"');
  });

  it("renders Words Placement review mode", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<QuizPage />);
    });

    const wordsPlacementTab = Array.from(document.querySelectorAll('[role="tab"]')).find(
      (tab) => tab.textContent === "Words Placement",
    );
    expect(wordsPlacementTab).toBeTruthy();

    act(() => {
      wordsPlacementTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const reviewChip = Array.from(document.querySelectorAll('[role="button"]')).find(
      (button) => button.textContent === "Review",
    );
    expect(reviewChip).toBeTruthy();

    act(() => {
      reviewChip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("Words Placement Review Tab");

    act(() => root.unmount());
    container.remove();
  });
});
