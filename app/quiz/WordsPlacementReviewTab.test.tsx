// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WordsPlacementReviewTab from "./WordsPlacementReviewTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "quizGenerator.languageLabel": "Language",
        "quizGenerator.english": "English",
        "quizGenerator.japanese": "Japanese",
        "quizGenerator.courseLabel": "Course",
        "quizGenerator.levelLabel": "JLPT Level",
        "quizReview.loadButton": "Load",
        "quizReview.loading": "Loading...",
        "quizReview.networkError": "Network error",
        "quizReview.noQuizzes": "No days found",
        "quizReview.deleteQuiz": "Delete Quiz",
        "quizReview.deleteSuccess": "Quiz deleted.",
        "quizReview.deleteError": "Delete failed",
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

function findButton(label: string) {
  const button = Array.from(document.querySelectorAll("button")).find(
    (node) => node.textContent === label,
  );
  expect(button).toBeTruthy();
  return button;
}

async function selectVisibleOption(currentText: string, optionText: string) {
  const select = Array.from(document.querySelectorAll('[role="combobox"]')).find(
    (node) => node.textContent === currentText,
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

describe("WordsPlacementReviewTab", () => {
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

  it("loads saved days, opens a day preview, and deletes it", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).startsWith("/api/admin/words-placement/status")) {
        return Response.json({ total: 2, days: [1] });
      }
      if (init?.method === "DELETE") {
        return new Response(null, { status: 204 });
      }
      return Response.json({
        gameType: "words_placement",
        courseId: "CSAT",
        dayId: "Day1",
        version: 1,
        items: [
          {
            wordId: "word-1",
            word: "spoil",
            example: "Too much help may spoil your child.",
            wordsToPlace: [
              {
                targetExample: "Too much help may spoil your child.",
                translation: "너무 많은 도움은 아이를 망칠 수 있다.",
                chunks: [
                  { id: "chunk-1", text: "Too much help may", type: "sentence_chunk", order: 1 },
                  { id: "chunk-2", text: "spoil", type: "answer", order: 2 },
                ],
              },
            ],
          },
        ],
      });
    });

    rendered = renderComponent(<WordsPlacementReviewTab />);

    await act(async () => {
      findButton("Load")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/words-placement/status?course=CSAT");
      expect(findButton("1")).toBeTruthy();
    });

    await act(async () => {
      findButton("1")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("Too much help may spoil your child.");
      expect(document.body.textContent).toContain("너무 많은 도움은 아이를 망칠 수 있다.");
      expect(document.body.textContent).toContain("2. spoil");
    });

    await act(async () => {
      findButton("Delete Quiz")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/words-placement?course=CSAT&day=1",
        { method: "DELETE" },
      );
      expect(document.body.textContent).not.toContain("Too much help may spoil your child.");
    });
  });

  it("sends JLPT level for Japanese review requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ total: 1, days: [] }),
    );

    rendered = renderComponent(<WordsPlacementReviewTab />);

    await selectVisibleOption("English", "Japanese");

    await act(async () => {
      findButton("Load")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/words-placement/status?course=JLPT&level=N3",
      );
    });
  });
});
