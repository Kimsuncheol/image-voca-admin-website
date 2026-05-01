// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WordTable from "./WordTable";
import { updateWordTextField } from "@/lib/firebase/firestore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const labels: Record<string, string> = {
        "courses.word": "Word",
        "courses.meaning": "Meaning",
        "courses.pronunciation": "Pronunciation",
        "courses.example": "Example",
        "courses.translation": "Translation",
        "courses.generatePronunciation": "Generate pronunciation",
        "words.contextMenuCopy": "Copy",
        "words.contextMenuEdit": "Edit",
        "words.contextMenuGenerate": "Generate",
        "words.none": "None",
        "common.copied": "Copied!",
        "common.copyFailed": "Copy failed",
      };

      if (typeof fallback === "string") return fallback;
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/components/shared/CellContextMenu", () => ({
  default: ({
    anchorPosition,
    onEdit,
  }: {
    anchorPosition: { top: number; left: number } | null;
    onEdit?: (() => void) | null;
  }) =>
    anchorPosition ? (
      <div data-testid="cell-context-menu">
        {onEdit ? <button onClick={onEdit}>Edit</button> : null}
      </div>
    ) : null,
}));

vi.mock("@/components/words/WordFinderMissingFieldDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/courses/DerivativeEditDialog", () => ({
  default: () => null,
}));

vi.mock("@/lib/firebase/firestore", () => ({
  updateWordTextField: vi.fn().mockResolvedValue(undefined),
  updateSingleListWordTextField: vi.fn().mockResolvedValue(undefined),
  updateCollectionWordTextField: vi.fn().mockResolvedValue(undefined),
  updateWordImageUrl: vi.fn(),
  updateSingleListWordImageUrl: vi.fn(),
  updateCollectionWordImageUrl: vi.fn(),
  updateWordDerivatives: vi.fn(),
  updateSingleListWordDerivatives: vi.fn(),
  updateCollectionWordDerivatives: vi.fn(),
}));

function renderTable(element: ReactElement) {
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

function getTextElement(text: string): HTMLElement {
  const element = Array.from(document.querySelectorAll("button, p, span, td")).find(
    (node) => node.textContent === text,
  );

  expect(element).not.toBeUndefined();
  return element as HTMLElement;
}

function getCell(text: string): HTMLTableCellElement {
  const cell = Array.from(document.querySelectorAll("td")).find((node) =>
    node.textContent?.includes(text),
  );

  expect(cell).not.toBeUndefined();
  return cell as HTMLTableCellElement;
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("WordTable pronunciation inline editing", () => {
  let rendered: ReturnType<typeof renderTable> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
  });

  it("edits a standard pronunciation with the keyboard and persists it", async () => {
    const onWordFieldsUpdated = vi.fn();

    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "std-1",
            word: "wander",
            meaning: "to move around",
            pronunciation: "wan-der",
            example: "We wander through the city.",
            translation: "돌아다니다",
          },
        ]}
        isCollocation={false}
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
        onWordFieldsUpdated={onWordFieldsUpdated}
      />,
    );

    await act(async () => {
      getCell("wan-der").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          clientX: 8,
          clientY: 12,
        }),
      );
    });

    await act(async () => {
      getTextElement("Edit").dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    const input = document.querySelector("input") as HTMLInputElement | null;
    expect(input).not.toBeNull();

    await act(async () => {
      setInputValue(input as HTMLInputElement, "wahn-der");
      input?.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          key: "Enter",
        }),
      );
    });

    expect(updateWordTextField).toHaveBeenCalledWith(
      "courses/TOEIC",
      "Day1",
      "std-1",
      "pronunciation",
      "wahn-der",
    );
    expect(onWordFieldsUpdated).toHaveBeenCalledWith("std-1", {
      pronunciation: "wahn-der",
    });
    expect(document.body.textContent).toContain("wahn-der");
  });

  it("exposes Edit in the context menu for pronunciation cells", async () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "std-1",
            word: "wander",
            meaning: "to move around",
            pronunciation: "wan-der",
            example: "We wander through the city.",
            translation: "돌아다니다",
          },
        ]}
        isCollocation={false}
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    await act(async () => {
      getCell("wan-der").dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          clientX: 8,
          clientY: 12,
        }),
      );
    });

    expect(document.body.textContent).toContain("Edit");
  });
});
