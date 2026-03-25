// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WordTable from "./WordTable";
import { updateWordDerivatives } from "@/lib/firebase/firestore";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const labels: Record<string, string> = {
        "courses.word": "Word",
        "courses.meaning": "Meaning",
        "courses.pronunciation": "Pronunciation",
        "courses.example": "Example",
        "courses.translation": "Translation",
        "words.derivative": "Derivatives",
        "words.generateDerivatives": "Generate derivatives",
        "words.contextMenuEdit": "Edit",
        "words.none": "None",
      };

      if (typeof fallback === "string") return fallback;
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/components/shared/InlineEditableText", () => ({
  default: ({ value, emptyLabel }: { value?: string; emptyLabel?: string }) => (
    <span>{value || emptyLabel || ""}</span>
  ),
}));

vi.mock("@/components/shared/CellContextMenu", () => ({
  default: () => null,
}));

vi.mock("@/components/words/WordFinderMissingFieldDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/courses/DerivativeEditDialog", () => ({
  default: ({
    open,
    baseWord,
    canGenerate,
    onSave,
  }: {
    open: boolean;
    baseWord: string;
    canGenerate?: boolean;
    onSave: (items: Array<{ word: string; meaning: string }>) => void | Promise<void>;
  }) =>
    open ? (
      <div data-testid="derivative-dialog">
        <span>{`dialog:${baseWord}:${String(canGenerate)}`}</span>
        <button onClick={() => void onSave([{ word: "generated", meaning: "generated meaning" }])}>
          Mock save
        </button>
      </div>
    ) : null,
}));

vi.mock("@/lib/firebase/firestore", () => ({
  updateWordTextField: vi.fn(),
  updateWordImageUrl: vi.fn(),
  updateWordDerivatives: vi.fn().mockResolvedValue(undefined),
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

describe("WordTable derivative dialog integration", () => {
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

  it("opens DerivativeEditDialog for missing supported derivatives", () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "std-1",
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ]}
        isCollocation={false}
        showImageUrl={false}
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    const button = document.querySelector('button[aria-label="Generate derivatives"]');
    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("dialog:care:true");
  });

  it("opens the same dialog for existing derivatives and saves through updateWordDerivatives", async () => {
    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "std-2",
            word: "use",
            meaning: "purpose",
            pronunciation: "",
            example: "",
            translation: "",
            derivative: [{ word: "useful", meaning: "helpful or practical" }],
          },
        ]}
        isCollocation={false}
        showImageUrl={false}
        courseId="TOEIC"
        coursePath="courses/TOEIC"
        dayId="Day1"
      />,
    );

    const derivativeCell = Array.from(document.querySelectorAll("td")).find((node) =>
      node.textContent?.includes("useful"),
    );
    expect(derivativeCell).not.toBeNull();

    act(() => {
      derivativeCell?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("dialog:use:true");

    await act(async () => {
      Array.from(document.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Mock save"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(updateWordDerivatives).toHaveBeenCalledWith(
      "courses/TOEIC",
      "Day1",
      "std-2",
      [{ word: "generated", meaning: "generated meaning" }],
    );
    expect(document.body.textContent).toContain("generated");
  });
});
