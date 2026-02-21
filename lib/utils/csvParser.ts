import Papa from 'papaparse';
import {
  standardWordSchema,
  collocationWordSchema,
  type StandardWordInput,
  type CollocationWordInput,
} from '@/lib/schemas/vocaSchemas';

export interface ParseResult {
  words: (StandardWordInput | CollocationWordInput)[];
  isCollocation: boolean;
  errors: string[];
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || [];
        const isCollocation = headers.includes('collocation');
        const schema = isCollocation ? collocationWordSchema : standardWordSchema;

        const words: (StandardWordInput | CollocationWordInput)[] = [];
        const errors: string[] = [];

        results.data.forEach((row, index) => {
          const parsed = schema.safeParse(row);
          if (parsed.success) {
            words.push(parsed.data);
          } else {
            errors.push(`Row ${index + 1}: ${parsed.error.issues.map((i) => i.message).join(', ')}`);
          }
        });

        resolve({ words, isCollocation, errors });
      },
      error(err) {
        resolve({ words: [], isCollocation: false, errors: [err.message] });
      },
    });
  });
}

export function parseCsvString(csvString: string): ParseResult {
  const results = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = results.meta.fields || [];
  const isCollocation = headers.includes('collocation');
  const schema = isCollocation ? collocationWordSchema : standardWordSchema;

  const words: (StandardWordInput | CollocationWordInput)[] = [];
  const errors: string[] = [];

  results.data.forEach((row, index) => {
    const parsed = schema.safeParse(row);
    if (parsed.success) {
      words.push(parsed.data);
    } else {
      errors.push(`Row ${index + 1}: ${parsed.error.issues.map((i) => i.message).join(', ')}`);
    }
  });

  return { words, isCollocation, errors };
}
