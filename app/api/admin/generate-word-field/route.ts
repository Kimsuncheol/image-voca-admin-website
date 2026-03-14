import { NextRequest, NextResponse } from 'next/server.js';
import { enrichWords, hasText, type WordInput } from '../enrich/enrichWords';
import { getPersistedPronunciation } from '@/lib/utils/ipaLookup';
import {
  createGeminiEnrichmentGenerator,
  createChatGPTEnrichmentGenerator,
} from '@/lib/server/enrichmentService';
import { verifySessionUser } from '@/lib/server/sessionUser';
import { getServerAISettings } from '@/lib/server/aiSettings';
import {
  getEnrichGenerationDisabledResponse,
  getEnrichGenerationPermissionDeniedResponse,
  shouldBlockWordFieldGenerationForUser,
} from '@/lib/server/aiFeatureGuards';

type FieldType = 'pronunciation' | 'example' | 'translation';

interface GenerateWordFieldBody {
  field: FieldType;
  word: string;
  meaning: string;
  example?: string;
}

export async function POST(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (caller.role !== 'admin' && caller.role !== 'super-admin') {
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

    const pronunciation = await Promise.race([
      getPersistedPronunciation(word),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (!pronunciation) {
      return NextResponse.json({ error: 'Pronunciation not found' }, { status: 422 });
    }

    return NextResponse.json({ pronunciation });
  }

  // --- Example / Translation ---
  const settings = await getServerAISettings();
  const blockReason = shouldBlockWordFieldGenerationForUser(settings, field, caller);
  if (blockReason === 'feature_disabled') {
    const disabledResponse = getEnrichGenerationDisabledResponse();
    return NextResponse.json(disabledResponse.body, {
      status: disabledResponse.status,
    });
  }
  if (blockReason === 'permission_denied') {
    const deniedResponse = getEnrichGenerationPermissionDeniedResponse();
    return NextResponse.json(deniedResponse.body, {
      status: deniedResponse.status,
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
