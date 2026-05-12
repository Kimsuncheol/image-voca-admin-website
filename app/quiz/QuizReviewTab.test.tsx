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
        "quizGenerator.wordsPlacement": "Words Placement",
        "quizGenerator.languageLabel": "Language",
        "quizGenerator.english": "English",
        "quizGenerator.japanese": "Japanese",
        "quizGenerator.courseLabel": "Course",
        "quizGenerator.levelLabel": "JLPT Level",
        "quizReview.loadButton": "Load",
        "quizReview.loading": "Loading...",
        "quizReview.networkError": "Network error",
        "quizReview.deleteQuiz": "Delete Quiz",
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

async function selectMuiOption(currentText: string, optionText: string) {
  const select = Array.from(document.querySelectorAll('[role="combobox"]')).find(
    (node) => node.textContent?.includes(currentText),
  );
  expect(select).toBeTruthy();

  await act(async () => {
    select?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  });

  const option = Array.from(document.querySelectorAll('[role="option"]')).find(
    (node) => node.textContent === optionText,
  );
  expect(option).toBeTruthy();

  await act(async () => {
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
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

  it("loads and renders Words Placement review data through the words-placement APIs", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ total: 2, days: [1] }))
      .mockResolvedValueOnce(
        Response.json({
          gameType: "words_placement",
          courseId: "TOEIC",
          dayId: "Day1",
          version: 1,
          items: [
            {
              wordId: "word-1",
              word: "measure",
              example: "A number of measures were taken to solve the problem.",
              wordsToPlace: [
                {
                  targetExample: "A number of measures were taken to solve the problem.",
                  translation: "문제를 해결하기 위해 여러 조치가 취해졌다.",
                  chunks: [
                    { id: "chunk-1", text: "A number of", type: "sentence_chunk", order: 0 },
                    { id: "chunk-2", text: "measures", type: "answer", order: 1 },
                  ],
                },
              ],
            },
          ],
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    rendered = renderComponent(
      <QuizReviewTab fixedQuizType="words_placement" hideQuizTypeSelector />,
    );

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
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "/api/admin/words-placement/status?",
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain("1");
    });
    const dayCard = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "1",
    );
    expect(dayCard).toBeTruthy();

    await act(async () => {
      dayCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        "A number of measures were taken to solve the problem.",
      );
      expect(document.body.textContent).toContain("문제를 해결하기 위해 여러 조치가 취해졌다.");
      expect(document.body.textContent).toContain("measures");
    });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "/api/admin/words-placement?",
    );

    await act(async () => {
      dayCard?.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          clientX: 10,
          clientY: 10,
        }),
      );
    });

    const deleteButton = Array.from(document.querySelectorAll('[role="menuitem"]')).find(
      (button) => button.textContent === "Delete Quiz",
    );
    expect(deleteButton).toBeTruthy();

    await act(async () => {
      deleteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    expect(String(fetchMock.mock.calls[2]?.[0])).toContain(
      "/api/admin/words-placement?",
    );
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: "DELETE" });
  });

  it("sends current review settings when an uncolored day is clicked", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ total: 6, days: [1, 2, 3, 4, 5] }),
    );
    const onEmptyDayClick = vi.fn();

    rendered = renderComponent(
      <QuizReviewTab onEmptyDayClick={onEmptyDayClick} />,
    );

    await selectMuiOption("Matching", "Words Placement");
    await selectMuiOption("English", "Japanese");
    await selectMuiOption("N3", "N5");

    const loadButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Load",
    );
    expect(loadButton).toBeTruthy();

    await act(async () => {
      loadButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(document.body.textContent).toContain("6");
    });

    const emptyDay = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "6",
    );
    expect(emptyDay).toBeTruthy();

    await act(async () => {
      emptyDay?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onEmptyDayClick).toHaveBeenCalledWith({
      quizType: "words_placement",
      language: "japanese",
      course: "JLPT",
      level: "N5",
      day: 6,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears the loaded grid and preview when a review filter changes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ total: 2, days: [1] }))
      .mockResolvedValueOnce(
        Response.json({
          quiz_type: "matching",
          meaning_language: "korean",
          items: [{ id: "item-1", word: "measure", meaning: "조치" }],
          choices: [{ id: "choice-1", word: "measure", meaning: "조치" }],
          answer_key: [{ item_id: "item-1", choice_id: "choice-1" }],
        }),
      );

    rendered = renderComponent(<QuizReviewTab />);

    const loadButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Load",
    );
    expect(loadButton).toBeTruthy();

    await act(async () => {
      loadButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("1");
    });

    const dayCard = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "1",
    );
    expect(dayCard).toBeTruthy();

    await act(async () => {
      dayCard?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("measure");
    });

    await selectMuiOption("TOEIC", "CSAT");

    await waitFor(() => {
      expect(document.body.textContent).not.toContain("measure");
      expect(
        Array.from(document.querySelectorAll("button")).some(
          (button) => button.textContent?.trim() === "1",
        ),
      ).toBe(false);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not open the delete menu for uncolored days", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ total: 2, days: [1] }),
    );

    rendered = renderComponent(<QuizReviewTab />);

    const loadButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Load",
    );
    expect(loadButton).toBeTruthy();

    await act(async () => {
      loadButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("2");
    });

    const emptyDay = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "2",
    );
    expect(emptyDay).toBeTruthy();

    await act(async () => {
      emptyDay?.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          clientX: 10,
          clientY: 10,
        }),
      );
    });

    expect(document.querySelector('[role="menuitem"]')).toBeNull();
  });
});
