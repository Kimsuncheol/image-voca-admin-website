const { z } = require('zod');

const schema = z.object({
  word: z.string().min(1),
  meaning: z.string().min(1),
  pronunciation: z.string().optional().default(''),
  example: z.string().optional().default(''),
  translation: z.string().optional().default(''),
});

const result1 = schema.safeParse({ word: 'apple', meaning: '사과', pronunciation: '', example: '', translation: '' });
console.log('Test 1 (empty strings):', result1.success ? 'SUCCESS' : result1.error.issues);

const result2 = schema.safeParse({ word: '', meaning: '' });
console.log('Test 2 (empty word):', result2.success ? 'SUCCESS' : result2.error.issues);

