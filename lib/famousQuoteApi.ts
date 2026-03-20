import type {
  FamousQuoteFilterLanguage,
  FamousQuoteFilterRequest,
} from "@/types/famousQuote";
import type { FamousQuoteWord } from "@/types/word";

export function buildFamousQuoteFilterUrl({
  coursePath,
  language,
}: FamousQuoteFilterRequest): string {
  const searchParams = new URLSearchParams({
    coursePath,
    language,
  });

  return `/api/admin/famous-quotes?${searchParams.toString()}`;
}

export async function fetchFilteredFamousQuotes(
  coursePath: string,
  language: FamousQuoteFilterLanguage,
): Promise<FamousQuoteWord[]> {
  const response = await fetch(
    buildFamousQuoteFilterUrl({ coursePath, language }),
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch famous quotes (${response.status})`);
  }

  return (await response.json()) as FamousQuoteWord[];
}

async function fillFamousQuotesLanguage(
  coursePath: string,
  ids: string[],
  language: "English" | "Japanese",
): Promise<void> {
  const response = await fetch("/api/admin/famous-quotes", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coursePath, ids, language }),
  });
  if (!response.ok) {
    throw new Error(`Fill ${language} failed (${response.status})`);
  }
}

export function fillFamousQuotesEnglish(
  coursePath: string,
  ids: string[],
): Promise<void> {
  return fillFamousQuotesLanguage(coursePath, ids, "English");
}

export function fillFamousQuotesJapanese(
  coursePath: string,
  ids: string[],
): Promise<void> {
  return fillFamousQuotesLanguage(coursePath, ids, "Japanese");
}
