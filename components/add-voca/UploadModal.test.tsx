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
