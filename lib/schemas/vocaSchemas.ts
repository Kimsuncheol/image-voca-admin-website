import { z } from 'zod';

import { KANJI_NESTED_LIST_FIELDS } from '@/lib/kanjiNestedList';

export const standardWordSchema = z.object({
  id: z.string().optional(),
  word: z.string().min(1),
  meaning: z.string().min(1),
  synonym: z.string().optional(),
  pronunciation: z.string().optional().default(''),
  example: z.string().optional().default(''),
  translation: z.string().optional().default(''),
  imageUrl: z.string().optional(),
  derivative: z.array(z.object({ word: z.string(), meaning: z.string() })).optional(),
});

export const extremelyAdvancedWordSchema = z.object({
  id: z.string().optional(),
  word: z.string().min(1),
  meaning: z.string().min(1),
  example: z.string().optional().default(''),
  translation: z.string().optional().default(''),
  imageUrl: z.string().optional(),
});

export const jlptWordSchema = z.object({
  id: z.string().optional(),
  word: z.string().min(1),
  meaningEnglish: z.string().optional().default(""),
  meaningKorean: z.string().optional().default(""),
  pronunciation: z.string().optional().default(""),
  pronunciationRoman: z.string().optional().default(""),
  example: z.string().optional().default(""),
  exampleRoman: z.string().optional().default(""),
  exampleHurigana: z.string().min(1),
  translationEnglish: z.string().optional().default(""),
  translationKorean: z.string().optional().default(""),
  imageUrl: z.string().optional(),
});

export const collocationWordSchema = z.object({
  id: z.string().optional(),
  collocation: z.string().min(1),
  meaning: z.string().min(1),
  explanation: z.string().optional().default(''),
  example: z.string().optional().default(''),
  translation: z.string().optional().default(''),
  imageUrl: z.string().optional(),
});

export const idiomWordSchema = z.object({
  id: z.string().optional(),
  idiom: z.string().min(1),
  meaning: z.string().min(1),
  example: z.string().optional().default(''),
  translation: z.string().optional().default(''),
  imageUrl: z.string().optional(),
});

export const famousQuoteWordSchema = z.object({
  quote: z.string().min(1),
  author: z.string().optional().default(''),
  translation: z.string().optional().default(''),
  language: z.enum(['English', 'Japanese']).default('English'),
});

const stringArraySchema = z.array(z.string());
export const kanjiNestedListGroupSchema = z.object({
  items: stringArraySchema,
});
const kanjiNestedListSchema = z.array(kanjiNestedListGroupSchema);

export const kanjiWordSchema = z.object({
  id: z.string().optional(),
  kanji: z.string().min(1),
  meaning: stringArraySchema,
  meaningExample: kanjiNestedListSchema,
  meaningExampleHurigana: kanjiNestedListSchema,
  meaningEnglishTranslation: kanjiNestedListSchema,
  meaningKoreanTranslation: kanjiNestedListSchema,
  reading: stringArraySchema,
  readingExample: kanjiNestedListSchema,
  readingExampleHurigana: kanjiNestedListSchema,
  readingEnglishTranslation: kanjiNestedListSchema,
  readingKoreanTranslation: kanjiNestedListSchema,
  example: stringArraySchema,
  exampleEnglishTranslation: stringArraySchema,
  exampleKoreanTranslation: stringArraySchema,
  exampleHurigana: stringArraySchema,
});

export const kanjiNestedListFields = KANJI_NESTED_LIST_FIELDS;

const jlptPrefixPostfixBase = jlptWordSchema.omit({ word: true, imageUrl: true });

export const prefixSchema = jlptPrefixPostfixBase.extend({
  prefix: z.string().min(1),
});

export const postfixSchema = jlptPrefixPostfixBase.extend({
  postfix: z.string().min(1),
});

export type StandardWordInput = z.infer<typeof standardWordSchema>;
export type ExtremelyAdvancedWordInput = z.infer<typeof extremelyAdvancedWordSchema>;
export type JlptWordInput = z.infer<typeof jlptWordSchema>;
export type CollocationWordInput = z.infer<typeof collocationWordSchema>;
export type IdiomWordInput = z.infer<typeof idiomWordSchema>;
export type FamousQuoteWordInput = z.infer<typeof famousQuoteWordSchema>;
export type KanjiWordInput = z.infer<typeof kanjiWordSchema>;
export type PrefixWordInput = z.infer<typeof prefixSchema>;
export type PostfixWordInput = z.infer<typeof postfixSchema>;
