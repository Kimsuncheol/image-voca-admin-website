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
