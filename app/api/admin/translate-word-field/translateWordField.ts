import { NextRequest, NextResponse } from "next/server.js";

import {
  getEnrichGenerationDisabledResponse,
  getEnrichGenerationPermissionDeniedResponse,
  shouldBlockWordFieldGenerationForUser,
} from "@/lib/server/aiFeatureGuards";
import type { AppUser } from "@/types/user";

type FieldType =
  | "example"
  | "translation"
  | "jlpt-example"
  | "jlpt-example-batch";
type ProviderOverride = "deepl";

interface JlptExampleBatchItemInput {
  id: string;
  translationKorean?: string;
  translationEnglish?: string;
}

interface JlptExampleBatchItemOutput {
  id: string;
  example: string;
}

interface JlptExampleBatchFailure {
  id: string;
  error: string;
}

export interface TranslateWordFieldBody {
  field: FieldType;
  example?: string;
  translation?: string;
  translationKorean?: string;
  translationEnglish?: string;
  items?: JlptExampleBatchItemInput[];
  provider?: ProviderOverride;
}

export interface TranslateWordFieldDependencies {
  getServerAISettings: () => Promise<import("@/lib/aiSettings").AISettings>;
  translateExampleToKoreanWithDeepL: (example: string) => Promise<string>;
  translateTranslationToEnglishWithDeepL: (translation: string) => Promise<string>;
  translateKoreanToJapaneseWithDeepL: (translation: string) => Promise<string>;
  translateEnglishToJapaneseWithDeepL: (translation: string) => Promise<string>;
  translateKoreanToJapaneseBatchWithDeepL: (
    translations: string[],
  ) => Promise<Array<string | null>>;
  translateEnglishToJapaneseBatchWithDeepL: (
    translations: string[],
  ) => Promise<Array<string | null>>;
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
  dependencies: TranslateWordFieldDependencies,
) {
  return {
    translateExampleToKorean: dependencies.translateExampleToKoreanWithDeepL,
    translateTranslationToEnglish:
      dependencies.translateTranslationToEnglishWithDeepL,
  };
}

function isJlptExampleBatchItem(
  value: unknown,
): value is JlptExampleBatchItemInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<JlptExampleBatchItemInput>;
  return typeof item.id === "string";
}

async function translateJlptExampleBatch(
  items: JlptExampleBatchItemInput[],
  dependencies: Pick<
    TranslateWordFieldDependencies,
    | "translateKoreanToJapaneseBatchWithDeepL"
    | "translateEnglishToJapaneseBatchWithDeepL"
  >,
): Promise<{
  items: JlptExampleBatchItemOutput[];
  failures: JlptExampleBatchFailure[];
}> {
  const successMap = new Map<string, string>();
  const failures: JlptExampleBatchFailure[] = [];
  const koreanItems: Array<{ id: string; text: string }> = [];
  const englishItems: Array<{ id: string; text: string }> = [];

  items.forEach((item) => {
    if (hasText(item.translationKorean)) {
      koreanItems.push({ id: item.id, text: item.translationKorean.trim() });
      return;
    }

    if (hasText(item.translationEnglish)) {
      englishItems.push({ id: item.id, text: item.translationEnglish.trim() });
      return;
    }

    failures.push({
      id: item.id,
      error: "translationKorean or translationEnglish is required",
    });
  });

  const translateGroup = async (
    groupItems: Array<{ id: string; text: string }>,
    translate: (texts: string[]) => Promise<Array<string | null>>,
  ) => {
    if (groupItems.length === 0) {
      return;
    }

    try {
      const translations = await translate(groupItems.map((item) => item.text));

      if (translations.length !== groupItems.length) {
        throw new Error("DeepL returned an unexpected number of translations.");
      }

      groupItems.forEach((item, index) => {
        const translated = translations[index]?.trim();
        if (!translated) {
          failures.push({
            id: item.id,
            error: "DeepL returned an empty translation.",
          });
          return;
        }

        successMap.set(item.id, translated);
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Translation failed.";
      groupItems.forEach((item) => {
        failures.push({ id: item.id, error: message });
      });
    }
  };

  await translateGroup(
    koreanItems,
    dependencies.translateKoreanToJapaneseBatchWithDeepL,
  );
  await translateGroup(
    englishItems,
    dependencies.translateEnglishToJapaneseBatchWithDeepL,
  );

  return {
    items: items.flatMap((item) =>
      hasText(successMap.get(item.id))
        ? [{ id: item.id, example: successMap.get(item.id) as string }]
        : [],
    ),
    failures,
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
      field !== "jlpt-example" &&
      field !== "jlpt-example-batch"
    ) {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }
    if (typeof provider !== "undefined" && provider !== "deepl") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const settings = await dependencies.getServerAISettings();
    const blockReason = shouldBlockWordFieldGenerationForUser(
      settings,
      field === "jlpt-example" || field === "jlpt-example-batch"
        ? "example"
        : field,
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
      if (field === "jlpt-example-batch") {
        if (provider !== "deepl") {
          return NextResponse.json(
            { error: "DeepL provider is required" },
            { status: 400 },
          );
        }

        if (!Array.isArray(body.items) || !body.items.every(isJlptExampleBatchItem)) {
          return NextResponse.json(
            { error: "items is required" },
            { status: 400 },
          );
        }

        const translated = await translateJlptExampleBatch(body.items, dependencies);
        return NextResponse.json(translated);
      }

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

        const translated = await translateJlptExampleBatch(
          [
            {
              id: "single",
              ...(sourceKorean ? { translationKorean: sourceKorean } : {}),
              ...(!sourceKorean && sourceEnglish
                ? { translationEnglish: sourceEnglish }
                : {}),
            },
          ],
          dependencies,
        );

        const correctedExample = translated.items[0]?.example;
        if (!hasText(correctedExample)) {
          const message = translated.failures[0]?.error || "Translation failed.";
          throw new Error(message);
        }

        return NextResponse.json({ example: correctedExample });
      }

      if (field === "example") {
        if (!hasText(example)) {
          return NextResponse.json(
            { error: "example is required" },
            { status: 400 },
          );
        }

        const translator = getProviderTranslator(dependencies);
        const translated = await translator.translateExampleToKorean(example);
        return NextResponse.json({ translation: translated });
      }

      if (!hasText(translation)) {
        return NextResponse.json(
          { error: "translation is required" },
          { status: 400 },
        );
      }

      const translator = getProviderTranslator(dependencies);
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
