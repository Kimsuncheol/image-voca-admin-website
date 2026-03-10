import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildWordLookupKey,
  enrichWords,
  mergeWordsWithExisting,
  type PersistedWordFields,
  type WordInput,
} from './enrichWords';

function makeLookup(entries: Array<[string, string, PersistedWordFields]>) {
  return new Map(
    entries.map(([word, meaning, fields]) => [
      buildWordLookupKey(word, meaning),
      fields,
    ]),
  );
}

test('reuses persisted example and translation for normalized matching rows', async () => {
  const words: WordInput[] = [
    { word: 'Apple', meaning: ' A fruit ', example: '', translation: '' },
  ];
  const existingLookup = makeLookup([
    [
      '  apple ',
      'a   FRUIT',
      {
        example: '1. She ate an apple after lunch.',
        translation: '1. 그녀는 점심 식사 후 사과를 먹었다.',
      },
    ],
  ]);

  const merged = mergeWordsWithExisting(words, existingLookup);

  let generatorCalls = 0;
  const result = await enrichWords(merged, async () => {
    generatorCalls += 1;
    return {
      example: 'should not be used',
      translation: 'should not be used',
    };
  });

  assert.deepEqual(result, [
    {
      word: 'Apple',
      meaning: ' A fruit ',
      example: '1. She ate an apple after lunch.',
      translation: '1. 그녀는 점심 식사 후 사과를 먹었다.',
    },
  ]);
  assert.equal(generatorCalls, 0);
});

test('fills only translation when persisted example exists and translation is blank', async () => {
  const words: WordInput[] = [
    { word: 'ubiquitous', meaning: 'present everywhere', example: '', translation: '' },
  ];
  const existingLookup = makeLookup([
    [
      'ubiquitous',
      'present everywhere',
      { example: '1. Mobile phones are ubiquitous.' },
    ],
  ]);

  const merged = mergeWordsWithExisting(words, existingLookup);
  let seenNeeds: { needsExample: boolean; needsTranslation: boolean } | null =
    null;

  const result = await enrichWords(merged, async (_word, needs) => {
    seenNeeds = needs;
    return {
      translation: '1. 휴대전화는 어디에나 있다.',
    };
  });

  assert.deepEqual(seenNeeds, {
    needsExample: false,
    needsTranslation: true,
  });
  assert.equal(result[0].example, '1. Mobile phones are ubiquitous.');
  assert.equal(result[0].translation, '1. 휴대전화는 어디에나 있다.');
});

test('fills only example when persisted translation exists and example is blank', async () => {
  const words: WordInput[] = [
    { word: 'resilient', meaning: 'quick to recover', example: '', translation: '' },
  ];
  const existingLookup = makeLookup([
    [
      'resilient',
      'quick to recover',
      { translation: '1. 그 식물은 회복력이 강하다.' },
    ],
  ]);

  const merged = mergeWordsWithExisting(words, existingLookup);
  let seenNeeds: { needsExample: boolean; needsTranslation: boolean } | null =
    null;

  const result = await enrichWords(merged, async (_word, needs) => {
    seenNeeds = needs;
    return {
      example: '1. The plant is resilient in harsh weather.',
    };
  });

  assert.deepEqual(seenNeeds, {
    needsExample: true,
    needsTranslation: false,
  });
  assert.equal(result[0].example, '1. The plant is resilient in harsh weather.');
  assert.equal(result[0].translation, '1. 그 식물은 회복력이 강하다.');
});

test('incoming non-empty fields override persisted values', async () => {
  const words: WordInput[] = [
    {
      word: 'brief',
      meaning: 'short in duration',
      example: '1. We had a brief meeting.',
      translation: '',
    },
  ];
  const existingLookup = makeLookup([
    [
      'brief',
      'short in duration',
      {
        example: '1. This older example should not win.',
        translation: '1. 우리는 짧은 회의를 했다.',
      },
    ],
  ]);

  const merged = mergeWordsWithExisting(words, existingLookup);

  assert.equal(merged[0].example, '1. We had a brief meeting.');
  assert.equal(merged[0].translation, '1. 우리는 짧은 회의를 했다.');
});

test('unmatched rows fall back to generator and preserve original row on generator failure', async () => {
  const words: WordInput[] = [
    { word: 'novel', meaning: 'new and original', example: '', translation: '' },
    { word: 'rare', meaning: 'not common', example: '', translation: '' },
  ];
  const existingLookup = makeLookup([]);
  const merged = mergeWordsWithExisting(words, existingLookup);

  const result = await enrichWords(merged, async (word) => {
    if (word.word === 'rare') {
      throw new Error('generation failed');
    }

    return {
      example: '1. The idea was novel.',
      translation: '1. 그 생각은 참신했다.',
    };
  }, 1);

  assert.deepEqual(result, [
    {
      word: 'novel',
      meaning: 'new and original',
      example: '1. The idea was novel.',
      translation: '1. 그 생각은 참신했다.',
    },
    {
      word: 'rare',
      meaning: 'not common',
      example: '',
      translation: '',
    },
  ]);
});
