export interface AISettings {
  imageGenerationEnabled: boolean;
  imageModel: "nano-banana2" | "gpt-image-1";
  enrichGenerationEnabled: boolean;
  enrichModel: "gemini" | "chatgpt";
  pronunciationApi: "free-dictionary" | "oxford";
  oxfordAppId: string;
  oxfordAppKey: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  imageGenerationEnabled: true,
  imageModel: "nano-banana2",
  enrichGenerationEnabled: true,
  enrichModel: "gemini",
  pronunciationApi: "free-dictionary",
  oxfordAppId: "",
  oxfordAppKey: "",
};

export const IMAGE_GENERATION_DISABLED_ERROR =
  "Image generation is disabled in AI settings.";
export const IMAGE_GENERATION_PERMISSION_DISABLED_ERROR =
  "Image generation is disabled for your administrator account.";
export const ENRICH_GENERATION_DISABLED_ERROR =
  "Example and translation generation is disabled in AI settings.";
export const ENRICH_GENERATION_PERMISSION_DISABLED_ERROR =
  "Example and translation generation is disabled for your administrator account.";

export function normalizeAISettings(
  value?: Partial<AISettings> | null,
): AISettings {
  return {
    ...DEFAULT_AI_SETTINGS,
    ...(value ?? {}),
  };
}
