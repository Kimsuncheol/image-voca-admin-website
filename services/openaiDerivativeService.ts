import "server-only";

import OpenAI from "openai";

interface AdjectiveDerivativeResponse {
  baseWord?: string;
  adjectives?: unknown;
}

interface DerivativeMeaningResponse {
  word?: string;
  meaning?: string;
}

function getOpenAiClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY ?? "";
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getAdjectiveCandidatesFromOpenAI(
  baseWord: string,
  baseMeaning: string,
): Promise<string[]> {
  const openai = getOpenAiClient();
  if (!openai) return [];

  const prompt = `You are assisting a vocabulary admin tool.

Task:
Return only English adjective derivatives that are morphologically derived from the given base word.

Rules:
- Return JSON only.
- Do not include explanations.
- Do not include synonyms.
- Do not include related words unless they are true adjective derivatives of the base word.
- Do not include nouns, verbs, or adverbs.
- Do not include phrases.
- Use lowercase words only.
- Remove duplicates.
- If no valid adjective derivatives exist, return an empty array.

Output format:
{
  "baseWord": "<base word>",
  "adjectives": ["..."]
}

Base word: "${baseWord}"
Base meaning/context: "${baseMeaning}"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 150,
  });

  const parsed = safeJsonParse<AdjectiveDerivativeResponse>(
    completion.choices[0]?.message?.content ?? "{}",
  );

  if (!parsed || !Array.isArray(parsed.adjectives)) return [];

  return parsed.adjectives
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export async function getDerivativeMeaningFromOpenAI(
  baseWord: string,
  derivativeWord: string,
  baseMeaning: string,
): Promise<string> {
  const openai = getOpenAiClient();
  if (!openai) return "";

  const prompt = `You are assisting a vocabulary admin tool.

Task:
Return a short dictionary-style meaning for the adjective derivative.

Rules:
- Return JSON only.
- Do not include explanations outside JSON.
- The meaning must describe the adjective itself.
- Keep the meaning concise.

Output format:
{
  "word": "${derivativeWord}",
  "meaning": "..."
}

Base word: "${baseWord}"
Base meaning/context: "${baseMeaning}"
Derivative adjective: "${derivativeWord}"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 120,
  });

  const parsed = safeJsonParse<DerivativeMeaningResponse>(
    completion.choices[0]?.message?.content ?? "{}",
  );

  return typeof parsed?.meaning === "string" ? parsed.meaning.trim() : "";
}
