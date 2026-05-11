# Words Placement Game Guide

## Firestore Path

Store one game document per course day:

```txt
{coursePath}/Day{day}/Day{day}-game/words_placement/data
```

CSAT Day1:

```txt
voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/CSAT/mNaFSzquidDTdaOq1cS0/Day1/Day1-game/words_placement/data
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
  chunks: WordPlacementChunk[];
};

type WordPlacementChunk = {
  id: string;
  text: string;
  type: "sentence_chunk" | "answer";
  order: number;
};
```

`wordsToPlace` is an array of chunk groups because one Firestore `example` field can contain multiple numbered examples or sentences. Each `chunks` array is one reconstruction task.

Do not store `WordPlacementChunk[][]` directly in Firestore. Firestore does not allow arrays that directly contain arrays. The admin generator may use `WordPlacementChunk[][]` for in-memory preview responses, but saved documents must wrap each group as `{ chunks: WordPlacementChunk[] }`.

## Generator Rules

- Remove numbered prefixes such as `1.` and `2.`.
- Generate one chunk group per line or sentence.
- Find the vocabulary word or a common derived form in each sentence.
- Split the sentence into `before`, `answer`, and `after` chunks.
- Keep punctuation attached to a useful text chunk.
- Never generate standalone punctuation chunks such as `"."`, `","`, or `"\""`.
- Store chunks in correct sentence order and use `order` for validation.
- Shuffle chunks only in the app UI.

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
    "chunks": [
      { "id": "measure-1-chunk-1", "text": "He", "type": "sentence_chunk", "order": 1 },
      { "id": "measure-1-chunk-2", "text": "measured", "type": "answer", "order": 2 },
      { "id": "measure-1-chunk-3", "text": "the width of", "type": "sentence_chunk", "order": 3 },
      { "id": "measure-1-chunk-4", "text": "the floor.", "type": "sentence_chunk", "order": 4 }
    ]
  },
  {
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
