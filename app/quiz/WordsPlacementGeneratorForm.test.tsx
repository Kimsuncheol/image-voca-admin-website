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
  courseLabel: "Course",
  dayLabel: "Day",
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
              [
                { id: "word-1-1-chunk-1", text: "Too much help may", type: "sentence_chunk", order: 1 },
                { id: "word-1-1-chunk-2", text: "spoil", type: "answer", order: 2 },
                { id: "word-1-1-chunk-3", text: "your child.", type: "sentence_chunk", order: 3 },
              ],
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
        path: "courses/csat/Day1/Day1-game/words_placement/data",
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
});
