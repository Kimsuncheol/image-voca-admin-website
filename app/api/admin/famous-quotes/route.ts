import { FieldPath } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { verifySessionUser } from "@/lib/server/sessionUser";
import { resolveQuoteLanguage } from "@/lib/utils/quoteLanguage";
import {
  isFamousQuoteFilterLanguage,
  type FamousQuoteFilterLanguage,
} from "@/types/famousQuote";
import type { AppUser } from "@/types/user";
import type { FamousQuoteWord } from "@/types/word";

const READ_BATCH_SIZE = 200;

interface FamousQuoteDocSnapshot {
  id: string;
  data: () => Record<string, unknown>;
}

interface FamousQuoteQuerySnapshot {
  empty: boolean;
  size: number;
  docs: FamousQuoteDocSnapshot[];
}

interface FamousQuoteQuery {
  limit: (batchSize: number) => FamousQuoteQuery;
  startAfter: (cursor: unknown) => FamousQuoteQuery;
  get: () => Promise<FamousQuoteQuerySnapshot>;
}

interface FamousQuoteCollectionRef {
  orderBy: (field: unknown) => FamousQuoteQuery;
}

interface FamousQuoteDependencies {
  adminDb: {
    collection: (coursePath: string) => FamousQuoteCollectionRef;
  };
  verifySessionUser: (request: NextRequest) => Promise<AppUser | null>;
}

function parseFamousQuoteWord(
  id: string,
  raw: Record<string, unknown>,
): FamousQuoteWord | null {
  const quote = typeof raw.quote === "string" ? raw.quote.trim() : "";
  const author = typeof raw.author === "string" ? raw.author.trim() : "";
  const translation =
    typeof raw.translation === "string" ? raw.translation.trim() : "";

  if (!quote || !translation) return null;

  const language = resolveQuoteLanguage(raw.language, quote);
  return language
    ? { id, quote, author, translation, language }
    : { id, quote, author, translation };
}

function matchesLanguageFilter(
  quote: FamousQuoteWord,
  language: FamousQuoteFilterLanguage,
): boolean {
  if (language === "All") return true;
  return resolveQuoteLanguage(quote.language, quote.quote) === language;
}

async function readFilteredFamousQuotes(
  coursePath: string,
  language: FamousQuoteFilterLanguage,
  dependencies: FamousQuoteDependencies,
  batchSize = READ_BATCH_SIZE,
): Promise<FamousQuoteWord[]> {
  const quotes: FamousQuoteWord[] = [];
  let cursor: FamousQuoteDocSnapshot | null = null;

  while (true) {
    let query = dependencies
      .adminDb
      .collection(coursePath)
      .orderBy(FieldPath.documentId())
      .limit(batchSize);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    snapshot.docs.forEach((doc) => {
      const quote = parseFamousQuoteWord(doc.id, doc.data());
      if (!quote) return;
      if (!matchesLanguageFilter(quote, language)) return;
      quotes.push(quote);
    });

    if (snapshot.size < batchSize) break;
    cursor = snapshot.docs[snapshot.docs.length - 1] ?? null;
  }

  return quotes;
}

export function createFamousQuotesHandler(
  dependencies: FamousQuoteDependencies,
) {
  return async function GET(request: NextRequest) {
    const caller = await dependencies.verifySessionUser(request);
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (caller.role !== "admin" && caller.role !== "super-admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const coursePath = searchParams.get("coursePath")?.trim() ?? "";
    const language = searchParams.get("language");

    if (!coursePath) {
      return NextResponse.json(
        { error: "Missing coursePath" },
        { status: 400 },
      );
    }

    if (!isFamousQuoteFilterLanguage(language)) {
      return NextResponse.json(
        { error: "Invalid language filter" },
        { status: 400 },
      );
    }

    const quotes = await readFilteredFamousQuotes(
      coursePath,
      language,
      dependencies,
    );
    return NextResponse.json(quotes);
  };
}

export const GET = createFamousQuotesHandler({
  adminDb,
  verifySessionUser,
});
