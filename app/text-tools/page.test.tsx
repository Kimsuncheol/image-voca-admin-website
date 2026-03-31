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
        "textTools.networkError": "Network error",
        "textTools.tabParentheses": "Parentheses",
        "textTools.tabRomanize": "Romanize",
        "textTools.tabFurigana": "Furigana",
        "textTools.tabTranslate": "Translate",
        "textTools.subtabGenerate": "Generate",
        "textTools.subtabRemove": "Remove",
        "textTools.subtabAdd": "Add",
        "textTools.generateAction": "Generate Parentheses",
        "textTools.removeAction": "Remove Parentheses",
        "textTools.romanizeAction": "Romanize",
        "textTools.addFuriganaAction": "Add Furigana",
        "textTools.removeFuriganaAction": "Remove Furigana",
        "textTools.removeFuriganaRemoveBracketsOption":
          "Remove brackets at the same time.",
        "textTools.translateAction": "Translate",
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
    booleanOption,
  }: {
    apiPath: string;
    submitLabel: string;
    booleanOption?: { label: string };
  }) => (
    <div data-testid="mock-form">
      {`${submitLabel}:${apiPath}`}
      {booleanOption ? <span>{booleanOption.label}</span> : null}
    </div>
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
  const button = Array.from(
    document.querySelectorAll('[role="button"], button, .MuiChip-root'),
  ).find((node) => node.textContent?.includes(label));

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

  it("renders grouped text tool tabs and defaults to parentheses generate with chip actions", () => {
    rendered = renderPage(<TextToolsPage />);

    expect(document.body.textContent).toContain("Text Tools");
    expect(document.body.textContent).toContain("Parentheses");
    expect(document.body.textContent).toContain("Romanize");
    expect(document.body.textContent).toContain("Furigana");
    expect(document.body.textContent).toContain("Translate");
    expect(document.body.textContent).toContain("Generate");
    expect(document.body.textContent).toContain("Remove");
    expect(document.body.textContent).toContain(
      "Generate Parentheses:/api/text/generate-parentheses",
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
  });

  it("updates the active form when a chip action is selected", () => {
    rendered = renderPage(<TextToolsPage />);

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
});
