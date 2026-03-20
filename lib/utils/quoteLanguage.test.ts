import { describe, expect, it } from "vitest";

import {
  classifyQuoteLanguage,
  normalizeQuoteLanguage,
  quoteMatchesLanguage,
  resolveQuoteLanguage,
  textMatchesLanguage,
} from "./quoteLanguage";

describe("quoteLanguage", () => {
  it("only accepts supported stored language values", () => {
    expect(normalizeQuoteLanguage("English")).toBe("English");
    expect(normalizeQuoteLanguage("Japanese")).toBe("Japanese");
    expect(normalizeQuoteLanguage("Korean")).toBeNull();
  });

  it("classifies a quote when only one language regex matches", () => {
    expect(classifyQuoteLanguage("Stay hungry, stay foolish.")).toBe("English");
    expect(classifyQuoteLanguage("七転び八起き")).toBe("Japanese");
    expect(classifyQuoteLanguage("Hello こんにちは")).toBeNull();
  });

  it("matches quotes against the shared regex helpers", () => {
    expect(quoteMatchesLanguage("Stay hungry.", "English")).toBe(true);
    expect(quoteMatchesLanguage("七転び八起き", "English")).toBe(false);
    expect(quoteMatchesLanguage("七転び八起き", "Japanese")).toBe(true);
    expect(textMatchesLanguage("Take off your coat.", "English")).toBe(true);
    expect(textMatchesLanguage("猫がいる。", "Japanese")).toBe(true);
  });

  it("prefers stored language over regex fallback when resolving", () => {
    expect(resolveQuoteLanguage("English", "七転び八起き")).toBe("English");
    expect(resolveQuoteLanguage(undefined, "七転び八起き")).toBe("Japanese");
    expect(resolveQuoteLanguage(undefined, "Hello こんにちは")).toBeNull();
  });
});
