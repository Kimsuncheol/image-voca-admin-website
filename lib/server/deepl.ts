export type DeepLSourceLang = "EN" | "KO";
export type DeepLTargetLang = "EN" | "KO" | "JA";
const DEEPL_MAX_TEXTS_PER_REQUEST = 50;
const DEEPL_MAX_BODY_BYTES = 120 * 1024;

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

interface TranslateBatchWithDeepLArgs {
  texts: string[];
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

function getDeepLAuthKey(apiKey?: string): string {
  const authKey = apiKey || process.env.DEEPL_API_KEY;
  if (!authKey) {
    throw new Error("DeepL is not configured.");
  }
  return authKey;
}

function createTranslateBody(
  texts: string[],
  sourceLang: DeepLSourceLang,
  targetLang: DeepLTargetLang,
): URLSearchParams {
  const body = new URLSearchParams();
  body.set("source_lang", sourceLang);
  body.set("target_lang", targetLang);
  texts.forEach((text) => {
    body.append("text", text);
  });
  return body;
}

function getBodySizeBytes(body: URLSearchParams): number {
  return new TextEncoder().encode(body.toString()).length;
}

function chunkTextsForDeepL(
  texts: string[],
  sourceLang: DeepLSourceLang,
  targetLang: DeepLTargetLang,
): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];

  texts.forEach((text) => {
    const trialChunk = [...currentChunk, text];
    const trialBody = createTranslateBody(trialChunk, sourceLang, targetLang);

    if (
      currentChunk.length > 0 &&
      (trialChunk.length > DEEPL_MAX_TEXTS_PER_REQUEST ||
        getBodySizeBytes(trialBody) > DEEPL_MAX_BODY_BYTES)
    ) {
      chunks.push(currentChunk);
      currentChunk = [text];
      return;
    }

    currentChunk = trialChunk;
  });

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
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

  const authKey = getDeepLAuthKey(apiKey);

  const body = createTranslateBody([trimmedText], sourceLang, targetLang);

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

export async function translateBatchWithDeepL({
  texts,
  sourceLang,
  targetLang,
  apiKey,
  baseUrl,
  fetchImpl = fetch,
}: TranslateBatchWithDeepLArgs): Promise<Array<string | null>> {
  if (texts.length === 0) {
    return [];
  }

  const trimmedTexts = texts.map((text) => text.trim());
  if (trimmedTexts.some((text) => !text)) {
    throw new Error("Text is required for DeepL translation.");
  }

  const authKey = getDeepLAuthKey(apiKey);
  const translated: Array<string | null> = [];
  const chunks = chunkTextsForDeepL(trimmedTexts, sourceLang, targetLang);

  for (const chunk of chunks) {
    const body = createTranslateBody(chunk, sourceLang, targetLang);
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
    if (!Array.isArray(payload.translations) || payload.translations.length !== chunk.length) {
      throw new Error("DeepL returned an unexpected number of translations.");
    }

    payload.translations.forEach((item) => {
      const translatedText = item.text?.trim();
      translated.push(translatedText ? translatedText : null);
    });
  }

  return translated;
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

export function translateKoreanToJapaneseBatch(
  translations: string[],
  options?: Omit<TranslateBatchWithDeepLArgs, "texts" | "sourceLang" | "targetLang">,
) {
  return translateBatchWithDeepL({
    texts: translations,
    sourceLang: "KO",
    targetLang: "JA",
    ...options,
  });
}

export function translateEnglishToJapaneseBatch(
  translations: string[],
  options?: Omit<TranslateBatchWithDeepLArgs, "texts" | "sourceLang" | "targetLang">,
) {
  return translateBatchWithDeepL({
    texts: translations,
    sourceLang: "EN",
    targetLang: "JA",
    ...options,
  });
}
