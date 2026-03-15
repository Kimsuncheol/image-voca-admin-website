import { z } from 'zod';

export const standardWordSchema = z.object({
  word: z.string().min(1),
  meaning: z.string().min(1),
  pronunciation: z.string().optional().default(''),
  example: z.string().optional().default(''),
  translation: z.string().optional().default(''),
  imageUrl: z.string().optional(),
});

export const collocationWordSchema = z.object({
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
export type CollocationWordInput = z.infer<typeof collocationWordSchema>;
export type FamousQuoteWordInput = z.infer<typeof famousQuoteWordSchema>;
