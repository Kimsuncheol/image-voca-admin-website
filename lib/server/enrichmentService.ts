import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { EnrichmentGenerator } from "@/app/api/admin/enrich/enrichWords";
import { hasText } from "@/app/api/admin/enrich/enrichWords";
import type { WordInput, EnrichmentNeeds } from "@/app/api/admin/enrich/enrichWords";

function buildEnrichPrompt(w: WordInput, needs: EnrichmentNeeds): string {
  const parts: string[] = [];
  const jsonFields: string[] = [];

  if (needs.needsExample) {
    parts.push(
      "- Write 2 or 3 short, natural English example sentences using the word. Format them as a numbered list separated by line breaks (\\n).",
    );
    jsonFields.push('"example":"1. ...\\n2. ..."');
  } else if (needs.needsTranslation && w.example) {
    parts.push(`- Here are the existing examples: "${w.example}"`);
  }

  if (needs.needsTranslation) {
    if (needs.needsExample) {
      parts.push(
        "- Provide the Korean translations corresponding to the generated examples. Format them as a numbered list separated by line breaks (\\n).",
      );
      jsonFields.push('"translation":"1. ...\\n2. ..."');
    } else {
      parts.push(
        "- Provide the Korean translations corresponding to the existing examples. Match the formatting of the existing examples (e.g., if there are multiple lines, provide multiple lines).",
      );
      jsonFields.push('"translation":"..."');
    }
  }

  return (
    `English word: "${w.word}", meaning: "${w.meaning}".\n` +
    parts.join("\n") +
    `\nRespond ONLY as JSON: {${jsonFields.join(",")}}\nEnsure line breaks are escaped as \\n in the JSON string.`
  );
}

function parseEnrichJSON(raw: string): { example?: string; translation?: string } {
  const startIdx = raw.indexOf("{");
  const endIdx = raw.lastIndexOf("}");
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return {};
  try {
    return JSON.parse(raw.substring(startIdx, endIdx + 1));
  } catch {
    return {};
  }
}

export function createGeminiEnrichmentGenerator(apiKey: string): EnrichmentGenerator {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: { responseMimeType: "application/json", maxOutputTokens: 1000 },
  });

  return async (w, needs) => {
    const prompt = buildEnrichPrompt(w, needs);
    const result = await model.generateContent(prompt);
    const parsed = parseEnrichJSON(result.response.text());
    console.log(`[Enrich/Gemini] "${w.word}":`, parsed);
    return {
      example: hasText(parsed.example) ? parsed.example : "",
      translation: hasText(parsed.translation) ? parsed.translation : "",
    };
  };
}

export function createChatGPTEnrichmentGenerator(apiKey: string): EnrichmentGenerator {
  const openai = new OpenAI({ apiKey });

  return async (w, needs) => {
    const prompt = buildEnrichPrompt(w, needs);
    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });
    const raw = result.choices[0]?.message?.content ?? "";
    const parsed = parseEnrichJSON(raw);
    console.log(`[Enrich/ChatGPT] "${w.word}":`, parsed);
    return {
      example: hasText(parsed.example) ? parsed.example : "",
      translation: hasText(parsed.translation) ? parsed.translation : "",
    };
  };
}
