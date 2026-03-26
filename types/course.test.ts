import { describe, expect, it } from "vitest";

import { normalizeCoursePath } from "@/lib/coursePath";
import { getCourseById } from "./course";

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

  it("marks affix courses as single-list storage", () => {
    expect(getCourseById("JLPT_PREFIX")?.storageMode).toBe("singleList");
    expect(getCourseById("JLPT_POSTFIX")?.storageMode).toBe("singleList");
    expect(getCourseById("JLPT_PREFIX")?.singleListSubcollection).toBe("prefix");
    expect(getCourseById("JLPT_POSTFIX")?.singleListSubcollection).toBe("postfix");
  });
});
