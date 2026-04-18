// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import QuizGeneratorForm from "./QuizGeneratorForm";

const defaultProps = {
  submitLabel: "Generate Quiz",
  loadingLabel: "Generating...",
  resetLabel: "Reset",
  networkErrorMsg: "Network error. Please try again.",
  standbyTitle: "Ready",
  standbyDescription: "Select options.",
  processingDescription: "Processing.",
  quizTypeLabel: "Quiz Type",
  languageLabel: "Language",
  courseLabel: "Course",
  levelLabel: "JLPT Level",
  dayLabel: "Day",
  countLabel: "Number of Questions",
  matchingLabel: "Matching",
  fillBlankLabel: "Fill in the Blank",
  englishLabel: "English",
  japaneseLabel: "Japanese",
  itemsLabel: "Items",
  choicesLabel: "Choices",
  answerKeyLabel: "Answer Key",
  questionLabel: "Question",
  showAnswerLabel: "Show Answer",
  hideAnswerLabel: "Hide Answer",
  addLabel: "Add",
  addingLabel: "Adding...",
  addSuccessMsg: "Quiz saved successfully.",
  addErrorMsg: "Failed to save quiz.",
  meaningLanguageLabel: "Meaning Language",
  meaningEnglishLabel: "English",
  meaningKoreanLabel: "Korean",
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

function getCountInput() {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="number"]'),
  );
  const countInput = inputs[1];
  expect(countInput).toBeTruthy();
  return countInput;
}

function getDayInput() {
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="number"]'),
  );
  const dayInput = inputs[0];
  expect(dayInput).toBeTruthy();
  return dayInput;
}

describe("QuizGeneratorForm", () => {
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

  it("sets max values, fills over-max values, and marks them red for one second", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 20, max_count: 6 }),
    );

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      const dayInput = getDayInput();
      const countInput = getCountInput();
      expect(dayInput.max).toBe("20");
      expect(countInput.max).toBe("6");
      expect(countInput.value).toBe("6");
      expect(countInput.getAttribute("aria-invalid")).toBe("true");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1050));
    });

    await waitFor(() => {
      expect(getCountInput().getAttribute("aria-invalid")).toBe("false");
    });

    const dayInput = getDayInput();
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(dayInput, "25");
      dayInput.dispatchEvent(new Event("input", { bubbles: true }));
      dayInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await waitFor(() => {
      expect(dayInput.value).toBe("20");
      expect(dayInput.getAttribute("aria-invalid")).toBe("true");
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1050));
    });

    await waitFor(() => {
      expect(dayInput.getAttribute("aria-invalid")).toBe("false");
    });
  });

  it("disables generation when the selected day has no words", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 20, max_count: 0 }),
    );

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      const button = Array.from(document.querySelectorAll("button")).find(
        (node) => node.textContent === "Generate Quiz",
      );
      expect(button).toBeTruthy();
      expect(button).toHaveProperty("disabled", true);
      expect(document.body.textContent).toContain("The selected day has no words.");
    });
  });

  it("generates with the selected day's word count when it is above the default count", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ max_days: 20, max_count: 14 }),
    ).mockResolvedValueOnce(
      Response.json({
        quiz_type: "matching",
        items: [],
        choices: [],
        answer_key: [],
      }),
    );

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(getCountInput().value).toBe("14");
    });

    const button = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Generate Quiz",
    );
    expect(button).toBeTruthy();

    await act(async () => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const generateRequest = fetchMock.mock.calls[1]?.[1];
    const body = JSON.parse(String(generateRequest?.body)) as { count?: number };
    expect(body.count).toBe(14);
  });
});
