import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import NaverDictPage, {
  extractDictTypeOptions,
  formatPayload,
  mergeDictTypeOptions,
} from "./page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      const labels: Record<string, string> = {
        "naverDict.title": "Naver Dict API",
        "naverDict.description": "Manual tester for dictionary endpoints.",
        "naverDict.dictTypesTitle": "Dict Types",
        "naverDict.dictTypesDescription":
          "Fetch the available dictionary types from /dict/types.",
        "naverDict.fetchTypes": "Fetch dict types",
        "naverDict.loading": "Loading...",
        "naverDict.responseTitle": "Raw response",
        "naverDict.emptyTypes": "No dict types response yet.",
        "naverDict.searchTitle": "Search",
        "naverDict.searchDescription":
          "Search /dict/search with the selected dictionary type and mode.",
        "naverDict.queryLabel": "Query",
        "naverDict.dictTypeLabel": "Dictionary type",
        "naverDict.dictTypeHelper": "Choose one of the available dictionary types.",
        "naverDict.dictTypeOptionsLoadError":
          "Couldn't load dictionary types. Using the built-in list.",
        "naverDict.dictTypeOptionsEmpty":
          "No additional dictionary types were returned. Using the built-in list.",
        "naverDict.searchModeLabel": "Search mode",
        "naverDict.searchModeSimple": "Simple",
        "naverDict.searchModeDetailed": "Detailed",
        "naverDict.searchAction": "Search",
        "naverDict.resetAction": "Reset",
        "naverDict.emptySearch": "No search response yet.",
      };

      if (labels[key]) return labels[key];
      if (typeof fallback === "string") return fallback;
      return key;
    },
  }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useAdminGuard", () => ({
  useAdminGuard: () => ({
    user: { role: "admin" },
    authLoading: false,
  }),
}));

describe("NaverDictPage", () => {
  it("renders both tester sections and the default search values", () => {
    const markup = renderToStaticMarkup(<NaverDictPage />);

    expect(markup).toContain("Naver Dict API");
    expect(markup).toContain("Dict Types");
    expect(markup).toContain("Search");
    expect(markup).toContain("No dict types response yet.");
    expect(markup).toContain("No search response yet.");
    expect(markup).toContain("Choose one of the available dictionary types.");
    expect(markup).toContain("<option value=\"english\" selected=\"\">english</option>");
    expect(markup).toContain("<option value=\"korean\">korean</option>");
    expect(markup).toContain("<option value=\"japanese\">japanese</option>");
    expect(markup).toContain("<option value=\"hanja\">hanja</option>");
    expect(markup).toContain("<option value=\"chinese\">chinese</option>");
    expect(markup).toContain("<option value=\"german\">german</option>");
    expect(markup).toContain("<option value=\"french\">french</option>");
    expect(markup).toContain("<option value=\"spanish\">spanish</option>");
    expect(markup).toContain("<option value=\"russian\">russian</option>");
    expect(markup).toContain("<option value=\"vietnamese\">vietnamese</option>");
    expect(markup).toContain("<option value=\"italian\">italian</option>");
    expect(markup).toContain("<option value=\"thai\">thai</option>");
    expect(markup).toContain("<option value=\"indonesian\">indonesian</option>");
    expect(markup).toContain("<option value=\"uzbek\">uzbek</option>");
    expect(markup).toContain("value=\"english\"");
    expect(markup).toContain("value=\"simple\"");
  });
});

describe("formatPayload", () => {
  it("formats representative payload shapes into visible text", () => {
    expect(formatPayload({ ok: true })).toContain('"ok": true');
    expect(formatPayload(["alpha", "beta"])).toContain('"alpha"');
    expect(formatPayload("plain text response")).toBe("plain text response");
    expect(formatPayload(undefined)).toBe("undefined");
    expect(formatPayload(null)).toBe("null");
  });
});

describe("extractDictTypeOptions", () => {
  it("extracts dictionary types from supported payload shapes", () => {
    expect(extractDictTypeOptions(["english", "korean"])).toEqual([
      "english",
      "korean",
    ]);
    expect(
      extractDictTypeOptions({
        types: ["english", " japanese ", 7, "", "english"],
      }),
    ).toEqual(["english", "japanese"]);
  });

  it("returns an empty list for unusable payloads", () => {
    expect(extractDictTypeOptions({ items: ["english"] })).toEqual([]);
    expect(extractDictTypeOptions(null)).toEqual([]);
  });
});

describe("mergeDictTypeOptions", () => {
  it("keeps the built-in dictionary types and appends extra API values", () => {
    expect(mergeDictTypeOptions(null)).toEqual([
      "english",
      "korean",
      "japanese",
      "hanja",
      "chinese",
      "german",
      "french",
      "spanish",
      "russian",
      "vietnamese",
      "italian",
      "thai",
      "indonesian",
      "uzbek",
    ]);
    expect(mergeDictTypeOptions({ types: ["english", "french", "hanja"] })).toEqual([
      "english",
      "korean",
      "japanese",
      "hanja",
      "chinese",
      "german",
      "french",
      "spanish",
      "russian",
      "vietnamese",
      "italian",
      "thai",
      "indonesian",
      "uzbek",
    ]);
  });
});
