type AddFuriganaMode = "hiragana_only";
const DEFAULT_ADD_FURIGANA_BATCH_SIZE = 20;

export interface AddFuriganaOptions {
  mode?: AddFuriganaMode;
}

interface AddFuriganaSingleRequest {
  text: string;
  mode?: AddFuriganaMode;
}

interface AddFuriganaResponse {
  result_text?: string;
  error?: string;
  detail?: string;
}

export interface AddFuriganaBatchRequest {
  texts: string[];
  mode?: AddFuriganaMode;
}

export interface AddFuriganaBatchResponse {
  result_texts?: unknown;
  error?: string;
  detail?: string;
}

export type AddFuriganaSettledResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

function getAddFuriganaErrorMessage(payload: {
  error?: string;
  detail?: string;
}): string {
  return payload.error || payload.detail || "Failed to add furigana";
}

function extractSingleResultText(payload: AddFuriganaResponse): string {
  return typeof payload.result_text === "string" ? payload.result_text.trim() : "";
}

function extractBatchResultTexts(
  payload: AddFuriganaBatchResponse,
  expectedLength: number,
): string[] {
  if (!Array.isArray(payload.result_texts)) return [];

  const texts = payload.result_texts.map((item) =>
    typeof item === "string" ? item.trim() : "",
  );

  if (texts.length !== expectedLength || texts.some((item) => item.length === 0)) {
    return [];
  }

  return texts;
}

export async function addFuriganaText(
  text: string,
  options?: AddFuriganaOptions,
): Promise<string> {
  const requestBody: AddFuriganaSingleRequest = {
    text,
    ...(options?.mode ? { mode: options.mode } : {}),
  };

  const response = await fetch("/api/text/add-furigana", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json()) as AddFuriganaResponse;
  const resultText = extractSingleResultText(payload);

  if (!response.ok || !resultText) {
    throw new Error(getAddFuriganaErrorMessage(payload));
  }

  return resultText;
}

export async function addFuriganaTexts(
  texts: string[],
  options?: AddFuriganaOptions,
): Promise<string[]> {
  if (texts.length === 0) return [];

  const requestBody: AddFuriganaBatchRequest = {
    texts,
    ...(options?.mode ? { mode: options.mode } : {}),
  };

  const response = await fetch("/api/text/add-furigana/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json()) as AddFuriganaBatchResponse;
  const resultTexts = extractBatchResultTexts(payload, texts.length);

  if (!response.ok || resultTexts.length !== texts.length) {
    throw new Error(getAddFuriganaErrorMessage(payload));
  }

  return resultTexts;
}

export async function addFuriganaTextsRobust(
  texts: string[],
  options?: AddFuriganaOptions,
): Promise<AddFuriganaSettledResult[]> {
  if (texts.length === 0) return [];

  const settled: AddFuriganaSettledResult[] = [];

  for (
    let startIndex = 0;
    startIndex < texts.length;
    startIndex += DEFAULT_ADD_FURIGANA_BATCH_SIZE
  ) {
    const chunk = texts.slice(
      startIndex,
      startIndex + DEFAULT_ADD_FURIGANA_BATCH_SIZE,
    );

    try {
      const chunkResults = await addFuriganaTexts(chunk, options);
      settled.push(
        ...chunkResults.map((text) => ({ ok: true, text }) satisfies AddFuriganaSettledResult),
      );
      continue;
    } catch {
      const fallbackResults = await Promise.all(
        chunk.map(async (text) => {
          try {
            return {
              ok: true,
              text: await addFuriganaText(text, options),
            } satisfies AddFuriganaSettledResult;
          } catch (error) {
            return {
              ok: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Failed to add furigana",
            } satisfies AddFuriganaSettledResult;
          }
        }),
      );

      settled.push(...fallbackResults);
    }
  }

  return settled;
}
