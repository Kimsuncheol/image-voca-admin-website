interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryEntry {
  phonetics: DictionaryPhonetic[];
}

/**
 * Fetches IPA phonetic transcriptions from the free Dictionary API.
 * Returns { us, uk } strings, or null if the word is not found.
 * Only called for single-word entries with missing pronunciation (FR-10).
 */
export async function getIpaUSUK(
  word: string
): Promise<{ us: string; uk: string } | null> {
  try {
    const resp = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (!resp.ok) return null;

    const entries: DictionaryEntry[] = await resp.json();
    if (!entries.length) return null;

    const phonetics = entries[0].phonetics;
    let us = '';
    let uk = '';

    for (const p of phonetics) {
      if (!p.text) continue;
      const audio = p.audio ?? '';
      if (audio.includes('-us')) us = p.text;
      else if (audio.includes('-uk')) uk = p.text;
      else if (!us) us = p.text; // first available as fallback
    }

    if (!us && !uk) return null;
    return { us: us || uk, uk: uk || us };
  } catch {
    return null;
  }
}
