import assert from "node:assert/strict";
import test from "node:test";

import {
  translateBatchWithDeepL,
  translateEnglishToJapaneseBatch,
  translateEnglishToJapanese,
  translateExampleToKorean,
  translateKoreanToJapaneseBatch,
  translateKoreanToJapanese,
  translateTranslationToEnglish,
  translateWithDeepL,
} from "./deepl.ts";

test("translateExampleToKorean posts EN to KO to DeepL", async () => {
  let seenUrl = "";
  let seenAuthHeader = "";
  let seenBody = "";

  const translated = await translateExampleToKorean(
    "1. We had a brief meeting.",
    {
      apiKey: "test-key",
      baseUrl: "https://api.deepl.test/v2/",
      fetchImpl: async (url, init) => {
        seenUrl = String(url);
        seenAuthHeader = new Headers(init?.headers).get("Authorization") ?? "";
        seenBody = String(init?.body);
        return new Response(
          JSON.stringify({
            translations: [{ text: "1. 우리는 짧은 회의를 했다." }],
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(translated, "1. 우리는 짧은 회의를 했다.");
  assert.equal(seenUrl, "https://api.deepl.test/v2/translate");
  assert.equal(seenAuthHeader, "DeepL-Auth-Key test-key");
  assert.match(seenBody, /source_lang=EN/);
  assert.match(seenBody, /target_lang=KO/);
  assert.match(seenBody, /brief\+meeting/);
});

test("translateTranslationToEnglish posts KO to EN to DeepL", async () => {
  let seenBody = "";

  const translated = await translateTranslationToEnglish(
    "1. 우리는 짧은 회의를 했다.",
    {
      apiKey: "test-key",
      fetchImpl: async (_url, init) => {
        seenBody = String(init?.body);
        return new Response(
          JSON.stringify({
            translations: [{ text: "1. We had a brief meeting." }],
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(translated, "1. We had a brief meeting.");
  assert.match(seenBody, /source_lang=KO/);
  assert.match(seenBody, /target_lang=EN/);
});

test("translateKoreanToJapanese posts KO to JA to DeepL", async () => {
  let seenBody = "";

  const translated = await translateKoreanToJapanese(
    "고양이가 있다.",
    {
      apiKey: "test-key",
      fetchImpl: async (_url, init) => {
        seenBody = String(init?.body);
        return new Response(
          JSON.stringify({
            translations: [{ text: "猫がいる。" }],
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(translated, "猫がいる。");
  assert.match(seenBody, /source_lang=KO/);
  assert.match(seenBody, /target_lang=JA/);
});

test("translateEnglishToJapanese posts EN to JA to DeepL", async () => {
  let seenBody = "";

  const translated = await translateEnglishToJapanese(
    "There is a cat.",
    {
      apiKey: "test-key",
      fetchImpl: async (_url, init) => {
        seenBody = String(init?.body);
        return new Response(
          JSON.stringify({
            translations: [{ text: "猫がいる。" }],
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(translated, "猫がいる。");
  assert.match(seenBody, /source_lang=EN/);
  assert.match(seenBody, /target_lang=JA/);
});

test("translateBatchWithDeepL posts multiple texts in order", async () => {
  let seenBody = "";

  const translated = await translateBatchWithDeepL({
    texts: ["고양이가 있다.", "개가 있다."],
    sourceLang: "KO",
    targetLang: "JA",
    apiKey: "test-key",
    fetchImpl: async (_url, init) => {
      seenBody = String(init?.body);
      return new Response(
        JSON.stringify({
          translations: [{ text: "猫がいる。" }, { text: "犬がいる。" }],
        }),
        { status: 200 },
      );
    },
  });

  assert.deepEqual(translated, ["猫がいる。", "犬がいる。"]);
  assert.match(seenBody, /text=%EA%B3%A0/);
  assert.match(seenBody, /text=%EA%B0%9C/);
  assert.match(seenBody, /source_lang=KO/);
  assert.match(seenBody, /target_lang=JA/);
});

test("translateBatchWithDeepL chunks requests above 50 texts", async () => {
  const seenBodies: string[] = [];

  const translated = await translateBatchWithDeepL({
    texts: Array.from({ length: 51 }, (_, index) => `Text ${index + 1}`),
    sourceLang: "EN",
    targetLang: "JA",
    apiKey: "test-key",
    fetchImpl: async (_url, init) => {
      const body = String(init?.body);
      seenBodies.push(body);
      const itemCount = (body.match(/(^|&)text=/g) ?? []).length;
      return new Response(
        JSON.stringify({
          translations: Array.from({ length: itemCount }, (_, index) => ({
            text: `translated-${seenBodies.length}-${index + 1}`,
          })),
        }),
        { status: 200 },
      );
    },
  });

  assert.equal(seenBodies.length, 2);
  assert.equal((seenBodies[0].match(/(^|&)text=/g) ?? []).length, 50);
  assert.equal((seenBodies[1].match(/(^|&)text=/g) ?? []).length, 1);
  assert.equal(translated.length, 51);
  assert.equal(translated[0], "translated-1-1");
  assert.equal(translated[50], "translated-2-1");
});

test("translateBatchWithDeepL returns null for empty translated items", async () => {
  const translated = await translateBatchWithDeepL({
    texts: ["There is a cat."],
    sourceLang: "EN",
    targetLang: "JA",
    apiKey: "test-key",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          translations: [{ text: "   " }],
        }),
        { status: 200 },
      ),
  });

  assert.deepEqual(translated, [null]);
});

test("language-specific batch helpers set the expected source language", async () => {
  const seenBodies: string[] = [];

  await translateKoreanToJapaneseBatch(["고양이가 있다."], {
    apiKey: "test-key",
    fetchImpl: async (_url, init) => {
      seenBodies.push(String(init?.body));
      return new Response(
        JSON.stringify({
          translations: [{ text: "猫がいる。" }],
        }),
        { status: 200 },
      );
    },
  });

  await translateEnglishToJapaneseBatch(["There is a cat."], {
    apiKey: "test-key",
    fetchImpl: async (_url, init) => {
      seenBodies.push(String(init?.body));
      return new Response(
        JSON.stringify({
          translations: [{ text: "猫がいる。" }],
        }),
        { status: 200 },
      );
    },
  });

  assert.match(seenBodies[0], /source_lang=KO/);
  assert.match(seenBodies[0], /target_lang=JA/);
  assert.match(seenBodies[1], /source_lang=EN/);
  assert.match(seenBodies[1], /target_lang=JA/);
});

test("translateWithDeepL throws when DeepL returns empty text", async () => {
  await assert.rejects(
    translateWithDeepL({
      text: "hello",
      sourceLang: "EN",
      targetLang: "KO",
      apiKey: "test-key",
      fetchImpl: async () =>
        new Response(JSON.stringify({ translations: [{ text: "   " }] }), {
          status: 200,
        }),
    }),
    /DeepL returned an empty translation/,
  );
});

test("translateWithDeepL throws when DeepL is not configured", async () => {
  await assert.rejects(
    translateWithDeepL({
      text: "hello",
      sourceLang: "EN",
      targetLang: "KO",
      apiKey: "",
    }),
    /DeepL is not configured/,
  );
});
