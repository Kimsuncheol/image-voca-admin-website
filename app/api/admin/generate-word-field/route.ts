import { NextRequest, NextResponse } from 'next/server.js';
import { adminAuth } from '@/lib/firebase/admin';
import { enrichWords, hasText, type WordInput } from '../enrich/enrichWords';
import { getIpaUSUK } from '@/lib/utils/ipaLookup';
import {
  createGeminiEnrichmentGenerator,
  createChatGPTEnrichmentGenerator,
} from '@/lib/server/enrichmentService';
import { getServerAISettings } from '@/lib/server/aiSettings';
import {
  getEnrichGenerationDisabledResponse,
  shouldBlockWordFieldGeneration,
} from '@/lib/server/aiFeatureGuards';

type FieldType = 'pronunciation' | 'example' | 'translation';

interface GenerateWordFieldBody {
  field: FieldType;
  word: string;
  meaning: string;
  example?: string;
}

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

  let body: GenerateWordFieldBody;
  try {
    body = (await request.json()) as GenerateWordFieldBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { field, word, meaning, example } = body;

  if (!['pronunciation', 'example', 'translation'].includes(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
  }
  if (!hasText(word) || !hasText(meaning)) {
    return NextResponse.json({ error: 'word and meaning are required' }, { status: 400 });
  }

  // --- Pronunciation ---
  if (field === 'pronunciation') {
    if (word.includes(' ')) {
      return NextResponse.json(
        { error: 'Multi-word entries are not supported for pronunciation lookup' },
        { status: 422 },
      );
    }

    const ipa = await Promise.race([
      getIpaUSUK(word),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (!ipa) {
      return NextResponse.json({ error: 'Pronunciation not found' }, { status: 422 });
    }

    const pronunciation = ipa.us === ipa.uk ? ipa.us : `US: ${ipa.us} / UK: ${ipa.uk}`;
    return NextResponse.json({ pronunciation });
  }

  // --- Example / Translation ---
  const settings = await getServerAISettings();
  if (shouldBlockWordFieldGeneration(settings, field)) {
    const disabledResponse = getEnrichGenerationDisabledResponse();
    return NextResponse.json(disabledResponse.body, {
      status: disabledResponse.status,
    });
  }

  let generatorApiKey: string | undefined;
  let createGenerator: typeof createGeminiEnrichmentGenerator;

  if (settings.enrichModel === 'chatgpt') {
    generatorApiKey = process.env.OPENAI_API_KEY;
    createGenerator = createChatGPTEnrichmentGenerator;
  } else {
    generatorApiKey = process.env.GEMINI_API_KEY;
    createGenerator = createGeminiEnrichmentGenerator;
  }

  if (!generatorApiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

  const generateExample = field === 'example' || (field === 'translation' && !hasText(example));
  const generateTranslation = field === 'translation';

  const wordInput: WordInput = {
    word,
    meaning,
    example: hasText(example) ? example : undefined,
  };

  const [result] = await enrichWords(
    [wordInput],
    createGenerator(generatorApiKey),
    { generateExample, generateTranslation },
  );

  const response: { example?: string; translation?: string } = {};
  if (hasText(result.example) && generateExample) response.example = result.example;
  if (hasText(result.translation)) response.translation = result.translation;

  if (Object.keys(response).length === 0) {
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }

  return NextResponse.json(response);
}
