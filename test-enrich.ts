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
    example: "1. Mobile phones are ubiquitous.\n2. The company logo is ubiquitous in this city."
  },
  {
    word: "resilient",
    meaning: "Able to withstand or recover quickly from difficult conditions.",
    translation: "1. 이 식물은 가혹한 환경에서도 잘 견딥니다.\n2. 아이들은 생각보다 회복력이 빠릅니다."
  }
];

async function runTest() {
  console.log('Testing Gemini Enrichment...\n');
  
  for (const w of testWords) {
    console.log(`Processing: "${w.word}" (${w.meaning})`);
    
    // We want to test the generation of example and translation
    const needsExample = !w.example;
    const needsTranslation = !w.translation;
    if (!needsExample && !needsTranslation) return;

    const parts: string[] = [];
    const jsonFields: string[] = [];

    if (needsExample) {
      parts.push('- Write 2 or 3 short, natural English example sentences using the word. Format them as a numbered list separated by line breaks (\\n).');
      jsonFields.push('"example":"1. ...\\n2. ..."');
    } else if (needsTranslation && w.example) {
      parts.push(`- Here are the existing examples: "${w.example}"`);
    }

    if (needsTranslation) {
      if (needsExample) {
        parts.push('- Provide the Korean translations corresponding to the generated examples. Format them as a numbered list separated by line breaks (\\n).');
        jsonFields.push('"translation":"1. ...\\n2. ..."');
      } else {
        parts.push('- Provide the Korean translations corresponding to the existing examples. Match the formatting of the existing examples (e.g., if there are multiple lines, provide multiple lines).');
        jsonFields.push('"translation":"..."');
      }
    }

    const prompt =
      `English word: "${w.word}", meaning: "${w.meaning}".\n` +
      parts.join('\n') +
      `\nRespond ONLY as JSON: {${jsonFields.join(',')}}\nEnsure line breaks are escaped as \\n in the JSON string.`;

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
