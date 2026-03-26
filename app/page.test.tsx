import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import Home from "./page";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const labels: Record<string, string> = {
        "dashboard.title": "Dashboard",
        "dashboard.addVoca": "Add Vocabulary",
        "dashboard.addVocaDesc": "Upload vocabulary data via CSV or links",
        "dashboard.courses": "Courses",
        "dashboard.coursesDesc": "Browse and manage course vocabulary",
        "dashboard.wordFinder": "Word Finder",
        "dashboard.wordFinderDesc": "Search vocabulary across courses and days",
        "dashboard.userManagement": "User Management",
        "dashboard.userManagementDesc": "Manage users and roles",
        "dashboard.ads": "Advertisements",
        "dashboard.adsDesc": "Manage video advertisements",
        "dashboard.promotionCodes": "Promotion Codes",
        "dashboard.promotionCodesDesc": "Generate and manage promotion codes",
        "dashboard.naverDictApi": "Naver Dict API",
        "dashboard.naverDictApiDesc": "Test /dict/types and /dict/search",
        "dashboard.settings": "Settings",
        "dashboard.settingsDesc": "Configure AI models for generation",
      };

      return labels[key] ?? key;
    },
  }),
}));

vi.mock("@/components/layout/PageLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/dashboard/NavCard", () => ({
  default: ({
    title,
    description,
    href,
  }: {
    title: string;
    description: string;
    href: string;
  }) => (
    <a href={href}>
      <span>{title}</span>
      <span>{description}</span>
    </a>
  ),
}));

describe("Dashboard page", () => {
  it("includes the Naver Dict API card", () => {
    const markup = renderToStaticMarkup(<Home />);

    expect(markup).toContain("Naver Dict API");
    expect(markup).toContain("Test /dict/types and /dict/search");
    expect(markup).toContain("/naver-dict");
  });
});
