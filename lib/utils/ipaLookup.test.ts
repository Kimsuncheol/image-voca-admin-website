import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatPersistedPronunciation,
  getIpaUSUK,
  getIpaUSUKBatch,
  getPersistedPronunciation,
} from "./ipaLookup";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal Free Dictionary API response with the given phonetics. */
function makeFreeDictResponse(
  phonetics: Array<{ text?: string; audio?: string }>,
) {
  return [{ phonetics }];
}

function mockFetchOk(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockFetchFail(status = 404) {
  return vi.fn().mockResolvedValue({ ok: false, status });
}

// ── formatPersistedPronunciation ───────────────────────────────────────────

describe("formatPersistedPronunciation", () => {
  it("returns the single value when US and UK are identical", () => {
    expect(formatPersistedPronunciation({ us: "/test/", uk: "/test/" })).toBe(
      "/test/",
    );
  });

  it("returns US / UK format when they differ", () => {
    expect(
      formatPersistedPronunciation({ us: "/tɛst/", uk: "/tɛst/" }),
    ).toBe("/tɛst/");

    expect(
      formatPersistedPronunciation({ us: "/ˈwɔːtər/", uk: "/ˈwɔːtə/" }),
    ).toBe("US: /ˈwɔːtər/ / UK: /ˈwɔːtə/");
  });
});

// ── getIpaUSUK (Free Dictionary) ──────────────────────────────────────────

describe("getIpaUSUK — Free Dictionary", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when the API responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", mockFetchFail(404));
    expect(await getIpaUSUK("unknownword1234")).toBeNull();
  });

  it("returns null when phonetics list is empty", async () => {
    vi.stubGlobal("fetch", mockFetchOk(makeFreeDictResponse([])));
    expect(await getIpaUSUK("test")).toBeNull();
  });

  it("returns null when no phonetic entry has text", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk(makeFreeDictResponse([{ audio: "some-audio.mp3" }])),
    );
    expect(await getIpaUSUK("test")).toBeNull();
  });

  it("picks US and UK entries based on audio filename suffix", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk(
        makeFreeDictResponse([
          { text: "/wɔːtər/", audio: "https://cdn/water-us.mp3" },
          { text: "/wɔːtə/", audio: "https://cdn/water-uk.mp3" },
        ]),
      ),
    );
    const result = await getIpaUSUK("water");
    expect(result).toEqual({ us: "/wɔːtər/", uk: "/wɔːtə/" });
  });

  it("falls back to the first text entry when no audio suffix matches", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk(
        makeFreeDictResponse([
          { text: "/hɛloʊ/", audio: "https://cdn/hello.mp3" },
        ]),
      ),
    );
    const result = await getIpaUSUK("hello");
    expect(result).toEqual({ us: "/hɛloʊ/", uk: "/hɛloʊ/" });
  });

  it("returns null and does not throw on network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );
    expect(await getIpaUSUK("test")).toBeNull();
  });
});

// ── getPersistedPronunciation ──────────────────────────────────────────────

describe("getPersistedPronunciation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when word not found", async () => {
    vi.stubGlobal("fetch", mockFetchFail());
    expect(await getPersistedPronunciation("xyz")).toBeNull();
  });

  it("returns formatted string for a found word with identical US/UK", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk(
        makeFreeDictResponse([{ text: "/rʌn/", audio: "run-us.mp3" }]),
      ),
    );
    expect(await getPersistedPronunciation("run")).toBe("/rʌn/");
  });

  it("returns 'US: ... / UK: ...' for differing dialects", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk(
        makeFreeDictResponse([
          { text: "/ˈwɔːtər/", audio: "water-us.mp3" },
          { text: "/ˈwɔːtə/", audio: "water-uk.mp3" },
        ]),
      ),
    );
    expect(await getPersistedPronunciation("water")).toBe(
      "US: /ˈwɔːtər/ / UK: /ˈwɔːtə/",
    );
  });
});

// ── getIpaUSUKBatch ───────────────────────────────────────────────────────

describe("getIpaUSUKBatch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty Map for an empty word list (no fetch calls)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await getIpaUSUKBatch([]);
    expect(result.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns correct results for a single word", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk(
        makeFreeDictResponse([{ text: "/rʌn/", audio: "run-us.mp3" }]),
      ),
    );
    const map = await getIpaUSUKBatch(["run"]);
    expect(map.get("run")).toEqual({ us: "/rʌn/", uk: "/rʌn/" });
  });

  it("maps null for words not found in the API", async () => {
    vi.stubGlobal("fetch", mockFetchFail(404));
    const map = await getIpaUSUKBatch(["xyzzy"]);
    expect(map.get("xyzzy")).toBeNull();
  });

  it("processes all words and returns a complete Map", async () => {
    const responses: Record<string, unknown> = {
      run: makeFreeDictResponse([{ text: "/rʌn/", audio: "run-us.mp3" }]),
      jump: makeFreeDictResponse([{ text: "/dʒʌmp/", audio: "jump-us.mp3" }]),
      unknown: { ok: false }, // will be handled by mockFetchFail pattern
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        const word = decodeURIComponent(url.split("/").pop() ?? "");
        if (word === "unknown") return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(null) });
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(responses[word]),
        });
      }),
    );

    const map = await getIpaUSUKBatch(["run", "jump", "unknown"]);
    expect(map.size).toBe(3);
    expect(map.get("run")).toEqual({ us: "/rʌn/", uk: "/rʌn/" });
    expect(map.get("jump")).toEqual({ us: "/dʒʌmp/", uk: "/dʒʌmp/" });
    expect(map.get("unknown")).toBeNull();
  });

  it("handles network errors per-word without rejecting the whole batch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve(
              makeFreeDictResponse([{ text: "/rʌn/", audio: "run-us.mp3" }]),
            ),
        })
        .mockRejectedValueOnce(new Error("Network error")),
    );

    const map = await getIpaUSUKBatch(["run", "crash"]);
    expect(map.get("run")).toEqual({ us: "/rʌn/", uk: "/rʌn/" });
    expect(map.get("crash")).toBeNull();
  });

  it("respects the concurrency limit — never exceeds N simultaneous fetches", async () => {
    const CONCURRENCY = 3;
    const WORDS = ["a", "b", "c", "d", "e", "f", "g", "h"];

    let inFlight = 0;
    let maxInFlight = 0;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        inFlight++;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise<{ ok: boolean; json: () => Promise<unknown> }>(
          (resolve) => {
            // Yield to allow other tasks to start before resolving
            setTimeout(() => {
              inFlight--;
              resolve({
                ok: true,
                json: () =>
                  Promise.resolve(
                    makeFreeDictResponse([{ text: "/x/", audio: "" }]),
                  ),
              });
            }, 5);
          },
        );
      }),
    );

    await getIpaUSUKBatch(WORDS, undefined, CONCURRENCY);

    expect(maxInFlight).toBeLessThanOrEqual(CONCURRENCY);
    expect(maxInFlight).toBeGreaterThan(1); // Confirm parallelism actually kicked in
  });

  it("uses Oxford API when settings specify it", async () => {
    const oxfordResponse = {
      results: [
        {
          lexicalEntries: [
            {
              pronunciations: [
                {
                  phoneticSpelling: "/ˈwɔːtər/",
                  dialects: ["American English"],
                },
                {
                  phoneticSpelling: "/ˈwɔːtə/",
                  dialects: ["British English"],
                },
              ],
            },
          ],
        },
      ],
    };

    vi.stubGlobal("fetch", mockFetchOk(oxfordResponse));

    const map = await getIpaUSUKBatch(["water"], {
      pronunciationApi: "oxford",
      oxfordAppId: "test-id",
      oxfordAppKey: "test-key",
    });

    expect(map.get("water")).toEqual({
      us: "/ˈwɔːtər/",
      uk: "/ˈwɔːtə/",
    });
  });

  it("falls back to Free Dictionary when Oxford credentials are missing", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetchOk(
        makeFreeDictResponse([{ text: "/rʌn/", audio: "run-us.mp3" }]),
      ),
    );

    const map = await getIpaUSUKBatch(["run"], {
      pronunciationApi: "oxford",
      oxfordAppId: "",   // empty → fall back to Free Dictionary
      oxfordAppKey: "",
    });

    expect(map.get("run")).toEqual({ us: "/rʌn/", uk: "/rʌn/" });
  });
});
