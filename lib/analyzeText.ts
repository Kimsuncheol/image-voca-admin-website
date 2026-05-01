export interface AnalyzeRequest {
  language: "ja";
  sentence: string;
  target_base_form: string;
}

export interface AnalyzeMatch {
  answer: string;
  start: number;
  end: number;
}

export interface AnalyzeResponse {
  masked_sentence?: string;
  matches?: AnalyzeMatch[];
  error?: string;
  detail?: string;
}

function getAnalyzeErrorMessage(payload: AnalyzeResponse): string {
  return payload.error || payload.detail || "Failed to analyze sentence";
}

function extractMaskedSentence(payload: AnalyzeResponse): string {
  return typeof payload.masked_sentence === "string"
    ? payload.masked_sentence.trim()
    : "";
}

export async function analyzeSentence(
  requestBody: AnalyzeRequest,
): Promise<string> {
  const response = await fetch("/api/text/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  const payload = (await response.json()) as AnalyzeResponse;
  const maskedSentence = extractMaskedSentence(payload);

  if (!response.ok || !maskedSentence) {
    throw new Error(getAnalyzeErrorMessage(payload));
  }

  return maskedSentence;
}
