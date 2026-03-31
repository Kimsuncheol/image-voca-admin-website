// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VocabularyLookup from "./VocabularyLookup";

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
    <VocabularyLookup
      apiPath="/api/text/vocabulary"
      submitLabel="Lookup"
      loadingLabel="Loading"
      resetLabel="Reset"
      inputLabel="Input"
      inputRequiredMsg="Input is required"
      networkErrorMsg="Network error"
      emptyStateLabel="No vocabulary entry found."
      resultTitle="Vocabulary Result"
      wordLabel="Word"
      readingLabel="Reading"
      romanizedLabel="Romanized"
      meaningsLabel="Meanings"
      partOfSpeechLabel="Part of Speech"
      commonLabel="Common"
      uncommonLabel="Uncommon"
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

async function clickCopyControl(sectionId: string) {
  const button = document.querySelector(
    `[data-testid="vocabulary-copy-${sectionId}"]`,
  );

  expect(button).not.toBeNull();
  expect(button?.getAttribute("aria-label")).toBe("Copy");

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function hoverSection(sectionId: string) {
  const section = document.querySelector(
    `[data-testid="vocabulary-section-${sectionId}"]`,
  );

  expect(section).not.toBeNull();

  act(() => {
    section?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
}

function leaveSection(sectionId: string) {
  const section = document.querySelector(
    `[data-testid="vocabulary-section-${sectionId}"]`,
  );

  expect(section).not.toBeNull();

  act(() => {
    section?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
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

function leaveMeaningRow(index: number) {
  const row = getMeaningRow(index);

  act(() => {
    row.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
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

function getPartOfSpeechItems() {
  return Array.from(
    document.querySelectorAll('[data-testid^="vocabulary-part-of-speech-"]'),
  ) as HTMLElement[];
}

describe("VocabularyLookup", () => {
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

  it("renders a structured vocabulary result when the entry is found", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "猫",
        entry: {
          word: "猫",
          reading: "ねこ",
          romanized: "neko",
          meanings: ["cat"],
          part_of_speech: ["noun"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫");
    });

    await clickButton("Lookup");

    expect(fetchMock).toHaveBeenCalledWith("/api/text/vocabulary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "猫" }),
    });
    expect(document.body.textContent).toContain("Vocabulary Result");
    expect(document.body.textContent).toContain("猫");
    expect(document.body.textContent).toContain("ねこ");
    expect(document.body.textContent).toContain("neko");
    expect(document.body.textContent).toContain("cat");
    expect(document.body.textContent).toContain("noun");
    expect(document.body.textContent).toContain("Common");
    expect(document.querySelector('[data-testid^="vocabulary-copy-"]')).toBeNull();
  });

  it("does not render field filter chips in single lookup", () => {
    rendered = renderLookup(createLookup());

    expect(document.querySelector('[data-testid="vocabulary-filters"]')).toBeNull();
  });

  it("renders an empty state when the entry is null", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "zzzz-not-a-word",
        entry: null,
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "zzzz-not-a-word");
    });

    await clickButton("Lookup");

    expect(document.body.textContent).toContain("No vocabulary entry found.");
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

    await clickButton("Lookup");

    expect(document.body.textContent).toContain("Network error");
  });

  it("clears input and result state on reset", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "猫",
        entry: {
          word: "猫",
          reading: "ねこ",
          romanized: "neko",
          meanings: ["cat"],
          part_of_speech: ["noun"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫");
    });

    await clickButton("Lookup");
    expect(document.body.textContent).toContain("Vocabulary Result");

    await clickButton("Reset");

    expect(textarea.value).toBe("");
    expect(document.body.textContent).not.toContain("Vocabulary Result");
  });

  it("mounts the hovered section copy button and unmounts it on leave", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "猫",
        entry: {
          word: "猫",
          reading: "ねこ",
          romanized: "neko",
          meanings: ["cat"],
          part_of_speech: ["noun"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫");
    });

    await clickButton("Lookup");

    expect(document.querySelector('[data-testid="vocabulary-copy-word"]')).toBeNull();

    hoverSection("word");
    expect(document.querySelector('[data-testid="vocabulary-copy-word"]')).not.toBeNull();
    expect(
      document.querySelector('[data-testid="vocabulary-copy-word"]')?.getAttribute("aria-label"),
    ).toBe("Copy");
    expect(document.querySelector('[data-testid="vocabulary-copy-reading"]')).toBeNull();

    leaveSection("word");
    expect(document.querySelector('[data-testid="vocabulary-copy-word"]')).toBeNull();
  });

  it("copies scalar field content for a hovered section", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "猫",
        entry: {
          word: "猫",
          reading: "ねこ",
          romanized: "neko",
          meanings: ["cat"],
          part_of_speech: ["noun"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫");
    });

    await clickButton("Lookup");

    hoverSection("word");
    await clickCopyControl("word");

    expect(writeTextMock).toHaveBeenCalledWith("猫");
    expect(document.body.textContent).toContain("Copied!");
  });

  it("does not render a per-meaning copy button by default", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "上げる",
        entry: {
          word: "上げる",
          reading: "あげる",
          romanized: "ageru",
          meanings: ["to raise", "to wake"],
          part_of_speech: ["verb"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "上げる");
    });

    await clickButton("Lookup");

    expect(document.querySelector('[data-testid="vocabulary-meaning-copy-0"]')).toBeNull();
    expect(document.querySelector('[data-testid="vocabulary-meaning-copy-1"]')).toBeNull();
  });

  it("mounts and unmounts a per-meaning copy button on row hover", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "上げる",
        entry: {
          word: "上げる",
          reading: "あげる",
          romanized: "ageru",
          meanings: ["to raise", "to wake"],
          part_of_speech: ["verb"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "上げる");
    });

    await clickButton("Lookup");

    hoverMeaningRow(0);
    expect(document.querySelector('[data-testid="vocabulary-meaning-copy-0"]')).not.toBeNull();

    leaveMeaningRow(0);
    expect(document.querySelector('[data-testid="vocabulary-meaning-copy-0"]')).toBeNull();
  });

  it("copies only that meaning when the per-meaning copy button is clicked", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "上げる",
        entry: {
          word: "上げる",
          reading: "あげる",
          romanized: "ageru",
          meanings: ["to raise", "to wake"],
          part_of_speech: ["verb"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "上げる");
    });

    await clickButton("Lookup");
    hoverMeaningRow(1);
    await clickMeaningCopyControl(1);

    expect(writeTextMock).toHaveBeenCalledWith("to wake");
  });


  it("copies serialized list content for meanings and part of speech", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "猫",
        entry: {
          word: "猫",
          reading: "ねこ",
          romanized: "neko",
          meanings: ["cat", "feline"],
          part_of_speech: ["noun", "animal"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "猫");
    });

    await clickButton("Lookup");

    const partOfSpeechItems = getPartOfSpeechItems();
    expect(partOfSpeechItems).toHaveLength(2);
    expect(partOfSpeechItems[0]?.textContent).toContain("noun");
    expect(partOfSpeechItems[1]?.textContent).toContain("animal");

    hoverSection("meanings");
    await clickCopyControl("meanings");
    expect(writeTextMock).toHaveBeenLastCalledWith("cat\nfeline");

    leaveSection("meanings");
    hoverSection("part-of-speech");
    await clickCopyControl("part-of-speech");
    expect(writeTextMock).toHaveBeenLastCalledWith("noun, animal");
  });

  it("copies only the clicked meaning row", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "上げる",
        entry: {
          word: "上げる",
          reading: "あげる",
          romanized: "ageru",
          meanings: ["to raise", "to pick up"],
          part_of_speech: ["verb"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "上げる");
    });

    await clickButton("Lookup");

    const meaningRow = getMeaningRow(0);

    await act(async () => {
      meaningRow.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(writeTextMock).toHaveBeenCalledWith("to raise");
  });

  it("keeps the meanings section copy control for copying the full list", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "上げる",
        entry: {
          word: "上げる",
          reading: "あげる",
          romanized: "ageru",
          meanings: ["to raise", "to set up", "to wake"],
          part_of_speech: ["verb"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "上げる");
    });

    await clickButton("Lookup");

    hoverSection("meanings");
    await clickCopyControl("meanings");

    expect(writeTextMock).toHaveBeenCalledWith("to raise\nto set up\nto wake");
  });

  it("renders meanings as separate interactive rows", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "上げる",
        entry: {
          word: "上げる",
          reading: "あげる",
          romanized: "ageru",
          meanings: ["to raise", "to raise up", "to wake"],
          part_of_speech: ["verb"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "上げる");
    });

    await clickButton("Lookup");

    const rows = document.querySelectorAll('[data-testid^="vocabulary-meaning-"]');
    expect(rows).toHaveLength(3);
    expect(getMeaningRow(0).textContent).toContain("to raise");
    expect(getMeaningRow(1).textContent).toContain("to raise up");
    expect(getMeaningRow(2).textContent).toContain("to wake");
  });

  it("copies a meaning on keyboard activation", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "上げる",
        entry: {
          word: "上げる",
          reading: "あげる",
          romanized: "ageru",
          meanings: ["to raise", "to wake"],
          part_of_speech: ["verb"],
          is_common: true,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "上げる");
    });

    await clickButton("Lookup");

    const meaningRow = getMeaningRow(1);

    await act(async () => {
      meaningRow.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    });

    expect(writeTextMock).toHaveBeenCalledWith("to wake");
  });

  it("does not render hidden nullable sections or their copy buttons", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        original_text: "test",
        entry: {
          word: null,
          reading: null,
          romanized: null,
          meanings: ["meaning"],
          part_of_speech: ["noun"],
          is_common: false,
        },
      }),
    });

    rendered = renderLookup(createLookup());
    const textarea = getTextarea();

    act(() => {
      setTextareaValue(textarea, "test");
    });

    await clickButton("Lookup");

    expect(document.querySelector('[data-testid="vocabulary-section-word"]')).toBeNull();
    expect(document.querySelector('[data-testid="vocabulary-section-reading"]')).toBeNull();
    expect(document.querySelector('[data-testid="vocabulary-section-romanized"]')).toBeNull();
    expect(document.querySelector('[data-testid="vocabulary-copy-word"]')).toBeNull();
  });
});
