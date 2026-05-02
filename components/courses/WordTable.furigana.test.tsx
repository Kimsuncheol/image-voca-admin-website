// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WordTable from "./WordTable";
import { addFuriganaText } from "@/lib/addFurigana";
import { analyzeSentence } from "@/lib/analyzeText";
import {
  updateSingleListWordTextField,
  updateWordTextField,
} from "@/lib/firebase/firestore";

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
        "words.contextMenuAddFurigana": "Add furigana",
        "words.contextMenuAnalyze": "Mask target word",
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

vi.mock("@/components/shared/InlineEditableText", () => ({
  default: ({ value, emptyLabel }: { value?: string; emptyLabel?: string }) => (
    <span>{value || emptyLabel || ""}</span>
  ),
}));

vi.mock("@/components/shared/CellContextMenu", () => ({
  default: ({
    anchorPosition,
    onAddFurigana,
    onAnalyze,
  }: {
    anchorPosition: { top: number; left: number } | null;
    onAddFurigana?: (() => void) | null;
    onAnalyze?: (() => void) | null;
  }) =>
    anchorPosition ? (
      <div data-testid="cell-context-menu">
        {onAddFurigana ? (
          <button onClick={onAddFurigana}>Add furigana</button>
        ) : null}
        {onAnalyze ? (
          <button onClick={onAnalyze}>Mask target word</button>
        ) : null}
      </div>
    ) : null,
}));

vi.mock("@/components/words/WordFinderMissingFieldDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/courses/DerivativeEditDialog", () => ({
  default: () => null,
}));

vi.mock("@/lib/addFurigana", () => ({
  addFuriganaText: vi.fn(),
}));

vi.mock("@/lib/analyzeText", () => ({
  analyzeSentence: vi.fn(),
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

vi.mock("@/lib/firebase/storage", () => ({
  uploadWordImage: vi.fn(),
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

function getCell(text: string) {
  const cell = Array.from(document.querySelectorAll("td")).find((node) =>
    node.textContent?.includes(text),
  );

  expect(cell).not.toBeUndefined();
  return cell as HTMLTableCellElement;
}

async function openContextMenu(cell: HTMLTableCellElement) {
  await act(async () => {
    cell.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        clientX: 12,
        clientY: 16,
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

async function clickAnalyze() {
  const button = Array.from(document.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Mask target word"),
  );

  expect(button).not.toBeUndefined();

  await act(async () => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("WordTable furigana actions", () => {
  let rendered: ReturnType<typeof renderTable> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("alert", vi.fn());
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
    vi.unstubAllGlobals();
  });

  it("adds hiragana-only furigana to JLPT pronunciation cells", async () => {
    vi.mocked(addFuriganaText).mockResolvedValue("ねこ");

    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "jlpt-1",
            word: "猫",
            meaningEnglish: "cat",
            meaningKorean: "고양이",
            pronunciation: "ネコ",
            pronunciationRoman: "neko",
            example: "猫がいる。",
            exampleHurigana: "ねこがいる。",
            exampleRoman: "neko ga iru.",
            translationEnglish: "There is a cat.",
            translationKorean: "고양이가 있다.",
          },
        ]}
        isCollocation={false}
        isJlpt
        courseId="JLPT"
        coursePath="courses/JLPT"
        dayId="Day1"
      />,
    );

    await openContextMenu(getCell("ネコ"));
    await clickAddFurigana();

    expect(addFuriganaText).toHaveBeenCalledWith("猫", {
      mode: "hiragana_only",
    });
    expect(updateWordTextField).toHaveBeenCalledWith(
      "courses/JLPT",
      "Day1",
      "jlpt-1",
      "pronunciation",
      "ねこ",
    );
    expect(document.body.textContent).toContain("ねこ");
  });

  it("adds furigana to prefix examples through single-list persistence", async () => {
    vi.mocked(addFuriganaText).mockResolvedValue("再(さい)生(せい)する");

    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "prefix-1",
            prefix: "再",
            meaningEnglish: "again",
            meaningKorean: "다시",
            pronunciation: "さい",
            pronunciationRoman: "sai",
            example: "再生する",
            exampleRoman: "saisei suru",
            translationEnglish: "to regenerate",
            translationKorean: "재생하다",
          },
        ]}
        isCollocation={false}
        isPrefix
        courseId="JLPT_PREFIX"
        coursePath="courses/JLPT_PREFIX"
      />,
    );

    await openContextMenu(getCell("再生する"));
    await clickAddFurigana();

    expect(addFuriganaText).toHaveBeenCalledWith("再生する", undefined);
    expect(updateSingleListWordTextField).toHaveBeenCalledWith(
      "JLPT_PREFIX",
      "courses/JLPT_PREFIX",
      "prefix-1",
      "example",
      "再(さい)生(せい)する",
    );
    expect(document.body.textContent).toContain("再(さい)生(せい)する");
  });

  it("does not expose add furigana for standard English rows", async () => {
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

    await openContextMenu(getCell("wan-der"));

    expect(
      Array.from(document.querySelectorAll("button")).find((node) =>
        node.textContent?.includes("Add furigana"),
      ),
    ).toBeUndefined();
  });

  it("masks JLPT examples through the analyze endpoint and persists the example", async () => {
    const onWordFieldsUpdated = vi.fn();
    vi.mocked(analyzeSentence).mockResolvedValue("[MASK]て、また[MASK]ました。");

    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "jlpt-1",
            word: "食べる",
            meaningEnglish: "eat",
            meaningKorean: "먹다",
            pronunciation: "たべる",
            pronunciationRoman: "taberu",
            example: "食べ(たべ)て、また食べました。",
            exampleHurigana: "",
            exampleRoman: "",
            translationEnglish: "I ate and ate again.",
            translationKorean: "먹고 또 먹었습니다.",
          },
        ]}
        isCollocation={false}
        isJlpt
        courseId="JLPT"
        coursePath="courses/JLPT"
        dayId="Day1"
        onWordFieldsUpdated={onWordFieldsUpdated}
      />,
    );

    await openContextMenu(getCell("食べ(たべ)て、また食べました。"));
    expect(document.body.textContent).toContain("食べ(たべ)て、また食べました。");
    await clickAnalyze();

    expect(analyzeSentence).toHaveBeenCalledWith({
      language: "ja",
      sentence: "食べて、また食べました。",
      target_base_form: "食べる",
    });
    expect(updateWordTextField).toHaveBeenCalledWith(
      "courses/JLPT",
      "Day1",
      "jlpt-1",
      "example",
      "[MASK]て、また[MASK]ました。",
    );
    expect(onWordFieldsUpdated).toHaveBeenCalledWith("jlpt-1", {
      example: "[MASK]て、また[MASK]ました。",
    });
    expect(document.body.textContent).toContain("[MASK]て、また[MASK]ました。");
  });

  it("normalizes prefix base forms before analyzing examples", async () => {
    vi.mocked(analyzeSentence).mockResolvedValue("[MASK]生する");

    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "prefix-1",
            prefix: "再-",
            meaningEnglish: "again",
            meaningKorean: "다시",
            pronunciation: "さい",
            pronunciationRoman: "sai",
            example: "再（ふたた）び再生する",
            exampleRoman: "saisei suru",
            translationEnglish: "to regenerate",
            translationKorean: "재생하다",
          },
        ]}
        isCollocation={false}
        isPrefix
        courseId="JLPT_PREFIX"
        coursePath="courses/JLPT_PREFIX"
      />,
    );

    await openContextMenu(getCell("再（ふたた）び再生する"));
    await clickAnalyze();

    expect(analyzeSentence).toHaveBeenCalledWith({
      language: "ja",
      sentence: "再び再生する",
      target_base_form: "再",
    });
    expect(updateSingleListWordTextField).toHaveBeenCalledWith(
      "JLPT_PREFIX",
      "courses/JLPT_PREFIX",
      "prefix-1",
      "example",
      "[MASK]生する",
    );
  });

  it("normalizes postfix base forms before analyzing examples", async () => {
    vi.mocked(analyzeSentence).mockResolvedValue("科学[MASK]");

    rendered = renderTable(
      <WordTable
        words={[
          {
            id: "postfix-1",
            postfix: "-的",
            meaningEnglish: "-like",
            meaningKorean: "-적",
            pronunciation: "てき",
            pronunciationRoman: "teki",
            example: "科学（かがく）的",
            exampleRoman: "kagakuteki",
            translationEnglish: "scientific",
            translationKorean: "과학적",
          },
        ]}
        isCollocation={false}
        isPostfix
        courseId="JLPT_POSTFIX"
        coursePath="courses/JLPT_POSTFIX"
      />,
    );

    await openContextMenu(getCell("科学（かがく）的"));
    await clickAnalyze();

    expect(analyzeSentence).toHaveBeenCalledWith({
      language: "ja",
      sentence: "科学的",
      target_base_form: "的",
    });
    expect(updateSingleListWordTextField).toHaveBeenCalledWith(
      "JLPT_POSTFIX",
      "courses/JLPT_POSTFIX",
      "postfix-1",
      "example",
      "科学[MASK]",
    );
  });

  it("does not expose analyze for standard English rows", async () => {
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

    await openContextMenu(getCell("We wander through the city."));

    expect(
      Array.from(document.querySelectorAll("button")).find((node) =>
        node.textContent?.includes("Mask target word"),
      ),
    ).toBeUndefined();
  });
});
