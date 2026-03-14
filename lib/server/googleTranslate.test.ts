import assert from "node:assert/strict";
import test from "node:test";

import {
  translateExampleToKoreanWithGoogle,
  translateTranslationToEnglishWithGoogle,
  translateWithGoogleTranslate,
} from "./googleTranslate.ts";

test("translateExampleToKoreanWithGoogle posts EN to KO to Google Translate v3", async () => {
  let seenUrl = "";
  let seenAuthHeader = "";
  let seenBody = "";

  const translated = await translateExampleToKoreanWithGoogle(
    "1. We had a brief meeting.",
    {
      projectId: "image-voca-app",
      accessToken: "google-token",
      fetchImpl: async (url, init) => {
        seenUrl = String(url);
        seenAuthHeader = new Headers(init?.headers).get("Authorization") ?? "";
        seenBody = String(init?.body);
        return new Response(
          JSON.stringify({
            translations: [{ translatedText: "1. 우리는 짧은 회의를 했다." }],
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(translated, "1. 우리는 짧은 회의를 했다.");
  assert.equal(
    seenUrl,
    "https://translation.googleapis.com/v3/projects/image-voca-app/locations/global:translateText",
  );
  assert.equal(seenAuthHeader, "Bearer google-token");
  assert.match(seenBody, /"sourceLanguageCode":"en"/);
  assert.match(seenBody, /"targetLanguageCode":"ko"/);
  assert.match(seenBody, /brief meeting/);
});

test("translateTranslationToEnglishWithGoogle posts KO to EN to Google Translate v3", async () => {
  let seenBody = "";

  const translated = await translateTranslationToEnglishWithGoogle(
    "1. 우리는 짧은 회의를 했다.",
    {
      projectId: "image-voca-app",
      accessToken: "google-token",
      fetchImpl: async (_url, init) => {
        seenBody = String(init?.body);
        return new Response(
          JSON.stringify({
            translations: [{ translatedText: "1. We had a brief meeting." }],
          }),
          { status: 200 },
        );
      },
    },
  );

  assert.equal(translated, "1. We had a brief meeting.");
  assert.match(seenBody, /"sourceLanguageCode":"ko"/);
  assert.match(seenBody, /"targetLanguageCode":"en"/);
});

test("translateWithGoogleTranslate throws when configuration is missing", async () => {
  await assert.rejects(
    translateWithGoogleTranslate({
      text: "hello",
      sourceLang: "en",
      targetLang: "ko",
      getAccessToken: async () => "google-token",
      projectId: "",
    }),
    /Google Translate is not configured/,
  );
});

test("translateWithGoogleTranslate throws when Google returns empty text", async () => {
  await assert.rejects(
    translateWithGoogleTranslate({
      text: "hello",
      sourceLang: "en",
      targetLang: "ko",
      accessToken: "google-token",
      projectId: "image-voca-app",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            translations: [{ translatedText: "   " }],
          }),
          { status: 200 },
        ),
    }),
    /Google Translate returned an empty translation/,
  );
});
