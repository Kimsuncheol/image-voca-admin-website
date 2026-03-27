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
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  getDayWordsMock: vi.fn(),
  requestDerivativePreviewMock: vi.fn(),
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
        "courses.generateMissingDerivatives": "Generate missing derivatives",
        "words.clearFilters": "Clear filters",
        "courses.bulkGenerateNoEligible": "No eligible rows",
        "words.generateActionError": "Generation failed",
        "courses.title": "Courses",
      };

      if (key === "courses.bulkGenerateSummary") {
        return `Updated ${options?.updated ?? 0}`;
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
  default: () => <div>WordTable</div>,
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
  getCourseById: () => ({
    id: "TOEIC",
    label: "TOEIC",
    path: "courses/TOEIC",
    schema: "standard",
  }),
}));

vi.mock("@/lib/firebase/firestore", () => ({
  getDayWords: getDayWordsMock,
  updateWordDerivatives: vi.fn(),
  updateWordField: vi.fn(),
  updateWordImageUrl: vi.fn(),
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
  requestDerivativePreview: requestDerivativePreviewMock,
}));

vi.mock("@/lib/wordFinderCourseAdapter", () => ({
  adaptCourseWordToWordFinderResult: ({
    word,
    courseId,
    courseLabel,
    coursePath,
    dayId,
  }: {
    word: { id: string; word: string; meaning: string };
    courseId: string;
    courseLabel: string;
    coursePath: string;
    dayId: string;
  }) => ({
    id: word.id,
    primaryText: word.word,
    meaning: word.meaning,
    derivative: [],
    courseId,
    courseLabel,
    coursePath,
    dayId,
    type: "standard",
    schemaVariant: "standard",
  }),
  applyCourseWordResolvedUpdates: (word: unknown, updates: unknown) => ({
    ...(word as object),
    ...(updates as object),
  }),
  isCourseWordFieldMissing: (
    _word: unknown,
    _options: unknown,
    field: string,
  ) => field === "derivative",
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
});
