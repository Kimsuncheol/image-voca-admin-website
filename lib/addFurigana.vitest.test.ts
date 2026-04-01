import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addFuriganaText,
  addFuriganaTexts,
  addFuriganaTextsRobust,
} from "./addFurigana";

describe("addFurigana helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts batch requests with texts only by default", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result_texts: ["猫(ねこ)", "犬(いぬ)"] }),
    } as Response);

    await expect(addFuriganaTexts(["猫", "犬"])).resolves.toEqual([
      "猫(ねこ)",
      "犬(いぬ)",
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/text/add-furigana/batch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ texts: ["猫", "犬"] }),
      }),
    );
  });

  it("includes hiragana_only mode in batch requests when provided", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result_texts: ["ねこ"] }),
    } as Response);

    await addFuriganaTexts(["猫"], { mode: "hiragana_only" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/text/add-furigana/batch",
      expect.objectContaining({
        body: JSON.stringify({
          texts: ["猫"],
          mode: "hiragana_only",
        }),
      }),
    );
  });

  it("short-circuits empty batch requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(addFuriganaTexts([])).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails when the batch response count does not match the request count", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result_texts: ["猫(ねこ)"] }),
    } as Response);

    await expect(addFuriganaTexts(["猫", "犬"])).rejects.toThrow(
      "Failed to add furigana",
    );
  });

  it("fails on non-ok batch responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => ({ detail: "upstream failed" }),
    } as Response);

    await expect(addFuriganaTexts(["猫"])).rejects.toThrow("upstream failed");
  });

  it("keeps single-item parsing unchanged", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ result_text: "猫(ねこ)" }),
    } as Response);

    await expect(addFuriganaText("猫")).resolves.toBe("猫(ねこ)");
  });

  it("chunks robust batch requests and preserves order", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { texts: string[] };
        return {
          ok: true,
          json: async () => ({
            result_texts: body.texts.map((text) => `${text}(ふ)`),
          }),
        } as Response;
      },
    );

    const texts = Array.from({ length: 21 }, (_, index) => `単語${index + 1}`);

    await expect(addFuriganaTextsRobust(texts)).resolves.toEqual(
      texts.map((text) => ({ ok: true, text: `${text}(ふ)` })),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/text/add-furigana/batch",
      expect.objectContaining({
        body: JSON.stringify({ texts: texts.slice(0, 20) }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/text/add-furigana/batch",
      expect.objectContaining({
        body: JSON.stringify({ texts: texts.slice(20) }),
      }),
    );
  });

  it("falls back to single-item requests when a batch payload is invalid", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input, init) => {
        const url = String(input);
        const body = JSON.parse(String(init?.body)) as { texts?: string[]; text?: string };

        if (url === "/api/text/add-furigana/batch") {
          return {
            ok: true,
            json: async () => ({ result_texts: ["猫(ねこ)"] }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({ result_text: `${body.text}(ふ)` }),
        } as Response;
      },
    );

    await expect(addFuriganaTextsRobust(["猫", "犬"])).resolves.toEqual([
      { ok: true, text: "猫(ふ)" },
      { ok: true, text: "犬(ふ)" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("falls back to single-item requests when a batch response is non-ok", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input, init) => {
        const url = String(input);
        const body = JSON.parse(String(init?.body)) as { text?: string };

        if (url === "/api/text/add-furigana/batch") {
          return {
            ok: false,
            json: async () => ({ detail: "upstream failed" }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({ result_text: `${body.text}(ふ)` }),
        } as Response;
      },
    );

    await expect(addFuriganaTextsRobust(["猫"])).resolves.toEqual([
      { ok: true, text: "猫(ふ)" },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns mixed per-item results in order when fallback has partial failures", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const body = JSON.parse(String(init?.body)) as { text?: string };

      if (url === "/api/text/add-furigana/batch") {
        return {
          ok: false,
          json: async () => ({ detail: "batch failed" }),
        } as Response;
      }

      if (body.text === "犬") {
        return {
          ok: false,
          json: async () => ({ detail: "dog failed" }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ result_text: `${body.text}(ふ)` }),
      } as Response;
    });

    await expect(addFuriganaTextsRobust(["猫", "犬", "鳥"])).resolves.toEqual([
      { ok: true, text: "猫(ふ)" },
      { ok: false, error: "dog failed" },
      { ok: true, text: "鳥(ふ)" },
    ]);
  });
});
