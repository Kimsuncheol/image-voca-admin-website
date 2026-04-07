// @vitest-environment jsdom

import { Suspense } from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CourseDaysPage from "./page";

const {
  pushMock,
  replaceMock,
  translateMock,
  getCourseByIdMock,
  getCollectionWordsMock,
  getCourseDaysMock,
  getSingleListWordsMock,
  fetchFilteredFamousQuotesMock,
  wordTableMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  translateMock: vi.fn((key: string, fallback?: string) => {
    const labels: Record<string, string> = {
      "courses.title": "Courses",
      "courses.days": "Days",
      "courses.fetchError": "Fetch error",
      "courses.noData": "No data",
      "common.all": "All",
      "common.loading": "Loading",
    };

    return labels[key] ?? fallback ?? key;
  }),
  getCourseByIdMock: vi.fn(),
  getCollectionWordsMock: vi.fn(),
  getCourseDaysMock: vi.fn(),
  getSingleListWordsMock: vi.fn(),
  fetchFilteredFamousQuotesMock: vi.fn(),
  wordTableMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: translateMock,
  }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/courses/CourseBreadcrumbs", () => ({
  default: () => <div data-testid="breadcrumbs" />,
}));

vi.mock("@/components/courses/CourseDaysLoadingSkeleton", () => ({
  default: () => <div>Loading…</div>,
}));

vi.mock("@/components/courses/FamousQuoteLoadingSkeleton", () => ({
  default: () => <div>Loading quotes…</div>,
}));

vi.mock("@/components/courses/CourseLoadingView", () => ({
  default: () => <div>Loading list…</div>,
}));

vi.mock("@/components/courses/DayCard", () => ({
  default: ({
    day,
    courseId,
  }: {
    day: { id: string };
    courseId: string;
  }) => <div>{`${courseId}:${day.id}`}</div>,
}));

vi.mock("@/components/courses/WordTable", () => ({
  default: (props: {
    words: Array<{ id: string }>;
    isJlpt?: boolean;
    isPrefix?: boolean;
    isPostfix?: boolean;
    showImageUrl?: boolean;
  }) => {
    wordTableMock(props);
    return (
      <div data-testid="word-table">{props.words.map((word) => word.id).join(",")}</div>
    );
  },
}));

vi.mock("@/types/course", () => ({
  JLPT_COUNTER_OPTIONS: [
    {
      id: "counter_hon",
      label: "counter_hon",
      path: "courses/JLPT_COUNTER/counter_hon",
    },
    {
      id: "counter_mai",
      label: "counter_mai",
      path: "courses/JLPT_COUNTER/counter_mai",
    },
  ],
  JLPT_LEVEL_COURSES: [],
  isJlptCourse: () => false,
  getCourseById: getCourseByIdMock,
}));

vi.mock("@/lib/firebase/firestore", () => ({
  getCollectionWords: getCollectionWordsMock,
  getCourseDays: getCourseDaysMock,
  getSingleListWords: getSingleListWordsMock,
}));

vi.mock("@/lib/famousQuoteApi", () => ({
  FAMOUS_QUOTE_FILTER_LANGUAGES: ["All", "English", "Japanese", "None"],
  fetchFilteredFamousQuotes: fetchFilteredFamousQuotesMock,
  fillFamousQuotesEnglish: vi.fn(),
  fillFamousQuotesJapanese: vi.fn(),
}));

function createCourse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "TOEIC",
    label: "TOEIC",
    path: "courses/TOEIC",
    storageMode: "day",
    ...overrides,
  };
}

async function renderPage(courseId = "TOEIC") {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <Suspense fallback={<div>Loading…</div>}>
        <CourseDaysPage params={Promise.resolve({ courseId })} />
      </Suspense>,
    );
  });

  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
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

describe("CourseDaysPage", () => {
  let rendered: Awaited<ReturnType<typeof renderPage>> | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
    getCourseByIdMock.mockReturnValue(createCourse());
    getCollectionWordsMock.mockResolvedValue([]);
    getCourseDaysMock.mockResolvedValue([]);
    getSingleListWordsMock.mockResolvedValue([]);
    fetchFilteredFamousQuotesMock.mockResolvedValue([]);
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
  });

  it("shows simple text when a standard course has no days", async () => {
    rendered = await renderPage("TOEIC");

    expect(document.body.textContent).toContain("No data");
  });

  it("shows simple text when a single-list course has no words", async () => {
    getCourseByIdMock.mockReturnValue(
      createCourse({
        id: "JLPT_PREFIX",
        label: "Prefix",
        path: "courses/JLPT_PREFIX",
        storageMode: "singleList",
        schema: "prefix",
      }),
    );

    rendered = await renderPage("JLPT_PREFIX");

    expect(document.body.textContent).toContain("No data");
  });

  it("shows simple text when a flat course has no quotes", async () => {
    getCourseByIdMock.mockReturnValue(
      createCourse({
        id: "FAMOUS_QUOTE",
        label: "Famous Quote",
        path: "famous_quotes",
        storageMode: "flat",
      }),
    );

    rendered = await renderPage("FAMOUS_QUOTE");

    expect(document.body.textContent).toContain("No data");
  });

  it("renders collection-backed JLPT counters with JLPT table props", async () => {
    getCourseByIdMock.mockReturnValue(
      createCourse({
        id: "JLPT_COUNTER",
        label: "Counters",
        path: "JLPT_Counters/GWhncSjjmcrL0X47yU9j",
        storageMode: "collection",
        schema: "jlpt",
      }),
    );
    getCollectionWordsMock.mockImplementation(async (path: string) => {
      if (path === "courses/JLPT_COUNTER/counter_hon") {
        return [{ id: "counter-1", word: "本" }];
      }
      if (path === "courses/JLPT_COUNTER/counter_mai") {
        return [{ id: "counter-2", word: "枚" }];
      }
      return [];
    });

    rendered = await renderPage("JLPT_COUNTER");

    const counterChip = Array.from(document.querySelectorAll('[role="button"], button')).find(
      (element) => element.textContent === "counter_hon",
    );
    const secondCounterChip = Array.from(document.querySelectorAll('[role="button"], button')).find(
      (element) => element.textContent === "counter_mai",
    );

    expect(counterChip?.textContent).toBe("counter_hon");
    expect(secondCounterChip?.textContent).toBe("counter_mai");
    expect(document.getElementById("counter_hon")).not.toBeNull();
    expect(document.getElementById("counter_mai")).toBeNull();
    expect(document.body.textContent?.match(/counter_hon/g)?.length).toBe(1);
    expect(wordTableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isJlpt: true,
        showImageUrl: true,
        coursePath: "courses/JLPT_COUNTER/counter_hon",
        rowIdPrefix: "counter_hon-",
      }),
    );
    expect(document.body.textContent).toContain("counter-1");

    act(() => {
      secondCounterChip?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });

    expect(document.getElementById("counter_hon")).toBeNull();
    expect(document.getElementById("counter_mai")).not.toBeNull();
    expect(document.body.textContent?.match(/counter_mai/g)?.length).toBe(1);
    expect(wordTableMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        coursePath: "courses/JLPT_COUNTER/counter_mai",
        rowIdPrefix: "counter_mai-",
      }),
    );
    expect(document.body.textContent).toContain("counter-2");
  });

  it("does not render counter section chips for non-counter courses", async () => {
    rendered = await renderPage("TOEIC");

    expect(
      Array.from(document.querySelectorAll('[role="button"], button')).some(
        (element) => element.textContent === "counter_hon",
      ),
    ).toBe(false);
  });

  it("renders day cards when a standard course has days", async () => {
    getCourseDaysMock.mockResolvedValue([
      { id: "Day1" },
      { id: "Day2" },
    ]);

    rendered = await renderPage("TOEIC");

    expect(document.body.textContent).toContain("TOEIC:Day1");
    expect(document.body.textContent).toContain("TOEIC:Day2");
    expect(document.body.textContent).not.toContain("No data");
  });
});
