import Papa from 'papaparse';
import {
  standardWordSchema,
  jlptWordSchema,
  collocationWordSchema,
  idiomWordSchema,
  famousQuoteWordSchema,
  prefixSchema,
  postfixSchema,
  type StandardWordInput,
  type JlptWordInput,
  type CollocationWordInput,
  type IdiomWordInput,
  type FamousQuoteWordInput,
  type PrefixWordInput,
  type PostfixWordInput,
} from '@/lib/schemas/vocaSchemas';
import { textMatchesLanguage, quoteMatchesLanguage } from '@/lib/utils/quoteLanguage';
import type { FamousQuoteLanguage } from '@/types/famousQuote';
import type { CourseId } from '@/types/course';

export type SchemaType = 'standard' | 'jlpt' | 'collocation' | 'idiom' | 'famousQuote' | 'prefix' | 'postfix';

export interface ParseSchemaOptions {
  schemaType?: SchemaType;
  courseId?: CourseId | '';
}

export interface ParseResult {
  words: (
    | StandardWordInput
    | JlptWordInput
    | CollocationWordInput
    | IdiomWordInput
    | FamousQuoteWordInput
    | PrefixWordInput
    | PostfixWordInput
  )[];
  schemaType: SchemaType;
  /** @deprecated use schemaType === 'collocation' */
  isCollocation: boolean;
  errors: string[];
  detectedHeaders: string[];
  blockingError?: 'HEADER_REQUIRED' | 'HEADER_MISMATCH' | 'CROSS_HEADER_ROW';
  expectedHeaders?: string[];
}

const STANDARD_HEADERS = ['word', 'meaning', 'pronunciation', 'example', 'translation'] as const;
const STANDARD_OPTIONAL_HEADERS = ['synonym'] as const;
const JLPT_HEADERS = [
  'word',
  'meaning(english)',
  'meaning(korean)',
  'pronunciation',
  'example',
  'translation(english)',
  'translation(korean)',
] as const;
const JLPT_OPTIONAL_HEADERS = ['imageurl'] as const;
const COLLOCATION_HEADERS = ['collocation', 'meaning', 'explanation', 'example', 'translation'] as const;
const IDIOM_HEADERS = ['idiom', 'meaning', 'example', 'translation'] as const;
const FAMOUS_QUOTE_HEADERS = ['quote', 'author', 'translation'] as const;
const FAMOUS_QUOTE_OPTIONAL_HEADERS = ['language'] as const;
const PREFIX_POSTFIX_HEADERS = [
  'meaning(english)',
  'meaning(korean)',
  'pronunciation',
  'pronunciation(roman)',
  'example',
  'translation(english)',
  'translation(korean)',
] as const;
const PREFIX_HEADERS = ['prefix', ...PREFIX_POSTFIX_HEADERS] as const;
const POSTFIX_HEADERS = ['postfix', ...PREFIX_POSTFIX_HEADERS] as const;
const PREFIX_POSTFIX_OPTIONAL_HEADERS = ['example(roman)'] as const;
const STANDARD_THIRD_HEADER_SET = new Set(['pronunciation', 'pronounciation']);
const STANDARD_FOURTH_HEADER_SET = new Set(['example', 'example sentence']);

function resolveParseOptions(
  schemaTypeOrOptions?: SchemaType | ParseSchemaOptions,
  courseId?: CourseId | '',
): ParseSchemaOptions {
  if (typeof schemaTypeOrOptions === 'string') {
    return {
      schemaType: schemaTypeOrOptions,
      courseId,
    };
  }

  return {
    schemaType: schemaTypeOrOptions?.schemaType,
    courseId: schemaTypeOrOptions?.courseId ?? courseId,
  };
}

function isToeflIeltsStandardCourse(courseId?: CourseId | ''): boolean {
  return courseId === 'TOEFL_IELTS';
}

/** Exported alias for normalizeRow — required by FR-9. */
export function extractVocaFields(
  row: Record<string, unknown>,
  isCollocation: boolean,
  schemaType?: SchemaType,
): Record<string, unknown> {
  const resolvedSchema = schemaType ?? (isCollocation ? 'collocation' : 'standard');
  return normalizeRow(row, resolvedSchema);
}

function normalizeRow(row: Record<string, unknown>, schemaType: SchemaType): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  if (schemaType === 'famousQuote') {
    const quoteAliases = ['quote', '_1'];
    const authorAliases = ['author', '_2'];
    const translationAliases = ['translation', '_3'];
    const languageAliases = ['language', '_4'];

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      const cleanValue = typeof value === 'string' ? value.trim() : value;

      if (quoteAliases.includes(cleanKey)) normalized['quote'] = cleanValue;
      else if (authorAliases.includes(cleanKey)) normalized['author'] = cleanValue;
      else if (translationAliases.includes(cleanKey)) normalized['translation'] = cleanValue;
      else if (languageAliases.includes(cleanKey)) normalized['language'] = cleanValue;
      else normalized[cleanKey] = cleanValue;
    }

    normalized['quote'] = normalized['quote'] ?? '';
    normalized['author'] = normalized['author'] ?? '';
    normalized['translation'] = normalized['translation'] ?? '';
    // language defaults to 'English' via Zod schema if absent
    return normalized;
  }

  if (schemaType === 'prefix' || schemaType === 'postfix') {
    const primaryKey = schemaType === 'prefix' ? 'prefix' : 'postfix';
    const primaryAliases = [primaryKey, '_1'];
    const meaningEnglishAliases = ['meaning(english)', 'meaning english', 'meaning_en', '_2'];
    const meaningKoreanAliases = ['meaning(korean)', 'meaning korean', 'meaning_ko', '_3'];
    const pronunciationAliases = ['pronunciation', 'pronounciation', '_4'];
    const pronunciationRomanAliases = ['pronunciation(roman)', 'pronunciation roman', 'pronunciation_roman', 'roman', '_5'];
    const exampleAliases = ['example', 'example sentence', '_6'];
    const exampleRomanAliases = ['example(roman)', 'example roman', 'example_roman', '_7'];
    const translationEnglishAliases = ['translation(english)', 'translation english', 'translation_en', '_8'];
    const translationKoreanAliases = ['translation(korean)', 'translation korean', 'translation_ko', '_9'];

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      const cleanValue = typeof value === 'string' ? value.trim() : value;

      if (primaryAliases.includes(cleanKey)) normalized[primaryKey] = cleanValue;
      else if (meaningEnglishAliases.includes(cleanKey)) normalized['meaningEnglish'] = cleanValue;
      else if (meaningKoreanAliases.includes(cleanKey)) normalized['meaningKorean'] = cleanValue;
      else if (pronunciationAliases.includes(cleanKey)) normalized['pronunciation'] = cleanValue;
      else if (pronunciationRomanAliases.includes(cleanKey)) normalized['pronunciationRoman'] = cleanValue;
      else if (exampleAliases.includes(cleanKey)) normalized['example'] = cleanValue;
      else if (exampleRomanAliases.includes(cleanKey)) normalized['exampleRoman'] = cleanValue;
      else if (translationEnglishAliases.includes(cleanKey)) normalized['translationEnglish'] = cleanValue;
      else if (translationKoreanAliases.includes(cleanKey)) normalized['translationKorean'] = cleanValue;
      else normalized[cleanKey] = cleanValue;
    }

    normalized[primaryKey] = normalized[primaryKey] ?? '';
    normalized['meaningEnglish'] = normalized['meaningEnglish'] ?? '';
    normalized['meaningKorean'] = normalized['meaningKorean'] ?? '';
    normalized['pronunciation'] = normalized['pronunciation'] ?? '';
    normalized['pronunciationRoman'] = normalized['pronunciationRoman'] ?? '';
    normalized['example'] = normalized['example'] ?? '';
    normalized['exampleRoman'] = normalized['exampleRoman'] ?? '';
    normalized['translationEnglish'] = normalized['translationEnglish'] ?? '';
    normalized['translationKorean'] = normalized['translationKorean'] ?? '';
    return normalized;
  }

  if (schemaType === 'jlpt') {
    const wordAliases = ['word', '_1'];
    const meaningEnglishAliases = ['meaning(english)', 'meaning english', 'meaning_en', '_2'];
    const meaningKoreanAliases = ['meaning(korean)', 'meaning korean', 'meaning_ko', '_3'];
    const pronunciationAliases = ['pronunciation', 'pronounciation', '_4'];
    const pronunciationRomanAliases = [
      'pronunciation(roman)',
      'pronunciation roman',
      'pronunciation_roman',
      'roman',
      '_5',
    ];
    const exampleAliases = ['example', 'example sentence', '_6'];
    const exampleRomanAliases = ['example(roman)', 'example roman', 'example_roman', '_10'];
    const translationEnglishAliases = [
      'translation(english)',
      'translation english',
      'translation_en',
      '_7',
    ];
    const translationKoreanAliases = [
      'translation(korean)',
      'translation korean',
      'translation_ko',
      '_8',
    ];
    const imageUrlAliases = ['imageurl', 'image url', 'image_url', '_9'];

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      const cleanValue = typeof value === 'string' ? value.trim() : value;

      if (wordAliases.includes(cleanKey)) normalized['word'] = cleanValue;
      else if (meaningEnglishAliases.includes(cleanKey)) normalized['meaningEnglish'] = cleanValue;
      else if (meaningKoreanAliases.includes(cleanKey)) normalized['meaningKorean'] = cleanValue;
      else if (pronunciationAliases.includes(cleanKey)) normalized['pronunciation'] = cleanValue;
      else if (pronunciationRomanAliases.includes(cleanKey)) normalized['pronunciationRoman'] = cleanValue;
      else if (exampleAliases.includes(cleanKey)) normalized['example'] = cleanValue;
      else if (exampleRomanAliases.includes(cleanKey)) normalized['exampleRoman'] = cleanValue;
      else if (translationEnglishAliases.includes(cleanKey)) normalized['translationEnglish'] = cleanValue;
      else if (translationKoreanAliases.includes(cleanKey)) normalized['translationKorean'] = cleanValue;
      else if (imageUrlAliases.includes(cleanKey)) normalized['imageUrl'] = cleanValue;
      else normalized[cleanKey] = cleanValue;
    }

    normalized['word'] = normalized['word'] ?? '';
    normalized['meaningEnglish'] = normalized['meaningEnglish'] ?? '';
    normalized['meaningKorean'] = normalized['meaningKorean'] ?? '';
    normalized['pronunciation'] = normalized['pronunciation'] ?? '';
    normalized['pronunciationRoman'] = normalized['pronunciationRoman'] ?? '';
    normalized['example'] = normalized['example'] ?? '';
    normalized['exampleRoman'] = normalized['exampleRoman'] ?? '';
    normalized['translationEnglish'] = normalized['translationEnglish'] ?? '';
    normalized['translationKorean'] = normalized['translationKorean'] ?? '';
    normalized['imageUrl'] = normalized['imageUrl'] ?? '';
    return normalized;
  }

  if (schemaType === 'idiom') {
    const idiomAliases = ['idiom', '_1'];
    const meaningAliases = ['meaning', '_2'];
    const exampleAliases = ['example', 'example sentence', '_3'];
    const translationAliases = ['translation', '_4'];
    const imageUrlAliases = ['imageurl', 'image url', 'image_url', '_5'];

    for (const [key, value] of Object.entries(row)) {
      const cleanKey = key.trim().toLowerCase();
      const cleanValue = typeof value === 'string' ? value.trim() : value;

      if (idiomAliases.includes(cleanKey)) normalized['idiom'] = cleanValue;
      else if (meaningAliases.includes(cleanKey)) normalized['meaning'] = cleanValue;
      else if (exampleAliases.includes(cleanKey)) normalized['example'] = cleanValue;
      else if (translationAliases.includes(cleanKey)) normalized['translation'] = cleanValue;
      else if (imageUrlAliases.includes(cleanKey)) normalized['imageUrl'] = cleanValue;
      else normalized[cleanKey] = cleanValue;
    }

    normalized['idiom'] = normalized['idiom'] ?? '';
    normalized['meaning'] = normalized['meaning'] ?? '';
    normalized['example'] = normalized['example'] ?? '';
    normalized['translation'] = normalized['translation'] ?? '';
    return normalized;
  }

  // Alias mappings
  const wordAliases = ['word', '_1'];
  const collocationAliases = ['collocation', '_1'];
  const meaningAliases = ['meaning', '_2'];
  const pronunciationAliases = ['pronunciation', 'pronounciation', '_3'];
  const explanationAliases = ['explanation', '_3']; // _3 is explanation for collocation, pronunciation for word
  const exampleAliases = ['example', 'example sentence', '_4'];
  const translationAliases = ['translation', '_5'];
  const synonymAliases = ['synonym'];

  const isCollocation = schemaType === 'collocation';

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
    else if (!isCollocation && synonymAliases.includes(cleanKey)) normalized['synonym'] = cleanValue;
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
    normalized['synonym'] = normalized['synonym'] ?? '';
    normalized['pronunciation'] = normalized['pronunciation'] ?? '';
    normalized['example'] = normalized['example'] ?? '';
    normalized['translation'] = normalized['translation'] ?? '';
  }

  return normalized;
}

function detectAndParse(
  data: Record<string, unknown>[],
  rawHeaders: string[],
  forceSchemaType?: SchemaType,
  _courseId?: CourseId | '',
): ParseResult {
  const headers = rawHeaders.map((h) => h.trim().toLowerCase());
  // forceSchemaType (from the selected course) takes priority over header-based detection.
  let schemaType: SchemaType;
  if (forceSchemaType) {
    schemaType = forceSchemaType;
  } else if (headers.includes('idiom')) {
    schemaType = 'idiom';
  } else if (headers.includes('collocation')) {
    schemaType = 'collocation';
  } else if (
    headers.includes('meaning(english)') ||
    headers.includes('meaning english') ||
    headers.includes('meaning(korean)') ||
    headers.includes('meaning korean')
  ) {
    schemaType = 'jlpt';
  } else if (headers.includes('quote')) {
    schemaType = 'famousQuote';
  } else {
    schemaType = 'standard';
  }

  const schema =
    schemaType === 'collocation' ? collocationWordSchema
    : schemaType === 'idiom' ? idiomWordSchema
    : schemaType === 'jlpt' ? jlptWordSchema
    : schemaType === 'famousQuote' ? famousQuoteWordSchema
    : schemaType === 'prefix' ? prefixSchema
    : schemaType === 'postfix' ? postfixSchema
    : standardWordSchema;

  const words: (
    | StandardWordInput
    | JlptWordInput
    | CollocationWordInput
    | IdiomWordInput
    | FamousQuoteWordInput
    | PrefixWordInput
    | PostfixWordInput
  )[] = [];
  const errors: string[] = [];

  function getUploadValidationLanguage(
    currentSchemaType: SchemaType,
  ): FamousQuoteLanguage | null {
    if (currentSchemaType === 'standard') {
      return 'English';
    }
    if (currentSchemaType === 'collocation' || currentSchemaType === 'idiom') {
      return 'English';
    }
    if (currentSchemaType === 'jlpt' || currentSchemaType === 'prefix' || currentSchemaType === 'postfix') {
      return 'Japanese';
    }
    return null;
  }

  function validateUploadRowLanguage(
    parsedWord: StandardWordInput | JlptWordInput | CollocationWordInput | IdiomWordInput | PrefixWordInput | PostfixWordInput,
    currentSchemaType: Exclude<SchemaType, 'famousQuote'>,
  ): string | null {
    const language = getUploadValidationLanguage(currentSchemaType);
    if (!language) return null;

    const failedFields: string[] = [];
    if (currentSchemaType === 'collocation') {
      const collocationWord = parsedWord as CollocationWordInput;
      const exampleValue = collocationWord.example.trim();

      if (!textMatchesLanguage(collocationWord.collocation.trim(), language)) {
        failedFields.push('collocation');
      }
      if (exampleValue && !textMatchesLanguage(exampleValue, language)) {
        failedFields.push('example');
      }
    } else if (currentSchemaType === 'idiom') {
      const idiomWord = parsedWord as IdiomWordInput;
      const exampleValue = idiomWord.example.trim();

      if (!textMatchesLanguage(idiomWord.idiom.trim(), language)) {
        failedFields.push('idiom');
      }
      if (exampleValue && !textMatchesLanguage(exampleValue, language)) {
        failedFields.push('example');
      }
    } else if (currentSchemaType === 'prefix') {
      const prefixWord = parsedWord as PrefixWordInput;
      const exampleValue = prefixWord.example.trim();
      if (!textMatchesLanguage(prefixWord.prefix.trim(), language)) {
        failedFields.push('prefix');
      }
      if (exampleValue && !textMatchesLanguage(exampleValue, language)) {
        failedFields.push('example');
      }
    } else if (currentSchemaType === 'postfix') {
      const postfixWord = parsedWord as PostfixWordInput;
      const exampleValue = postfixWord.example.trim();
      if (!textMatchesLanguage(postfixWord.postfix.trim(), language)) {
        failedFields.push('postfix');
      }
      if (exampleValue && !textMatchesLanguage(exampleValue, language)) {
        failedFields.push('example');
      }
    } else {
      const standardLikeWord = parsedWord as StandardWordInput | JlptWordInput;
      const exampleValue = standardLikeWord.example.trim();

      if (!textMatchesLanguage(standardLikeWord.word.trim(), language)) {
        failedFields.push('word');
      }
      if (exampleValue && !textMatchesLanguage(exampleValue, language)) {
        failedFields.push('example');
      }
    }

    if (failedFields.length === 0) return null;

    const lastField = failedFields[failedFields.length - 1];
    const fieldLabel =
      failedFields.length === 1
        ? failedFields[0]
        : `${failedFields.slice(0, -1).join(', ')} and ${lastField}`;
    return `must contain ${language} characters in ${fieldLabel}`;
  }

  data.forEach((row, index) => {
    const normalized = normalizeRow(row, schemaType);

    // Guard: skip rows that look like a header row that slipped through detection.
    if (schemaType === 'famousQuote') {
      const quoteVal = String(normalized['quote'] ?? '').toLowerCase();
      const translationVal = String(normalized['translation'] ?? '').toLowerCase();
      if (quoteVal === 'quote' && translationVal === 'translation') return;
    } else if (schemaType === 'jlpt') {
      const wordVal = String(normalized['word'] ?? '').toLowerCase();
      const meaningEnglishVal = String(normalized['meaningEnglish'] ?? '').toLowerCase();
      if (wordVal === 'word' && meaningEnglishVal === 'meaning(english)') return;
    } else if (schemaType === 'prefix') {
      const prefixVal = String(normalized['prefix'] ?? '').toLowerCase();
      const meaningEnglishVal = String(normalized['meaningEnglish'] ?? '').toLowerCase();
      if (prefixVal === 'prefix' && meaningEnglishVal === 'meaning(english)') return;
    } else if (schemaType === 'postfix') {
      const postfixVal = String(normalized['postfix'] ?? '').toLowerCase();
      const meaningEnglishVal = String(normalized['meaningEnglish'] ?? '').toLowerCase();
      if (postfixVal === 'postfix' && meaningEnglishVal === 'meaning(english)') return;
    } else if (schemaType === 'idiom') {
      const idiomVal = String(normalized['idiom'] ?? '').toLowerCase();
      const meaningVal = String(normalized['meaning'] ?? '').toLowerCase();
      if (idiomVal === 'idiom' && meaningVal === 'meaning') return;
    } else {
      const primaryKey = schemaType === 'collocation' ? 'collocation' : 'word';
      const primaryVal = String(normalized[primaryKey] ?? '').toLowerCase();
      const meaningVal = String(normalized['meaning'] ?? '').toLowerCase();
      if (primaryVal === primaryKey && meaningVal === 'meaning') return;
    }

    const parsed = schema.safeParse(normalized);
    if (parsed.success) {
      if (schemaType === 'famousQuote') {
        const quoteData = parsed.data as FamousQuoteWordInput;
        const lang = quoteData.language ?? 'English';
        const langValid = quoteMatchesLanguage(quoteData.quote, lang);
        if (!langValid) {
          errors.push(`Row ${index + 1}: quote does not match the selected language (${lang})`);
          return;
        }
      } else {
        const languageWarning = validateUploadRowLanguage(
          parsed.data as StandardWordInput | JlptWordInput | CollocationWordInput | IdiomWordInput | PrefixWordInput | PostfixWordInput,
          schemaType,
        );
        if (languageWarning) {
          errors.push(`Row ${index + 1}: ${languageWarning}`);
          return;
        }
      }
      words.push(parsed.data);
    } else {
      errors.push(
        `Row ${index + 1}: ${parsed.error.issues.map((i) => i.message).join(', ')}`
      );
    }
  });

  return { words, schemaType, isCollocation: schemaType === 'collocation', errors, detectedHeaders: rawHeaders };
}

// Re-export types for consumers that import from csvParser
export type { PrefixWordInput, PostfixWordInput };

function getExpectedHeaders(schemaType: SchemaType): string[] {
  if (schemaType === 'collocation') return [...COLLOCATION_HEADERS];
  if (schemaType === 'idiom') return [...IDIOM_HEADERS];
  if (schemaType === 'famousQuote') return [...FAMOUS_QUOTE_HEADERS];
  if (schemaType === 'jlpt') return [...JLPT_HEADERS];
  if (schemaType === 'prefix') return [...PREFIX_HEADERS];
  if (schemaType === 'postfix') return [...POSTFIX_HEADERS];
  return [...STANDARD_HEADERS];
}

function isExactHeaderSet(
  headers: string[],
  expectedHeaders: string[],
  schemaType?: SchemaType,
  courseId?: CourseId | '',
): boolean {
  if (schemaType === 'jlpt') {
    const allowedHeaders = new Set([...expectedHeaders, ...JLPT_OPTIONAL_HEADERS]);
    const headerSet = new Set(headers);
    if (headers.length < expectedHeaders.length) return false;
    if (!expectedHeaders.every((h) => headerSet.has(h))) return false;
    return headers.every((header) => allowedHeaders.has(header));
  }

  if (schemaType === 'prefix' || schemaType === 'postfix') {
    const allowedHeaders = new Set([...expectedHeaders, ...PREFIX_POSTFIX_OPTIONAL_HEADERS]);
    const headerSet = new Set(headers);
    if (headers.length < expectedHeaders.length) return false;
    if (!expectedHeaders.every((h) => headerSet.has(h))) return false;
    return headers.every((header) => allowedHeaders.has(header));
  }

  if (schemaType === 'famousQuote') {
    const allowedHeaders = new Set([...expectedHeaders, ...FAMOUS_QUOTE_OPTIONAL_HEADERS]);
    const headerSet = new Set(headers);
    if (headers.length < expectedHeaders.length) return false;
    if (!expectedHeaders.every((h) => headerSet.has(h))) return false;
    return headers.every((header) => allowedHeaders.has(header));
  }

  if (schemaType === 'standard' && isToeflIeltsStandardCourse(courseId)) {
    const allowedHeaders = new Set([...expectedHeaders, ...STANDARD_OPTIONAL_HEADERS]);
    const headerSet = new Set(headers);
    if (headers.length < expectedHeaders.length) return false;
    if (!expectedHeaders.every((h) => headerSet.has(h))) return false;
    return headers.every((header) => allowedHeaders.has(header));
  }

  if (headers.length !== expectedHeaders.length) return false;
  const headerSet = new Set(headers);
  if (headerSet.size !== expectedHeaders.length) return false;
  return expectedHeaders.every((h) => headerSet.has(h));
}

function isNonEmptyRow(row: string[]): boolean {
  return row.some((cell) => (cell?.trim() ?? '').length > 0);
}

function buildBlockingResult(
  schemaType: SchemaType,
  code: NonNullable<ParseResult['blockingError']>,
  expectedHeaders: string[],
  detectedHeaders: string[],
): ParseResult {
  return {
    words: [],
    schemaType,
    isCollocation: schemaType === 'collocation',
    errors: [],
    detectedHeaders,
    blockingError: code,
    expectedHeaders,
  };
}

function isCrossHeaderFirstRow(
  firstDataRow: string[],
  targetSchemaType: SchemaType,
): boolean {
  if (targetSchemaType === 'famousQuote' || targetSchemaType === 'jlpt') {
    // Famous quote rows are sentences; cross-header detection not applicable
    return false;
  }
  const norm = firstDataRow.map((cell) => (cell?.trim() ?? '').toLowerCase());

  if (targetSchemaType === 'idiom') {
    // Detect a standard or collocation header pasted into an idiom upload
    if (firstDataRow.length < 4) return false;
    return (
      (norm[0] === 'word' || norm[0] === 'collocation') &&
      norm[1] === 'meaning'
    );
  }

  if (firstDataRow.length < 5) return false;

  if (targetSchemaType === 'collocation') {
    return (
      norm[0] === 'word' &&
      norm[1] === 'meaning' &&
      STANDARD_THIRD_HEADER_SET.has(norm[2]) &&
      STANDARD_FOURTH_HEADER_SET.has(norm[3]) &&
      norm[4] === 'translation'
    );
  }

  // standard — detect collocation or idiom header
  return (
    (norm[0] === 'collocation' || norm[0] === 'idiom') &&
    norm[1] === 'meaning'
  );
}

// Schema field names only — NOT positional aliases.
// A row qualifies as a header row when ≥2 of its cells match known field names.
const KNOWN_FIELDS = new Set([
  'word', 'collocation', 'idiom', 'prefix', 'postfix', 'meaning',
  'meaning(english)', 'meaning english', 'meaning(korean)', 'meaning korean',
  'pronunciation', 'pronounciation',
  'synonym',
  'pronunciation(roman)', 'pronunciation roman', 'roman',
  'explanation', 'example', 'example sentence', 'example(roman)', 'example roman', 'translation',
  'translation(english)', 'translation english', 'translation(korean)', 'translation korean',
  'quote', 'author', 'language',
]);

/**
 * Public alias for processParsedArray — accepts a raw 2-D array of strings (e.g.
 * from the Google Sheets API values endpoint) and returns a ParseResult.
 */
export function parseRowArrays(
  data: string[][],
  schemaTypeOrOptions?: SchemaType | ParseSchemaOptions,
  courseId?: CourseId | '',
): ParseResult {
  return processParsedArray(data, schemaTypeOrOptions, courseId);
}

function processParsedArray(
  data: string[][],
  schemaTypeOrOptions?: SchemaType | ParseSchemaOptions,
  courseId?: CourseId | '',
): ParseResult {
  const options = resolveParseOptions(schemaTypeOrOptions, courseId);
  const schemaType = options.schemaType;
  const targetCourseId = options.courseId;
  if (data.length === 0) return { words: [], schemaType: 'standard', isCollocation: false, errors: [], detectedHeaders: [] };

  // Ignore leading blank rows so strict header checks evaluate the first real row.
  const firstNonEmptyRowIndex = data.findIndex(isNonEmptyRow);
  if (firstNonEmptyRowIndex < 0) {
    if (schemaType) {
      return buildBlockingResult(
        schemaType,
        'HEADER_REQUIRED',
        getExpectedHeaders(schemaType),
        [],
      );
    }
    return { words: [], schemaType: 'standard', isCollocation: false, errors: [], detectedHeaders: [] };
  }

  const rowsFromFirstNonEmpty = data.slice(firstNonEmptyRowIndex);
  const firstRowNormAll = rowsFromFirstNonEmpty[0].map((h) =>
    (h?.trim() ?? '').toLowerCase()
  );
  const firstRowNorm = firstRowNormAll.filter((h) => h.length > 0);

  // Determine target schema type from hint or header detection
  let targetSchemaType: SchemaType;
  if (schemaType) {
    targetSchemaType = schemaType;
  } else if (firstRowNormAll.includes('collocation')) {
    targetSchemaType = 'collocation';
  } else if (
    firstRowNormAll.includes('meaning(english)') ||
    firstRowNormAll.includes('meaning english') ||
    firstRowNormAll.includes('meaning(korean)') ||
    firstRowNormAll.includes('meaning korean')
  ) {
    targetSchemaType = 'jlpt';
  } else if (firstRowNormAll.includes('quote')) {
    targetSchemaType = 'famousQuote';
  } else {
    targetSchemaType = 'standard';
  }

  // Require ≥2 known field names to avoid false positives on data rows that
  // happen to contain a single common word like "example" or "meaning".
  const matchCount = firstRowNorm.filter(h => KNOWN_FIELDS.has(h)).length;
  const hasHeaders = matchCount >= 2;

  if (schemaType) {
    const expectedHeaders = getExpectedHeaders(targetSchemaType);
    if (!hasHeaders) {
      return buildBlockingResult(
        targetSchemaType,
        'HEADER_REQUIRED',
        expectedHeaders,
        firstRowNorm,
      );
    }
    if (!isExactHeaderSet(firstRowNorm, expectedHeaders, targetSchemaType, targetCourseId)) {
      return buildBlockingResult(
        targetSchemaType,
        'HEADER_MISMATCH',
        expectedHeaders,
        firstRowNorm,
      );
    }
  }

  let headers: string[];
  let rows: string[][];
  let headerIndexes: number[] | null = null;

  if (hasHeaders) {
    headerIndexes = [];
    headers = [];
    firstRowNormAll.forEach((header, index) => {
      if (!header) return;
      headerIndexes!.push(index);
      headers.push(header);
    });
    rows = rowsFromFirstNonEmpty.slice(1);
  } else {
    // Positional fallback: support up to 8 columns for JLPT uploads.
    headers = ['_1', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9'];
    rows = rowsFromFirstNonEmpty;

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

  if (schemaType) {
    const firstDataRow = rows.find((row) => row.some((cell) => cell && cell.trim().length > 0));
    if (firstDataRow && isCrossHeaderFirstRow(firstDataRow, targetSchemaType)) {
      return buildBlockingResult(
        targetSchemaType,
        'CROSS_HEADER_ROW',
        getExpectedHeaders(targetSchemaType),
        firstRowNorm,
      );
    }
  }

  const objects = rows
    .filter(rowArray => rowArray.some(cell => cell && cell.trim().length > 0))
    .map(rowArray => {
      const obj: Record<string, unknown> = {};
      if (headerIndexes) {
        headers.forEach((h, i) => {
          obj[h] = rowArray[headerIndexes[i]];
        });
      } else {
        headers.forEach((h, i) => {
          obj[h] = rowArray[i];
        });
      }
      return obj;
    });

  return detectAndParse(objects, headers, schemaType, targetCourseId);
}

export async function parseCsvFile(
  file: File,
  schemaTypeOrOptions?: SchemaType | ParseSchemaOptions,
  courseId?: CourseId | '',
): Promise<ParseResult> {
  const options = resolveParseOptions(schemaTypeOrOptions, courseId);
  const schemaType = options.schemaType;
  const targetCourseId = options.courseId;
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
          resolve(processParsedArray(results.data as string[][], schemaType, targetCourseId));
        },
        error(err) {
          resolve({ words: [], schemaType: schemaType ?? 'standard', isCollocation: schemaType === 'collocation', errors: [err.message], detectedHeaders: [] });
        },
      });
    });
  } catch (err) {
    return { words: [], schemaType: 'standard', isCollocation: false, errors: [String(err)], detectedHeaders: [] };
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
