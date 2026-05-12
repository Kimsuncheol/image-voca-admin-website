export type WordPlacementChunkType = "sentence_chunk" | "answer";

export interface WordPlacementChunk {
  id: string;
  text: string;
  type: WordPlacementChunkType;
  order: number;
}

export interface WordsPlacementGroup {
  targetExample: string;
  chunks: WordPlacementChunk[];
}

export interface GenerateWordsPlacementChunksInput {
  word: string;
  example: string;
  wordId?: string;
}

const WORD_TOKEN_PATTERN = /[A-Za-z]+(?:['-][A-Za-z]+)*/g;
const NUMBERED_EXAMPLE_PATTERN = /^\s*\d+[.)]\s*/;
const SENTENCE_END_PATTERN = /(?<=[.!?])\s+(?=(?:"?[A-Z0-9]))/g;
const PUNCTUATION_ONLY_PATTERN = /^[^\p{L}\p{N}]+$/u;
const TRAILING_PUNCTUATION_PATTERN = /^[\s.,!?;:)"'\]]+$/;
const OPENING_QUOTES = new Set(['"', "'", "“", "‘"]);
const CLOSING_QUOTES = new Set(['"', "'", "”", "’"]);
const MAX_UNSPLIT_SENTENCE_CHUNK_WORDS = 4;
const TARGET_SENTENCE_CHUNK_WORDS = 3;

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "word";
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function splitExample(example: string): string[] {
  const normalized = example.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized
    .split("\n")
    .map((line) => normalizeSpaces(line.replace(NUMBERED_EXAMPLE_PATTERN, "")))
    .filter(Boolean);

  return lines.flatMap((line) => {
    const parts = line.split(SENTENCE_END_PATTERN).map(normalizeSpaces).filter(Boolean);
    return parts.length > 0 ? parts : [line];
  });
}

function isUsefulChunk(text: string): boolean {
  const normalized = normalizeSpaces(text);
  return Boolean(normalized) && !PUNCTUATION_ONLY_PATTERN.test(normalized);
}

function splitSentenceChunk(text: string): string[] {
  const normalized = normalizeSpaces(text);
  if (!isUsefulChunk(normalized)) return [];

  const words = normalized.split(" ");
  if (words.length <= MAX_UNSPLIT_SENTENCE_CHUNK_WORDS) return [normalized];

  const chunkCount = Math.ceil(words.length / TARGET_SENTENCE_CHUNK_WORDS);
  const chunkSize = Math.ceil(words.length / chunkCount);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }

  return chunks;
}

function candidateBases(token: string): Set<string> {
  const lower = token.toLowerCase();
  const bases = new Set([lower]);

  if (lower.endsWith("ies") && lower.length > 3) bases.add(`${lower.slice(0, -3)}y`);
  if (lower.endsWith("es") && lower.length > 2) bases.add(lower.slice(0, -2));
  if (lower.endsWith("s") && lower.length > 1) bases.add(lower.slice(0, -1));
  if (lower.endsWith("ied") && lower.length > 3) bases.add(`${lower.slice(0, -3)}y`);
  if (lower.endsWith("ed") && lower.length > 2) {
    const stem = lower.slice(0, -2);
    bases.add(stem);
    bases.add(`${stem}e`);
  }
  if (lower.endsWith("ing") && lower.length > 3) {
    const stem = lower.slice(0, -3);
    bases.add(stem);
    bases.add(`${stem}e`);
  }
  if (lower.endsWith("able") && lower.length > 4) {
    const stem = lower.slice(0, -4);
    bases.add(stem);
    bases.add(`${stem}e`);
  }

  return bases;
}

function tokenMatchesWord(token: string, word: string): boolean {
  const normalizedToken = token.toLowerCase();
  const normalizedWord = word.toLowerCase();
  if (normalizedToken === normalizedWord) return true;
  if (candidateBases(normalizedToken).has(normalizedWord)) return true;

  const wordStem = normalizedWord.endsWith("e")
    ? normalizedWord.slice(0, -1)
    : normalizedWord;
  return wordStem.length >= 4 && normalizedToken.startsWith(wordStem);
}

function findAnswerSpan(sentence: string, word: string): { start: number; end: number } | null {
  const phraseIndex = sentence.toLowerCase().indexOf(word.toLowerCase());
  if (phraseIndex >= 0 && /\s/.test(word.trim())) {
    return { start: phraseIndex, end: phraseIndex + word.length };
  }

  for (const match of sentence.matchAll(WORD_TOKEN_PATTERN)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (tokenMatchesWord(token, word)) {
      let answerStart = start;
      let answerEnd = start + token.length;
      const previous = sentence[answerStart - 1];
      const next = sentence[answerEnd];
      if (previous && next && OPENING_QUOTES.has(previous) && CLOSING_QUOTES.has(next)) {
        answerStart -= 1;
        answerEnd += 1;
      }
      return { start: answerStart, end: answerEnd };
    }
  }

  return null;
}

function buildChunkGroup({
  sentence,
  span,
  idPrefix,
}: {
  sentence: string;
  span: { start: number; end: number };
  idPrefix: string;
}): WordsPlacementGroup {
  const before = normalizeSpaces(sentence.slice(0, span.start));
  let answer = normalizeSpaces(sentence.slice(span.start, span.end));
  let after = normalizeSpaces(sentence.slice(span.end));

  if (after && TRAILING_PUNCTUATION_PATTERN.test(after)) {
    answer = normalizeSpaces(`${answer}${after}`);
    after = "";
  }

  const parts = [
    ...splitSentenceChunk(before).map((text) => ({
      text,
      type: "sentence_chunk" as const,
    })),
    { text: answer, type: "answer" as const },
    ...splitSentenceChunk(after).map((text) => ({
      text,
      type: "sentence_chunk" as const,
    })),
  ].filter((part) => isUsefulChunk(part.text));

  return {
    targetExample: normalizeSpaces(sentence),
    chunks: parts.map((part, index) => ({
      id: `${idPrefix}-chunk-${index + 1}`,
      text: part.text,
      type: part.type,
      order: index + 1,
    })),
  };
}

export function generateWordsPlacementChunks({
  word,
  example,
  wordId,
}: GenerateWordsPlacementChunksInput): WordsPlacementGroup[] {
  const normalizedWord = normalizeSpaces(word);
  if (!normalizedWord) return [];

  return splitExample(example)
    .map((sentence, sentenceIndex) => {
      const span = findAnswerSpan(sentence, normalizedWord);
      if (!span) return null;
      return buildChunkGroup({
        sentence,
        span,
        idPrefix: `${wordId ? slug(wordId) : slug(normalizedWord)}-${sentenceIndex + 1}`,
      });
    })
    .filter((group): group is WordsPlacementGroup => Boolean(group?.chunks.length));
}
