// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DerivativeGenerationDialog from "./DerivativeGenerationDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

function renderDialog(element: ReactElement) {
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

function expectScrollbarStyles(testId: string) {
  const content = document.querySelector(`[data-testid="${testId}"]`);
  expect(content).not.toBeNull();

  const className =
    content?.className
      .split(" ")
      .find((value) => value.startsWith("css-")) ?? "";

  expect(className).not.toBe("");
  const styles = document.head.textContent ?? "";

  expect(styles).toContain(`.${className}`);
  expect(styles).toContain(`.${className}::-webkit-scrollbar`);
  expect(styles).toContain(`.${className}::-webkit-scrollbar-thumb`);
  expect(styles).toContain('data-scrollbar-active="true"');
  expect(styles).toContain("scrollbar-width:none");
  expect(styles).toContain("scrollbar-color:transparent transparent");

  return content as HTMLElement;
}

describe("DerivativeGenerationDialog", () => {
  let root: ReturnType<typeof renderDialog> | null = null;

  beforeEach(() => {
    vi.useFakeTimers();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    vi.useRealTimers();
    root?.unmount();
    root = null;
    document.body.innerHTML = "";
    document.head.innerHTML = "";
  });

  it("shows the custom scrollbar only while scrolling", () => {
    root = renderDialog(
      <DerivativeGenerationDialog
        open
        loading={false}
        items={[
          {
            itemId: "item-1",
            dayName: "Day 1",
            words: [
              {
                baseWord: "care",
                baseMeaning: "attention",
                candidates: [
                  {
                    word: "careful",
                    meaning: "showing care",
                    source: "datamuse",
                    selectedByDefault: true,
                  },
                ],
              },
            ],
          },
        ]}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );

    const content = expectScrollbarStyles("derivative-generation-dialog-content");
    expect(content.getAttribute("data-scrollbar-active")).toBe("false");

    act(() => {
      content.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    expect(content.getAttribute("data-scrollbar-active")).toBe("true");

    act(() => {
      vi.advanceTimersByTime(701);
    });
    expect(content.getAttribute("data-scrollbar-active")).toBe("false");
  });
});
