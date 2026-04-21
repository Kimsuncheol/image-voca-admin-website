// @vitest-environment jsdom

import { act, type ReactElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CoursesPage from "./page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const labels: Record<string, string> = {
        "courses.title": "Courses",
      };

      return labels[key] ?? fallback ?? key;
    },
  }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/courses/CourseCard", () => ({
  default: ({ course }: { course: { label: string } }) => <div>{course.label}</div>,
}));

vi.mock("@/components/manga/MangaNoAiUploadModal", () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="courses-no-ai-modal">modal open</div> : null,
}));

function renderPage(element: ReactElement) {
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

describe("CoursesPage", () => {
  let rendered: ReturnType<typeof renderPage> | null = null;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  afterEach(() => {
    rendered?.unmount();
    rendered = null;
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    vi.clearAllMocks();
  });

  it("opens the no-AI upload modal from the studio entry panel", () => {
    rendered = renderPage(<CoursesPage />);

    const trigger = Array.from(document.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Upload manga (no AI)"),
    );

    expect(trigger).not.toBeUndefined();

    act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.querySelector('[data-testid="courses-no-ai-modal"]')).not.toBeNull();
  });

  it("shows the Kanji course card", () => {
    rendered = renderPage(<CoursesPage />);

    expect(document.body.textContent).toContain("Kanji");
  });
});
