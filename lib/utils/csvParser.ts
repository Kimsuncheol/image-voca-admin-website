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

/** Exported alias for normalizeRow — required by FR-9. */
export function extractVocaFields(
  row: Record<string, unknown>,
  isCollocation: boolean
): Record<string, unknown> {
  return normalizeRow(row, isCollocation);
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
  rawHeaders: string[],
  forceIsCollocation?: boolean,
): ParseResult {
  const headers = rawHeaders.map((h) => h.trim().toLowerCase());
  // forceIsCollocation (from the selected course) takes priority over header-based detection.
  const isCollocation = forceIsCollocation ?? headers.includes('collocation');
  const schema = isCollocation ? collocationWordSchema : standardWordSchema;

  const words: (StandardWordInput | CollocationWordInput)[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const normalized = normalizeRow(row, isCollocation);

    // Guard: skip rows that look like a header row that slipped through detection.
    // A header row has its primary field value equal to the field name itself (e.g. word='Word').
    // Check both primary field and meaning to avoid false positives on real vocabulary.
    const primaryKey = isCollocation ? 'collocation' : 'word';
    const primaryVal = String(normalized[primaryKey] ?? '').toLowerCase();
    const meaningVal = String(normalized['meaning'] ?? '').toLowerCase();
    if (primaryVal === primaryKey && meaningVal === 'meaning') return;

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

// Schema field names only — NOT positional aliases.
// A row qualifies as a header row when ≥2 of its cells match known field names.
const KNOWN_FIELDS = new Set([
  'word', 'collocation', 'meaning',
  'pronunciation', 'pronounciation',
  'explanation', 'example', 'example sentence', 'translation',
]);

/**
 * Public alias for processParsedArray — accepts a raw 2-D array of strings (e.g.
 * from the Google Sheets API values endpoint) and returns a ParseResult.
 */
export function parseRowArrays(data: string[][], isCollocation?: boolean): ParseResult {
  return processParsedArray(data, isCollocation);
}

function processParsedArray(data: string[][], isCollocation?: boolean): ParseResult {
  if (data.length === 0) return { words: [], isCollocation: false, errors: [], detectedHeaders: [] };

  const firstRowNorm = data[0].map(h => (h?.trim() ?? '').toLowerCase());

  // Require ≥2 known field names to avoid false positives on data rows that
  // happen to contain a single common word like "example" or "meaning".
  const matchCount = firstRowNorm.filter(h => KNOWN_FIELDS.has(h)).length;
  const hasHeaders = matchCount >= 2;

  let headers: string[];
  let rows: string[][];

  if (hasHeaders) {
    headers = firstRowNorm;
    rows = data.slice(1);
  } else {
    // Positional fallback: support up to 6 columns.
    headers = ['_1', '_2', '_3', '_4', '_5', '_6'];
    rows = data;

    // Detect empty or numeric leading column (common in Google Sheets exports
    // where column A is a blank row-number or index column).
    // Sample up to 5 non-empty rows and check if the first cell is always
    // empty or a pure integer — if so, drop that leading column.
    const sampleRows = rows
      .filter((r) => r.some((c) => c && c.trim()))
      .slice(0, 5);
    if (sampleRows.length > 0 && (sampleRows[0]?.length ?? 0) > 1) {
      const leadingIsIndexOrEmpty = sampleRows.every((r) => {
        const first = (r[0] ?? '').trim();
        return first === '' || /^\d+$/.test(first);
      });
      if (leadingIsIndexOrEmpty) {
        rows = rows.map((r) => r.slice(1));
      }
    }
  }

  const objects = rows
    .filter(rowArray => rowArray.some(cell => cell && cell.trim().length > 0))
    .map(rowArray => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = rowArray[i];
      });
      return obj;
    });

  return detectAndParse(objects, headers, isCollocation);
}

export async function parseCsvFile(file: File, isCollocation?: boolean): Promise<ParseResult> {
  try {
    // Read text first to sniff the delimiter — the same logic used in parseCsvString.
    // .csv files exported from Google Sheets / Excel are often tab-separated despite
    // the .csv extension, so relying on PapaParse auto-detect (which defaults to comma)
    // causes the entire row to become a single cell.
    const text = await file.text();
    const firstLine = text.split('\n')[0] ?? '';
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const delimiter =
      tabCount >= commaCount && tabCount >= semicolonCount ? '\t'
      : semicolonCount > commaCount ? ';'
      : ',';

    return new Promise((resolve) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        delimiter,
        complete(results) {
          resolve(processParsedArray(results.data as string[][], isCollocation));
        },
        error(err) {
          resolve({ words: [], isCollocation: isCollocation ?? false, errors: [err.message], detectedHeaders: [] });
        },
      });
    });
  } catch (err) {
    return { words: [], isCollocation: false, errors: [String(err)], detectedHeaders: [] };
  }
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
