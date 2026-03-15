import type { AISettings } from "@/lib/aiSettings";

interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryEntry {
  phonetics: DictionaryPhonetic[];
}

interface OxfordPhonetic {
  phoneticSpelling?: string;
  dialects?: string[];
}

interface OxfordLexicalEntry {
  pronunciations?: OxfordPhonetic[];
  entries?: Array<{ pronunciations?: OxfordPhonetic[] }>;
}

interface OxfordResponse {
  results?: Array<{ lexicalEntries?: OxfordLexicalEntry[] }>;
}

type PronunciationSettings = Pick<
  AISettings,
  "pronunciationApi" | "oxfordAppId" | "oxfordAppKey"
>;

async function getIpaFromFreeDictionary(
  word: string,
): Promise<{ us: string; uk: string } | null> {
  try {
    const resp = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
    );
    if (!resp.ok) return null;

    const entries: DictionaryEntry[] = await resp.json();
    if (!entries.length) return null;

    const phonetics = entries[0].phonetics;
    let us = "";
    let uk = "";

    for (const p of phonetics) {
      if (!p.text) continue;
      const audio = p.audio ?? "";
      if (audio.includes("-us")) us = p.text;
      else if (audio.includes("-uk")) uk = p.text;
      else if (!us) us = p.text;
    }

    if (!us && !uk) return null;
    return { us: us || uk, uk: uk || us };
  } catch {
    return null;
  }
}

async function getIpaFromOxford(
  word: string,
  appId: string,
  appKey: string,
): Promise<{ us: string; uk: string } | null> {
  try {
    const resp = await fetch(
      `https://od-api.oxforddictionaries.com/api/v2/entries/en-gb/${encodeURIComponent(word.toLowerCase())}?fields=pronunciations`,
      { headers: { app_id: appId, app_key: appKey } },
    );
    if (!resp.ok) return null;

    const data: OxfordResponse = await resp.json();
    const lexicalEntries = data.results?.[0]?.lexicalEntries ?? [];

    let us = "";
    let uk = "";

    for (const le of lexicalEntries) {
      const phonetics: OxfordPhonetic[] = [
        ...(le.pronunciations ?? []),
        ...(le.entries?.flatMap((e) => e.pronunciations ?? []) ?? []),
      ];
      for (const p of phonetics) {
        if (!p.phoneticSpelling) continue;
        const dialects = p.dialects ?? [];
        if (dialects.some((d) => d.toLowerCase().includes("american"))) {
          us = p.phoneticSpelling;
        } else if (dialects.some((d) => d.toLowerCase().includes("british"))) {
          uk = p.phoneticSpelling;
        } else if (!us) {
          us = p.phoneticSpelling;
        }
      }
      if (us || uk) break;
    }

    if (!us && !uk) return null;
    return { us: us || uk, uk: uk || us };
  } catch {
    return null;
  }
}

/**
 * Fetches IPA phonetic transcriptions.
 * Dispatches to Oxford Dictionaries API or Free Dictionary API based on settings.
 * Returns { us, uk } strings, or null if the word is not found.
 * Only called for single-word entries with missing pronunciation (FR-10).
 */
export async function getIpaUSUK(
  word: string,
  settings?: PronunciationSettings,
): Promise<{ us: string; uk: string } | null> {
  if (
    settings?.pronunciationApi === "oxford" &&
    settings.oxfordAppId &&
    settings.oxfordAppKey
  ) {
    return getIpaFromOxford(word, settings.oxfordAppId, settings.oxfordAppKey);
  }
  return getIpaFromFreeDictionary(word);
}

export function formatPersistedPronunciation(ipa: {
  us: string;
  uk: string;
}): string {
  return ipa.us === ipa.uk ? ipa.us : `US: ${ipa.us} / UK: ${ipa.uk}`;
}

export async function getPersistedPronunciation(
  word: string,
  settings?: PronunciationSettings,
): Promise<string | null> {
  const ipa = await getIpaUSUK(word, settings);
  return ipa ? formatPersistedPronunciation(ipa) : null;
}

/**
 * Fetches IPA for multiple words concurrently with a bounded concurrency pool.
 * Returns a Map from word → { us, uk } (or null when the word is not found).
 * Default concurrency of 5 avoids overwhelming the API while still being fast.
 */
export async function getIpaUSUKBatch(
  words: string[],
  settings?: PronunciationSettings,
  concurrency = 5,
): Promise<Map<string, { us: string; uk: string } | null>> {
  const result = new Map<string, { us: string; uk: string } | null>();
  if (words.length === 0) return result;

  const queue = [...words];
  let done = 0;
  const total = words.length;

  await new Promise<void>((resolve) => {
    const inFlight = new Set<Promise<void>>();

    const launch = () => {
      while (inFlight.size < concurrency && queue.length > 0) {
        const word = queue.shift()!;
        const p: Promise<void> = getIpaUSUK(word, settings)
          .then((ipa) => {
            result.set(word, ipa);
          })
          .finally(() => {
            inFlight.delete(p);
            done++;
            if (done === total) resolve();
            else launch();
          });
        inFlight.add(p);
      }
    };

    launch();
  });

  return result;
}
