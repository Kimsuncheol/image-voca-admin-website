import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { DEFAULT_AI_SETTINGS } from "../../../../lib/aiSettings.ts";

import { createTranslateWordFieldHandler } from "./translateWordField.ts";

function createRequest(body: string) {
  return new NextRequest("http://localhost/api/admin/translate-word-field", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });
}

function createAdminUser(overrides?: {
  role?: "admin" | "super-admin" | "user";
  exampleTranslationGeneration?: boolean;
}) {
  return {
    uid: "admin-1",
    email: "admin@example.com",
    displayName: "Admin",
    role: overrides?.role ?? "admin",
    adminPermissions: {
      imageGeneration: true,
      exampleTranslationGeneration:
        overrides?.exampleTranslationGeneration ?? true,
      planModification: false,
      roleModification: false,
    },
  };
}

test("route returns Korean translation for an example", async () => {
  const handler = createTranslateWordFieldHandler({
    getServerAISettings: async () => DEFAULT_AI_SETTINGS,
    translateExampleToKoreanWithDeepL: async (example) => `${example} [KO]`,
    translateTranslationToEnglishWithDeepL: async () => {
      throw new Error("should not be called");
    },
    translateExampleToKoreanWithGoogle: async () => {
      throw new Error("should not be called");
    },
    translateTranslationToEnglishWithGoogle: async () => {
      throw new Error("should not be called");
    },
    verifySessionUser: async () => createAdminUser(),
  });

  const response = await handler(
    createRequest(JSON.stringify({ field: "example", example: "1. Hello." })),
  );
  const payload = (await response.json()) as { translation?: string };

  assert.equal(response.status, 200);
  assert.equal(payload.translation, "1. Hello. [KO]");
});

test("route returns English example for a translation", async () => {
  const handler = createTranslateWordFieldHandler({
    getServerAISettings: async () => DEFAULT_AI_SETTINGS,
    translateExampleToKoreanWithDeepL: async () => {
      throw new Error("should not be called");
    },
    translateTranslationToEnglishWithDeepL: async (translation) =>
      `${translation} [EN]`,
    translateExampleToKoreanWithGoogle: async () => {
      throw new Error("should not be called");
    },
    translateTranslationToEnglishWithGoogle: async () => {
      throw new Error("should not be called");
    },
    verifySessionUser: async () => createAdminUser(),
  });

  const response = await handler(
    createRequest(
      JSON.stringify({
        field: "translation",
        translation: "1. 안녕하세요.",
      }),
    ),
  );
  const payload = (await response.json()) as { example?: string };

  assert.equal(response.status, 200);
  assert.equal(payload.example, "1. 안녕하세요. [EN]");
});

test("route dispatches to Google Translate when selected in settings", async () => {
  const handler = createTranslateWordFieldHandler({
    getServerAISettings: async () => ({
      ...DEFAULT_AI_SETTINGS,
      exampleTranslationApi: "google-translate",
    }),
    translateExampleToKoreanWithDeepL: async () => {
      throw new Error("should not be called");
    },
    translateTranslationToEnglishWithDeepL: async () => {
      throw new Error("should not be called");
    },
    translateExampleToKoreanWithGoogle: async (example) => `${example} [GOOGLE KO]`,
    translateTranslationToEnglishWithGoogle: async () => {
      throw new Error("should not be called");
    },
    verifySessionUser: async () => createAdminUser(),
  });

  const response = await handler(
    createRequest(JSON.stringify({ field: "example", example: "1. Hello." })),
  );
  const payload = (await response.json()) as { translation?: string };

  assert.equal(response.status, 200);
  assert.equal(payload.translation, "1. Hello. [GOOGLE KO]");
});

test("route returns provider failures as non-200 responses", async () => {
  const handler = createTranslateWordFieldHandler({
    getServerAISettings: async () => ({
      ...DEFAULT_AI_SETTINGS,
      exampleTranslationApi: "google-translate",
    }),
    translateExampleToKoreanWithDeepL: async () => "unused",
    translateTranslationToEnglishWithDeepL: async () => "unused",
    translateExampleToKoreanWithGoogle: async () => {
      throw new Error("Google Translate is not configured.");
    },
    translateTranslationToEnglishWithGoogle: async () => "unused",
    verifySessionUser: async () => createAdminUser(),
  });

  const response = await handler(
    createRequest(JSON.stringify({ field: "example", example: "1. Hello." })),
  );
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 503);
  assert.equal(payload.error, "Google Translate is not configured.");
});

test("route rejects unauthorized users", async () => {
  const handler = createTranslateWordFieldHandler({
    getServerAISettings: async () => DEFAULT_AI_SETTINGS,
    translateExampleToKoreanWithDeepL: async () => "unused",
    translateTranslationToEnglishWithDeepL: async () => "unused",
    translateExampleToKoreanWithGoogle: async () => "unused",
    translateTranslationToEnglishWithGoogle: async () => "unused",
    verifySessionUser: async () => null,
  });

  const response = await handler(
    createRequest(JSON.stringify({ field: "example", example: "1. Hello." })),
  );
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 401);
  assert.equal(payload.error, "Unauthorized");
});

test("route rejects disabled enrich generation", async () => {
  const handler = createTranslateWordFieldHandler({
    getServerAISettings: async () => ({
      ...DEFAULT_AI_SETTINGS,
      enrichGenerationEnabled: false,
    }),
    translateExampleToKoreanWithDeepL: async () => "unused",
    translateTranslationToEnglishWithDeepL: async () => "unused",
    translateExampleToKoreanWithGoogle: async () => "unused",
    translateTranslationToEnglishWithGoogle: async () => "unused",
    verifySessionUser: async () => createAdminUser(),
  });

  const response = await handler(
    createRequest(JSON.stringify({ field: "example", example: "1. Hello." })),
  );
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 403);
  assert.equal(
    payload.error,
    "Example and translation generation is disabled in AI settings.",
  );
});

test("route rejects admins without example/translation permission", async () => {
  const handler = createTranslateWordFieldHandler({
    getServerAISettings: async () => DEFAULT_AI_SETTINGS,
    translateExampleToKoreanWithDeepL: async () => "unused",
    translateTranslationToEnglishWithDeepL: async () => "unused",
    translateExampleToKoreanWithGoogle: async () => "unused",
    translateTranslationToEnglishWithGoogle: async () => "unused",
    verifySessionUser: async () =>
      createAdminUser({ exampleTranslationGeneration: false }),
  });

  const response = await handler(
    createRequest(JSON.stringify({ field: "translation", translation: "1. 안녕하세요." })),
  );
  const payload = (await response.json()) as { error?: string };

  assert.equal(response.status, 403);
  assert.equal(
    payload.error,
    "Example and translation generation is disabled for your administrator account.",
  );
});

test("route rejects invalid request bodies", async () => {
  const handler = createTranslateWordFieldHandler({
    getServerAISettings: async () => DEFAULT_AI_SETTINGS,
    translateExampleToKoreanWithDeepL: async () => "unused",
    translateTranslationToEnglishWithDeepL: async () => "unused",
    translateExampleToKoreanWithGoogle: async () => "unused",
    translateTranslationToEnglishWithGoogle: async () => "unused",
    verifySessionUser: async () => createAdminUser(),
  });

  const invalidJsonResponse = await handler(createRequest("{"));
  const invalidJsonPayload = (await invalidJsonResponse.json()) as { error?: string };
  assert.equal(invalidJsonResponse.status, 400);
  assert.equal(invalidJsonPayload.error, "Invalid JSON");

  const invalidFieldResponse = await handler(
    createRequest(JSON.stringify({ field: "pronunciation", example: "1. Hello." })),
  );
  const invalidFieldPayload = (await invalidFieldResponse.json()) as { error?: string };
  assert.equal(invalidFieldResponse.status, 400);
  assert.equal(invalidFieldPayload.error, "Invalid field");

  const missingTextResponse = await handler(
    createRequest(JSON.stringify({ field: "translation" })),
  );
  const missingTextPayload = (await missingTextResponse.json()) as { error?: string };
  assert.equal(missingTextResponse.status, 400);
  assert.equal(missingTextPayload.error, "translation is required");
});
