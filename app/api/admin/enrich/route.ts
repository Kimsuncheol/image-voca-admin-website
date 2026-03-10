import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  buildWordLookupKey,
  enrichWords,
  hasText,
  isWordInput,
  mergeWordsWithExisting,
  type PersistedWordFields,
  type WordInput,
} from './enrichWords';

interface EnrichRequestBody {
  words: WordInput[];
  coursePath?: string;
  dayName?: string;
}

async function getExistingWordLookup(
  coursePath?: string,
  dayName?: string,
): Promise<Map<string, PersistedWordFields>> {
  if (!coursePath || !dayName) return new Map();

  try {
    const snapshot = await adminDb.doc(coursePath).collection(dayName).get();
    const lookup = new Map<string, PersistedWordFields>();

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() as Partial<WordInput>;
      if (!hasText(data.word) || !hasText(data.meaning)) return;

      const key = buildWordLookupKey(data.word, data.meaning);
      if (lookup.has(key)) return;

      lookup.set(key, {
        example: hasText(data.example) ? data.example : undefined,
        translation: hasText(data.translation) ? data.translation : undefined,
      });
    });

    return lookup;
  } catch (error) {
    console.error('[Enrich] Failed to load existing day words:', error);
    return new Map();
  }
}

/**
 * POST /api/admin/enrich
 * Accepts { words: WordInput[] }, returns the same array with missing
 * `example` and `translation` fields filled in via Gemini.
 * Failures are silent per-word — callers receive the original word on error.
 */
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let requestBody: EnrichRequestBody;
  try {
    requestBody = (await request.json()) as EnrichRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(requestBody.words) || !requestBody.words.every(isWordInput)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  const existingWordLookup = await getExistingWordLookup(
    requestBody.coursePath,
    requestBody.dayName,
  );
  const words = mergeWordsWithExisting(requestBody.words, existingWordLookup);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return merged words unchanged when enrichment is not configured
    return NextResponse.json({ words });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1000 },
  });

  const result = await enrichWords(words, async (w, needs) => {
    const parts: string[] = [];
    const jsonFields: string[] = [];

    if (needs.needsExample) {
      parts.push('- Write 2 or 3 short, natural English example sentences using the word. Format them as a numbered list separated by line breaks (\\n).');
      jsonFields.push('"example":"1. ...\\n2. ..."');
    } else if (needs.needsTranslation && w.example) {
      parts.push(`- Here are the existing examples: "${w.example}"`);
    }

    if (needs.needsTranslation) {
      if (needs.needsExample) {
        parts.push('- Provide the Korean translations corresponding to the generated examples. Format them as a numbered list separated by line breaks (\\n).');
        jsonFields.push('"translation":"1. ...\\n2. ..."');
      } else {
        parts.push('- Provide the Korean translations corresponding to the existing examples. Match the formatting of the existing examples (e.g., if there are multiple lines, provide multiple lines).');
        jsonFields.push('"translation":"..."');
      }
    }

    const prompt =
      `English word: "${w.word}", meaning: "${w.meaning}".\n` +
      parts.join('\n') +
      `\nRespond ONLY as JSON: {${jsonFields.join(',')}}\nEnsure line breaks are escaped as \\n in the JSON string.`;

    const result = await geminiModel.generateContent(prompt);
    const raw = result.response.text();
    let parsed: { example?: string; translation?: string } = {};
    
    const startIdx = raw.indexOf('{');
    const endIdx = raw.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      const jsonStr = raw.substring(startIdx, endIdx + 1);
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        /* keep original */
        console.error(`[Enrich Error] Failed to parse:`, jsonStr);
      }
    }

    console.log(`[Enrich] "${w.word}":`, parsed);

    return {
      example: hasText(parsed.example) ? parsed.example : '',
      translation: hasText(parsed.translation) ? parsed.translation : '',
    };
  });

  return NextResponse.json({ words: result });
}
