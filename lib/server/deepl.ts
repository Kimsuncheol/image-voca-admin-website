export type DeepLSourceLang = "EN" | "KO";
export type DeepLTargetLang = "EN" | "KO" | "JA";

interface DeepLTranslation {
  text?: string;
}

interface DeepLResponse {
  translations?: DeepLTranslation[];
  message?: string;
}

interface TranslateWithDeepLArgs {
  text: string;
  sourceLang: DeepLSourceLang;
  targetLang: DeepLTargetLang;
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getTranslateUrl(baseUrl?: string): string {
  const root =
    baseUrl ||
    process.env.DEEPL_API_BASE_URL ||
    "https://api-free.deepl.com/v2";

  return `${root.replace(/\/+$/, "")}/translate`;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as DeepLResponse;
    if (hasText(payload.message)) {
      return payload.message.trim();
    }
  } catch {
    // Ignore JSON parsing failures and fall back to status text.
  }

  return response.statusText || "DeepL translation failed.";
}

export async function translateWithDeepL({
  text,
  sourceLang,
  targetLang,
  apiKey,
  baseUrl,
  fetchImpl = fetch,
}: TranslateWithDeepLArgs): Promise<string> {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text is required for DeepL translation.");
  }

  const authKey = apiKey || process.env.DEEPL_API_KEY;
  if (!authKey) {
    throw new Error("DeepL is not configured.");
  }

  const body = new URLSearchParams();
  body.set("text", trimmedText);
  body.set("source_lang", sourceLang);
  body.set("target_lang", targetLang);

  const response = await fetchImpl(getTranslateUrl(baseUrl), {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${authKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const payload = (await response.json()) as DeepLResponse;
  const translatedText = payload.translations?.[0]?.text?.trim();
  if (!translatedText) {
    throw new Error("DeepL returned an empty translation.");
  }

  return translatedText;
}

export function translateExampleToKorean(
  example: string,
  options?: Omit<TranslateWithDeepLArgs, "text" | "sourceLang" | "targetLang">,
) {
  return translateWithDeepL({
    text: example,
    sourceLang: "EN",
    targetLang: "KO",
    ...options,
  });
}

export function translateTranslationToEnglish(
  translation: string,
  options?: Omit<TranslateWithDeepLArgs, "text" | "sourceLang" | "targetLang">,
) {
  return translateWithDeepL({
    text: translation,
    sourceLang: "KO",
    targetLang: "EN",
    ...options,
  });
}

export function translateKoreanToJapanese(
  translation: string,
  options?: Omit<TranslateWithDeepLArgs, "text" | "sourceLang" | "targetLang">,
) {
  return translateWithDeepL({
    text: translation,
    sourceLang: "KO",
    targetLang: "JA",
    ...options,
  });
}

export function translateEnglishToJapanese(
  translation: string,
  options?: Omit<TranslateWithDeepLArgs, "text" | "sourceLang" | "targetLang">,
) {
  return translateWithDeepL({
    text: translation,
    sourceLang: "EN",
    targetLang: "JA",
    ...options,
  });
}
