import assert from "node:assert/strict";
import test from "node:test";

import { getAdjectiveDerivativesPreview } from "./getAdjectiveDerivatives";
import {
  createDatamuseDerivativeProvider,
  createFreeDictionaryDerivativeProvider,
  createWordSenseDerivativeProvider,
  mapWithConcurrencyLimit,
  type AdjectiveDerivativeProvider,
} from "./providerAdapters";

test("getAdjectiveDerivativesPreview uses Naver meanings for datamuse candidates", async () => {
  const providerCalls: string[] = [];
  const meaningLookupCalls: string[][] = [];
  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [
          {
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
    ],
    "datamuse",
    {
      resolveProvider: (providerApi) => {
        providerCalls.push(providerApi);
        return {
          source: "datamuse",
          discoverCandidatesBatch: async (inputs) => ({
            candidatesByWord: new Map(
              inputs.map((input) => [input.baseWord, ["careful"]]),
            ),
            errorsByWord: new Map(),
          }),
          getDefinitionsBatch: async () => ({
            definitionsByWord: new Map(),
            errorsByWord: new Map(),
          }),
        } satisfies AdjectiveDerivativeProvider;
      },
      lookupMeaningsBatch: async (words) => {
        meaningLookupCalls.push([...words]);
        return words.map((word) => ({
          word,
          meaning: `naver:${word}`,
        }));
      },
    },
  );

  assert.deepEqual(providerCalls, ["datamuse"]);
  assert.deepEqual(meaningLookupCalls, [["careful"]]);
  assert.deepEqual(result[0]?.words[0]?.candidates, [
    {
      word: "careful",
      meaning: "naver:careful",
      source: "datamuse",
      selectedByDefault: true,
      attribution: "Naver Dict API",
    },
  ]);
});

test("getAdjectiveDerivativesPreview uses Naver meanings for free dictionary candidates", async () => {
  const meaningLookupCalls: string[][] = [];
  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [
          {
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
    ],
    "free-dictionary",
    {
      resolveProvider: () =>
        ({
          source: "free-dictionary",
          discoverCandidatesBatch: async (inputs) => ({
            candidatesByWord: new Map(
              inputs.map((input) => [input.baseWord, ["careful"]]),
            ),
            errorsByWord: new Map(),
          }),
          getDefinitionsBatch: async () => ({
            definitionsByWord: new Map([
              [
                "careful",
                {
                  meaning: "provider meaning should not be used",
                  attribution: "Free Dictionary API",
                },
              ],
            ]),
            errorsByWord: new Map(),
          }),
        }) satisfies AdjectiveDerivativeProvider,
      lookupMeaningsBatch: async (words) => {
        meaningLookupCalls.push([...words]);
        return words.map((word) => ({
          word,
          meaning: `naver:${word}`,
        }));
      },
    },
  );

  assert.deepEqual(meaningLookupCalls, [["careful"]]);
  assert.deepEqual(result[0]?.words[0]?.candidates, [
    {
      word: "careful",
      meaning: "naver:careful",
      source: "free-dictionary",
      selectedByDefault: true,
      attribution: "Naver Dict API",
    },
  ]);
});

test("getAdjectiveDerivativesPreview keeps provider definitions for word-sense", async () => {
  let lookupMeaningsCalled = false;
  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [
          {
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
    ],
    "word-sense",
    {
      resolveProvider: () =>
        ({
          source: "word-sense",
          discoverCandidatesBatch: async (inputs) => ({
            candidatesByWord: new Map(
              inputs.map((input) => [input.baseWord, ["careful"]]),
            ),
            errorsByWord: new Map(),
          }),
          getDefinitionsBatch: async (words) => ({
            definitionsByWord: new Map(
              words.map((word) => [
                word,
                {
                  meaning: `provider:${word}`,
                  attribution: "Word Sense API",
                },
              ]),
            ),
            errorsByWord: new Map(),
          }),
        }) satisfies AdjectiveDerivativeProvider,
      lookupMeaningsBatch: async () => {
        lookupMeaningsCalled = true;
        return [];
      },
    },
  );

  assert.equal(lookupMeaningsCalled, false);
  assert.deepEqual(result[0]?.words[0]?.candidates, [
    {
      word: "careful",
      meaning: "provider:careful",
      source: "word-sense",
      selectedByDefault: true,
      attribution: "Word Sense API",
    },
  ]);
});

test("getAdjectiveDerivativesPreview dedupes repeated base words across items", async () => {
  const discoveryInputsSeen: string[][] = [];
  const definitionInputsSeen: string[][] = [];

  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [
          {
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
      {
        itemId: "item-2",
        dayName: "Day2",
        words: [
          {
            word: "care",
            meaning: "carefulness",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
    ],
    "word-sense",
    {
      resolveProvider: () =>
        ({
          source: "word-sense",
          discoverCandidatesBatch: async (inputs) => {
            discoveryInputsSeen.push(inputs.map((input) => input.baseWord));
            return {
              candidatesByWord: new Map([["care", ["careful"]]]),
              errorsByWord: new Map(),
            };
          },
          getDefinitionsBatch: async (words) => {
            definitionInputsSeen.push([...words]);
            return {
              definitionsByWord: new Map([
                ["careful", { meaning: "showing care", attribution: "Word Sense API" }],
              ]),
              errorsByWord: new Map(),
            };
          },
        }) satisfies AdjectiveDerivativeProvider,
    },
  );

  assert.deepEqual(discoveryInputsSeen, [["care"]]);
  assert.deepEqual(definitionInputsSeen, [["careful"]]);
  assert.equal(result[0]?.words[0]?.candidates[0]?.word, "careful");
  assert.equal(result[1]?.words[0]?.candidates[0]?.word, "careful");
});

test("getAdjectiveDerivativesPreview dedupes repeated candidate validations", async () => {
  let meaningLookupCount = 0;

  await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [
          {
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
          {
            word: "hope",
            meaning: "expectation",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
    ],
    "datamuse",
    {
      resolveProvider: () =>
        ({
          source: "datamuse",
          discoverCandidatesBatch: async () => ({
            candidatesByWord: new Map([
              ["care", ["shared", "careful"]],
              ["hope", ["shared", "hopeful"]],
            ]),
            errorsByWord: new Map(),
          }),
          getDefinitionsBatch: async () => ({
            definitionsByWord: new Map(),
            errorsByWord: new Map(),
          }),
        }) satisfies AdjectiveDerivativeProvider,
      lookupMeaningsBatch: async (words) => {
        meaningLookupCount += 1;
        return words.map((word) => ({
          word,
          meaning: `${word} meaning`,
        }));
      },
    },
  );

  assert.equal(meaningLookupCount, 1);
});

test("getAdjectiveDerivativesPreview preserves item, word, and candidate ordering", async () => {
  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-2",
        dayName: "Day2",
        words: [
          {
            word: "zest",
            meaning: "energy",
            pronunciation: "",
            example: "",
            translation: "",
          },
          {
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [
          {
            word: "hope",
            meaning: "expectation",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
    ],
    "datamuse",
    {
      resolveProvider: () =>
        ({
          source: "datamuse",
          discoverCandidatesBatch: async () => ({
            candidatesByWord: new Map([
              ["zest", ["zesty", "zestful"]],
              ["care", ["careful", "caring"]],
              ["hope", ["hopeful", "hopeless"]],
            ]),
            errorsByWord: new Map(),
          }),
          getDefinitionsBatch: async (words) => ({
            definitionsByWord: new Map(
              words.map((word) => [word, { meaning: `${word} meaning` }]),
            ),
            errorsByWord: new Map(),
          }),
        }) satisfies AdjectiveDerivativeProvider,
    },
  );

  assert.deepEqual(
    result.map((item) => item.itemId),
    ["item-2", "item-1"],
  );
  assert.deepEqual(
    result[0]?.words.map((word) => word.baseWord),
    ["zest", "care"],
  );
  assert.deepEqual(
    result[0]?.words[0]?.candidates.map((candidate) => candidate.word),
    ["zestful", "zesty"],
  );
});

test("getAdjectiveDerivativesPreview keeps partial results when one base lookup fails", async () => {
  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [
          {
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
          {
            word: "hope",
            meaning: "expectation",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
    ],
    "word-sense",
    {
      resolveProvider: () =>
        ({
          source: "word-sense",
          discoverCandidatesBatch: async () => ({
            candidatesByWord: new Map([
              ["care", ["careful"]],
              ["hope", []],
            ]),
            errorsByWord: new Map([["hope", ["Word Sense request failed with 503"]]]),
          }),
          getDefinitionsBatch: async () => ({
            definitionsByWord: new Map([
              ["careful", { meaning: "showing care" }],
            ]),
            errorsByWord: new Map(),
          }),
        }) satisfies AdjectiveDerivativeProvider,
    },
  );

  assert.deepEqual(
    result[0]?.words[0]?.candidates.map((candidate) => candidate.word),
    ["careful"],
  );
  assert.deepEqual(result[0]?.words[1]?.candidates, []);
  assert.deepEqual(result[0]?.words[1]?.errors, [
    "Word Sense request failed with 503",
  ]);
});

test("getAdjectiveDerivativesPreview drops datamuse candidates missing an exact Naver meaning", async () => {
  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [
          {
            word: "care",
            meaning: "attention",
            pronunciation: "",
            example: "",
            translation: "",
          },
        ],
      },
    ],
    "datamuse",
    {
      resolveProvider: () =>
        ({
          source: "datamuse",
          discoverCandidatesBatch: async () => ({
            candidatesByWord: new Map([["care", ["careful", "caring"]]]),
            errorsByWord: new Map(),
          }),
          getDefinitionsBatch: async () => ({
            definitionsByWord: new Map([
              ["careful", { meaning: "provider careful meaning" }],
              ["caring", { meaning: "provider caring meaning" }],
            ]),
            errorsByWord: new Map(),
          }),
        }) satisfies AdjectiveDerivativeProvider,
      lookupMeaningsBatch: async () => [
        { word: "careful", meaning: "naver careful meaning" },
        { word: "caring", meaning: null },
      ],
    },
  );

  assert.deepEqual(result[0]?.words[0]?.candidates, [
    {
      word: "careful",
      meaning: "naver careful meaning",
      source: "datamuse",
      selectedByDefault: true,
      attribution: "Naver Dict API",
    },
  ]);
});

test("datamuse provider batch methods preserve adjective validation", async () => {
  const provider = createDatamuseDerivativeProvider({
    fetchImpl: async (url) => {
      const currentUrl = new URL(String(url));
      const spelling = currentUrl.searchParams.get("sp");

      if (spelling === "care*") {
        return new Response(
          JSON.stringify([
            { word: "careful", tags: ["adj"], defs: ["adj\tshowing care"] },
            { word: "care", tags: ["n"], defs: ["n\tattention"] },
          ]),
          { status: 200 },
        );
      }

      if (spelling === "careful") {
        return new Response(
          JSON.stringify([
            { word: "careful", tags: ["adj"], defs: ["adj\tshowing care"] },
          ]),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify([]), { status: 200 });
    },
  });

  const discovery = await provider.discoverCandidatesBatch([
    { baseWord: "care", baseMeaning: "attention" },
  ]);
  const definitions = await provider.getDefinitionsBatch(["careful"]);

  assert.deepEqual(discovery.candidatesByWord.get("care"), ["careful"]);
  assert.equal(
    definitions.definitionsByWord.get("careful")?.meaning,
    "showing care",
  );
});

test("free dictionary provider batch methods preserve adjective validation", async () => {
  const provider = createFreeDictionaryDerivativeProvider({
    fetchImpl: async (url) => {
      const word = decodeURIComponent(String(url).split("/").pop() ?? "");
      if (word === "careful") {
        return new Response(
          JSON.stringify([
            {
              sourceUrls: ["https://dictionaryapi.dev/careful"],
              meanings: [
                {
                  partOfSpeech: "adjective",
                  definitions: [{ definition: "giving close attention" }],
                },
              ],
            },
          ]),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ title: "No Definitions Found" }), {
        status: 404,
      });
    },
  });

  const discovery = await provider.discoverCandidatesBatch([
    { baseWord: "care", baseMeaning: "attention" },
  ]);
  const definitions = await provider.getDefinitionsBatch(["careful"]);

  assert.equal(discovery.candidatesByWord.get("care")?.includes("careful"), true);
  assert.equal(
    definitions.definitionsByWord.get("careful")?.meaning,
    "giving close attention",
  );
});

test("word sense provider batch methods degrade cleanly when the api key is missing", async () => {
  let fetchCalls = 0;
  const provider = createWordSenseDerivativeProvider({
    apiKey: "",
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response("[]", { status: 200 });
    },
  });

  const discovery = await provider.discoverCandidatesBatch([
    { baseWord: "care", baseMeaning: "attention" },
  ]);
  const definitions = await provider.getDefinitionsBatch(["careful"]);

  assert.equal(discovery.candidatesByWord.get("care")?.includes("careful"), true);
  assert.equal(definitions.definitionsByWord.get("careful"), null);
  assert.equal(fetchCalls, 0);
});

test("mapWithConcurrencyLimit honors the configured limit", async () => {
  let active = 0;
  let maxActive = 0;

  const output = await mapWithConcurrencyLimit(
    ["a", "b", "c", "d", "e", "f"],
    2,
    async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return value.toUpperCase();
    },
  );

  assert.deepEqual(output, ["A", "B", "C", "D", "E", "F"]);
  assert.equal(maxActive, 2);
});
