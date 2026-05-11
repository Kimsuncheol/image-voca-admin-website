import { describe, expect, it } from "vitest";

import { generateWordsPlacementChunks } from "./wordsPlacementChunkGenerator";

describe("generateWordsPlacementChunks", () => {
  it("splits a single sentence around the answer", () => {
    expect(
      generateWordsPlacementChunks({
        word: "spoil",
        example: "Too much help may spoil your child.",
        wordId: "spoil-id",
      }),
    ).toEqual([
      [
        { id: "spoil-id-1-chunk-1", text: "Too much help may", type: "sentence_chunk", order: 1 },
        { id: "spoil-id-1-chunk-2", text: "spoil", type: "answer", order: 2 },
        { id: "spoil-id-1-chunk-3", text: "your child.", type: "sentence_chunk", order: 3 },
      ],
    ]);
  });

  it("handles answer at the beginning of a numbered example", () => {
    expect(
      generateWordsPlacementChunks({
        word: "threat",
        example: `1. threat of terrorism
2. Someone is threatening to go to war.`,
      }),
    ).toEqual([
      [
        { id: "threat-1-chunk-1", text: "threat", type: "answer", order: 1 },
        { id: "threat-1-chunk-2", text: "of terrorism", type: "sentence_chunk", order: 2 },
      ],
      [
        { id: "threat-2-chunk-1", text: "Someone is", type: "sentence_chunk", order: 1 },
        { id: "threat-2-chunk-2", text: "threatening", type: "answer", order: 2 },
        { id: "threat-2-chunk-3", text: "to go to war.", type: "sentence_chunk", order: 3 },
      ],
    ]);
  });

  it("matches common English derived forms", () => {
    expect(
      generateWordsPlacementChunks({
        word: "measure",
        example: `1. He measured the width of the floor.
2. Valid experiments also must have data that are measurable.`,
      }),
    ).toEqual([
      [
        { id: "measure-1-chunk-1", text: "He", type: "sentence_chunk", order: 1 },
        { id: "measure-1-chunk-2", text: "measured", type: "answer", order: 2 },
        { id: "measure-1-chunk-3", text: "the width of", type: "sentence_chunk", order: 3 },
        { id: "measure-1-chunk-4", text: "the floor.", type: "sentence_chunk", order: 4 },
      ],
      [
        {
          id: "measure-2-chunk-1",
          text: "Valid experiments also",
          type: "sentence_chunk",
          order: 1,
        },
        {
          id: "measure-2-chunk-2",
          text: "must have data",
          type: "sentence_chunk",
          order: 2,
        },
        {
          id: "measure-2-chunk-3",
          text: "that are",
          type: "sentence_chunk",
          order: 3,
        },
        { id: "measure-2-chunk-4", text: "measurable.", type: "answer", order: 4 },
      ],
    ]);
  });

  it("keeps surrounding quotes with the answer", () => {
    expect(
      generateWordsPlacementChunks({
        word: "victim",
        example: `1. the victims of war
2. The "offender" and the "victim" usually see the event differently`,
      }),
    ).toEqual([
      [
        { id: "victim-1-chunk-1", text: "the", type: "sentence_chunk", order: 1 },
        { id: "victim-1-chunk-2", text: "victims", type: "answer", order: 2 },
        { id: "victim-1-chunk-3", text: "of war", type: "sentence_chunk", order: 3 },
      ],
      [
        {
          id: "victim-2-chunk-1",
          text: 'The "offender" and the',
          type: "sentence_chunk",
          order: 1,
        },
        { id: "victim-2-chunk-2", text: '"victim"', type: "answer", order: 2 },
        {
          id: "victim-2-chunk-3",
          text: "usually see the",
          type: "sentence_chunk",
          order: 3,
        },
        {
          id: "victim-2-chunk-4",
          text: "event differently",
          type: "sentence_chunk",
          order: 4,
        },
      ],
    ]);
  });

  it("splits long sentence chunks into more placement pieces", () => {
    expect(
      generateWordsPlacementChunks({
        word: "measure",
        example: "A number of measures were taken to solve the problem.",
      }),
    ).toEqual([
      [
        { id: "measure-1-chunk-1", text: "A number of", type: "sentence_chunk", order: 1 },
        { id: "measure-1-chunk-2", text: "measures", type: "answer", order: 2 },
        { id: "measure-1-chunk-3", text: "were taken to", type: "sentence_chunk", order: 3 },
        { id: "measure-1-chunk-4", text: "solve the problem.", type: "sentence_chunk", order: 4 },
      ],
    ]);
  });

  it("does not generate standalone punctuation chunks", () => {
    const result = generateWordsPlacementChunks({
      word: "measure",
      example: "Valid experiments also must have data that are measurable.",
    });

    expect(result[0]?.some((chunk) => chunk.text === ".")).toBe(false);
  });
});
