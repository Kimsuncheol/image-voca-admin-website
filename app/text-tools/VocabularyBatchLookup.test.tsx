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
      filterMeaningsLabel="Meanings"
      filterReadingLabel="Reading"
      filterRomanizedLabel="Romanized"
      filterPartOfSpeechLabel="Part of Speech"
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

function getMeaningRow(index: number) {
  const row = document.querySelector(
    `[data-testid="vocabulary-meaning-${index}"]`,
  );

  expect(row).not.toBeNull();
  return row as HTMLElement;
}

function hoverMeaningRow(index: number) {
  const row = getMeaningRow(index);

  act(() => {
    row.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
}

async function clickMeaningCopyControl(index: number) {
  const button = document.querySelector(
    `[data-testid="vocabulary-meaning-copy-${index}"]`,
  );

  expect(button).not.toBeNull();
  expect(button?.getAttribute("aria-label")).toBe("Copy");

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function getFilterChip(section: string) {
  const chip = document.querySelector(
    `[data-testid="vocabulary-filter-${section}"]`,
  );

  expect(chip).not.toBeNull();
  return chip as HTMLElement;
}

function clickFilterChip(section: string) {
  const chip = getFilterChip(section);

  act(() => {
    chip.dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

  it("renders batch filter chips selected by default", () => {
    rendered = renderLookup(createLookup());

    expect(document.body.textContent).toContain("Meanings");
    expect(document.body.textContent).toContain("Reading");
    expect(document.body.textContent).toContain("Romanized");
    expect(document.body.textContent).toContain("Part of Speech");
    expect(getFilterChip("meanings").getAttribute("data-selected")).toBe("true");
    expect(getFilterChip("reading").getAttribute("data-selected")).toBe("true");
    expect(getFilterChip("romanized").getAttribute("data-selected")).toBe("true");
    expect(getFilterChip("partOfSpeech").getAttribute("data-selected")).toBe("true");
  });

  it("renders successful batch results in order", async () => {
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

    expect(document.body.textContent).toContain("cat result");
    expect(document.body.textContent).toContain("today result");
    expect(
      document.body.textContent?.indexOf("cat result"),
    ).toBeLessThan(document.body.textContent?.indexOf("today result") ?? 0);
    expect(document.body.textContent).toContain("ねこ");
    expect(document.body.textContent).toContain("neko");
    expect(document.body.textContent).toContain("noun");
  });

  it("hides reading across all successful batch cards when the reading chip is toggled off", async () => {
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
    clickFilterChip("reading");

    expect(document.querySelector('[data-testid="vocabulary-section-reading"]')).toBeNull();
    expect(document.body.textContent).not.toContain("ねこ");
    expect(document.body.textContent).not.toContain("きょう");
    expect(document.body.textContent).toContain("neko");
    expect(document.body.textContent).toContain("kyou");
    expect(document.body.textContent).toContain("猫");
    expect(document.body.textContent).toContain("今日");
    expect(document.body.textContent).toContain("Common");
  });

  it("hides romanized across all successful batch cards when the romanized chip is toggled off", async () => {
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
    clickFilterChip("romanized");

    expect(document.querySelector('[data-testid="vocabulary-section-romanized"]')).toBeNull();
    expect(document.body.textContent).not.toContain("neko");
    expect(document.body.textContent).not.toContain("kyou");
    expect(document.body.textContent).toContain("ねこ");
    expect(document.body.textContent).toContain("きょう");
    expect(document.body.textContent).toContain("Common");
  });

  it("hides part of speech across all successful batch cards when that chip is toggled off", async () => {
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
    clickFilterChip("partOfSpeech");

    expect(document.querySelector('[data-testid="vocabulary-section-part-of-speech"]')).toBeNull();
    expect(document.body.textContent).not.toContain("noun");
    expect(document.body.textContent).not.toContain("adverb");
    expect(document.body.textContent).toContain("ねこ");
    expect(document.body.textContent).toContain("neko");
    expect(document.body.textContent).toContain("cat result");
    expect(document.body.textContent).toContain("Common");
  });

  it("hides meanings across all successful batch cards when the meanings chip is toggled off", async () => {
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
              part_of_speech: ["verb"],
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
    clickFilterChip("meanings");

    expect(document.querySelector('[data-testid="vocabulary-section-meanings"]')).toBeNull();
    expect(document.querySelector('[data-testid^="vocabulary-meaning-"]')).toBeNull();
    expect(document.body.textContent).not.toContain("to raise");
    expect(document.body.textContent).not.toContain("to wake");
    expect(document.body.textContent).not.toContain("today");
    expect(document.body.textContent).toContain("あげる");
    expect(document.body.textContent).toContain("ageru");
    expect(document.body.textContent).toContain("verb");
    expect(document.body.textContent).toContain("Common");
  });

  it("mounts the per-meaning copy button in successful batch results and copies that meaning", async () => {
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

    expect(document.querySelector('[data-testid="vocabulary-meaning-copy-0"]')).toBeNull();

    hoverMeaningRow(0);
    expect(document.querySelector('[data-testid="vocabulary-meaning-copy-0"]')).not.toBeNull();

    await clickMeaningCopyControl(0);

    expect(writeTextMock).toHaveBeenCalledWith("to raise");
  });

  it("renders an inline not-found card when an item has no entry", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["不存在"],
        results: [
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
      setTextareaValue(textarea, "不存在");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(document.body.textContent).toContain("Original Text");
    expect(document.body.textContent).toContain("不存在");
    expect(document.body.textContent).toContain("No vocabulary entry found.");
  });

  it("does not affect non-success batch cards when filters are toggled", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["cat", "不存在"],
        results: [
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
      setTextareaValue(textarea, "cat\n不存在");
    });

    await clickButton("Lookup Multiple Vocabulary Items");
    clickFilterChip("reading");
    clickFilterChip("meanings");

    expect(document.body.textContent).toContain("cat");
    expect(document.body.textContent).toContain(
      "This input is not valid for batch lookup.",
    );
    expect(document.body.textContent).toContain("不存在");
    expect(document.body.textContent).toContain("No vocabulary entry found.");
  });

  it("renders an inline invalid-input card", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["cat"],
        results: [
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
      setTextareaValue(textarea, "cat");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(document.body.textContent).toContain("cat");
    expect(document.body.textContent).toContain(
      "This input is not valid for batch lookup.",
    );
  });

  it("renders returned per-item errors and falls back when the message is missing", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_texts: ["障害", "今日"],
        results: [
          {
            original_text: "障害",
            status: "error",
            entry: null,
            error: "backend failed",
          },
          {
            original_text: "今日",
            status: "unknown_status",
            entry: null,
            error: null,
          },
        ],
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "障害\n今日");
    });

    await clickButton("Lookup Multiple Vocabulary Items");

    expect(document.body.textContent).toContain("Lookup failed");
    expect(document.body.textContent).toContain("backend failed");
    expect(document.body.textContent).toContain(
      "An unexpected error occurred while looking up this item.",
    );
  });

  it("clears input and results on reset", async () => {
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
    expect(document.body.textContent).toContain("Vocabulary Result");

    clickFilterChip("reading");
    expect(getFilterChip("reading").getAttribute("data-selected")).toBe("false");

    await clickButton("Reset");

    expect(textarea.value).toBe("");
    expect(document.body.textContent).not.toContain("Vocabulary Result");
    expect(getFilterChip("reading").getAttribute("data-selected")).toBe("true");
    expect(getFilterChip("meanings").getAttribute("data-selected")).toBe("true");
    expect(getFilterChip("romanized").getAttribute("data-selected")).toBe("true");
    expect(getFilterChip("partOfSpeech").getAttribute("data-selected")).toBe("true");
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
