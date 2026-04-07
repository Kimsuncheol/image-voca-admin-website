import { afterEach, describe, expect, it, vi } from "vitest";

import { validateUploadCourse } from "./addVocaUploadPreflight";
import { getCourseById, type Course } from "@/types/course";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("validateUploadCourse", () => {
  it("accepts JLPT affix courses with normalized paths", () => {
    const result = validateUploadCourse(getCourseById("JLPT_PREFIX"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.course.path).toBe(
      "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/prefix/XwuTuOsvngV6ZJ97RfP5",
    );
  });

  it("accepts the JLPT counters single-list course path", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_JLPT_COUNTER_PATH",
      "/JLPT_Counters/GWhncSjjmcrL0X47yU9j",
    );
    vi.resetModules();
    const { getCourseById: getDynamicCourseById } = await import("@/types/course");
    const result = validateUploadCourse(getDynamicCourseById("JLPT_COUNTER"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.course.path).toBe("JLPT_Counters/GWhncSjjmcrL0X47yU9j");
  });

  it("rejects blank course paths before upload starts", () => {
    const blankCourse: Course = {
      id: "TOEIC",
      label: "TOEIC",
      path: "   ",
      schema: "standard",
      storageMode: "day",
    };

    expect(validateUploadCourse(blankCourse)).toEqual({
      ok: false,
      reason: "missing-path",
    });
  });
});
