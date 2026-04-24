// @vitest-environment jsdom

import { act, type ReactElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ParseResult } from "@/lib/utils/csvParser";

import UploadModal, {
  detectJlptCounterOptionIdFromFilename,
  resolveJlptCounterOptionIdFromFilename,
} from "./UploadModal";

vi.mock("react-dropzone", () => ({
  useDropzone: () => ({
    getRootProps: () => ({}),
    getInputProps: () => ({}),
    isDragActive: false,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | { courseLabel?: string }) =>
      typeof fallback === "string" ? fallback : key,
  }),
}));

vi.mock("@mui/material/Dialog", () => ({
  default: ({
    open,
    children,
  }: {
    open: boolean;
    children: ReactNode;
  }) => (open ? <div data-testid="mock-dialog">{children}</div> : null),
}));

function renderModal(element: ReactElement) {
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

function createStandardParseResult(): ParseResult {
  return {
    words: [
      {
        word: "focus",
        meaning: "attention",
        synonym: "concentration",
        pronunciation: "",
        example: "Focus on your goal.",
        translation: "집중하다",
      },
    ],
    schemaType: "standard",
    isCollocation: false,
    errors: [],
    detectedHeaders: ["word", "meaning", "synonym", "pronunciation", "example", "translation"],
  };
}

function createHeaderMismatchParseResult(
  detectedHeaders: string[],
): ParseResult {
  return {
    words: [],
    schemaType: "standard",
    isCollocation: false,
    errors: [],
    detectedHeaders,
    blockingError: "HEADER_MISMATCH",
    expectedHeaders: ["word", "meaning", "pronunciation", "example", "translation"],
  };
}

function createExtremelyAdvancedParseResult(): ParseResult {
  return {
    words: [
      {
        word: "fuddle",
        meaning: "to confuse",
        example: "I fuddled away with old friends.",
        translation: "나는 친구들과 시간을 보냈다.",
        imageUrl: "https://example.com/fuddle.png",
      },
    ],
    schemaType: "extremelyAdvanced",
    isCollocation: false,
    errors: [],
    detectedHeaders: ["word", "meaning", "example", "translation", "imageUrl"],
  };
}

function createKanjiParseResult(): ParseResult {
  return {
    words: [
      {
        kanji: "一",
        meaning: ["ひと", "ひと(つ)"],
        meaningKorean: ["one person", "one thing"],
        meaningKoreanRomanize: ["achim", "han saram"],
        meaningExample: [{ items: ["一言", "一息"] }, { items: ["一つ"] }],
        meaningExampleHurigana: [{ items: ["ひとこと", "ひといき"] }, { items: ["ひとつ"] }],
        meaningEnglishTranslation: [{ items: ["A single word", "A breath"] }, { items: ["One"] }],
        meaningKoreanTranslation: [{ items: ["한마디 말", "한숨 돌림"] }, { items: ["한 개"] }],
        reading: ["いち"],
        readingKorean: ["ichi"],
        readingKoreanRomanize: ["jo", "(il)"],
        readingExample: [{ items: ["一月"] }],
        readingExampleHurigana: [{ items: ["いちがつ"] }],
        readingEnglishTranslation: [{ items: ["January"] }],
        readingKoreanTranslation: [{ items: ["1월"] }],
        example: ["一月です。"],
        exampleEnglishTranslation: ["It is January."],
        exampleKoreanTranslation: ["1월입니다."],
        exampleHurigana: ["いちがつです。"],
      },
    ],
    schemaType: "kanji",
    isCollocation: false,
    errors: [],
    detectedHeaders: ["kanji", "meaning"],
  };
}

describe("UploadModal", () => {
  let rendered: ReturnType<typeof renderModal> | null = null;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & {
        IS_REACT_ACT_ENVIRONMENT?: boolean;
      }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    vi.clearAllMocks();
  });

  it("shows the synonym column in the preview table for TOEFL_IELTS standard uploads", () => {
    rendered = renderModal(
      <UploadModal
        open
        onClose={() => {}}
        onConfirm={() => {}}
        initialData={createStandardParseResult()}
        hideDayInput
        hiddenDayName="Day1"
        schemaType="standard"
        courseId="TOEFL_IELTS"
      />,
    );

    expect(document.body.textContent).toContain("synonym");
    expect(document.body.textContent).toContain("concentration");
  });

  it("does not show the synonym column in the preview table for non-TOEFL standard uploads", () => {
    rendered = renderModal(
      <UploadModal
        open
        onClose={() => {}}
        onConfirm={() => {}}
        initialData={createStandardParseResult()}
        hideDayInput
        hiddenDayName="Day1"
        schemaType="standard"
        courseId="CSAT"
      />,
    );

    const headers = Array.from(document.querySelectorAll("th")).map(
      (cell) => cell.textContent?.trim() ?? "",
    );

    expect(headers).not.toContain("synonym");
    expect(headers).toEqual([
      "word",
      "meaning",
      "pronunciation",
      "example",
      "translation",
    ]);
  });

  it("shows Extremely Advanced preview columns without pronunciation", () => {
    rendered = renderModal(
      <UploadModal
        open
        onClose={() => {}}
        onConfirm={() => {}}
        initialData={createExtremelyAdvancedParseResult()}
        hideDayInput
        hiddenDayName="Day1"
        schemaType="extremelyAdvanced"
        courseId="EXTREMELY_ADVANCED"
      />,
    );

    const headers = Array.from(document.querySelectorAll("th")).map(
      (cell) => cell.textContent?.trim() ?? "",
    );

    expect(headers).toEqual([
      "word",
      "meaning",
      "example",
      "translation",
      "imageUrl",
    ]);
    expect(document.body.textContent).toContain("fuddle");
    expect(document.body.textContent).toContain("https://example.com/fuddle.png");
    expect(headers).not.toContain("pronunciation");
  });

  it("shows Kanji preview columns and nested values", () => {
    rendered = renderModal(
      <UploadModal
        open
        onClose={() => {}}
        onConfirm={() => {}}
        initialData={createKanjiParseResult()}
        hideDayInput
        hiddenDayName="Day1"
        schemaType="kanji"
        courseId="KANJI"
      />,
    );

    const headers = Array.from(document.querySelectorAll("th")).map(
      (cell) => cell.textContent?.trim() ?? "",
    );

    expect(headers).toContain("kanji");
    expect(headers).toContain("meaningKorean");
    expect(headers).toContain("meaningKoreanRomanize");
    expect(headers).toContain("meaningExample");
    expect(headers).toContain("readingKorean");
    expect(headers).toContain("readingKoreanRomanize");
    expect(headers).toContain("exampleHurigana");
    expect(document.body.textContent).toContain("one person");
    expect(document.body.textContent).toContain("Achim");
    expect(document.body.textContent).toContain("Han saram");
    expect(document.body.textContent).toContain("ichi");
    expect(document.body.textContent).toContain("Jo");
    expect(document.body.textContent).toContain("(Il)");
    expect(document.body.textContent).toContain("一言, 一息");
    expect(document.body.textContent).toContain("いちがつです。");
  });

  it("shows the targeted TOEFL/IELTS synonym hint for CSAT exact-match header mismatches", () => {
    rendered = renderModal(
      <UploadModal
        open
        onClose={() => {}}
        onConfirm={() => {}}
        initialData={createHeaderMismatchParseResult([
          "meaning",
          "synonym",
          "word",
          "translation",
          "example",
          "pronunciation",
        ])}
        hideDayInput
        hiddenDayName="Day1"
        schemaType="standard"
        courseId="CSAT"
      />,
    );

    expect(document.body.textContent).toContain(
      "This file appears to use the TOEFL/IELTS format because it includes a synonym column.",
    );
  });

  it("shows the targeted TOEFL/IELTS synonym hint for TOEIC exact-match header mismatches", () => {
    rendered = renderModal(
      <UploadModal
        open
        onClose={() => {}}
        onConfirm={() => {}}
        initialData={createHeaderMismatchParseResult([
          "word",
          "meaning",
          "pronunciation",
          "example",
          "translation",
          "synonym",
        ])}
        hideDayInput
        hiddenDayName="Day1"
        schemaType="standard"
        courseId="TOEIC"
      />,
    );

    expect(document.body.textContent).toContain(
      "This file appears to use the TOEFL/IELTS format because it includes a synonym column.",
    );
  });

  it("does not show the targeted hint for TOEFL_IELTS uploads", () => {
    rendered = renderModal(
      <UploadModal
        open
        onClose={() => {}}
        onConfirm={() => {}}
        initialData={createHeaderMismatchParseResult([
          "word",
          "meaning",
          "pronunciation",
          "example",
          "translation",
          "synonym",
        ])}
        hideDayInput
        hiddenDayName="Day1"
        schemaType="standard"
        courseId="TOEFL_IELTS"
      />,
    );

    expect(document.body.textContent).not.toContain(
      "This file appears to use the TOEFL/IELTS format because it includes a synonym column.",
    );
  });

  it("does not show the targeted hint for other header mismatches", () => {
    rendered = renderModal(
      <UploadModal
        open
        onClose={() => {}}
        onConfirm={() => {}}
        initialData={createHeaderMismatchParseResult([
          "word",
          "meaning",
          "example",
          "translation",
          "synonym",
        ])}
        hideDayInput
        hiddenDayName="Day1"
        schemaType="standard"
        courseId="CSAT"
      />,
    );

    expect(document.body.textContent).not.toContain(
      "This file appears to use the TOEFL/IELTS format because it includes a synonym column.",
    );
  });

  it("detects Counter Hours from a COUNTERS_HOURS filename", () => {
    expect(detectJlptCounterOptionIdFromFilename("COUNTERS_HOURS.csv")).toBe(
      "counter_hours",
    );
  });

  it("detects Counter Hiki from a COUNTERS_HIKI filename", () => {
    expect(detectJlptCounterOptionIdFromFilename("COUNTERS_HIKI.csv")).toBe(
      "counter_hiki",
    );
  });

  it("detects Counter Minutes case-insensitively from the filename", () => {
    expect(detectJlptCounterOptionIdFromFilename("counters-minutes.CSV")).toBe(
      "counter_minutes",
    );
  });

  it("detects counter targets when separators vary in the filename", () => {
    expect(detectJlptCounterOptionIdFromFilename("COUNTERS HIKI.csv")).toBe(
      "counter_hiki",
    );
  });

  it("does not force a selection for unmatched filenames on new items", () => {
    expect(resolveJlptCounterOptionIdFromFilename("random-upload.csv")).toBe(
      "",
    );
  });

  it("replaces the previous selection when a matching filename is uploaded while editing", () => {
    expect(
      resolveJlptCounterOptionIdFromFilename(
        "COUNTERS_MINUTES.csv",
        "counter_hon",
      ),
    ).toBe("counter_minutes");
  });

  it("keeps the existing selection when an edited filename does not match", () => {
    expect(
      resolveJlptCounterOptionIdFromFilename(
        "random-upload.csv",
        "counter_hon",
      ),
    ).toBe("counter_hon");
  });
});
