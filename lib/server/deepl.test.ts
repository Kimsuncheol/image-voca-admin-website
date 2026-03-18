import assert from "node:assert/strict";
import test from "node:test";

import {
  translateEnglishToJapanese,
  translateExampleToKorean,
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
