import { describe, expect, it } from "vitest";

import { validateUploadCourse } from "./addVocaUploadPreflight";
import { getCourseById, type Course } from "@/types/course";

describe("validateUploadCourse", () => {
  it("accepts JLPT affix courses with normalized paths", () => {
    const result = validateUploadCourse(getCourseById("JLPT_PREFIX"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.course.path).toBe(
      "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/prefix/XwuTuOsvngV6ZJ97RfP5",
    );
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
