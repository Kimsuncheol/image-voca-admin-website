import assert from "node:assert/strict";
import test from "node:test";

import {
  createSeedAdminPermissions,
  diffAdminAIUsagePermissions,
  getEffectiveAdminPermissions,
  hasAdminPermission,
} from "./adminPermissions.ts";

test("super-admin gets implicit full permissions", () => {
  const permissions = getEffectiveAdminPermissions({
    role: "super-admin",
    adminPermissions: createSeedAdminPermissions(),
  });

  assert.deepEqual(permissions, {
    imageGeneration: true,
    exampleTranslationGeneration: true,
    planModification: true,
    roleModification: true,
  });
});

test("legacy admin gets backward-compatible defaults", () => {
  const permissions = getEffectiveAdminPermissions({
    role: "admin",
  });

  assert.deepEqual(permissions, {
    imageGeneration: true,
    exampleTranslationGeneration: true,
    planModification: true,
    roleModification: false,
  });
});

test("explicit admin permissions override legacy defaults", () => {
  const permissions = getEffectiveAdminPermissions({
    role: "admin",
    adminPermissions: {
      imageGeneration: false,
      exampleTranslationGeneration: true,
      planModification: false,
      roleModification: true,
    },
  });

  assert.equal(permissions.imageGeneration, false);
  assert.equal(permissions.planModification, false);
  assert.equal(hasAdminPermission({ role: "admin", adminPermissions: permissions }, "roleModification"), true);
});

test("new seeded admin permissions start fully disabled", () => {
  assert.deepEqual(createSeedAdminPermissions(), {
    imageGeneration: false,
    exampleTranslationGeneration: false,
    planModification: false,
    roleModification: false,
  });
});

test("diffAdminAIUsagePermissions returns only changed AI keys", () => {
  const changes = diffAdminAIUsagePermissions(
    {
      imageGeneration: true,
      exampleTranslationGeneration: true,
      planModification: true,
      roleModification: false,
    },
    {
      imageGeneration: false,
      exampleTranslationGeneration: true,
      planModification: false,
      roleModification: true,
    },
  );

  assert.deepEqual(changes, {
    imageGeneration: {
      before: true,
      after: false,
    },
  });
});
