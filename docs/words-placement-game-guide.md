# Words Placement Game Guide

## Firestore Path

Store one game document per course day:

```txt
{coursePath}/Day{day}/Day{day}-quiz/words_placement/data
```

CSAT Day1:

```txt
voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/CSAT/mNaFSzquidDTdaOq1cS0/Day1/Day1-quiz/words_placement/data
```

## Document Shape

```json
{
  "gameType": "words_placement",
  "courseId": "CSAT",
  "dayId": "Day1",
  "version": 1,
  "items": [
    {
      "wordId": "4zvOkwPDRV0zidNHAhc3",
      "word": "spoil",
      "example": "Too much help may spoil your child.",
      "wordsToPlace": [
        {
          "targetExample": "Too much help may spoil your child.",
          "chunks": [
            {
              "id": "4zvokwpdrv0zidnhahc3-1-chunk-1",
              "text": "Too much help may",
              "type": "sentence_chunk",
              "order": 1
            },
            {
              "id": "4zvokwpdrv0zidnhahc3-1-chunk-2",
              "text": "spoil",
              "type": "answer",
              "order": 2
            },
            {
              "id": "4zvokwpdrv0zidnhahc3-1-chunk-3",
              "text": "your child.",
              "type": "sentence_chunk",
              "order": 3
            }
          ]
        }
      ]
    }
  ],
  "createdAt": "Firestore Timestamp",
  "updatedAt": "Firestore Timestamp"
}
```

## Types

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
  wordsToPlace: WordPlacementChunkGroup[];
};

type WordPlacementChunkGroup = {
  targetExample: string;
  chunks: WordPlacementChunk[];
};

type WordPlacementChunk = {
  id: string;
  text: string;
  type: "sentence_chunk" | "answer";
  order: number;
};
```

`wordsToPlace` is an array of chunk groups because one Firestore `example` field can contain multiple numbered examples or sentences. Each group has the cleaned `targetExample` shown to the app/admin UI and a `chunks` array for one reconstruction task.

Do not store `WordPlacementChunk[][]` directly in Firestore. Firestore does not allow arrays that directly contain arrays. Store each group as `{ targetExample, chunks }`.

## Generator Rules

English:

- Remove numbered prefixes such as `1.` and `2.`.
- Generate one chunk group per line or sentence.
- Find the vocabulary word or a common derived form in each sentence.
- Split the sentence into `before`, `answer`, and `after` chunks.
- Keep punctuation attached to a useful text chunk.
- Never generate standalone punctuation chunks such as `"."`, `","`, or `"\""`.
- Store chunks in correct sentence order and use `order` for validation.
- Shuffle chunks only in the app UI.

JLPT:

- Strip reading parentheses before matching and chunking, e.g. `家(いえ)` becomes `家`.
- Tokenize server-side with `kuromoji`.
- Match the target word by token surface form, base form, or compound containment.
- Attach particles such as `に`, `を`, `は`, `が`, `と`, and `の` to the previous useful chunk.
- Attach sentence punctuation such as `。` to the previous useful chunk.

Kanji:

- Use `[[[...]]]` markers as the answer source of truth.
- Strip reading parentheses from output chunks.
- Expand marked answers into useful compounds, e.g. `[[[一]]]月(いちがつ)` becomes `一月`.
- Attach particles for kana answers, e.g. `[[[いつ]]]で` becomes `いつで`.
- Skip examples without markers.

## Examples

```ts
generateWordsPlacementChunks({
  word: "measure",
  example: `1. He measured the width of the floor.
2. Valid experiments also must have data that are measurable.`,
});
```

```json
[
  {
    "targetExample": "He measured the width of the floor.",
    "chunks": [
      { "id": "measure-1-chunk-1", "text": "He", "type": "sentence_chunk", "order": 1 },
      { "id": "measure-1-chunk-2", "text": "measured", "type": "answer", "order": 2 },
      { "id": "measure-1-chunk-3", "text": "the width of", "type": "sentence_chunk", "order": 3 },
      { "id": "measure-1-chunk-4", "text": "the floor.", "type": "sentence_chunk", "order": 4 }
    ]
  },
  {
    "targetExample": "Valid experiments also must have data that are measurable.",
    "chunks": [
      { "id": "measure-2-chunk-1", "text": "Valid experiments also", "type": "sentence_chunk", "order": 1 },
      { "id": "measure-2-chunk-2", "text": "must have data", "type": "sentence_chunk", "order": 2 },
      { "id": "measure-2-chunk-3", "text": "that are", "type": "sentence_chunk", "order": 3 },
      { "id": "measure-2-chunk-4", "text": "measurable.", "type": "answer", "order": 4 }
    ]
  }
]
```

## App Behavior

For each `WordsPlacementItem`:

1. Pick one `wordsToPlace` group.
2. Shuffle that group's `chunks` for display.
3. Let the user place chunks into ordered slots.
4. Validate by comparing selected chunk IDs sorted by slot position against chunks sorted by `order`.
5. Reconstruct the sentence by joining ordered chunk text with spaces.

The app should treat `wordId` as the identity. Do not use `word` or chunk text as a unique key because duplicate words can exist in the same day.
