// @vitest-environment jsdom

import { Suspense } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DayWordsPage from "./page";

const {
  replaceMock,
  getDayWordsMock,
  requestDerivativePreviewMock,
  updateWordFieldMock,
  addFuriganaTextsRobustMock,
  getCourseByIdMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  getDayWordsMock: vi.fn(),
  requestDerivativePreviewMock: vi.fn(),
  updateWordFieldMock: vi.fn(),
  addFuriganaTextsRobustMock: vi.fn(),
  getCourseByIdMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const labels: Record<string, string> = {
        "courses.words": "Words",
        "courses.missingFilter": "Missing filter",
        "courses.missingAll": "All missing fields",
        "courses.missingDerivative": "Missing derivatives",
        "courses.missingFurigana": "Missing furigana",
        "courses.missingExampleHurigana": "Missing example hurigana",
        "courses.generateMissingDerivatives": "Generate missing derivatives",
        "words.clearFilters": "Clear filters",
        "words.addFuriganaAction": "Add furigana",
        "words.fillExampleHuriganaAction": "Fill example hurigana",
        "courses.bulkGenerateNoEligible": "No eligible rows",
        "words.generateActionError": "Generation failed",
        "courses.title": "Courses",
      };

      if (key === "courses.bulkGenerateSummary") {
        return `Updated ${options?.updated ?? 0}. Failed ${options?.failed ?? 0}. Skipped ${options?.skipped ?? 0}.`;
      }

      if (key === "courses.bulkGenerateSummaryDetails") {
        return String(options?.details ?? "");
      }

      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/components/derivatives/DerivativeGenerationDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/layout/PageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/courses/CourseBreadcrumbs", () => ({
  default: () => null,
}));

vi.mock("@/components/courses/CourseLoadingView", () => ({
  default: () => <div>Loading…</div>,
}));

vi.mock("@/components/courses/WordTable", () => ({
  default: ({ words }: { words: Array<{ id: string }> }) => (
    <div data-testid="word-table">{words.map((word) => word.id).join(",")}</div>
  ),
}));

vi.mock("@/lib/hooks/useAdminAccess", () => ({
  useAdminAIAccess: () => ({
    loading: false,
    settings: { pronunciationApi: "free-dictionary" },
    imageGenerationBlockedByPermissions: false,
    imageGenerationBlockedBySettings: false,
    exampleTranslationBlockedByPermissions: false,
    exampleTranslationBlockedBySettings: false,
  }),
}));

vi.mock("@/constants/supportedDerivativeCourses", () => ({
  supportsDerivativeCourse: () => true,
}));

vi.mock("@/types/course", () => ({
  getCourseById: getCourseByIdMock,
}));

vi.mock("@/lib/firebase/firestore", () => ({
  getDayWords: getDayWordsMock,
  updateWordDerivatives: vi.fn(),
  updateWordField: updateWordFieldMock,
  updateWordImageUrl: vi.fn(),
}));

vi.mock("@/lib/addFurigana", () => ({
  addFuriganaTextsRobust: addFuriganaTextsRobustMock,
}));

vi.mock("@/lib/derivativeGeneration", () => ({
  buildDerivativePreviewRequestItems: (results: Array<{ id: string; primaryText: string; meaning: string }>) =>
    results.map((result) => ({
      itemId: result.id,
      dayName: result.id,
      words: [
        {
          word: result.primaryText,
          meaning: result.meaning,
          pronunciation: "",
          example: "",
          translation: "",
        },
      ],
    })),
  buildDerivativeUpdatesFromPreview: vi.fn(),
  hasDerivativeEntries: () => false,
  requestDerivativePreview: requestDerivativePreviewMock,
}));

function findClickableByText(text: string): HTMLElement | null {
  return (
    (Array.from(
      document.querySelectorAll<HTMLElement>(
        "button,[role='button'],.MuiChip-root",
      ),
    ).find((element) => element.textContent?.includes(text)) as
      | HTMLElement
      | undefined) ?? null
  );
}

async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("DayWordsPage derivative bulk action", () => {
  let root: ReturnType<typeof createRoot> | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    getCourseByIdMock.mockImplementation((courseId: string) => ({
      id: courseId,
      label: courseId,
      path: `courses/${courseId}`,
      schema: courseId.startsWith("JLPT_") ? "jlpt" : "standard",
    }));
    getDayWordsMock.mockResolvedValue([
      { id: "w1", word: "care", meaning: "attention" },
      { id: "w2", word: "hope", meaning: "expectation" },
    ]);
    requestDerivativePreviewMock.mockResolvedValue({ items: [] });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root?.unmount();
      });
      container.remove();
    }
    root = null;
    container = null;
    document.body.innerHTML = "";
  });

  it("issues a single derivative preview request for the course/day bulk action", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <Suspense fallback={<div>Loading…</div>}>
          <DayWordsPage
            params={Promise.resolve({ courseId: "TOEIC", dayId: "Day1" })}
          />
        </Suspense>,
      );
    });

    await flushPromises();

    expect(findClickableByText("Missing furigana")).toBeNull();

    const missingDerivativeButton = findClickableByText("Missing derivatives");
    expect(missingDerivativeButton).not.toBeNull();

    await act(async () => {
      missingDerivativeButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    const generateButton = findClickableByText("Generate missing derivatives");
    expect(generateButton).not.toBeNull();

    await act(async () => {
      generateButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(requestDerivativePreviewMock).toHaveBeenCalledTimes(1);
    expect(requestDerivativePreviewMock).toHaveBeenCalledWith(
      "TOEIC",
      expect.arrayContaining([
        expect.objectContaining({ itemId: "w1" }),
        expect.objectContaining({ itemId: "w2" }),
      ]),
    );
  });

  it("filters JLPT rows by missing furigana and bulk-adds furigana to examples", async () => {
    getDayWordsMock.mockResolvedValue([
      {
        id: "w1",
        word: "猫",
        meaningEnglish: "cat",
        meaningKorean: "고양이",
        pronunciation: "ねこ",
        pronunciationRoman: "neko",
        example: "猫が好きです",
        exampleRoman: "",
        translationEnglish: "I like cats.",
        translationKorean: "고양이를 좋아합니다.",
      },
      {
        id: "w2",
        word: "犬",
        meaningEnglish: "dog",
        meaningKorean: "개",
        pronunciation: "いぬ",
        pronunciationRoman: "inu",
        example: "犬(いぬ)が好きです",
        exampleRoman: "",
        translationEnglish: "I like dogs.",
        translationKorean: "개를 좋아합니다.",
      },
      {
        id: "w3",
        word: "鳥",
        meaningEnglish: "bird",
        meaningKorean: "새",
        pronunciation: "とり",
        pronunciationRoman: "tori",
        example: "",
        exampleRoman: "",
        translationEnglish: "I like birds.",
        translationKorean: "새를 좋아합니다.",
      },
    ]);
    addFuriganaTextsRobustMock.mockResolvedValue([
      { ok: true, text: "猫(ねこ)が好(す)きです" },
    ]);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <Suspense fallback={<div>Loading…</div>}>
          <DayWordsPage
            params={Promise.resolve({ courseId: "JLPT_N1", dayId: "Day1" })}
          />
        </Suspense>,
      );
    });

    await flushPromises();

    const missingFuriganaButton = findClickableByText("Missing furigana");
    expect(missingFuriganaButton).not.toBeNull();

    await act(async () => {
      missingFuriganaButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await flushPromises();

    expect(document.querySelector("[data-testid='word-table']")?.textContent).toBe("w1");

    const addFuriganaButton = findClickableByText("Add furigana");
    expect(addFuriganaButton).not.toBeNull();

    await act(async () => {
      addFuriganaButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await flushPromises();

    expect(addFuriganaTextsRobustMock).toHaveBeenCalledTimes(1);
    expect(addFuriganaTextsRobustMock).toHaveBeenCalledWith(["猫が好きです"]);
    expect(updateWordFieldMock).toHaveBeenCalledWith(
      "courses/JLPT_N1",
      "Day1",
      "w1",
      "example",
      "猫(ねこ)が好(す)きです",
    );
  });

  it("keeps successful rows when robust furigana fallback returns partial failures", async () => {
    getDayWordsMock.mockResolvedValue([
      {
        id: "w1",
        word: "猫",
        meaningEnglish: "cat",
        meaningKorean: "고양이",
        pronunciation: "ねこ",
        pronunciationRoman: "neko",
        example: "猫が好きです",
        exampleRoman: "",
        translationEnglish: "I like cats.",
        translationKorean: "고양이를 좋아합니다.",
      },
      {
        id: "w2",
        word: "犬",
        meaningEnglish: "dog",
        meaningKorean: "개",
        pronunciation: "いぬ",
        pronunciationRoman: "inu",
        example: "犬が好きです",
        exampleRoman: "",
        translationEnglish: "I like dogs.",
        translationKorean: "개를 좋아합니다.",
      },
      {
        id: "w3",
        word: "鳥",
        meaningEnglish: "bird",
        meaningKorean: "새",
        pronunciation: "とり",
        pronunciationRoman: "tori",
        example: "鳥が好きです",
        exampleRoman: "",
        translationEnglish: "I like birds.",
        translationKorean: "새를 좋아합니다.",
      },
      {
        id: "w4",
        word: "馬",
        meaningEnglish: "horse",
        meaningKorean: "말",
        pronunciation: "うま",
        pronunciationRoman: "uma",
        example: "馬(うま)が好きです",
        exampleRoman: "",
        translationEnglish: "I like horses.",
        translationKorean: "말을 좋아합니다.",
      },
    ]);
    addFuriganaTextsRobustMock.mockResolvedValue([
      { ok: true, text: "猫(ねこ)が好(す)きです" },
      { ok: false, error: "dog failed" },
      { ok: true, text: "鳥(とり)が好(す)きです" },
    ]);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <Suspense fallback={<div>Loading…</div>}>
          <DayWordsPage
            params={Promise.resolve({ courseId: "JLPT_N1", dayId: "Day1" })}
          />
        </Suspense>,
      );
    });

    await flushPromises();

    const missingFuriganaButton = findClickableByText("Missing furigana");
    expect(missingFuriganaButton).not.toBeNull();

    await act(async () => {
      missingFuriganaButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await flushPromises();

    expect(document.querySelector("[data-testid='word-table']")?.textContent).toBe("w1,w2,w3");

    const addFuriganaButton = findClickableByText("Add furigana");
    expect(addFuriganaButton).not.toBeNull();

    await act(async () => {
      addFuriganaButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await flushPromises();

    expect(addFuriganaTextsRobustMock).toHaveBeenCalledWith([
      "猫が好きです",
      "犬が好きです",
      "鳥が好きです",
    ]);
    expect(updateWordFieldMock).toHaveBeenCalledTimes(2);
    expect(updateWordFieldMock).toHaveBeenNthCalledWith(
      1,
      "courses/JLPT_N1",
      "Day1",
      "w1",
      "example",
      "猫(ねこ)が好(す)きです",
    );
    expect(updateWordFieldMock).toHaveBeenNthCalledWith(
      2,
      "courses/JLPT_N1",
      "Day1",
      "w3",
      "example",
      "鳥(とり)が好(す)きです",
    );
    expect(container.textContent).toContain("Updated 2. Failed 1. Skipped 0.");
  });

  it("filters JLPT rows by missing example hurigana and fills them with hiragana-only furigana", async () => {
    getDayWordsMock.mockResolvedValue([
      {
        id: "w1",
        word: "猫",
        meaningEnglish: "cat",
        meaningKorean: "고양이",
        pronunciation: "ねこ",
        pronunciationRoman: "neko",
        example: "猫が好きです",
        exampleHurigana: "",
        exampleRoman: "",
        translationEnglish: "I like cats.",
        translationKorean: "고양이를 좋아합니다.",
      },
      {
        id: "w2",
        word: "犬",
        meaningEnglish: "dog",
        meaningKorean: "개",
        pronunciation: "いぬ",
        pronunciationRoman: "inu",
        example: "犬が好きです",
        exampleHurigana: "いぬがすきです",
        exampleRoman: "",
        translationEnglish: "I like dogs.",
        translationKorean: "개를 좋아합니다.",
      },
    ]);
    addFuriganaTextsRobustMock.mockResolvedValue([
      { ok: true, text: "ねこがすきです" },
    ]);

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <Suspense fallback={<div>Loading…</div>}>
          <DayWordsPage
            params={Promise.resolve({ courseId: "JLPT_N1", dayId: "Day1" })}
          />
        </Suspense>,
      );
    });

    await flushPromises();

    const missingExampleHuriganaButton = findClickableByText("Missing example hurigana");
    expect(missingExampleHuriganaButton).not.toBeNull();

    await act(async () => {
      missingExampleHuriganaButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await flushPromises();

    expect(document.querySelector("[data-testid='word-table']")?.textContent).toBe("w1");

    const fillExampleHuriganaButton = findClickableByText("Fill example hurigana");
    expect(fillExampleHuriganaButton).not.toBeNull();

    await act(async () => {
      fillExampleHuriganaButton?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    await flushPromises();

    expect(addFuriganaTextsRobustMock).toHaveBeenCalledWith(
      ["猫が好きです"],
      { mode: "hiragana_only" },
    );
    expect(updateWordFieldMock).toHaveBeenCalledWith(
      "courses/JLPT_N1",
      "Day1",
      "w1",
      "exampleHurigana",
      "ねこがすきです",
    );
  });
});
