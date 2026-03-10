import {
  createGenerateImageError,
  hasImageUrl,
  type GenerateImagesFailure,
  type GenerateImageErrorCode,
  type UploadImageGenerationWord,
} from "../../../../types/imageGeneration.ts";

export interface UploadWordImageGeneration {
  imageUrl: string;
}

export type UploadWordImageGenerator = (
  word: UploadImageGenerationWord,
  index: number,
) => Promise<UploadWordImageGeneration>;

export async function generateImagesForUploadWords(
  words: UploadImageGenerationWord[],
  generateImage: UploadWordImageGenerator,
  concurrency = 2,
): Promise<{
  words: UploadImageGenerationWord[];
  failures: GenerateImagesFailure[];
}> {
  const output = words.map((word) =>
    hasImageUrl(word.imageUrl) ? word : { ...word, imageUrl: "" },
  );
  const failures: GenerateImagesFailure[] = [];
  const indexesToGenerate = output.map((_, index) => index);

  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, indexesToGenerate.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < indexesToGenerate.length) {
        const current = cursor;
        cursor += 1;

        const index = indexesToGenerate[current];
        const word = words[index];

        try {
          const result = await generateImage(word, index);
          output[index] = { ...word, imageUrl: result.imageUrl };
        } catch (error) {
          const generatedError =
            error &&
            typeof error === "object" &&
            "code" in error &&
            "error" in error &&
            typeof error.code === "string" &&
            typeof error.error === "string"
              ? {
                  code: error.code as GenerateImageErrorCode,
                  error: error.error,
                }
              : createGenerateImageError("INTERNAL_ERROR");

          failures.push({
            index,
            word: word.word,
            meaning: word.meaning,
            code: generatedError.code,
            error: generatedError.error,
          });
          output[index] = {
            ...word,
            imageUrl: hasImageUrl(word.imageUrl) ? word.imageUrl : "",
          };
        }
      }
    }),
  );

  failures.sort((a, b) => a.index - b.index);

  return { words: output, failures };
}
