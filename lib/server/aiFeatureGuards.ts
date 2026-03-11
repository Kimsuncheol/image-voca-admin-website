import {
  ENRICH_GENERATION_DISABLED_ERROR,
  type AISettings,
} from "../aiSettings.ts";
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
