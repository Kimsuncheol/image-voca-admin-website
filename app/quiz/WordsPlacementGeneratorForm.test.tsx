// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WordsPlacementGeneratorForm from "./WordsPlacementGeneratorForm";

const defaultProps = {
  submitLabel: "Generate Words Placement",
  loadingLabel: "Generating...",
  resetLabel: "Reset",
  networkErrorMsg: "Network error. Please try again.",
  standbyTitle: "Ready",
  standbyDescription: "Select options.",
  processingDescription: "Processing.",
  languageLabel: "Language",
  courseLabel: "Course",
  levelLabel: "JLPT Level",
  dayLabel: "Day",
  englishLabel: "English",
  japaneseLabel: "Japanese",
  saveLabel: "Add",
  savingLabel: "Adding...",
  saveSuccessMsg: "Words placement game saved successfully.",
  saveErrorMsg: "Failed to save words placement game.",
};

function renderForm(element: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(element);
  });

  return {
    unmount() {
      act(() => {
        root.unmount();
      });
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

describe("WordsPlacementGeneratorForm", () => {
  let rendered: ReturnType<typeof renderForm> | null = null;

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

  it("loads day limits, generates preview chunks, and saves", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ max_days: 20, max_count: 2 }),
    ).mockResolvedValueOnce(
      Response.json({
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
                  { id: "word-1-1-chunk-1", text: "Too much help may", type: "sentence_chunk", order: 1 },
                  { id: "word-1-1-chunk-2", text: "spoil", type: "answer", order: 2 },
                  { id: "word-1-1-chunk-3", text: "your child.", type: "sentence_chunk", order: 3 },
                ],
              },
            ],
          },
        ],
        skipped: [],
      }),
    ).mockResolvedValueOnce(
      Response.json({
        gameType: "words_placement",
        courseId: "CSAT",
        dayId: "Day1",
        version: 1,
        saved: true,
        path: "courses/csat/Day1/Day1-quiz/words_placement/data",
        items: [],
        skipped: [],
      }),
    );

    rendered = renderForm(<WordsPlacementGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="number"]');
      expect(input?.max).toBe("20");
    });

    await act(async () => {
      findButton("Generate Words Placement")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("Generated 1 words placement items.");
      expect(document.body.textContent).toContain("Too much help may");
      expect(document.body.textContent).toContain("너무 많은 도움은 아이를 망칠 수 있다.");
      expect(document.body.textContent).toContain("2. spoil");
      expect(document.body.textContent).toContain("your child.");
    });

    await act(async () => {
      findButton("Add")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    const generateBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      course?: string;
      day?: number;
      save?: boolean;
    };
    const saveBody = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)) as {
      course?: string;
      day?: number;
      save?: boolean;
    };

    expect(generateBody).toEqual({ course: "CSAT", day: 1 });
    expect(saveBody).toEqual({ course: "CSAT", day: 1, save: true });
  });

  it("renders targetExample instead of raw Japanese source example", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ max_days: 20, max_count: 1 }),
    ).mockResolvedValueOnce(
      Response.json({
        gameType: "words_placement",
        courseId: "JLPT_N3",
        dayId: "Day1",
        version: 1,
        items: [
          {
            wordId: "jlpt-1",
            word: "間",
            example: "家(いえ)と学(がっ)校(こう)の間(あいだ)に公(こう)園(えん)がある。",
            wordsToPlace: [
              {
                targetExample: "家と学校の間に公園がある。",
                translationEnglish: "There is a park between my house and school.",
                translationKorean: "집과 학교 사이에 공원이 있다.",
                chunks: [
                  { id: "jlpt-1-1-chunk-1", text: "家と", type: "sentence_chunk", order: 1 },
                  { id: "jlpt-1-1-chunk-2", text: "学校の", type: "sentence_chunk", order: 2 },
                  { id: "jlpt-1-1-chunk-3", text: "間に", type: "answer", order: 3 },
                ],
              },
            ],
          },
        ],
        skipped: [],
      }),
    );

    rendered = renderForm(<WordsPlacementGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(document.querySelector<HTMLInputElement>('input[type="number"]')?.max).toBe("20");
    });

    await act(async () => {
      findButton("Generate Words Placement")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("家と学校の間に公園がある。");
      expect(document.body.textContent).toContain("There is a park between my house and school.");
      expect(document.body.textContent).toContain("집과 학교 사이에 공원이 있다.");
      expect(document.body.textContent).not.toContain("家(いえ)");
      expect(document.body.textContent).not.toContain("公(こう)");
    });
  });

  it("supports Japanese JLPT level generation requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      if (url === "/api/admin/words-placement/generate") {
        return Response.json({
          gameType: "words_placement",
          courseId: "JLPT_N3",
          dayId: "Day1",
          version: 1,
          items: [],
          skipped: [],
        });
      }
      return Response.json({ max_days: 20, max_count: 1 });
    });

    rendered = renderForm(<WordsPlacementGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/text/quiz-generate/count?course=CSAT&day=1",
        expect.any(Object),
      );
    });

    await selectVisibleOption("English", "Japanese");

    await waitFor(() => {
      expect(document.body.textContent).toContain("JLPT Level");
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/text/quiz-generate/count?course=JLPT&day=1&level=N3",
        expect.any(Object),
      );
    });

    await act(async () => {
      findButton("Generate Words Placement")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await waitFor(() => {
      const generateCall = fetchMock.mock.calls.find(
        ([url]) => url === "/api/admin/words-placement/generate",
      );
      expect(generateCall).toBeTruthy();
      const latestBody = JSON.parse(String(generateCall?.[1]?.body)) as {
        course?: string;
        level?: string;
        day?: number;
      };
      expect(latestBody).toEqual({ course: "JLPT", level: "N3", day: 1 });
    });
  });
});
