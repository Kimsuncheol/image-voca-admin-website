import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_AI_SETTINGS } from "../aiSettings.ts";

import {
  canUseEnrichGeneration,
  canUseImageGeneration,
  getEnrichGenerationDisabledResponse,
  getEnrichGenerationPermissionDeniedResponse,
  getImageGenerationDisabledResponse,
  getImageGenerationPermissionDeniedResponse,
  isImageGenerationEnabled,
  shouldBlockEnrichGenerationForUser,
  shouldBlockImageGenerationForUser,
  shouldBlockEnrichGeneration,
  shouldBlockWordFieldGenerationForUser,
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

test("permission denied responses match the route contracts", () => {
  assert.deepEqual(getImageGenerationPermissionDeniedResponse(), {
    status: 403,
    body: {
      ok: false,
      code: "PERMISSION_DENIED",
      error: "Image generation is disabled for your administrator account.",
    },
  });

  assert.deepEqual(getEnrichGenerationPermissionDeniedResponse(), {
    status: 403,
    body: {
      error:
        "Example and translation generation is disabled for your administrator account.",
    },
  });
});

test("admin-specific feature guards combine global settings with personal permissions", () => {
  const adminUser = {
    role: "admin" as const,
    adminPermissions: {
      imageGeneration: false,
      exampleTranslationGeneration: true,
      planModification: false,
      roleModification: false,
    },
  };

  assert.equal(
    shouldBlockImageGenerationForUser(DEFAULT_AI_SETTINGS, adminUser),
    "permission_denied",
  );
  assert.equal(
    shouldBlockEnrichGenerationForUser(
      DEFAULT_AI_SETTINGS,
      { generateExample: true, generateTranslation: false },
      adminUser,
    ),
    null,
  );
  assert.equal(
    shouldBlockWordFieldGenerationForUser(
      DEFAULT_AI_SETTINGS,
      "translation",
      {
        ...adminUser,
        adminPermissions: {
          ...adminUser.adminPermissions,
          exampleTranslationGeneration: false,
        },
      },
    ),
    "permission_denied",
  );
});

test("super-admin bypasses per-admin permission restrictions", () => {
  const superAdminUser = {
    role: "super-admin" as const,
  };

  assert.equal(canUseImageGeneration(DEFAULT_AI_SETTINGS, superAdminUser), true);
  assert.equal(canUseEnrichGeneration(DEFAULT_AI_SETTINGS, superAdminUser), true);
});
