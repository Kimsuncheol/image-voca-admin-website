import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import OpenAI from 'openai';

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
 * `example` and `translation` fields filled in via OpenAI.
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

  const apiKey = process.env.OPENAI_API_KEY;
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

  const openai = new OpenAI({ apiKey });

  const enrichOne = async (w: WordInput): Promise<WordInput> => {
    const needsExample = !w.example;
    const needsTranslation = !w.translation;
    if (!needsExample && !needsTranslation) return w;

    const parts: string[] = [];
    if (needsExample)
      parts.push('- Write one short, natural English example sentence using the word.');
    if (needsTranslation)
      parts.push('- Provide the Korean translation of the meaning.');

    const prompt =
      `English word: "${w.word}", meaning: "${w.meaning}".\n` +
      parts.join('\n') +
      '\nRespond ONLY as JSON: {"example":"...","translation":"..."}';

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 150,
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: { example?: string; translation?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* keep original */
    }

    return {
      ...w,
      example: w.example || parsed.example || '',
      translation: w.translation || parsed.translation || '',
    };
  };

  // Process words in chunks of 10 to avoid hitting OpenAI rate limits
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
