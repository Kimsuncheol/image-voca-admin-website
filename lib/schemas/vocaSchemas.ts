import { z } from 'zod';

export const standardWordSchema = z.object({
  id: z.string().optional(),
  word: z.string().min(1),
  meaning: z.string().min(1),
  pronunciation: z.string().optional().default(''),
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

export const famousQuoteWordSchema = z.object({
  quote: z.string().min(1),
  author: z.string().optional().default(''),
  translation: z.string().optional().default(''),
});

export type StandardWordInput = z.infer<typeof standardWordSchema>;
export type JlptWordInput = z.infer<typeof jlptWordSchema>;
export type CollocationWordInput = z.infer<typeof collocationWordSchema>;
export type FamousQuoteWordInput = z.infer<typeof famousQuoteWordSchema>;
