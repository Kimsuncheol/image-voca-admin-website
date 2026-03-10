import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

interface AdjectiveDerivativeResponse {
  baseWord?: string;
  adjectives?: unknown;
}

interface DerivativeMeaningResponse {
  word?: string;
  meaning?: string;
}

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-3-flash",
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 250 },
  });
}

function safeJsonParse<T>(raw: string): T | null {
  try {
    const startIdx = raw.indexOf('{');
    const endIdx = raw.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      const jsonStr = raw.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonStr) as T;
    }
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function getAdjectiveCandidatesFromAI(
  baseWord: string,
  baseMeaning: string,
): Promise<string[]> {
  const model = getGeminiModel();
  if (!model) return [];

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

  try {
    const completion = await model.generateContent(prompt);
    const parsed = safeJsonParse<AdjectiveDerivativeResponse>(
      completion.response.text(),
    );

    if (!parsed || !Array.isArray(parsed.adjectives)) return [];

    return parsed.adjectives
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  } catch (error) {
    console.error("[derivatives] AI adjective generation failed:", error);
    return [];
  }
}

export async function getDerivativeMeaningFromAI(
  baseWord: string,
  derivativeWord: string,
  baseMeaning: string,
): Promise<string> {
  const model = getGeminiModel();
  if (!model) return "";

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

  try {
    const completion = await model.generateContent(prompt);
    const parsed = safeJsonParse<DerivativeMeaningResponse>(
      completion.response.text(),
    );

    return typeof parsed?.meaning === "string" ? parsed.meaning.trim() : "";
  } catch (error) {
    console.error("[derivatives] AI explicit meaning generation failed:", error);
    return "";
  }
}
