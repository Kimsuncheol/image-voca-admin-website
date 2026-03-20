import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildFamousQuoteFilterUrl,
  fetchFilteredFamousQuotes,
} from "./famousQuoteApi";

describe("famousQuoteApi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("encodes coursePath and language in the filter URL", () => {
    expect(
      buildFamousQuoteFilterUrl({
        coursePath: "voca/course/FAMOUS_QUOTE",
        language: "Japanese",
      }),
    ).toBe(
      "/api/admin/famous-quotes?coursePath=voca%2Fcourse%2FFAMOUS_QUOTE&language=Japanese",
    );
  });

  it("requests the filtered route and returns the payload", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "quote-1",
              quote: "Stay hungry, stay foolish.",
              author: "Steve Jobs",
              translation: "항상 갈망하고 우직하게 나아가라.",
              language: "English",
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    const quotes = await fetchFilteredFamousQuotes("quotes/path", "English");

    expect(quotes).toHaveLength(1);
    expect(quotes[0]?.id).toBe("quote-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/famous-quotes?coursePath=quotes%2Fpath&language=English",
    );
  });
});
