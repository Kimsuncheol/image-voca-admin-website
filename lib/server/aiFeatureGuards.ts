import {
  ENRICH_GENERATION_DISABLED_ERROR,
  ENRICH_GENERATION_PERMISSION_DISABLED_ERROR,
  type AISettings,
} from "../aiSettings.ts";
import { hasAdminPermission } from "../adminPermissions.ts";
import type { AppUser } from "../../types/user.ts";
import {
  createGenerateImageError,
  getGenerateImageErrorStatus,
} from "../../types/imageGeneration.ts";

type EnrichGenerationRequest = {
  generateExample: boolean;
  generateTranslation: boolean;
};

type GeneratableWordField = "pronunciation" | "example" | "translation";

export function isImageGenerationEnabled(
  settings: Pick<AISettings, "imageGenerationEnabled">,
): boolean {
  return settings.imageGenerationEnabled;
}

export function getImageGenerationDisabledResponse() {
  return {
    status: getGenerateImageErrorStatus("FEATURE_DISABLED"),
    body: createGenerateImageError("FEATURE_DISABLED"),
  };
}

export function getImageGenerationPermissionDeniedResponse() {
  return {
    status: getGenerateImageErrorStatus("PERMISSION_DENIED"),
    body: createGenerateImageError("PERMISSION_DENIED"),
  };
}

export function shouldBlockEnrichGeneration(
  settings: Pick<AISettings, "enrichGenerationEnabled">,
  request: EnrichGenerationRequest,
): boolean {
  if (settings.enrichGenerationEnabled) {
    return false;
  }

  return request.generateExample || request.generateTranslation;
}

export function shouldBlockWordFieldGeneration(
  settings: Pick<AISettings, "enrichGenerationEnabled">,
  field: GeneratableWordField,
): boolean {
  return (
    !settings.enrichGenerationEnabled &&
    (field === "example" || field === "translation")
  );
}

export function getEnrichGenerationDisabledResponse() {
  return {
    status: 403,
    body: {
      error: ENRICH_GENERATION_DISABLED_ERROR,
    },
  };
}

export function getEnrichGenerationPermissionDeniedResponse() {
  return {
    status: 403,
    body: {
      error: ENRICH_GENERATION_PERMISSION_DISABLED_ERROR,
    },
  };
}

export function canUseImageGeneration(
  settings: Pick<AISettings, "imageGenerationEnabled">,
  user: Pick<AppUser, "role" | "adminPermissions"> | null | undefined,
): boolean {
  return (
    isImageGenerationEnabled(settings) &&
    hasAdminPermission(user, "imageGeneration")
  );
}

export function canUseEnrichGeneration(
  settings: Pick<AISettings, "enrichGenerationEnabled">,
  user: Pick<AppUser, "role" | "adminPermissions"> | null | undefined,
): boolean {
  return (
    settings.enrichGenerationEnabled &&
    hasAdminPermission(user, "exampleTranslationGeneration")
  );
}

export function shouldBlockImageGenerationForUser(
  settings: Pick<AISettings, "imageGenerationEnabled">,
  user: Pick<AppUser, "role" | "adminPermissions"> | null | undefined,
): "feature_disabled" | "permission_denied" | null {
  if (!isImageGenerationEnabled(settings)) {
    return "feature_disabled";
  }

  if (!hasAdminPermission(user, "imageGeneration")) {
    return "permission_denied";
  }

  return null;
}

export function shouldBlockEnrichGenerationForUser(
  settings: Pick<AISettings, "enrichGenerationEnabled">,
  request: EnrichGenerationRequest,
  user: Pick<AppUser, "role" | "adminPermissions"> | null | undefined,
): "feature_disabled" | "permission_denied" | null {
  if (shouldBlockEnrichGeneration(settings, request)) {
    return "feature_disabled";
  }

  if (
    (request.generateExample || request.generateTranslation) &&
    !hasAdminPermission(user, "exampleTranslationGeneration")
  ) {
    return "permission_denied";
  }

  return null;
}

export function shouldBlockWordFieldGenerationForUser(
  settings: Pick<AISettings, "enrichGenerationEnabled">,
  field: GeneratableWordField,
  user: Pick<AppUser, "role" | "adminPermissions"> | null | undefined,
): "feature_disabled" | "permission_denied" | null {
  if (shouldBlockWordFieldGeneration(settings, field)) {
    return "feature_disabled";
  }

  if (
    (field === "example" || field === "translation") &&
    !hasAdminPermission(user, "exampleTranslationGeneration")
  ) {
    return "permission_denied";
  }

  return null;
}
