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
    generatorDraft,
  }: {
    fixedQuizType?: string;
    saveTarget?: string;
    hideQuizTypeSelector?: boolean;
    generatorDraft?: {
      quizType?: string;
      language?: string;
      course?: string;
      level?: string | null;
      day?: number;
    } | null;
  }) => (
    <div
      data-fixed-quiz-type={fixedQuizType ?? ""}
      data-save-target={saveTarget ?? "quiz"}
      data-hide-quiz-type-selector={String(Boolean(hideQuizTypeSelector))}
      data-draft-quiz-type={generatorDraft?.quizType ?? ""}
      data-draft-language={generatorDraft?.language ?? ""}
      data-draft-course={generatorDraft?.course ?? ""}
      data-draft-level={generatorDraft?.level ?? ""}
      data-draft-day={generatorDraft?.day ?? ""}
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
    onEmptyDayClick,
  }: {
    saveTarget?: string;
    fixedQuizType?: string;
    hideQuizTypeSelector?: boolean;
    onEmptyDayClick?: (draft: {
      quizType: string;
      language: string;
      course: string;
      level: string | null;
      day: number;
    }) => void;
  }) => (
    <div
      data-review-save-target={saveTarget ?? "quiz"}
      data-review-fixed-quiz-type={fixedQuizType ?? ""}
      data-review-hide-quiz-type-selector={String(Boolean(hideQuizTypeSelector))}
    >
      Review Tab
      <button
        type="button"
        onClick={() =>
          onEmptyDayClick?.(
            saveTarget === "pop_quiz"
              ? {
                  quizType: "matching",
                  language: "japanese",
                  course: "JLPT",
                  level: "N5",
                  day: 2,
                }
              : {
                  quizType: "matching",
                  language: "english",
                  course: "CSAT",
                  level: null,
                  day: 3,
                },
          )
        }
      >
        Empty Day
      </button>
    </div>
  ),
}));

describe("QuizPage", () => {
  it("renders Quiz and Pop Quiz top tabs with generator/review chips", () => {
    const markup = renderToStaticMarkup(<QuizPage />);

    expect(markup).toContain("Quiz");
    expect(markup).toContain("Pop Quiz");
    expect(markup).not.toContain("Words Placement");
    expect(markup).toContain("Generator");
    expect(markup).toContain("Review");
    expect(markup).toContain('data-save-target="quiz"');
  });

  it("keeps Pop Quiz fixed to matching review mode", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<QuizPage />);
    });

    const popQuizTab = Array.from(document.querySelectorAll('[role="tab"]')).find(
      (tab) => tab.textContent === "Pop Quiz",
    );
    expect(popQuizTab).toBeTruthy();

    act(() => {
      popQuizTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const reviewChip = Array.from(document.querySelectorAll('[role="button"]')).find(
      (button) => button.textContent === "Review",
    );
    expect(reviewChip).toBeTruthy();

    act(() => {
      reviewChip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.innerHTML).toContain('data-review-save-target="pop_quiz"');
    expect(document.body.innerHTML).toContain('data-review-fixed-quiz-type="matching"');
    expect(document.body.innerHTML).toContain('data-review-hide-quiz-type-selector="true"');

    act(() => root.unmount());
    container.remove();
  });

  it("switches Quiz review empty day clicks into generator with matching settings", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<QuizPage />);
    });

    const reviewChip = Array.from(document.querySelectorAll('[role="button"]')).find(
      (button) => button.textContent === "Review",
    );
    expect(reviewChip).toBeTruthy();

    act(() => {
      reviewChip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const emptyDayButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Empty Day",
    );
    expect(emptyDayButton).toBeTruthy();

    act(() => {
      emptyDayButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.innerHTML).toContain('data-save-target="quiz"');
    expect(document.body.innerHTML).toContain('data-draft-quiz-type="matching"');
    expect(document.body.innerHTML).toContain('data-draft-language="english"');
    expect(document.body.innerHTML).toContain('data-draft-course="CSAT"');
    expect(document.body.innerHTML).toContain('data-draft-day="3"');

    act(() => root.unmount());
    container.remove();
  });

  it("switches Pop Quiz review empty day clicks into fixed matching generator", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<QuizPage />);
    });

    const popQuizTab = Array.from(document.querySelectorAll('[role="tab"]')).find(
      (tab) => tab.textContent === "Pop Quiz",
    );
    expect(popQuizTab).toBeTruthy();

    act(() => {
      popQuizTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const reviewChip = Array.from(document.querySelectorAll('[role="button"]')).find(
      (button) => button.textContent === "Review",
    );
    expect(reviewChip).toBeTruthy();

    act(() => {
      reviewChip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const emptyDayButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Empty Day",
    );
    expect(emptyDayButton).toBeTruthy();

    act(() => {
      emptyDayButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.innerHTML).toContain('data-save-target="pop_quiz"');
    expect(document.body.innerHTML).toContain('data-fixed-quiz-type="matching"');
    expect(document.body.innerHTML).toContain('data-draft-language="japanese"');
    expect(document.body.innerHTML).toContain('data-draft-course="JLPT"');
    expect(document.body.innerHTML).toContain('data-draft-level="N5"');
    expect(document.body.innerHTML).toContain('data-draft-day="2"');

    act(() => root.unmount());
    container.remove();
  });
});
