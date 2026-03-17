import { afterEach, describe, expect, it, vi } from "vitest";

import { lookupJlptPronunciations } from "./jmdictPronunciation";

describe("lookupJlptPronunciations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("normalizes configured API results", async () => {
    vi.stubEnv("JMDICT_API_BASE_URL", "https://example.com/jmdict");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                word: "猫",
                reading: "ねこ",
                romaji: "neko",
              },
            ],
          }),
      }),
    );

    await expect(lookupJlptPronunciations(["猫"])).resolves.toEqual([
      {
        word: "猫",
        pronunciation: "ねこ",
        pronunciationRoman: "neko",
      },
    ]);
  });

  it("throws when the API is not configured", async () => {
    vi.stubEnv("JMDICT_API_BASE_URL", "");

    await expect(lookupJlptPronunciations(["猫"])).rejects.toThrow(
      "JMdict API is not configured.",
    );
  });
});
