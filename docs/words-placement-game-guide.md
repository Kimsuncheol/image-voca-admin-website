# Words Placement Game Guide

This guide is for implementing the `words_placement` game in `image-voca-app`.

The admin website generates and saves the game data. The app only reads the saved Firestore document and renders the placement game.

## Firestore Path

Read one game document per course day:

```txt
{coursePath}/Day{day}/Day{day}-quiz/words_placement/data
```

Example, CSAT Day1:

```txt
voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/CSAT/mNaFSzquidDTdaOq1cS0/Day1/Day1-quiz/words_placement/data
```

The source day words still live under:

```txt
{coursePath}/Day{day}
```

The app should not generate chunks from the source words. It should use only the saved `words_placement/data` document.

## Firestore Schema

```ts
type WordsPlacementGameDoc = {
  gameType: "words_placement";
  courseId: string;
  dayId: string;
  version: 1;
  items: WordsPlacementItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

type WordsPlacementItem = {
  wordId: string;
  word: string;
  example: string;
  wordsToPlace: WordsPlacementGroup[];
};

type WordsPlacementGroup = {
  targetExample: string;
  chunks: WordPlacementChunk[];

  // English courses
  translation?: string;

  // JLPT
  translationEnglish?: string;
  translationKorean?: string;

  // Kanji
  exampleEnglishTranslation?: string;
  exampleKoreanTranslation?: string;
};

type WordPlacementChunk = {
  id: string;
  text: string;
  type: "sentence_chunk" | "answer";
  order: number;
};
```

`item.example` is raw source/debug data. Do not render it as the game sentence. It can contain JLPT readings like `家(いえ)` or Kanji markers like `[[[一]]]`.

Use `group.targetExample` as the clean sentence for the game.

## Playable Round Model

Each `wordsToPlace` group is one playable round. One word item can produce multiple rounds.

```ts
type WordsPlacementRound = {
  roundId: string;
  wordId: string;
  word: string;
  targetExample: string;
  chunks: WordPlacementChunk[];
  translations: string[];
};

function getGroupTranslations(group: WordsPlacementGroup): string[] {
  return [
    group.translation,
    group.translationEnglish,
    group.translationKorean,
    group.exampleEnglishTranslation,
    group.exampleKoreanTranslation,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function buildWordsPlacementRounds(doc: WordsPlacementGameDoc): WordsPlacementRound[] {
  return doc.items.flatMap((item) =>
    item.wordsToPlace.map((group, groupIndex) => ({
      roundId: `${item.wordId}-${groupIndex}`,
      wordId: item.wordId,
      word: item.word,
      targetExample: group.targetExample,
      chunks: group.chunks,
      translations: getGroupTranslations(group),
    })),
  );
}
```

## Game Behavior

For each round:

1. Show `round.word` as the prompt.
2. Shuffle `round.chunks` for the choice chips.
3. Let the user place chips into an answer area.
4. Validate the placed chip order against `chunk.order`.
5. On success, show `round.targetExample` and the available translations.

Do not validate by comparing text. Use chunk IDs or `order`, because different chunks can theoretically have the same text.

```ts
function getAnswerChunks(chunks: WordPlacementChunk[]): WordPlacementChunk[] {
  return [...chunks].sort((a, b) => a.order - b.order);
}

function isCorrectPlacement(
  selectedChunks: WordPlacementChunk[],
  answerChunks: WordPlacementChunk[],
): boolean {
  const correctIds = getAnswerChunks(answerChunks).map((chunk) => chunk.id);
  const selectedIds = selectedChunks.map((chunk) => chunk.id);

  return (
    selectedIds.length === correctIds.length &&
    selectedIds.every((id, index) => id === correctIds[index])
  );
}
```

Shuffle only the UI choices. Never mutate the original `chunks` array when building the answer.

## Course Examples

English course group:

```json
{
  "targetExample": "Too much help may spoil your child.",
  "translation": "너무 많은 도움은 아이를 망칠 수 있다.",
  "chunks": [
    { "id": "word-1-1-chunk-1", "text": "Too much help may", "type": "sentence_chunk", "order": 1 },
    { "id": "word-1-1-chunk-2", "text": "spoil", "type": "answer", "order": 2 },
    { "id": "word-1-1-chunk-3", "text": "your child.", "type": "sentence_chunk", "order": 3 }
  ]
}
```

JLPT group:

```json
{
  "targetExample": "家と学校の間に公園がある。",
  "translationEnglish": "There is a park between my house and school.",
  "translationKorean": "집과 학교 사이에 공원이 있다.",
  "chunks": [
    { "id": "jlpt-1-1-chunk-1", "text": "家と", "type": "sentence_chunk", "order": 1 },
    { "id": "jlpt-1-1-chunk-2", "text": "学校の", "type": "sentence_chunk", "order": 2 },
    { "id": "jlpt-1-1-chunk-3", "text": "間に", "type": "answer", "order": 3 },
    { "id": "jlpt-1-1-chunk-4", "text": "公園が", "type": "sentence_chunk", "order": 4 },
    { "id": "jlpt-1-1-chunk-5", "text": "ある。", "type": "sentence_chunk", "order": 5 }
  ]
}
```

Kanji group:

```json
{
  "targetExample": "これはいつでいくらですか。",
  "exampleEnglishTranslation": "How much is this one?",
  "exampleKoreanTranslation": "이것은 한 개에 얼마입니까?",
  "chunks": [
    { "id": "kanji-1-1-chunk-1", "text": "これは", "type": "sentence_chunk", "order": 1 },
    { "id": "kanji-1-1-chunk-2", "text": "いつで", "type": "answer", "order": 2 },
    { "id": "kanji-1-1-chunk-3", "text": "いくらですか。", "type": "sentence_chunk", "order": 3 }
  ]
}
```

## UI Recommendations

- Display the word prompt prominently.
- Display shuffled chunks as tappable chips.
- Move selected chips into a stable answer area.
- Let users tap a selected chip to return it to choices.
- Disable submit until all chunks are placed.
- On wrong answer, keep the placed chunks and allow retry.
- On correct answer, reveal `targetExample` and translations.

For Japanese rounds, chunks should be joined without inserting extra spaces. For English rounds, displaying chips separately is usually better than reconstructing with manual spacing.

## Data Rules

- `wordsToPlace[n]` is the playable unit.
- `targetExample` is the clean sentence.
- `chunks` are already in the correct answer order by `order`.
- `type: "answer"` marks the vocabulary chunk, useful for review/highlight after submission.
- Translation fields are optional but generated as empty strings when source translations are missing.
- Do not rely on `item.example` for app display.
- Do not store or expect nested arrays like `WordPlacementChunk[][]`; Firestore stores group objects.
