export interface AISettings {
  imageGenerationEnabled: boolean;
  imageModel: "nano-banana2" | "gpt-image-1";
  enrichGenerationEnabled: boolean;
  enrichModel: "gemini" | "chatgpt";
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  imageGenerationEnabled: true,
  imageModel: "nano-banana2",
  enrichGenerationEnabled: true,
  enrichModel: "gemini",
};

export const IMAGE_GENERATION_DISABLED_ERROR =
  "Image generation is disabled in AI settings.";
export const ENRICH_GENERATION_DISABLED_ERROR =
  "Example and translation generation is disabled in AI settings.";

export function normalizeAISettings(
  value?: Partial<AISettings> | null,
): AISettings {
  return {
    ...DEFAULT_AI_SETTINGS,
    ...(value ?? {}),
  };
}
