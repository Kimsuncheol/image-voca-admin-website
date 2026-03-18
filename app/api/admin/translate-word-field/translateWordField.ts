import { NextRequest, NextResponse } from "next/server.js";

import {
  getEnrichGenerationDisabledResponse,
  getEnrichGenerationPermissionDeniedResponse,
  shouldBlockWordFieldGenerationForUser,
} from "@/lib/server/aiFeatureGuards";
import type { AISettings } from "@/lib/aiSettings";
import type { AppUser } from "@/types/user";

type FieldType = "example" | "translation" | "jlpt-example";
type ProviderOverride = "deepl";

export interface TranslateWordFieldBody {
  field: FieldType;
  example?: string;
  translation?: string;
  translationKorean?: string;
  translationEnglish?: string;
  provider?: ProviderOverride;
}

export interface TranslateWordFieldDependencies {
  getServerAISettings: () => Promise<AISettings>;
  translateExampleToKoreanWithDeepL: (example: string) => Promise<string>;
  translateTranslationToEnglishWithDeepL: (translation: string) => Promise<string>;
  translateKoreanToJapaneseWithDeepL: (translation: string) => Promise<string>;
  translateEnglishToJapaneseWithDeepL: (translation: string) => Promise<string>;
  translateExampleToKoreanWithGoogle: (example: string) => Promise<string>;
  translateTranslationToEnglishWithGoogle: (translation: string) => Promise<string>;
  verifySessionUser: (request: NextRequest) => Promise<AppUser | null>;
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAuthorizedRole(role: string): boolean {
  return role === "admin" || role === "super-admin";
}

function getProviderErrorStatus(message: string): number {
  return /is not configured\.$/.test(message) ? 503 : 502;
}

function getProviderTranslator(
  settings: Pick<AISettings, "exampleTranslationApi">,
  providerOverride: ProviderOverride | undefined,
  dependencies: TranslateWordFieldDependencies,
) {
  if (providerOverride === "deepl") {
    return {
      translateExampleToKorean: dependencies.translateExampleToKoreanWithDeepL,
      translateTranslationToEnglish:
        dependencies.translateTranslationToEnglishWithDeepL,
    };
  }

  if (settings.exampleTranslationApi === "google-translate") {
    return {
      translateExampleToKorean: dependencies.translateExampleToKoreanWithGoogle,
      translateTranslationToEnglish:
        dependencies.translateTranslationToEnglishWithGoogle,
    };
  }

  return {
    translateExampleToKorean: dependencies.translateExampleToKoreanWithDeepL,
    translateTranslationToEnglish:
      dependencies.translateTranslationToEnglishWithDeepL,
  };
}

export function createTranslateWordFieldHandler(
  dependencies: TranslateWordFieldDependencies,
) {
  return async function POST(request: NextRequest) {
    const caller = await dependencies.verifySessionUser(request);
    if (!caller || !isAuthorizedRole(caller.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: TranslateWordFieldBody;
    try {
      body = (await request.json()) as TranslateWordFieldBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      field,
      example,
      translation,
      translationKorean,
      translationEnglish,
      provider,
    } = body;
    if (
      field !== "example" &&
      field !== "translation" &&
      field !== "jlpt-example"
    ) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }
    if (typeof provider !== "undefined" && provider !== "deepl") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const settings = await dependencies.getServerAISettings();
    const blockReason = shouldBlockWordFieldGenerationForUser(
      settings,
      field === "jlpt-example" ? "example" : field,
      caller,
    );

    if (blockReason === "feature_disabled") {
      const disabledResponse = getEnrichGenerationDisabledResponse();
      return NextResponse.json(disabledResponse.body, {
        status: disabledResponse.status,
      });
    }

    if (blockReason === "permission_denied") {
      const deniedResponse = getEnrichGenerationPermissionDeniedResponse();
      return NextResponse.json(deniedResponse.body, {
        status: deniedResponse.status,
      });
    }

    try {
      if (field === "jlpt-example") {
        const sourceKorean = hasText(translationKorean)
          ? translationKorean
          : null;
        const sourceEnglish = !sourceKorean && hasText(translationEnglish)
          ? translationEnglish
          : null;

        if (!sourceKorean && !sourceEnglish) {
          return NextResponse.json(
            { error: "translationKorean or translationEnglish is required" },
            { status: 400 },
          );
        }

        if (provider !== "deepl") {
          return NextResponse.json(
            { error: "DeepL provider is required" },
            { status: 400 },
          );
        }

        const translated = sourceKorean
          ? await dependencies.translateKoreanToJapaneseWithDeepL(sourceKorean)
          : await dependencies.translateEnglishToJapaneseWithDeepL(
              sourceEnglish as string,
            );

        return NextResponse.json({ example: translated });
      }

      if (field === "example") {
        if (!hasText(example)) {
          return NextResponse.json(
            { error: "example is required" },
            { status: 400 },
          );
        }

        const translator = getProviderTranslator(settings, provider, dependencies);
        const translated = await translator.translateExampleToKorean(example);
        return NextResponse.json({ translation: translated });
      }

      if (!hasText(translation)) {
        return NextResponse.json(
          { error: "translation is required" },
          { status: 400 },
        );
      }

      const translator = getProviderTranslator(settings, provider, dependencies);
      const translated = await translator.translateTranslationToEnglish(
        translation,
      );
      return NextResponse.json({ example: translated });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Translation failed.";
      return NextResponse.json(
        { error: message },
        { status: getProviderErrorStatus(message) },
      );
    }
  };
}
