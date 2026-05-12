import path from "node:path";

import kuromoji, { type IpadicFeatures, type Tokenizer } from "kuromoji";

import type { WordPlacementChunk, WordsPlacementGroup } from "@/lib/wordsPlacementChunkGenerator";

interface GenerateJapaneseWordsPlacementChunksInput {
  word: string;
  example: string;
  wordId?: string;
}

interface GenerateKanjiWordsPlacementChunksInput {
  example: string | string[];
  wordId?: string;
}

type JapanesePart = {
  text: string;
  type: "sentence_chunk" | "answer";
};

const JAPANESE_SENTENCE_END_PATTERN = /(?<=[。！？!?])\s*/;
const JAPANESE_PUNCTUATION_PATTERN = /^[。、！？!?・「」『』（）()[\]\s]+$/;
const JAPANESE_PARTICLE_POS = "助詞";
const JAPANESE_PARTICLE_SET = new Set(["は", "が", "を", "に", "へ", "で", "と", "の", "も", "や"]);
const JAPANESE_SUFFIX_SET = new Set(["ませ", "ん", "だ", "です", "ます", "か"]);
const JAPANESE_TRAILING_PUNCTUATION_PATTERN = /^[。、！？!?]+$/;
const KANJI_MARKER_PATTERN = /\[\[\[(.+?)\]\]\]/;
const FURIGANA_PATTERN = /(?<=[\p{Script=Han}ぁ-んァ-ン])\([^)]*\)/gu;

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "word";
}

function normalizeJapaneseText(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/\s+/g, "").trim();
}

export function stripJapaneseReadings(value: string): string {
  return value.replace(FURIGANA_PATTERN, "");
}

function splitJapaneseExamples(example: string): string[] {
  return example
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .flatMap((line) =>
      line
        .split(JAPANESE_SENTENCE_END_PATTERN)
        .map((part) => part.trim())
        .filter(Boolean),
    );
}

function isUsefulJapaneseChunk(text: string): boolean {
  const normalized = normalizeJapaneseText(text);
  return Boolean(normalized) && !JAPANESE_PUNCTUATION_PATTERN.test(normalized);
}

function makeChunks(parts: JapanesePart[], idPrefix: string): WordPlacementChunk[] {
  const normalizedParts: JapanesePart[] = [];

  for (const part of parts) {
    const text = normalizeJapaneseText(part.text);
    if (!text) continue;
    if (JAPANESE_TRAILING_PUNCTUATION_PATTERN.test(text) && normalizedParts.length > 0) {
      const previous = normalizedParts[normalizedParts.length - 1];
      normalizedParts[normalizedParts.length - 1] = {
        ...previous,
        text: `${previous.text}${text}`,
      };
      continue;
    }
    if (!isUsefulJapaneseChunk(text)) continue;
    normalizedParts.push({ ...part, text });
  }

  return normalizedParts.map((part, index) => ({
    id: `${idPrefix}-chunk-${index + 1}`,
    text: part.text,
    type: part.type,
    order: index + 1,
  }));
}

function getKuromojiTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  tokenizerPromise ??= new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: path.join(process.cwd(), "node_modules/kuromoji/dict") })
      .build((error, tokenizer) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(tokenizer);
      });
  });
  return tokenizerPromise;
}

function tokenText(token: IpadicFeatures): string {
  return token.surface_form;
}

function tokenMatchesWord(token: IpadicFeatures, word: string): boolean {
  return (
    token.surface_form === word ||
    token.basic_form === word ||
    token.surface_form.includes(word) ||
    token.basic_form.includes(word)
  );
}

function isParticleToken(token: IpadicFeatures): boolean {
  return token.pos === JAPANESE_PARTICLE_POS || JAPANESE_PARTICLE_SET.has(token.surface_form);
}

function tokenIsPunctuation(token: IpadicFeatures): boolean {
  return JAPANESE_PUNCTUATION_PATTERN.test(token.surface_form);
}

function tokenToPart(token: IpadicFeatures): JapanesePart | null {
  if (tokenIsPunctuation(token)) return { text: token.surface_form, type: "sentence_chunk" };
  if (isParticleToken(token)) return null;
  return { text: token.surface_form, type: "sentence_chunk" };
}

function attachToken(parts: JapanesePart[], token: IpadicFeatures) {
  const text = tokenText(token);
  if (!text) return;

  if ((isParticleToken(token) || tokenIsPunctuation(token)) && parts.length > 0) {
    const previous = parts[parts.length - 1];
    parts[parts.length - 1] = {
      ...previous,
      text: `${previous.text}${text}`,
    };
    return;
  }

  if (JAPANESE_SUFFIX_SET.has(text) && parts.length > 0) {
    const previous = parts[parts.length - 1];
    parts[parts.length - 1] = {
      ...previous,
      text: `${previous.text}${text}`,
    };
    return;
  }

  const part = tokenToPart(token);
  if (!part) return;

  const previous = parts[parts.length - 1];
  if (
    previous?.type === "sentence_chunk" &&
    /^[一二三四五六七八九十百千万何0-9]+$/.test(previous.text) &&
    !/[。、！？!?]$/.test(previous.text)
  ) {
    parts[parts.length - 1] = {
      ...previous,
      text: `${previous.text}${part.text}`,
    };
    return;
  }

  parts.push(part);
}

function buildJapaneseGroup({
  targetExample,
  tokens,
  matchIndex,
  idPrefix,
}: {
  targetExample: string;
  tokens: IpadicFeatures[];
  matchIndex: number;
  idPrefix: string;
}): WordsPlacementGroup {
  const parts: JapanesePart[] = [];

  for (let i = 0; i < matchIndex; i += 1) {
    attachToken(parts, tokens[i]);
  }

  let answerText = tokenText(tokens[matchIndex]);
  let afterStart = matchIndex + 1;
  while (afterStart < tokens.length && isParticleToken(tokens[afterStart])) {
    answerText += tokenText(tokens[afterStart]);
    afterStart += 1;
  }
  while (afterStart < tokens.length && tokenIsPunctuation(tokens[afterStart])) {
    answerText += tokenText(tokens[afterStart]);
    afterStart += 1;
  }
  parts.push({ text: answerText, type: "answer" });

  for (let i = afterStart; i < tokens.length; i += 1) {
    attachToken(parts, tokens[i]);
  }

  return {
    targetExample,
    chunks: makeChunks(parts, idPrefix),
  };
}

export async function generateJapaneseWordsPlacementChunks({
  word,
  example,
  wordId,
}: GenerateJapaneseWordsPlacementChunksInput): Promise<WordsPlacementGroup[]> {
  const normalizedWord = stripJapaneseReadings(word).trim();
  if (!normalizedWord) return [];

  const tokenizer = await getKuromojiTokenizer();
  return splitJapaneseExamples(example)
    .map(stripJapaneseReadings)
    .map(normalizeJapaneseText)
    .map((targetExample, sentenceIndex) => {
      const tokens = tokenizer.tokenize(targetExample);
      const matchIndex = tokens.findIndex((token) => tokenMatchesWord(token, normalizedWord));
      if (matchIndex < 0) return null;
      return buildJapaneseGroup({
        targetExample,
        tokens,
        matchIndex,
        idPrefix: `${wordId ? slug(wordId) : "japanese"}-${sentenceIndex + 1}`,
      });
    })
    .filter((group): group is WordsPlacementGroup => Boolean(group?.chunks.length));
}

function normalizeKanjiExamples(example: string | string[]): string[] {
  return (Array.isArray(example) ? example : splitJapaneseExamples(example))
    .map((item) => item.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
}

function expandMarkedAnswer({
  marked,
  afterMarked,
}: {
  marked: string;
  afterMarked: string;
}): string {
  const cleanMarked = normalizeJapaneseText(stripJapaneseReadings(marked));
  const startsWithReadingCompound = afterMarked.match(/^([\p{Script=Han}ぁ-んァ-ンー]+)\([^)]*\)/u);
  if (startsWithReadingCompound?.[1]) {
    return `${cleanMarked}${startsWithReadingCompound[1]}`;
  }

  const cleanAfter = normalizeJapaneseText(stripJapaneseReadings(afterMarked));
  const nextChar = Array.from(cleanAfter)[0] ?? "";
  if (nextChar && JAPANESE_PARTICLE_SET.has(nextChar)) {
    return `${cleanMarked}${nextChar}`;
  }

  return cleanMarked;
}

function splitKanjiSentenceChunk(text: string): string[] {
  const normalized = normalizeJapaneseText(text);
  if (!isUsefulJapaneseChunk(normalized)) return [];

  const chunks: string[] = [];
  let current = "";
  for (const char of normalized) {
    current += char;
    if (
      ["は", "が", "を", "に", "と", "の", "も", "や"].includes(char) ||
      JAPANESE_TRAILING_PUNCTUATION_PATTERN.test(char)
    ) {
      chunks.push(current);
      current = "";
    }
  }
  if (current) chunks.push(current);

  return chunks.filter(isUsefulJapaneseChunk);
}

function buildKanjiGroup(rawExample: string, idPrefix: string): WordsPlacementGroup | null {
  const markerMatch = rawExample.match(KANJI_MARKER_PATTERN);
  if (!markerMatch || markerMatch.index === undefined) return null;

  const beforeMarked = rawExample.slice(0, markerMatch.index);
  const marked = markerMatch[1];
  const afterMarked = rawExample.slice(markerMatch.index + markerMatch[0].length);
  const cleanBefore = normalizeJapaneseText(stripJapaneseReadings(beforeMarked));
  const cleanMarked = normalizeJapaneseText(stripJapaneseReadings(marked));
  const cleanAfter = normalizeJapaneseText(stripJapaneseReadings(afterMarked));
  const cleanSentence = `${cleanBefore}${cleanMarked}${cleanAfter}`;
  const answerStart = cleanBefore.length;
  const answer = expandMarkedAnswer({ marked, afterMarked });
  const answerEnd = cleanBefore.length + answer.length;

  const before = cleanSentence.slice(0, answerStart);
  const after = cleanSentence.slice(answerEnd);
  const parts: JapanesePart[] = [
    ...splitKanjiSentenceChunk(before).map((text) => ({
      text,
      type: "sentence_chunk" as const,
    })),
    { text: answer, type: "answer" },
    ...splitKanjiSentenceChunk(after).map((text) => ({
      text,
      type: "sentence_chunk" as const,
    })),
  ];

  return {
    targetExample: cleanSentence,
    chunks: makeChunks(parts, idPrefix),
  };
}

export function generateKanjiWordsPlacementChunks({
  example,
  wordId,
}: GenerateKanjiWordsPlacementChunksInput): WordsPlacementGroup[] {
  return normalizeKanjiExamples(example)
    .map((rawExample, index) =>
      buildKanjiGroup(rawExample, `${wordId ? slug(wordId) : "kanji"}-${index + 1}`),
    )
    .filter((group): group is WordsPlacementGroup => Boolean(group?.chunks.length));
}
