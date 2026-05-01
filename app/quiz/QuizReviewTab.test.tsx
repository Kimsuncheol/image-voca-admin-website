// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import QuizReviewTab from "./QuizReviewTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "quizGenerator.quizTypeLabel": "Quiz Type",
        "quizGenerator.matching": "Matching",
        "quizGenerator.fillBlank": "Fill in the Blank",
        "quizGenerator.languageLabel": "Language",
        "quizGenerator.english": "English",
        "quizGenerator.japanese": "Japanese",
        "quizGenerator.courseLabel": "Course",
        "quizGenerator.levelLabel": "JLPT Level",
        "quizReview.loadButton": "Load",
        "quizReview.loading": "Loading...",
        "quizReview.networkError": "Network error",
      };

      return labels[key] ?? key;
    },
  }),
}));

function renderComponent(element: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

async function waitFor(assertion: () => void) {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < 1000) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
      });
    }
  }

  throw lastError;
}

describe("QuizReviewTab", () => {
  let rendered: ReturnType<typeof renderComponent> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("hides quiz type and loads pop quiz review with save_target", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ total: 3, days: [] }),
    );

    rendered = renderComponent(
      <QuizReviewTab
        saveTarget="pop_quiz"
        fixedQuizType="matching"
        hideQuizTypeSelector
      />,
    );

    expect(document.body.textContent).not.toContain("Quiz Type");
    expect(document.body.textContent).not.toContain("Fill in the Blank");

    const loadButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Load",
    );
    expect(loadButton).toBeTruthy();

    await act(async () => {
      loadButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("/api/admin/quiz/status?");
    expect(url).toContain("save_target=pop_quiz");
    expect(url).toContain("quiz_type=matching");
  });
});
