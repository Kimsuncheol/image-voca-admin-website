// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VocabExtractForm from "./VocabExtractForm";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const defaultProps = {
  submitLabel: "Extract Vocabulary",
  loadingLabel: "Extracting...",
  resetLabel: "Reset",
  exampleLabel: "Examples",
  exampleHelpText: "One example sentence per line.",
  exampleInvalidMsg: "Only Japanese text is allowed.",
  meaningLanguageLabel: "Meanings",
  meaningKoreanChipLabel: "Korean",
  meaningEnglishChipLabel: "English",
  meaningKoreanLabel: "Korean Meanings",
  meaningKoreanHelpText: "One Korean meaning per line.",
  meaningEnglishInputLabel: "English Meanings",
  meaningEnglishInputHelpText: "One English meaning per line.",
  meaningKoreanInvalidMsg: "English and Japanese characters are not allowed.",
  meaningEnglishInvalidMsg: "Korean and Japanese characters are not allowed.",
  inputRequiredMsg: "Enter at least one pair.",
  lineMismatchMsg: "Both fields must have the same number of lines.",
  tooManyPairsMsg: "Maximum 20 pairs allowed.",
  networkErrorMsg: "Network error. Please try again.",
  standbyTitle: "Ready",
  standbyDescription: "Enter examples and meanings.",
  resultTitle: "Extracted Vocabulary",
  wordLabel: "Word",
  meaningEnglishLabel: "Meaning (EN)",
  meaningKoreanResultLabel: "Meaning (KO)",
  pronunciationLabel: "Pronunciation",
  exampleResultLabel: "Example",
  translationEnglishLabel: "Translation (EN)",
  translationKoreanLabel: "Translation (KO)",
  exampleHiraganaLabel: "Example (Hiragana)",
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

function getTextareas() {
  return Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea")).filter(
    (node) => node.getAttribute("aria-hidden") !== "true",
  );
}

function getButton(label: string) {
  const button = Array.from(document.querySelectorAll("button")).find(
    (node) => node.textContent === label,
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

function getRadio(label: string) {
  const radio = Array.from(document.querySelectorAll('[role="radio"]')).find(
    (node) => node.textContent === label,
  );
  expect(radio).toBeTruthy();
  return radio as HTMLElement;
}

function hasStandaloneVisibleText(text: string) {
  return Array.from(document.querySelectorAll("p, span, div")).some(
    (node) => node.textContent === text,
  );
}

async function changeTextarea(textarea: HTMLTextAreaElement, value: string) {
  await act(async () => {
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    valueSetter?.call(textarea, value);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function click(node: HTMLElement) {
  await act(async () => {
    node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("VocabExtractForm", () => {
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

  it("renders Korean as the default meaning language", () => {
    rendered = renderForm(<VocabExtractForm {...defaultProps} />);

    expect(getRadio("Korean").getAttribute("aria-checked")).toBe("true");
    expect(getRadio("English").getAttribute("aria-checked")).toBe("false");
    expect(document.body.textContent).toContain("Korean Meanings");
    expect(document.body.textContent).not.toContain("English Meanings");
    expect(hasStandaloneVisibleText("Meanings")).toBe(false);
    expect(getTextareas()).toHaveLength(2);
  });

  it("switches the visible meaning field to English", async () => {
    rendered = renderForm(<VocabExtractForm {...defaultProps} />);

    await click(getRadio("English"));

    expect(getRadio("Korean").getAttribute("aria-checked")).toBe("false");
    expect(getRadio("English").getAttribute("aria-checked")).toBe("true");
    expect(document.body.textContent).not.toContain("Korean Meanings");
    expect(document.body.textContent).toContain("English Meanings");
    expect(getTextareas()).toHaveLength(2);
  });

  it("filters Latin and Korean text from examples while preserving Japanese sentences", async () => {
    rendered = renderForm(<VocabExtractForm {...defaultProps} />);
    const [examples] = getTextareas();

    await changeTextarea(examples, "今日は2026年です。ABC 한글\nカタカナ！１２３");

    expect(examples.value).toBe("今日は2026年です。 \nカタカナ！１２３");
    expect(document.body.textContent).toContain("Only Japanese text is allowed.");
  });

  it("submits Korean meanings and null English meanings by default", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ results: [] }),
    );
    rendered = renderForm(<VocabExtractForm {...defaultProps} />);
    const [examples, meanings] = getTextareas();

    await changeTextarea(examples, "食べ物です");
    await changeTextarea(meanings, "음식");
    await click(getButton("Extract Vocabulary"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      pairs: [
        {
          example: "食べ物です",
          meaning_korean: "음식",
          meaning_english: null,
        },
      ],
    });
  });

  it("submits English meanings and null Korean meanings when English is selected", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ results: [] }),
    );
    rendered = renderForm(<VocabExtractForm {...defaultProps} />);

    await click(getRadio("English"));
    const [examples, meanings] = getTextareas();
    await changeTextarea(examples, "食べ物です");
    await changeTextarea(meanings, "food");
    await click(getButton("Extract Vocabulary"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(init?.body))).toEqual({
      pairs: [
        {
          example: "食べ物です",
          meaning_korean: null,
          meaning_english: "food",
        },
      ],
    });
  });

  it("validates line counts against only the selected meaning language", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ results: [] }),
    );
    rendered = renderForm(<VocabExtractForm {...defaultProps} />);
    const [examples, meanings] = getTextareas();

    await changeTextarea(examples, "一つ目\n二つ目");
    await changeTextarea(meanings, "하나");
    await click(getButton("Extract Vocabulary"));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain("Both fields must have the same number of lines.");
  });
});
