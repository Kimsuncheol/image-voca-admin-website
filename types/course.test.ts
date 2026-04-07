import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeCoursePath } from "@/lib/coursePath";
import { getCourseById } from "./course";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("normalizeCoursePath", () => {
  it("trims whitespace and removes leading slashes", () => {
    expect(normalizeCoursePath("  /voca/course/path  ")).toBe(
      "voca/course/path",
    );
  });

  it("returns an empty string for missing values", () => {
    expect(normalizeCoursePath("   ")).toBe("");
    expect(normalizeCoursePath(undefined)).toBe("");
  });
});

describe("JLPT affix course paths", () => {
  it("uses a stable non-empty code-defined path for prefix", () => {
    expect(getCourseById("JLPT_PREFIX")?.path).toBe(
      "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/prefix/XwuTuOsvngV6ZJ97RfP5",
    );
  });

  it("uses a stable non-empty code-defined path for postfix", () => {
    expect(getCourseById("JLPT_POSTFIX")?.path).toBe(
      "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/postfix/nxvs4uhsrxb3myl4OwVi",
    );
  });

  it("uses the configured env path for counters", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_JLPT_COUNTER_PATH",
      "/JLPT_Counters/GWhncSjjmcrL0X47yU9j",
    );
    vi.resetModules();

    return import("./course").then(({ getCourseById: getDynamicCourseById }) => {
      expect(getDynamicCourseById("JLPT_COUNTER")?.path).toBe(
        "JLPT_Counters/GWhncSjjmcrL0X47yU9j",
      );
    });
  });

  it("marks affix courses as single-list storage", () => {
    expect(getCourseById("JLPT_PREFIX")?.storageMode).toBe("singleList");
    expect(getCourseById("JLPT_POSTFIX")?.storageMode).toBe("singleList");
    expect(getCourseById("JLPT_PREFIX")?.singleListSubcollection).toBe("prefix");
    expect(getCourseById("JLPT_POSTFIX")?.singleListSubcollection).toBe("postfix");
  });

  it("marks counters as direct collection storage after the env-backed import", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_JLPT_COUNTER_PATH",
      "/JLPT_Counters/GWhncSjjmcrL0X47yU9j",
    );
    vi.resetModules();
    const { getCourseById: getDynamicCourseById } = await import("./course");

    expect(getDynamicCourseById("JLPT_COUNTER")?.storageMode).toBe("collection");
    expect(getDynamicCourseById("JLPT_COUNTER")?.singleListSubcollection).toBeUndefined();
  });

  it("places counters after postfix in the JLPT chip order", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_JLPT_COUNTER_PATH",
      "/JLPT_Counters/GWhncSjjmcrL0X47yU9j",
    );
    vi.resetModules();
    const { JLPT_LEVEL_COURSES } = await import("./course");

    expect(JLPT_LEVEL_COURSES.slice(-3).map((course) => course.id)).toEqual([
      "JLPT_PREFIX",
      "JLPT_POSTFIX",
      "JLPT_COUNTER",
    ]);
  });

  it("includes counter_years and keeps JLPT counter options in env order", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_NUMBERS_PATH",
      "/jlpt-counter/numbers",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_TSUU_PATH",
      "/jlpt-counter/counter_tsuu",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_KO_PATH",
      "/jlpt-counter/counter_ko",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_KAI_FLOOR_PATH",
      "/jlpt-counter/counter_kai_floor",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_KAI_TIMES_PATH",
      "/jlpt-counter/counter_kai_times",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_BAN_PATH",
      "/jlpt-counter/counter_ban",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_YEARS_PATH",
      "/jlpt-counter/counter_years",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_MONTHS_PATH",
      "/jlpt-counter/counter_months",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_DAYS_PATH",
      "/jlpt-counter/counter_days",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_HOURS_PATH",
      "/jlpt-counter/counter_hours",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_MINUTES_PATH",
      "/jlpt-counter/counter_minutes",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_WEEKDAYS_PATH",
      "/jlpt-counter/counter_weekdays",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_HAI_PATH",
      "/jlpt-counter/counter_hai",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_BAI_PATH",
      "/jlpt-counter/counter_bai",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_HON_PATH",
      "/jlpt-counter/counter_hon",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_MAI_PATH",
      "/jlpt-counter/counter_mai",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_NIN_PATH",
      "/jlpt-counter/counter_nin",
    );
    vi.stubEnv(
      "NEXT_PUBLIC_JLTP_COUNTER_COUNTER_HIKI_PATH",
      "/jlpt-counter/counter_hiki",
    );
    vi.resetModules();

    const { JLPT_COUNTER_OPTIONS } = await import("./course");

    expect(JLPT_COUNTER_OPTIONS.map((option) => option.id)).toEqual([
      "numbers",
      "counter_tsuu",
      "counter_ko",
      "counter_kai_floor",
      "counter_kai_times",
      "counter_ban",
      "counter_years",
      "counter_months",
      "counter_days",
      "counter_hours",
      "counter_minutes",
      "counter_weekdays",
      "counter_hai",
      "counter_bai",
      "counter_hon",
      "counter_mai",
      "counter_nin",
      "counter_hiki",
    ]);
    expect(
      JLPT_COUNTER_OPTIONS.find((option) => option.id === "counter_years")?.path,
    ).toBe("jlpt-counter/counter_years");
    expect(
      JLPT_COUNTER_OPTIONS.find((option) => option.id === "numbers")?.label,
    ).toBe("Numbers");
    expect(
      JLPT_COUNTER_OPTIONS.find((option) => option.id === "counter_tsuu")?.label,
    ).toBe("Counter Tsuu");
    expect(
      JLPT_COUNTER_OPTIONS.find((option) => option.id === "counter_years")?.label,
    ).toBe("Counter Years");
  });
});
