import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_AI_SETTINGS } from "../aiSettings.ts";

import {
  getEnrichGenerationDisabledResponse,
  getImageGenerationDisabledResponse,
  isImageGenerationEnabled,
  shouldBlockEnrichGeneration,
  shouldBlockWordFieldGeneration,
} from "./aiFeatureGuards.ts";

test("image generation helpers allow enabled settings and expose a disabled response", () => {
  assert.equal(isImageGenerationEnabled(DEFAULT_AI_SETTINGS), true);

  const disabledResponse = getImageGenerationDisabledResponse();
  assert.equal(disabledResponse.status, 403);
  assert.deepEqual(disabledResponse.body, {
    ok: false,
    code: "FEATURE_DISABLED",
    error: "Image generation is disabled in AI settings.",
  });
});

test("enrich generation helper blocks only active enrich requests when disabled", () => {
  const disabledSettings = {
    ...DEFAULT_AI_SETTINGS,
    enrichGenerationEnabled: false,
  };

  assert.equal(
    shouldBlockEnrichGeneration(disabledSettings, {
      generateExample: true,
      generateTranslation: false,
    }),
    true,
  );
  assert.equal(
    shouldBlockEnrichGeneration(disabledSettings, {
      generateExample: false,
      generateTranslation: true,
    }),
    true,
  );
  assert.equal(
    shouldBlockEnrichGeneration(disabledSettings, {
      generateExample: false,
      generateTranslation: false,
    }),
    false,
  );
});

test("word field helper still allows pronunciation when enrich generation is disabled", () => {
  const disabledSettings = {
    ...DEFAULT_AI_SETTINGS,
    enrichGenerationEnabled: false,
  };

  assert.equal(
    shouldBlockWordFieldGeneration(disabledSettings, "pronunciation"),
    false,
  );
  assert.equal(
    shouldBlockWordFieldGeneration(disabledSettings, "example"),
    true,
  );
  assert.equal(
    shouldBlockWordFieldGeneration(disabledSettings, "translation"),
    true,
  );
});

test("enrich disabled response matches the route contract", () => {
  assert.deepEqual(getEnrichGenerationDisabledResponse(), {
    status: 403,
    body: {
      error: "Example and translation generation is disabled in AI settings.",
    },
  });
});
