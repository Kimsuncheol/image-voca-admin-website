// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VocabularyLookup from "./VocabularyLookup";

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

describe("VocabularyLookup", () => {
  let rendered: ReturnType<typeof renderLookup> | null = null;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
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
});
