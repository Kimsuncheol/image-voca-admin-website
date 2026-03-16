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

test("getAdjectiveDerivativesPreview uses the selected provider only", async () => {
  const calls: string[] = [];
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
        calls.push(providerApi);
        return {
          source: "datamuse",
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
                  meaning: "showing care",
                  attribution: "Datamuse",
                },
              ]),
            ),
            errorsByWord: new Map(),
          }),
        } satisfies AdjectiveDerivativeProvider;
      },
    },
  );

  assert.deepEqual(calls, ["datamuse"]);
  assert.deepEqual(result[0]?.words[0]?.candidates, [
    {
      word: "careful",
      meaning: "showing care",
      source: "datamuse",
      selectedByDefault: true,
      attribution: "Datamuse",
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
  let definitionBatchCount = 0;

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
          getDefinitionsBatch: async (words) => {
            definitionBatchCount += 1;
            return {
              definitionsByWord: new Map(
                words.map((word) => [word, { meaning: `${word} meaning` }]),
              ),
              errorsByWord: new Map(),
            };
          },
        }) satisfies AdjectiveDerivativeProvider,
    },
  );

  assert.equal(definitionBatchCount, 1);
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
