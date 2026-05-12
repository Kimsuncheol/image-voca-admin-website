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
  wordsPlacementLabel: "Words Placement",
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

async function setInputValue(input: HTMLInputElement, value: string) {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
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
    vi.useRealTimers();
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
    const body = JSON.parse(String(generateRequest?.body)) as {
      count?: number;
      meaning_language?: string;
    };
    expect(body.count).toBe(14);
    expect("meaning_language" in body).toBe(false);
  });

  it("shows Words Placement as a quiz type option", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 20, max_count: 6 }),
    );

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    const quizTypeSelect = Array.from(document.querySelectorAll('[role="combobox"]')).find(
      (node) => node.textContent?.includes("Matching"),
    );
    expect(quizTypeSelect).toBeTruthy();

    await act(async () => {
      quizTypeSelect?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("Words Placement");
    });
  });

  it("applies a matching generator draft without immediately generating", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 20, max_count: 6 }),
    );

    rendered = renderForm(
      <QuizGeneratorForm
        {...defaultProps}
        generatorDraft={{
          id: 1,
          quizType: "matching",
          language: "english",
          course: "CSAT",
          level: null,
          day: 3,
        }}
      />,
    );

    await waitFor(() => {
      expect(getDayInput().value).toBe("3");
      expect(document.body.textContent).toContain("Matching");
      expect(document.body.textContent).toContain("English");
      expect(document.body.textContent).toContain("CSAT");
    });

    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes("/api/text/quiz-generate") &&
        !String(url).includes("/count"),
      ),
    ).toBe(false);
    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === "/api/admin/words-placement/generate",
      ),
    ).toBe(false);
  });

  it("resets Day to 1 when quiz type changes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 20, max_count: 6 }),
    );

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(getDayInput().value).toBe("1");
    });
    await setInputValue(getDayInput(), "5");
    await selectMuiOption("Matching", "Words Placement");

    await waitFor(() => {
      expect(getDayInput().value).toBe("1");
      expect(document.body.textContent).toContain("Words Placement");
    });
  });

  it("resets Day to 1 when language changes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 20, max_count: 6 }),
    );

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(getDayInput().value).toBe("1");
    });
    await setInputValue(getDayInput(), "5");
    await selectMuiOption("English", "Japanese");

    await waitFor(() => {
      expect(getDayInput().value).toBe("1");
      expect(document.body.textContent).toContain("Japanese");
      expect(document.body.textContent).toContain("JLPT");
    });
  });

  it("resets Day to 1 when course changes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 20, max_count: 6 }),
    );

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(getDayInput().value).toBe("1");
    });
    await setInputValue(getDayInput(), "5");
    await selectMuiOption("TOEIC", "CSAT");

    await waitFor(() => {
      expect(getDayInput().value).toBe("1");
      expect(document.body.textContent).toContain("CSAT");
    });
  });

  it("resets Day to 1 when JLPT level changes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 20, max_count: 6 }),
    );

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(getDayInput().value).toBe("1");
    });
    await selectMuiOption("English", "Japanese");
    await waitFor(() => {
      expect(document.body.textContent).toContain("N3");
    });
    await setInputValue(getDayInput(), "5");
    await selectMuiOption("N3", "N5");

    await waitFor(() => {
      expect(getDayInput().value).toBe("1");
      expect(document.body.textContent).toContain("N5");
    });
  });

  it("applies a Japanese Words Placement generator draft", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 20, max_count: 6 }),
    );

    rendered = renderForm(
      <QuizGeneratorForm
        {...defaultProps}
        generatorDraft={{
          id: 1,
          quizType: "words_placement",
          language: "japanese",
          course: "JLPT",
          level: "N5",
          day: 6,
        }}
      />,
    );

    await waitFor(() => {
      expect(getDayInput().value).toBe("6");
      expect(document.body.textContent).toContain("Words Placement");
      expect(document.body.textContent).toContain("Japanese");
      expect(document.body.textContent).toContain("JLPT");
      expect(document.body.textContent).toContain("N5");
    });
  });

  it("keeps a Pop Quiz draft fixed to matching", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input, init) => {
        if (String(input) === "/api/text/quiz-generate" && init?.method === "POST") {
          return Response.json({
          quiz_type: "matching",
          language: "japanese",
          course: "JLPT",
          level: "N5",
          day: 2,
          items: [],
          choices: [],
          answer_key: [],
          });
        }
        return Response.json({ max_days: 20, max_count: 6 });
      },
    );

    rendered = renderForm(
      <QuizGeneratorForm
        {...defaultProps}
        fixedQuizType="matching"
        hideQuizTypeSelector
        saveTarget="pop_quiz"
        generatorDraft={{
          id: 1,
          quizType: "words_placement",
          language: "japanese",
          course: "JLPT",
          level: "N5",
          day: 2,
        }}
      />,
    );

    await waitFor(() => {
      expect(getDayInput().value).toBe("2");
      expect(document.body.textContent).not.toContain("Quiz Type");
      expect(document.body.textContent).toContain("Japanese");
      expect(document.body.textContent).toContain("N5");
    });

    const generateButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Generate Quiz",
    );
    expect(generateButton).toBeTruthy();

    await waitFor(() => {
      expect(generateButton).toHaveProperty("disabled", false);
    });

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url, init]) => {
          if (String(url) !== "/api/text/quiz-generate") return false;
          const body = JSON.parse(String(init?.body)) as { quiz_type?: string };
          return body.quiz_type === "matching";
        }),
      ).toBe(true);
    });
  });

  it("generates and saves Words Placement through the words-placement endpoint", async () => {
    const wordsPlacementResponse = {
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
      skipped: [],
    };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ max_days: 20, max_count: 6 }))
      .mockResolvedValueOnce(Response.json(wordsPlacementResponse))
      .mockResolvedValueOnce(Response.json({ ...wordsPlacementResponse, saved: true }));

    rendered = renderForm(
      <QuizGeneratorForm
        {...defaultProps}
        fixedQuizType="words_placement"
        hideQuizTypeSelector
      />,
    );

    await waitFor(() => {
      expect(getCountInput().value).toBe("6");
    });

    const generateButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Generate Quiz",
    );
    expect(generateButton).toBeTruthy();

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("A number of measures were taken");
      expect(document.body.textContent).toContain("문제를 해결하기 위해 여러 조치가 취해졌다.");
    });

    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      "/api/admin/words-placement/generate",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      course: "TOEIC",
      level: null,
      day: 1,
    });

    const addButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Add",
    );
    expect(addButton).toBeTruthy();

    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe(
      "/api/admin/words-placement/generate",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toMatchObject({
      course: "TOEIC",
      level: null,
      day: 1,
      save: true,
    });
  });

  it("supports KANJI for Japanese Words Placement generation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ max_days: 2, max_count: 2 }),
    );
    fetchMock.mockResolvedValueOnce(Response.json({ max_days: 2, max_count: 2 }));
    fetchMock.mockResolvedValueOnce(Response.json({ max_days: 2, max_count: 2 }));
    fetchMock.mockResolvedValueOnce(Response.json({ max_days: 2, max_count: 2 }));
    fetchMock.mockResolvedValueOnce(
      Response.json({
        gameType: "words_placement",
        courseId: "KANJI",
        dayId: "Day1",
        version: 1,
        items: [],
        skipped: [],
      }),
    );

    rendered = renderForm(
      <QuizGeneratorForm
        {...defaultProps}
        fixedQuizType="words_placement"
        hideQuizTypeSelector
      />,
    );

    await waitFor(() => {
      expect(getCountInput().value).toBe("2");
    });

    await selectMuiOption("English", "Japanese");
    await waitFor(() => {
      expect(document.body.textContent).toContain("JLPT");
    });
    await selectMuiOption("JLPT", "KANJI");

    const generateButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Generate Quiz",
    );
    expect(generateButton).toBeTruthy();

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            String(url) === "/api/admin/words-placement/generate" &&
            JSON.parse(String(init?.body)).course === "KANJI",
        ),
      ).toBe(true);
    });
  });

  it("can hide the quiz type selector and force matching generation", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ max_days: 20, max_count: 4 }),
    ).mockResolvedValueOnce(
      Response.json({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 1,
        items: [],
        choices: [],
        answer_key: [],
      }),
    );

    rendered = renderForm(
      <QuizGeneratorForm
        {...defaultProps}
        fixedQuizType="matching"
        hideQuizTypeSelector
      />,
    );

    await waitFor(() => {
      expect(getCountInput().value).toBe("4");
      expect(document.body.textContent).not.toContain("Quiz Type");
      expect(document.body.textContent).not.toContain("Fill in the Blank");
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
    const body = JSON.parse(String(generateRequest?.body)) as {
      quiz_type?: string;
    };
    expect(body.quiz_type).toBe("matching");
  });

  it("renders Korean and English meanings for matching items and choices and saves without meaning_language", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ max_days: 20, max_count: 2 }),
    ).mockResolvedValueOnce(
      Response.json({
        quiz_type: "matching",
        language: "japanese",
        course: "JLPT",
        level: "N3",
        day: 1,
        items: [
          {
            id: "item-1",
            word: "食べる",
            meaningKorean: "먹다",
            meaningEnglish: "to eat",
          },
          {
            id: "item-2",
            word: "見る",
            meaningKorean: "보다",
            meaningEnglish: "to see",
          },
        ],
        choices: [
          {
            id: "choice-1",
            word: "食べる",
            meaningKorean: "먹다",
            meaningEnglish: "to eat",
          },
          {
            id: "choice-2",
            word: "見る",
            meaningKorean: "보다",
            meaningEnglish: "to see",
          },
        ],
        answer_key: [
          { item_id: "item-1", choice_id: "choice-1" },
          { item_id: "item-2", choice_id: "choice-2" },
        ],
      }),
    ).mockResolvedValueOnce(Response.json({ id: "data" }));

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(getCountInput().value).toBe("2");
    });

    const generateButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Generate Quiz",
    );
    expect(generateButton).toBeTruthy();

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("食べる");
      expect(document.body.textContent).toContain("見る");
      expect(document.body.textContent).toContain("Korean:먹다");
      expect(document.body.textContent).toContain("English:to eat");
      expect(document.body.textContent).toContain("Korean:보다");
      expect(document.body.textContent).toContain("English:to see");
    });

    const addButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Add",
    );
    expect(addButton).toBeTruthy();

    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    const saveRequest = fetchMock.mock.calls[2]?.[1];
    const saveBody = JSON.parse(String(saveRequest?.body)) as {
      save_target?: string;
      meaning_language?: string;
      quiz_data?: {
        items?: Array<{
          word?: string;
          text?: unknown;
          meaningEnglish?: string;
          meaningKorean?: string;
        }>;
        choices?: Array<{
          word?: string;
          text?: unknown;
          meaningEnglish?: string;
          meaningKorean?: string;
        }>;
      };
    };
    expect(saveBody.save_target).toBe("quiz");
    expect("meaning_language" in saveBody).toBe(false);
    expect(saveBody.quiz_data?.items).toMatchObject([
      {
        word: "食べる",
        meaningEnglish: "to eat",
        meaningKorean: "먹다",
      },
      {
        word: "見る",
        meaningEnglish: "to see",
        meaningKorean: "보다",
      },
    ]);
    expect(saveBody.quiz_data?.choices).toMatchObject([
      {
        word: "食べる",
        meaningEnglish: "to eat",
        meaningKorean: "먹다",
      },
      {
        word: "見る",
        meaningEnglish: "to see",
        meaningKorean: "보다",
      },
    ]);
    expect(saveBody.quiz_data?.items?.some((item) => "text" in item)).toBe(false);
    expect(saveBody.quiz_data?.choices?.some((choice) => "text" in choice)).toBe(false);
  });

  it("sends pop quiz save target when configured", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ max_days: 20, max_count: 1 }),
    ).mockResolvedValueOnce(
      Response.json({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 1,
        items: [{ id: "q1", word: "make a decision", meaning: "decide" }],
        choices: [{ id: "c1", word: "decide", meaning: "decide" }],
        answer_key: [{ item_id: "q1", choice_id: "c1" }],
      }),
    ).mockResolvedValueOnce(Response.json({ id: "data" }));

    rendered = renderForm(
      <QuizGeneratorForm
        {...defaultProps}
        fixedQuizType="matching"
        hideQuizTypeSelector
        saveTarget="pop_quiz"
      />,
    );

    await waitFor(() => {
      expect(getCountInput().value).toBe("1");
    });

    const generateButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Generate Quiz",
    );
    expect(generateButton).toBeTruthy();

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("make a decision");
    });

    const addButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Add",
    );
    expect(addButton).toBeTruthy();

    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    const saveRequest = fetchMock.mock.calls[2]?.[1];
    const saveBody = JSON.parse(String(saveRequest?.body)) as {
      save_target?: string;
      quiz_type?: string;
    };
    expect(saveBody.save_target).toBe("pop_quiz");
    expect(saveBody.quiz_type).toBe("matching");
  });

  it("shows server save error messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      Response.json({ max_days: 20, max_count: 1 }),
    ).mockResolvedValueOnce(
      Response.json({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: 1,
        items: [{ id: "q1", word: "make a decision", meaning: "decide" }],
        choices: [{ id: "c1", word: "decide", meaning: "decide" }],
        answer_key: [{ item_id: "q1", choice_id: "c1" }],
      }),
    ).mockResolvedValueOnce(
      Response.json(
        {
          error: "POP_QUIZ_STORAGE_PATH_NOT_CONFIGURED",
          message: "Pop quiz storage path is not configured.",
        },
        { status: 400 },
      ),
    );

    rendered = renderForm(
      <QuizGeneratorForm
        {...defaultProps}
        fixedQuizType="matching"
        hideQuizTypeSelector
        saveTarget="pop_quiz"
      />,
    );

    await waitFor(() => {
      expect(getCountInput().value).toBe("1");
    });

    const generateButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Generate Quiz",
    );
    expect(generateButton).toBeTruthy();

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("make a decision");
    });

    const addButton = Array.from(document.querySelectorAll("button")).find(
      (node) => node.textContent === "Add",
    );
    expect(addButton).toBeTruthy();

    await act(async () => {
      addButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        "Pop quiz storage path is not configured.",
      );
    });
  });

  it("auto-generates three seconds after day changes without clearing the current preview", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).startsWith("/api/text/quiz-generate/count")) {
        return Response.json({ max_days: 20, max_count: 1 });
      }

      const body = JSON.parse(String(init?.body)) as { day?: number };
      return Response.json({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: body.day,
        items: [{ id: `item-${body.day}`, word: `day-${body.day}`, meaning: "meaning" }],
        choices: [{ id: `choice-${body.day}`, word: `choice-${body.day}`, meaning: "meaning" }],
        answer_key: [{ item_id: `item-${body.day}`, choice_id: `choice-${body.day}` }],
      });
    });

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(getCountInput().value).toBe("1");
    });

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((node) => node.textContent === "Generate Quiz")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("day-1");
    });

    vi.useFakeTimers();
    await setInputValue(getDayInput(), "2");
    await act(async () => {
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("day-1");
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/text/quiz-generate")).toHaveLength(1);

    await act(async () => {
      vi.advanceTimersByTime(2999);
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("day-1");
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/text/quiz-generate")).toHaveLength(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("day-2");
    });
  });

  it("does not clear or regenerate when day changes back to the already generated day before debounce fires", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if (String(url).startsWith("/api/text/quiz-generate/count")) {
        return Response.json({ max_days: 20, max_count: 1 });
      }

      const body = JSON.parse(String(init?.body)) as { day?: number };
      return Response.json({
        quiz_type: "matching",
        language: "english",
        course: "TOEIC",
        level: null,
        day: body.day,
        items: [{ id: `item-${body.day}`, word: `day-${body.day}`, meaning: "meaning" }],
        choices: [{ id: `choice-${body.day}`, word: `choice-${body.day}`, meaning: "meaning" }],
        answer_key: [{ item_id: `item-${body.day}`, choice_id: `choice-${body.day}` }],
      });
    });

    rendered = renderForm(<QuizGeneratorForm {...defaultProps} />);

    await waitFor(() => {
      expect(getCountInput().value).toBe("1");
    });

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((node) => node.textContent === "Generate Quiz")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain("day-1");
    });

    vi.useFakeTimers();
    await setInputValue(getDayInput(), "2");
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(1000);
    });
    await setInputValue(getDayInput(), "1");
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(3000);
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain("day-1");
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/text/quiz-generate")).toHaveLength(1);
  });
});
