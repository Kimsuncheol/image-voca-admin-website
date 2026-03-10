import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface WordInput {
  word: string;
  meaning: string;
  pronunciation?: string;
  example?: string;
  translation?: string;
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return words unchanged when enrichment is not configured
    const { words } = await request.json() as { words: WordInput[] };
    return NextResponse.json({ words });
  }

  let words: WordInput[];
  try {
    ({ words } = await request.json() as { words: WordInput[] });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1000 },
  });

  const enrichOne = async (w: WordInput): Promise<WordInput> => {
    const needsExample = !w.example;
    const needsTranslation = !w.translation;
    if (!needsExample && !needsTranslation) return w;

    const parts: string[] = [];
    if (needsExample)
      parts.push('- Write 2 or 3 short, natural English example sentences using the word. Format them as a numbered list separated by line breaks (\\n).');
    if (needsTranslation)
      parts.push('- Provide the Korean translations corresponding to the examples. Format them as a numbered list separated by line breaks (\\n).');

    const prompt =
      `English word: "${w.word}", meaning: "${w.meaning}".\n` +
      parts.join('\n') +
      '\nRespond ONLY as JSON: {"example":"1. ...\\n2. ...","translation":"1. ...\\n2. ..."}\nEnsure line breaks are escaped as \\n in the JSON string.';

    const result = await geminiModel.generateContent(prompt);
    const raw = result.response.text();
    let parsed: { example?: string; translation?: string } = {};
    
    const startIdx = raw.indexOf('{');
    const endIdx = raw.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
      const jsonStr = raw.substring(startIdx, endIdx + 1);
      try {
        parsed = JSON.parse(jsonStr);
      } catch (err) {
        /* keep original */
        console.error(`[Enrich Error] Failed to parse:`, jsonStr);
      }
    }

    console.log(`[Enrich] "${w.word}":`, parsed);

    return {
      ...w,
      example: w.example || parsed.example || '',
      translation: w.translation || parsed.translation || '',
    };
  };

  // Process words in chunks of 10 to avoid hitting rate limits
  const CHUNK = 10;
  const allSettled: PromiseSettledResult<WordInput>[] = [];
  for (let i = 0; i < words.length; i += CHUNK) {
    const batch = words.slice(i, i + CHUNK);
    const results = await Promise.allSettled(batch.map(enrichOne));
    allSettled.push(...results);
  }

  const result = allSettled.map((r, i) =>
    r.status === 'fulfilled' ? r.value : words[i]
  );

  return NextResponse.json({ words: result });
}
