import { NextRequest, NextResponse } from 'next/server.js';
import { adminDb } from '@/lib/firebase/admin';
import {
  buildWordLookupKey,
  enrichWords,
  hasText,
  isWordInput,
  mergeWordsWithExisting,
  type PersistedWordFields,
  type WordInput,
} from './enrichWords';
import {
  createGeminiEnrichmentGenerator,
  createChatGPTEnrichmentGenerator,
} from '@/lib/server/enrichmentService';
import { getServerAISettings } from '@/lib/server/aiSettings';
import {
  getEnrichGenerationDisabledResponse,
  getEnrichGenerationPermissionDeniedResponse,
  shouldBlockEnrichGenerationForUser,
} from '@/lib/server/aiFeatureGuards';
import { verifySessionUser } from '@/lib/server/sessionUser';

interface EnrichRequestBody {
  words: WordInput[];
  coursePath?: string;
  dayName?: string;
  generateExample?: boolean;
  generateTranslation?: boolean;
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
 * `example` and `translation` fields filled in via the configured AI model.
 * Failures are silent per-word — callers receive the original word on error.
 */
export async function POST(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (caller.role !== 'admin' && caller.role !== 'super-admin') {
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
  const generateExample = requestBody.generateExample !== false;
  const generateTranslation = requestBody.generateTranslation !== false;

  if (!generateExample && !generateTranslation) {
    return NextResponse.json({ words });
  }

  const settings = await getServerAISettings();
  const blockReason = shouldBlockEnrichGenerationForUser(
    settings,
    {
      generateExample,
      generateTranslation,
    },
    caller,
  );
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

  if (settings.enrichModel === 'chatgpt') {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ words });

    const result = await enrichWords(
      words,
      createChatGPTEnrichmentGenerator(apiKey),
      { generateExample, generateTranslation },
    );
    return NextResponse.json({ words: result });
  }

  // Default: Gemini
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ words });
  }

  const result = await enrichWords(
    words,
    createGeminiEnrichmentGenerator(apiKey),
    { generateExample, generateTranslation },
  );
  return NextResponse.json({ words: result });
}
