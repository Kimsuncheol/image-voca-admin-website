import type {
  JlptWordInput,
  PostfixWordInput,
  PrefixWordInput,
} from "./schemas/vocaSchemas.ts";
import { addFuriganaTextsRobust } from "./addFurigana.ts";

export type FuriganaUploadSchema = "jlpt" | "prefix" | "postfix";
type FuriganaUploadWordMap = {
  jlpt: JlptWordInput;
  prefix: PrefixWordInput;
  postfix: PostfixWordInput;
};

function getPrimaryText<T extends FuriganaUploadSchema>(
  word: FuriganaUploadWordMap[T],
  schemaType: T,
): string {
  switch (schemaType) {
    case "jlpt":
      return (word as JlptWordInput).word;
    case "prefix":
      return (word as PrefixWordInput).prefix;
    case "postfix":
      return (word as PostfixWordInput).postfix;
  }
}

export async function applyFuriganaToJapaneseUploadWords<
  T extends FuriganaUploadSchema,
>(
  words: FuriganaUploadWordMap[T][],
  schemaType: T,
): Promise<FuriganaUploadWordMap[T][]> {
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
