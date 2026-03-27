import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  extractMeaningForWord,
  lookupMeanings,
} from "./naverDictMeaning";

const fetchMock = vi.fn<typeof fetch>();

describe("naverDictMeaning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NAVER_DICT_API_BASE_URL", "https://example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("extracts exact-match meanings from supported payload shapes", () => {
    expect(
      extractMeaningForWord("careful", {
        items: [{ word: "careful", meanings: ["showing care"] }],
      }),
    ).toBe("showing care");
    expect(
      extractMeaningForWord("careful", [{ word: "careful", meaning: "showing care" }]),
    ).toBe("showing care");
  });

  it("uses bounded batches while preserving unique-word results and per-word failures", async () => {
    const inFlightQueries = new Set<string>();
    let maxConcurrentBatches = 0;

    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      const query = url.searchParams.get("query") ?? "";
      inFlightQueries.add(query);
      maxConcurrentBatches = Math.max(maxConcurrentBatches, inFlightQueries.size);

      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlightQueries.delete(query);

      if (query === "broken") {
        return new Response(JSON.stringify({ detail: "bad" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          items: [{ word: query, meanings: [`meaning:${query}`] }],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const result = await lookupMeanings(
      ["careful", "usable", "careful", "broken"],
      {
        batchSize: 2,
        batchConcurrency: 1,
      },
    );

    expect(result).toEqual([
      { word: "careful", meaning: "meaning:careful" },
      { word: "usable", meaning: "meaning:usable" },
      { word: "broken", meaning: null, error: "Lookup failed." },
    ]);
    expect(maxConcurrentBatches).toBeLessThanOrEqual(2);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
