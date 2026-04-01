type AddFuriganaMode = "hiragana_only";

interface AddFuriganaOptions {
  mode?: AddFuriganaMode;
}

interface AddFuriganaResponse {
  result_text?: string;
  error?: string;
  detail?: string;
}

export async function addFuriganaText(
  text: string,
  options?: AddFuriganaOptions,
): Promise<string> {
  const response = await fetch("/api/text/add-furigana", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      ...(options?.mode ? { mode: options.mode } : {}),
    }),
  });

  const payload = (await response.json()) as AddFuriganaResponse;
  const resultText =
    typeof payload.result_text === "string" ? payload.result_text.trim() : "";

  if (!response.ok || !resultText) {
    throw new Error(payload.error || payload.detail || "Failed to add furigana");
  }

  return resultText;
}
