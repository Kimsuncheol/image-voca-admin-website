import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_AI_SETTINGS,
  normalizeAISettings,
} from "./aiSettings.ts";

test("normalizeAISettings returns defaults when no value is provided", () => {
  assert.deepEqual(normalizeAISettings(), DEFAULT_AI_SETTINGS);
});

test("normalizeAISettings merges partial settings with defaults", () => {
  assert.deepEqual(
    normalizeAISettings({
      imageGenerationEnabled: false,
      enrichModel: "chatgpt",
      exampleTranslationApi: "google-translate",
    }),
    {
      imageGenerationEnabled: false,
      imageModel: "nano-banana2",
      enrichGenerationEnabled: true,
      enrichModel: "chatgpt",
      exampleTranslationApi: "google-translate",
      pronunciationApi: "free-dictionary",
      oxfordAppId: "",
      oxfordAppKey: "",
    },
  );
});
