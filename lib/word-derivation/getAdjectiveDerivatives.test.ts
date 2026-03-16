import assert from "node:assert/strict";
import test from "node:test";

import { getAdjectiveDerivativesPreview } from "./getAdjectiveDerivatives";
import {
  createDatamuseDerivativeProvider,
  createFreeDictionaryDerivativeProvider,
  createWordSenseDerivativeProvider,
} from "./providerAdapters";

test("getAdjectiveDerivativesPreview uses the selected provider only", async () => {
  const calls: string[] = [];
  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [{ word: "care", meaning: "attention", pronunciation: "", example: "", translation: "" }],
      },
    ],
    "datamuse",
    {
      resolveProvider: (providerApi) => {
        calls.push(providerApi);
        return {
          source: "datamuse",
          discoverCandidates: async () => ["careful"],
          getDefinition: async () => ({
            meaning: "showing care",
            attribution: "Datamuse",
          }),
        };
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

test("datamuse provider keeps only validated adjective candidates with meanings", async () => {
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

  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [{ word: "care", meaning: "attention", pronunciation: "", example: "", translation: "" }],
      },
    ],
    "datamuse",
    {
      resolveProvider: () => provider,
    },
  );

  assert.deepEqual(
    result[0]?.words[0]?.candidates.map((candidate) => candidate.word),
    ["careful"],
  );
  assert.equal(result[0]?.words[0]?.candidates[0]?.meaning, "showing care");
});

test("free dictionary provider validates heuristic candidates against adjective entries", async () => {
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

  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day2",
        words: [{ word: "care", meaning: "attention", pronunciation: "", example: "", translation: "" }],
      },
    ],
    "free-dictionary",
    {
      resolveProvider: () => provider,
    },
  );

  assert.deepEqual(
    result[0]?.words[0]?.candidates.map((candidate) => candidate.word),
    ["careful"],
  );
  assert.equal(
    result[0]?.words[0]?.candidates[0]?.meaning,
    "giving close attention",
  );
});

test("word sense provider degrades cleanly when the api key is missing", async () => {
  let fetchCalls = 0;
  const provider = createWordSenseDerivativeProvider({
    apiKey: "",
    fetchImpl: async () => {
      fetchCalls += 1;
      return new Response("[]", { status: 200 });
    },
  });

  const result = await getAdjectiveDerivativesPreview(
    [
      {
        itemId: "item-1",
        dayName: "Day1",
        words: [{ word: "care", meaning: "attention", pronunciation: "", example: "", translation: "" }],
      },
    ],
    "word-sense",
    {
      resolveProvider: () => provider,
    },
  );

  assert.deepEqual(result[0]?.words[0]?.candidates, []);
  assert.equal(fetchCalls, 0);
});
