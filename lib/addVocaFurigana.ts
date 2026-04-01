import type {
  JlptWordInput,
  PostfixWordInput,
  PrefixWordInput,
} from "./schemas/vocaSchemas.ts";
import { addFuriganaTextsRobust } from "./addFurigana.ts";

export type FuriganaUploadSchema = "jlpt" | "prefix" | "postfix";
export type FuriganaUploadWord =
  | JlptWordInput
  | PrefixWordInput
  | PostfixWordInput;

function getPrimaryText(
  word: FuriganaUploadWord,
  schemaType: FuriganaUploadSchema,
): string {
  switch (schemaType) {
    case "jlpt":
      return word.word;
    case "prefix":
      return word.prefix;
    case "postfix":
      return word.postfix;
  }
}

export async function applyFuriganaToJapaneseUploadWords<
  T extends FuriganaUploadWord,
>(
  words: T[],
  schemaType: FuriganaUploadSchema,
): Promise<T[]> {
  if (words.length === 0) return words;

  const pronunciationResults = await addFuriganaTextsRobust(
    words.map((word) => getPrimaryText(word, schemaType)),
    { mode: "hiragana_only" },
  );

  const exampleIndexes: number[] = [];
  const exampleTexts: string[] = [];

  words.forEach((word, index) => {
    if (typeof word.example === "string" && word.example.trim().length > 0) {
      exampleIndexes.push(index);
      exampleTexts.push(word.example);
    }
  });

  const exampleResults =
    exampleTexts.length > 0
      ? await addFuriganaTextsRobust(exampleTexts)
      : [];
  const exampleResultByIndex = new Map(
    exampleIndexes.map((wordIndex, resultIndex) => [
      wordIndex,
      exampleResults[resultIndex],
    ]),
  );

  return words.map((word, index) => {
    const nextWord = { ...word };
    const pronunciationResult = pronunciationResults[index];
    if (pronunciationResult?.ok) {
      nextWord.pronunciation = pronunciationResult.text;
    }

    const exampleResult = exampleResultByIndex.get(index);
    if (exampleResult?.ok) {
      nextWord.example = exampleResult.text;
    }

    return nextWord;
  });
}
