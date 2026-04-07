// @vitest-environment jsdom

import { act, type ReactElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WordFinderTable from "./WordFinderTable";
import type { WordFinderResult } from "@/types/wordFinder";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const labels: Record<string, string> = {
        "words.primaryText": "Primary Text",
        "words.secondaryText": "Secondary Text",
        "words.translationLabel": "Translation",
        "courses.image": "Image",
        "words.location": "Location",
        "words.status": "Status",
        "words.typeStandard": "Standard",
        "words.hasPronunciation": "Has pronunciation",
        "words.hasExample": "Has example",
        "words.hasTranslation": "Has translation",
        "words.missingPronunciation": "Missing pronunciation",
        "words.missingExample": "Missing example",
        "words.none": "None",
        "words.noDay": "No day",
        "words.contextMenuAddFurigana": "Add furigana",
        "words.contextMenuGenerate": "Generate",
        "words.contextMenuCopy": "Copy",
      };

      if (typeof fallback === "string") return fallback;
      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@mui/material/Typography", () => ({
  default: ({
    children,
    className,
    sx,
  }: {
    children?: ReactNode;
    className?: string;
    sx?: Record<string, string>;
  }) => (
    <p
      className={["MuiTypography-root", className].filter(Boolean).join(" ")}
      data-sx={sx ? JSON.stringify(sx) : undefined}
    >
      {children}
    </p>
  ),
}));

vi.mock("@/components/shared/CellContextMenu", () => ({
  default: ({
    anchorPosition,
    onAddFurigana,
  }: {
    anchorPosition: { top: number; left: number } | null;
    onAddFurigana?: (() => void) | null;
  }) =>
    anchorPosition ? (
      <div data-testid="cell-context-menu">
        {onAddFurigana ? (
          <button onClick={onAddFurigana}>Add furigana</button>
        ) : null}
      </div>
    ) : null,
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

function createResult(overrides: Partial<WordFinderResult>): WordFinderResult {
  return {
    id: "prefix-1",
    courseId: "JLPT_PREFIX",
    courseLabel: "Prefix",
    coursePath: "courses/JLPT_PREFIX",
    dayId: null,
    sourceHref: "/courses/JLPT_PREFIX#prefix-1",
    schemaVariant: "prefix",
    type: "standard",
    primaryText: "再",
    secondaryText: "again / 다시",
    meaning: "again / 다시",
    translation: "to regenerate / 재생하다",
    translationEnglish: "to regenerate",
    translationKorean: "재생하다",
    example: "再生する",
    exampleRoman: "saisei suru",
    pronunciation: "さい",
    pronunciationRoman: "sai",
    imageUrl: null,
    ...overrides,
  };
}

function getCell(text: string) {
  const cell = Array.from(document.querySelectorAll("td")).find((node) =>
    node.textContent?.includes(text),
  );
  expect(cell).not.toBeUndefined();
  return cell as HTMLTableCellElement;
}

function expectSingleLineWordStyles(element: Element) {
  const sx = element.getAttribute("data-sx");
  expect(sx).not.toBeNull();

  expect(JSON.parse(sx ?? "{}")).toMatchObject({
    whiteSpace: "nowrap",
    overflowWrap: "normal",
    wordBreak: "keep-all",
  });
}

async function openContextMenu(cell: HTMLTableCellElement) {
  await act(async () => {
    cell.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 20,
        clientY: 20,
      }),
    );
  });
}

async function clickAddFurigana() {
  const button = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Add furigana"),
  );
  expect(button).not.toBeUndefined();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}

describe("WordFinderTable add furigana actions", () => {
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

  it("routes primary-text context menu furigana to pronunciation for JP rows", async () => {
    const onAddFuriganaClick = vi.fn();

    rendered = renderTable(
      <WordFinderTable
        results={[createResult({})]}
        onAddFuriganaClick={onAddFuriganaClick}
      />,
    );

    await openContextMenu(getCell("再"));
    await clickAddFurigana();

    expect(onAddFuriganaClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "prefix-1" }),
      "pronunciation",
    );
  });

  it("routes meaning/details context menu furigana to example for JP rows", async () => {
    const onAddFuriganaClick = vi.fn();

    rendered = renderTable(
      <WordFinderTable
        results={[createResult({})]}
        onAddFuriganaClick={onAddFuriganaClick}
      />,
    );

    await openContextMenu(getCell("again / 다시"));
    await clickAddFurigana();

    expect(onAddFuriganaClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "prefix-1" }),
      "example",
    );
  });

  it("lets JP pronunciation status chips open the resolve dialog path", async () => {
    const onMissingFieldClick = vi.fn();

    rendered = renderTable(
      <WordFinderTable
        results={[createResult({})]}
        onMissingFieldClick={onMissingFieldClick}
      />,
    );

    const chip = Array.from(
      document.querySelectorAll('[role="button"], button, .MuiChip-root'),
    ).find((node) =>
      node.textContent?.includes("Has pronunciation"),
    );
    expect(chip).not.toBeUndefined();

    await act(async () => {
      chip?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onMissingFieldClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "prefix-1" }),
      "pronunciation",
    );
  });

  it("does not expose add furigana for non-Japanese standard rows", async () => {
    const onAddFuriganaClick = vi.fn();

    rendered = renderTable(
      <WordFinderTable
        results={[
          createResult({
            id: "std-1",
            courseId: "TOEIC",
            courseLabel: "TOEIC",
            coursePath: "courses/TOEIC",
            dayId: "Day1",
            sourceHref: "/courses/TOEIC/Day1#std-1",
            schemaVariant: "standard",
            primaryText: "wander",
            secondaryText: "to move around",
            meaning: "to move around",
            pronunciation: "wan-der",
            example: "We wander through the city.",
            translation: "돌아다니다",
          }),
        ]}
        onAddFuriganaClick={onAddFuriganaClick}
      />,
    );

    await openContextMenu(getCell("wander"));

    expect(
      Array.from(document.querySelectorAll("button")).find((node) =>
        node.textContent?.includes("Add furigana"),
      ),
    ).toBeUndefined();
  });

  it("renders the primary word text with single-line styles while keeping the type chip", () => {
    rendered = renderTable(
      <WordFinderTable
        results={[
          createResult({
            id: "std-2",
            courseId: "TOEIC",
            courseLabel: "TOEIC",
            coursePath: "courses/TOEIC",
            dayId: "Day1",
            sourceHref: "/courses/TOEIC/Day1#std-2",
            schemaVariant: "standard",
            primaryText: "take a very long phrase with spaces",
            secondaryText: "to understand",
            meaning: "to understand",
            pronunciation: "take in",
            example: "We take in new ideas slowly.",
            translation: "이해하다",
          }),
        ]}
      />,
    );

    const cell = getCell("take a very long phrase with spaces");
    const wordText = Array.from(cell.querySelectorAll(".MuiTypography-root")).find((node) =>
      node.textContent?.includes("take a very long phrase with spaces"),
    );

    expect(wordText).not.toBeUndefined();
    expectSingleLineWordStyles(wordText as Element);
    expect(cell.textContent).toContain("Standard");
  });
});
