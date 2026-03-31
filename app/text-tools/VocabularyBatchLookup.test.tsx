// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VocabularyBatchLookup from "./VocabularyBatchLookup";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      if (key === "promotionCodes.copyCode") return "Copy";
      if (key === "common.copied") return "Copied!";
      if (key === "common.copyFailed") return "Copy failed";
      return typeof fallback === "string" ? fallback : key;
    },
  }),
}));

function renderLookup(element: ReactElement) {
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

function createLookup() {
  return (
    <VocabularyBatchLookup
      apiPath="/api/text/vocabulary/batch"
      submitLabel="Lookup Multiple Vocabulary Items"
      loadingLabel="Loading"
      resetLabel="Reset"
      inputLabel="Vocabulary Items"
      inputHelpText="Enter one word per line. Blank lines will be ignored."
      inputRequiredMsg="Enter at least one word to look up."
      networkErrorMsg="Network error"
      resultTitle="Vocabulary Result"
      wordLabel="Word"
      readingLabel="Reading"
      romanizedLabel="Romanized"
      meaningsLabel="Meanings"
      partOfSpeechLabel="Part of Speech"
      commonLabel="Common"
      uncommonLabel="Uncommon"
      originalTextLabel="Original Text"
      notFoundTitle="No vocabulary entry found."
      invalidInputTitle="This input is not valid for batch lookup."
      errorTitle="Lookup failed"
      unknownErrorMsg="An unexpected error occurred while looking up this item."
      standbyTitle="Standby Title"
      standbyDescription="Standby Description"
    />
  );
}

function getTextarea() {
  const textarea = Array.from(document.querySelectorAll("textarea")).find(
    (node) => node.getAttribute("aria-hidden") !== "true",
  );

  expect(textarea).not.toBeUndefined();
  return textarea as HTMLTextAreaElement;
}

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    "value",
  )?.set;

  expect(setter).toBeTypeOf("function");

  setter?.call(textarea, value);
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

async function clickButton(label: string) {
  const button = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(label),
  );

  expect(button).not.toBeUndefined();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function hoverBatchCell(cellId: string) {
  const cell = document.querySelector(
    `[data-testid="vocabulary-batch-cell-${cellId}"]`,
  );

  expect(cell).not.toBeNull();

  act(() => {
    cell?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
}

async function clickBatchCopyControl(cellId: string) {
  const button = document.querySelector(
    `[data-testid="vocabulary-batch-copy-${cellId}"]`,
  );

  expect(button).not.toBeNull();
  expect(button?.getAttribute("aria-label")).toBe("Copy");

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function hoverMeaningRow(rowIndex: number, meaningIndex: number) {
  const row = document.querySelector(
    `[data-testid="vocabulary-meaning-${rowIndex}-${meaningIndex}"]`,
  );

  expect(row).not.toBeNull();

  act(() => {
    row?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
}

async function clickMeaningCopyControl(rowIndex: number, meaningIndex: number) {
  const button = document.querySelector(
    `[data-testid="vocabulary-meaning-copy-${rowIndex}-${meaningIndex}"]`,
  );

  expect(button).not.toBeNull();
  expect(button?.getAttribute("aria-label")).toBe("Copy");

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("VocabularyBatchLookup", () => {
  let rendered: ReturnType<typeof renderLookup> | null = null;
  let fetchMock: ReturnType<typeof vi.fn>;
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis.navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: writeTextMock,
      },
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("splits multiline input and skips blank lines before submitting", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["猫", "今日"],
        results: [],
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫\n\n  今日  \n");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(fetchMock).toHaveBeenCalledWith("/api/text/vocabulary/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texts: ["猫", "今日"] }),
    });
  });

  it("does not render layout chips or batch field filters", () => {
    rendered = renderLookup(createLookup());

    expect(document.querySelector('[data-testid="vocabulary-layout-options"]')).toBeNull();
    expect(document.querySelector('[data-testid="vocabulary-filters"]')).toBeNull();
  });

  it("renders successful results in one shared table card with the requested visible header", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["猫", "今日"],
        results: [
          {
            original_text: "猫",
            status: "ok",
            entry: {
              word: "猫",
              reading: "ねこ",
              romanized: "neko",
              meanings: ["cat result"],
              part_of_speech: ["noun"],
              is_common: true,
            },
            error: null,
          },
          {
            original_text: "今日",
            status: "ok",
            entry: {
              word: "今日",
              reading: "きょう",
              romanized: "kyou",
              meanings: ["today result"],
              part_of_speech: ["adverb"],
              is_common: true,
            },
            error: null,
          },
        ],
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫\n今日");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(document.body.textContent).toContain("Vocabulary Result");
    expect(document.body.textContent).toContain("word");
    expect(document.body.textContent).toContain("reading");
    expect(document.body.textContent).toContain("romanized");
    expect(document.body.textContent).toContain("meanings");
    expect(document.body.textContent).not.toContain("part of speech");
    expect(document.querySelectorAll("thead tr")).toHaveLength(1);
    expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(document.body.textContent).toContain("cat result");
    expect(document.body.textContent).toContain("today result");
  });

  it("shows original input context outside the table when input differs from the returned word", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["存在しない単語"],
        results: [
          {
            original_text: "存在しない単語",
            status: "ok",
            entry: {
              word: "存在",
              reading: "そんざい",
              romanized: "sonzai",
              meanings: ["existence"],
              part_of_speech: ["noun"],
              is_common: true,
            },
            error: null,
          },
        ],
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "存在しない単語");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(document.body.textContent).toContain(
      "Original Text: 存在しない単語 -> 存在",
    );
  });

  it("shows the remaining visible table columns in batch table layout", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["上げる", "今日"],
        results: [
          {
            original_text: "上げる",
            status: "ok",
            entry: {
              word: "上げる",
              reading: "あげる",
              romanized: "ageru",
              meanings: ["to raise", "to wake"],
              part_of_speech: ["verb", "transitive"],
              is_common: true,
            },
            error: null,
          },
          {
            original_text: "今日",
            status: "ok",
            entry: {
              word: "今日",
              reading: "きょう",
              romanized: "kyou",
              meanings: ["today"],
              part_of_speech: ["adverb"],
              is_common: true,
            },
            error: null,
          },
        ],
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "上げる\n今日");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(document.body.textContent).toContain("word");
    expect(document.body.textContent).toContain("reading");
    expect(document.body.textContent).toContain("romanized");
    expect(document.body.textContent).toContain("meanings");
    expect(document.body.textContent).not.toContain("part of speech");
    expect(document.body.textContent).toContain("上げる");
    expect(document.body.textContent).toContain("あげる");
    expect(document.body.textContent).toContain("ageru");
    expect(document.body.textContent).toContain("to raise");
    expect(document.body.textContent).toContain("to wake");
    expect(document.body.textContent).toContain("今日");
    expect(document.body.textContent).toContain("きょう");
    expect(document.body.textContent).toContain("kyou");
    expect(document.body.textContent).toContain("today");
    expect(document.body.textContent).toContain("Common");
  });

  it("preserves visible-cell and meaning copy behavior in the table", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["上げる"],
        results: [
          {
            original_text: "上げる",
            status: "ok",
            entry: {
              word: "上げる",
              reading: "あげる",
              romanized: "ageru",
              meanings: ["to raise", "to wake"],
              part_of_speech: ["verb"],
              is_common: true,
            },
            error: null,
          },
        ],
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "上げる");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    hoverBatchCell("word-0");
    await clickBatchCopyControl("word-0");
    expect(writeTextMock).toHaveBeenCalledWith("上げる");

    hoverBatchCell("meanings-0");
    await clickBatchCopyControl("meanings-0");
    expect(writeTextMock).toHaveBeenLastCalledWith("to raise\nto wake");

    hoverMeaningRow(0, 0);
    expect(document.querySelector('[data-testid="vocabulary-meaning-copy-0-0"]')).not.toBeNull();
    await clickMeaningCopyControl(0, 0);
    expect(writeTextMock).toHaveBeenLastCalledWith("to raise");
  });

  it("renders non-success items as separate compact cards below the table", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["猫", "cat", "不存在"],
        results: [
          {
            original_text: "猫",
            status: "ok",
            entry: {
              word: "猫",
              reading: "ねこ",
              romanized: "neko",
              meanings: ["cat"],
              part_of_speech: ["noun"],
              is_common: true,
            },
            error: null,
          },
          {
            original_text: "cat",
            status: "invalid_input",
            entry: null,
            error: null,
          },
          {
            original_text: "不存在",
            status: "ok",
            entry: null,
            error: null,
          },
        ],
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫\ncat\n不存在");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(document.body.textContent).toContain(
      "This input is not valid for batch lookup.",
    );
    expect(document.body.textContent).toContain("No vocabulary entry found.");
  });

  it("keeps non-success cards below the success table", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["猫", "cat"],
        results: [
          {
            original_text: "猫",
            status: "ok",
            entry: {
              word: "猫",
              reading: "ねこ",
              romanized: "neko",
              meanings: ["cat"],
              part_of_speech: ["noun"],
              is_common: true,
            },
            error: null,
          },
          {
            original_text: "cat",
            status: "invalid_input",
            entry: null,
            error: null,
          },
        ],
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫\ncat");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(document.body.textContent).toContain("cat");
    expect(document.body.textContent).toContain(
      "This input is not valid for batch lookup.",
    );
  });

  it("clears results on reset", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["猫"],
        results: [
          {
            original_text: "猫",
            status: "ok",
            entry: {
              word: "猫",
              reading: "ねこ",
              romanized: "neko",
              meanings: ["cat"],
              part_of_speech: ["noun"],
              is_common: true,
            },
            error: null,
          },
        ],
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    await clickButton("Reset");

    expect(textarea.value).toBe("");
    expect(document.body.textContent).not.toContain("Vocabulary Result");
  });

  it("shows the batch input validation message when only blank lines are submitted", async () => {
    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "\n   \n");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(
      "Enter at least one word to look up.",
    );
  });

  it("shows the existing network error on non-ok responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "boom" }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(document.body.textContent).toContain("Network error");
  });
});
