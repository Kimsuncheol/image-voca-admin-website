import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set in .env');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-3-flash-preview',
  generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1000 },
});

interface WordInput {
  word: string;
  meaning: string;
  pronunciation?: string;
  example?: string;
  translation?: string;
}

const testWords: WordInput[] = [
  {
    word: "apple",
    meaning: "A round fruit with red or green skin and a whitish interior.",
  },
  {
    word: "ubiquitous",
    meaning: "Present, appearing, or found everywhere.",
  }
];

async function runTest() {
  console.log('Testing Gemini Enrichment...\n');
  
  for (const w of testWords) {
    console.log(`Processing: "${w.word}" (${w.meaning})`);
    
    // We want to test the generation of example and translation
    const parts: string[] = [
      '- Write 2 or 3 short, natural English example sentences using the word. Format them as a numbered list separated by line breaks (\\n).',
      '- Provide the Korean translations corresponding to the examples. Format them as a numbered list separated by line breaks (\\n).'
    ];

    const prompt =
      `English word: "${w.word}", meaning: "${w.meaning}".\n` +
      parts.join('\n') +
      '\nRespond ONLY as JSON: {"example":"1. ...\\n2. ...","translation":"1. ...\\n2. ..."}\nEnsure line breaks are escaped as \\n in the JSON string.';

    try {
      const result = await geminiModel.generateContent(prompt);
      const raw = result.response.text();
      console.log('RAW RESP ->', raw);
      let parsed: { example?: string; translation?: string } = {};
      
      const startIdx = raw.indexOf('{');
      const endIdx = raw.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
        const jsonStr = raw.substring(startIdx, endIdx + 1);
        try {
          parsed = JSON.parse(jsonStr);
        } catch (err) {
          console.error(`Failed to parse JSON for "${w.word}". Substring was:`, jsonStr);
        }
      } else {
        console.error(`No JSON object found in response for "${w.word}".`);
      }

      console.log('Result:');
      console.log(JSON.stringify(parsed, null, 2));
      console.log('--------------------------------------------------\n');
    } catch (error) {
      console.error(`Error processing "${w.word}":`, error);
    }
  }
}

runTest();
