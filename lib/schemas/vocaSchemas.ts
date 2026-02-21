import { z } from 'zod';

export const standardWordSchema = z.object({
  word: z.string().min(1),
  meaning: z.string().min(1),
  pronunciation: z.string().optional().default(''),
  example: z.string().optional().default(''),
  translation: z.string().optional().default(''),
});

export const collocationWordSchema = z.object({
  collocation: z.string().min(1),
  meaning: z.string().min(1),
  explanation: z.string().optional().default(''),
  example: z.string().optional().default(''),
  translation: z.string().optional().default(''),
});

export type StandardWordInput = z.infer<typeof standardWordSchema>;
export type CollocationWordInput = z.infer<typeof collocationWordSchema>;
