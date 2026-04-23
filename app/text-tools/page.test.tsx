// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TextToolsPage from "./page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "textTools.title": "Text Tools",
        "textTools.description": "Grouped text utility page",
        "textTools.loading": "Processing...",
        "textTools.resetAction": "Reset",
        "textTools.inputLabel": "Input Text",
        "textTools.outputLabel": "Output Text",
        "textTools.inputRequired": "Input text is required.",
        "textTools.inputOtherLanguageChars":
          "The text contains characters from other languages.",
        "textTools.networkError": "Network error",
        "textTools.tabVocabExtract": "Extract",
        "textTools.tabRemoveEqualSign": "Remove Equal Sign",
        "textTools.tabParentheses": "Parentheses",
        "textTools.tabRomanize": "Romanize",
        "textTools.tabFurigana": "Furigana",
        "textTools.tabVocabulary": "Vocabulary",
        "textTools.subtabGenerate": "Generate",
        "textTools.subtabRemove": "Remove",
        "textTools.subtabAdd": "Add",
        "textTools.subtabLeft": "Left",
        "textTools.subtabRight": "Right",
        "textTools.generateAction": "Generate Parentheses",
        "textTools.removeAction": "Remove Parentheses",
        "textTools.romanizeAction": "Romanize",
        "textTools.romanizeLanguageJapanese": "Japanese",
        "textTools.romanizeLanguageKorean": "Korean",
        "textTools.addFuriganaAction": "Add Furigana",
        "textTools.addFuriganaHiraganaOnlyOption": "Hiragana only",
        "textTools.removeFuriganaAction": "Remove Furigana",
        "textTools.removeFuriganaRemoveBracketsOption":
          "Remove brackets at the same time.",
        "textTools.vocabularyAction": "Lookup Vocabulary",
        "textTools.vocabularyBatchAction": "Lookup Multiple Vocabulary Items",
        "textTools.vocabularyBatchInputLabel": "Vocabulary Items",
        "textTools.vocabularyBatchInputHelpText":
          "Enter one word per line. Blank lines will be ignored.",
        "textTools.vocabularyBatchInputRequired":
          "Enter at least one word to look up.",
        "textTools.vocabularyBatchOriginalTextLabel": "Original Text",
        "textTools.vocabularyBatchNotFoundTitle": "No vocabulary entry found.",
        "textTools.vocabularyBatchInvalidInputTitle":
          "This input is not valid for batch lookup.",
        "textTools.vocabularyBatchErrorTitle": "Lookup failed",
        "textTools.vocabularyBatchUnknownError":
          "An unexpected error occurred while looking up this item.",
        "textTools.vocabularyEmptyState": "No vocabulary entry found.",
        "textTools.vocabularyResultTitle": "Vocabulary Result",
        "textTools.vocabularyWordLabel": "Word",
        "textTools.vocabularyReadingLabel": "Reading",
        "textTools.vocabularyRomanizedLabel": "Romanized",
        "textTools.vocabularyMeaningsLabel": "Meanings",
        "textTools.vocabularyPartOfSpeechLabel": "Part of Speech",
        "textTools.vocabularyFilterMeanings": "Meanings",
        "textTools.vocabularyFilterReading": "Reading",
        "textTools.vocabularyFilterRomanized": "Romanized",
        "textTools.vocabularyFilterPartOfSpeech": "Part of Speech",
        "textTools.vocabularyLayoutCard": "Card",
        "textTools.vocabularyLayoutTable": "Table",
        "textTools.vocabularyCommonLabel": "Common",
        "textTools.vocabularyUncommonLabel": "Uncommon",
        "textTools.vocabExtractAction": "Extract Vocabulary",
        "textTools.removeEqualSignAction": "Remove Equal Sign",
      };

      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useAdminGuard", () => ({
  useAdminGuard: () => ({
    user: { role: "admin" },
    authLoading: false,
  }),
}));

vi.mock("./ParenthesesForm", () => ({
  default: ({
    apiPath,
    submitLabel,
    checkboxOptions,
    extraPayload,
    validate,
  }: {
    apiPath: string;
    submitLabel: string;
    checkboxOptions?: Array<{ label: string }>;
    extraPayload?: Record<string, unknown>;
    validate?: (text: string) => string | null;
  }) => (
    <div
      data-testid="mock-form"
      data-extra-payload={JSON.stringify(extraPayload ?? {})}
      data-hangul-validation={validate?.("안녕하세요") ?? ""}
      data-latin-validation={validate?.("hello") ?? ""}
    >
      {`${submitLabel}:${apiPath}`}
      {checkboxOptions?.map((option) => <span key={option.label}>{option.label}</span>)}
    </div>
  ),
}));

vi.mock("./VocabExtractForm", () => ({
  default: ({ submitLabel }: { submitLabel: string }) => (
    <div data-testid="mock-vocab-extract-form">{submitLabel}</div>
  ),
}));

vi.mock("./VocabularyBatchLookup", () => ({
  default: ({ apiPath, submitLabel }: { apiPath: string; submitLabel: string }) => (
    <div data-testid="mock-vocabulary-batch-lookup">{`${submitLabel}:${apiPath}`}</div>
  ),
}));

function renderPage(element: ReactElement) {
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

function clickTab(label: string) {
  const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((node) =>
    node.textContent?.includes(label),
  );

  expect(tab).not.toBeUndefined();

  act(() => {
    tab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

function clickButton(label: string) {
  const candidates = Array.from(
    document.querySelectorAll(".MuiChip-root, button:not([role='tab'])"),
  );
  const button =
    candidates.find((node) => node.textContent === label) ??
    candidates.find((node) => node.textContent?.includes(label));

  expect(button).not.toBeUndefined();

  act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("TextToolsPage", () => {
  let rendered: ReturnType<typeof renderPage> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  it("renders grouped text tool tabs and defaults to vocabulary extraction", () => {
    rendered = renderPage(<TextToolsPage />);

    expect(document.body.textContent).toContain("Text Tools");
    expect(document.body.textContent).toContain("Extract");
    expect(document.body.textContent).toContain("Parentheses");
    expect(document.body.textContent).toContain("Romanize");
    expect(document.body.textContent).toContain("Furigana");
    expect(document.body.textContent).toContain("Vocabulary");
    expect(document.body.textContent).toContain("Extract Vocabulary");
    expect(document.body.textContent).not.toContain("Japanese");
    expect(document.body.textContent).not.toContain("Korean");
  });

  it("defaults romanize requests to Japanese and shows language chips only there", () => {
    rendered = renderPage(<TextToolsPage />);

    clickTab("Romanize");

    const form = document.querySelector('[data-testid="mock-form"]');
    expect(document.body.textContent).toContain("Japanese");
    expect(document.body.textContent).toContain("Korean");
    expect(document.body.textContent).toContain("Romanize:/api/text/romanize");
    expect(form?.getAttribute("data-extra-payload")).toBe(
      JSON.stringify({ language: "ja" }),
    );
    expect(form?.getAttribute("data-hangul-validation")).toBe(
      "The text contains characters from other languages.",
    );

    clickTab("Furigana");

    expect(document.body.textContent).not.toContain("Japanese");
    expect(document.body.textContent).not.toContain("Korean");
  });

  it("switches romanize requests to Korean and allows Hangul validation", () => {
    rendered = renderPage(<TextToolsPage />);

    clickTab("Romanize");
    clickButton("Korean");

    const form = document.querySelector('[data-testid="mock-form"]');
    expect(form?.getAttribute("data-extra-payload")).toBe(
      JSON.stringify({ language: "ko" }),
    );
    expect(form?.getAttribute("data-hangul-validation")).toBe("");
    expect(form?.getAttribute("data-latin-validation")).toBe(
      "The text contains characters from other languages.",
    );
  });

  it("shows furigana chip actions and defaults to add furigana when that group is selected", () => {
    rendered = renderPage(<TextToolsPage />);

    clickTab("Furigana");

    expect(document.body.textContent).toContain("Add");
    expect(document.body.textContent).toContain("Remove");
    expect(document.body.textContent).toContain(
      "Add Furigana:/api/text/add-furigana",
    );
    expect(document.body.textContent).toContain("Hiragana only");
  });

  it("shows the remove-brackets option for remove furigana", () => {
    rendered = renderPage(<TextToolsPage />);

    clickTab("Furigana");
    clickButton("Remove");

    expect(document.body.textContent).toContain(
      "Remove Furigana:/api/text/remove-furigana",
    );
    expect(document.body.textContent).toContain(
      "Remove brackets at the same time.",
    );
    expect(document.body.textContent).not.toContain("Hiragana only");
  });

  it("updates the active form when a chip action is selected", () => {
    rendered = renderPage(<TextToolsPage />);

    clickTab("Parentheses");
    clickButton("Remove");

    expect(document.body.textContent).toContain(
      "Remove Parentheses:/api/text/remove-parentheses",
    );

    clickTab("Furigana");
    clickButton("Remove");

    expect(document.body.textContent).toContain(
      "Remove Furigana:/api/text/remove-furigana",
    );
  });

  it("renders the batch vocabulary lookup component directly for the vocabulary tab", () => {
    rendered = renderPage(<TextToolsPage />);

    clickTab("Vocabulary");

    expect(document.body.textContent).toContain(
      "Lookup Multiple Vocabulary Items:/api/text/vocabulary/batch",
    );
  });

  it("does not render the removed single and batch vocabulary chips", () => {
    rendered = renderPage(<TextToolsPage />);

    clickTab("Vocabulary");

    expect(document.body.textContent).not.toContain("Single");
    expect(document.body.textContent).not.toContain("Batch");
  });
});
