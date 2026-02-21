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
  detectedHeaders: string[];
}

function normalizeRow(row: Record<string, unknown>, isCollocation: boolean): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  // Alias mappings
  const wordAliases = ['word', '_1'];
  const collocationAliases = ['collocation', '_1'];
  const meaningAliases = ['meaning', '_2'];
  const pronunciationAliases = ['pronunciation', 'pronounciation', '_3'];
  const explanationAliases = ['explanation', '_3']; // _3 is explanation for collocation, pronunciation for word
  const exampleAliases = ['example', 'example sentence', '_4'];
  const translationAliases = ['translation', '_5'];

  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.trim().toLowerCase();
    const cleanValue = typeof value === 'string' ? value.trim() : value;

    // Map to definitive keys
    if (isCollocation && collocationAliases.includes(cleanKey)) normalized['collocation'] = cleanValue;
    else if (!isCollocation && wordAliases.includes(cleanKey)) normalized['word'] = cleanValue;
    else if (meaningAliases.includes(cleanKey)) normalized['meaning'] = cleanValue;
    else if (!isCollocation && pronunciationAliases.includes(cleanKey)) normalized['pronunciation'] = cleanValue;
    else if (isCollocation && explanationAliases.includes(cleanKey)) normalized['explanation'] = cleanValue;
    else if (exampleAliases.includes(cleanKey)) normalized['example'] = cleanValue;
    else if (translationAliases.includes(cleanKey)) normalized['translation'] = cleanValue;
    else normalized[cleanKey] = cleanValue; // Fallback
  }
  
  // Ensure required and optional keys exist as empty strings if completely missing from the row
  if (isCollocation) {
    normalized['collocation'] = normalized['collocation'] ?? '';
    normalized['meaning'] = normalized['meaning'] ?? '';
    normalized['explanation'] = normalized['explanation'] ?? '';
    normalized['example'] = normalized['example'] ?? '';
    normalized['translation'] = normalized['translation'] ?? '';
  } else {
    normalized['word'] = normalized['word'] ?? '';
    normalized['meaning'] = normalized['meaning'] ?? '';
    normalized['pronunciation'] = normalized['pronunciation'] ?? '';
    normalized['example'] = normalized['example'] ?? '';
    normalized['translation'] = normalized['translation'] ?? '';
  }

  return normalized;
}

function detectAndParse(
  data: Record<string, unknown>[],
  rawHeaders: string[]
): ParseResult {
  const headers = rawHeaders.map((h) => h.trim().toLowerCase());
  const isCollocation = headers.includes('collocation');
  const schema = isCollocation ? collocationWordSchema : standardWordSchema;

  const words: (StandardWordInput | CollocationWordInput)[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const normalized = normalizeRow(row, isCollocation);
    const parsed = schema.safeParse(normalized);
    if (parsed.success) {
      words.push(parsed.data);
    } else {
      errors.push(
        `Row ${index + 1}: ${parsed.error.issues.map((i) => i.message).join(', ')}`
      );
    }
  });

  return { words, isCollocation, errors, detectedHeaders: rawHeaders };
}

function processParsedArray(data: string[][]): ParseResult {
  if (data.length === 0) return { words: [], isCollocation: false, errors: [], detectedHeaders: [] };

  const firstRow = data[0].map(h => h?.trim().toLowerCase() || '');
  
  const allAliases = [
    'word', '_1', 'collocation', 'meaning', '_2', 
    'pronunciation', 'pronounciation', '_3', 'explanation', 
    'example', 'example sentence', '_4', 'translation', '_5'
  ];

  const hasHeaders = firstRow.some(h => allAliases.includes(h));
  console.log('[csvParser] Has headers row:', hasHeaders, '| First row:', firstRow);

  let headers: string[];
  let rows: string[][];

  if (hasHeaders) {
    headers = firstRow;
    rows = data.slice(1);
  } else {
    headers = ['_1', '_2', '_3', '_4', '_5'];
    rows = data;
  }
  console.log('[csvParser] Using headers:', headers, '| Row count:', rows.length);

  const objects = rows
    .filter(rowArray => rowArray.some(cell => cell && cell.trim().length > 0)) // skip fully empty rows
    .map(rowArray => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = rowArray[i];
      });
      return obj;
    });

  console.log('[csvParser] Normalized objects:', objects);

  return detectAndParse(objects, headers);
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    // Determine delimiter based on file extension
    const isTsv = file.name.toLowerCase().endsWith('.tsv') || file.name.toLowerCase().endsWith('.txt');
    
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      delimiter: isTsv ? '\t' : '', // Empty string tells PapaParse to auto-detect, but we force tab for tsv/txt
      complete(results) {
        resolve(processParsedArray(results.data as string[][]));
      },
      error(err) {
        resolve({ words: [], isCollocation: false, errors: [err.message], detectedHeaders: [] });
      },
    });
  });
}

export function parseCsvString(csvString: string): ParseResult {
  // Detect delimiter by comparing tab vs comma count on the first line.
  // This correctly handles TSV pasted from Google Sheets/Excel even when
  // example sentences contain commas.
  const firstLine = csvString.split('\n')[0] ?? '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : '';
  console.log('[csvParser] parseCsvString — firstLine:', JSON.stringify(firstLine));
  console.log('[csvParser] tabCount:', tabCount, '| commaCount:', commaCount, '| → delimiter:', JSON.stringify(delimiter || 'auto'));

  const results = Papa.parse(csvString, {
    header: false,
    skipEmptyLines: true,
    delimiter,
  });
  console.log('[csvParser] Raw PapaParse rows (first 3):', (results.data as string[][]).slice(0, 3));

  return processParsedArray(results.data as string[][]);
}
