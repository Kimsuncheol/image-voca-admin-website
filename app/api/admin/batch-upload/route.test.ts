import { NextRequest } from "next/server";
import { expect, test, vi } from "vitest";
import { getCourseById } from "@/types/course";

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    verifySessionCookie: vi.fn(),
  },
  adminDb: {},
}));

vi.mock("@/lib/server/wordCache", () => ({
  invalidateCourseCache: vi.fn(),
}));

import { createBatchUploadHandler } from "./route";

type FakeDocRef =
  | { kind: "flat"; collectionPath: string; id: string }
  | { kind: "day"; coursePath: string; dayName: string; id: string };

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/batch-upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "__session=test-session",
    },
    body: JSON.stringify(body),
  });
}

function createFakeDependencies() {
  let autoId = 0;
  const dayDocs = new Map<string, Map<string, unknown>>();
  const flatDocs = new Map<string, Map<string, unknown>>();
  const courseMeta = new Map<string, Record<string, unknown>>();
  let invalidateCalls = 0;

  function dayKey(coursePath: string, dayName: string) {
    return `${coursePath}::${dayName}`;
  }

  function ensureDay(coursePath: string, dayName: string) {
    const key = dayKey(coursePath, dayName);
    let docs = dayDocs.get(key);
    if (!docs) {
      docs = new Map();
      dayDocs.set(key, docs);
    }
    return docs;
  }

  function ensureFlat(collectionPath: string) {
    let docs = flatDocs.get(collectionPath);
    if (!docs) {
      docs = new Map();
      flatDocs.set(collectionPath, docs);
    }
    return docs;
  }

  const adminDb = {
    batch() {
      const operations: Array<{ type: "set" | "delete"; ref: FakeDocRef; data?: unknown }> = [];
      return {
        set(ref: FakeDocRef, data: unknown) {
          operations.push({ type: "set", ref, data });
        },
        delete(ref: FakeDocRef) {
          operations.push({ type: "delete", ref });
        },
        async commit() {
          operations.forEach((operation) => {
            if (operation.ref.kind === "flat") {
              const docs = ensureFlat(operation.ref.collectionPath);
              if (operation.type === "delete") {
                docs.delete(operation.ref.id);
              } else {
                docs.set(operation.ref.id, operation.data);
              }
              return;
            }

            const docs = ensureDay(operation.ref.coursePath, operation.ref.dayName);
            if (operation.type === "delete") {
              docs.delete(operation.ref.id);
            } else {
              docs.set(operation.ref.id, operation.data);
            }
          });
        },
      };
    },
    collection(collectionPath: string) {
      return {
        doc(id?: string) {
          autoId += 1;
          return {
            kind: "flat" as const,
            collectionPath,
            id: id ?? `auto-${autoId}`,
          };
        },
        async get() {
          const docs = ensureFlat(collectionPath);
          return {
            docs: [...docs.values()].map((data) => ({
              data: () => data,
            })),
          };
        },
      };
    },
    doc(coursePath: string) {
      return {
        collection(dayName: string) {
          return {
            doc(id?: string) {
              autoId += 1;
              return {
                kind: "day" as const,
                coursePath,
                dayName,
                id: id ?? `auto-${autoId}`,
              };
            },
            async get() {
              const docs = ensureDay(coursePath, dayName);
              return {
                empty: docs.size === 0,
                docs: [...docs.entries()].map(([id, data]) => ({
                  id,
                  ref: {
                    kind: "day" as const,
                    coursePath,
                    dayName,
                    id,
                  },
                  data: () => data as Record<string, unknown>,
                })),
              };
            },
          };
        },
        async get() {
          return {
            data: () => courseMeta.get(coursePath),
          };
        },
        async set(data: Record<string, unknown>, options: { merge: boolean }) {
          const existing = courseMeta.get(coursePath) ?? {};
          courseMeta.set(coursePath, options.merge ? { ...existing, ...data } : data);
        },
      };
    },
  };

  const handler = createBatchUploadHandler({
    adminDb,
    invalidateCourseCache: () => {
      invalidateCalls += 1;
    },
    verifySessionCookie: async () => undefined,
  });

  return {
    handler,
    state: {
      dayDocs,
      flatDocs,
      courseMeta,
      get invalidateCalls() {
        return invalidateCalls;
      },
    },
  };
}

test("batch upload writes non-flat word docs using provided ids", async () => {
  const { handler, state } = createFakeDependencies();

  const response = await handler(
    createRequest({
      coursePath: "courses/toeic",
      storageMode: "day",
      days: [
        {
          dayName: "Day3",
          words: [
            { id: "TOEIC_Day3_1", word: "abandon", meaning: "leave" },
            { id: "TOEIC_Day3_2", word: "brief", meaning: "short" },
          ],
        },
      ],
    }),
  );
  const payload = (await response.json()) as {
    results: Array<{ dayName: string; count: number; error?: string }>;
  };

  expect(response.status).toBe(200);
  expect(payload.results).toEqual([{ dayName: "Day3", count: 2 }]);
  expect(
    [...(state.dayDocs.get("courses/toeic::Day3")?.keys() ?? [])],
  ).toEqual(["TOEIC_Day3_1", "TOEIC_Day3_2"]);
  expect(state.dayDocs.get("courses/toeic::Day3")?.get("TOEIC_Day3_1")).toEqual({
    word: "abandon",
    meaning: "leave",
  });
  expect(state.courseMeta.get("courses/toeic")?.lastUploadedDayId).toBe("Day3");
  expect(state.courseMeta.get("courses/toeic")?.totalDays).toBe(3);
  expect(state.invalidateCalls).toBe(1);
});

test("batch upload rejects duplicate ids within a day payload", async () => {
  const { handler, state } = createFakeDependencies();

  const response = await handler(
    createRequest({
      coursePath: "courses/csat",
      days: [
        {
          dayName: "Day1",
          words: [
            { id: "CSAT_Day1_1", word: "care", meaning: "attention" },
            { id: "CSAT_Day1_1", word: "careful", meaning: "cautious" },
          ],
        },
      ],
    }),
  );
  const payload = (await response.json()) as {
    results: Array<{ dayName: string; count: number; error?: string }>;
  };

  expect(response.status).toBe(200);
  expect(payload.results[0]?.error).toBe("Duplicate word id: CSAT_Day1_1");
  expect(state.dayDocs.get("courses/csat::Day1")?.size ?? 0).toBe(0);
});

test("batch upload rejects blank course paths", async () => {
  const { handler } = createFakeDependencies();

  const response = await handler(
    createRequest({
      coursePath: "   ",
      days: [
        {
          dayName: "Day1",
          words: [{ id: "TOEIC_Day1_1", word: "brief", meaning: "short" }],
        },
      ],
    }),
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({
    error: "Course path is required",
  });
});

test("batch upload keeps famous quote writes on auto-generated ids", async () => {
  const { handler, state } = createFakeDependencies();

  const response = await handler(
    createRequest({
      coursePath: "quotes",
      storageMode: "flat",
      days: [
        {
          dayName: "ignored",
          words: [
            { quote: "Stay hungry.", author: "Jobs", translation: "배고프게 살아라." },
          ],
        },
      ],
    }),
  );
  const payload = (await response.json()) as {
    results: Array<{ dayName: string; count: number; error?: string }>;
  };

  expect(response.status).toBe(200);
  expect(payload.results).toEqual([{ dayName: "ignored", count: 1 }]);
  const storedDocs = [...(state.flatDocs.get("quotes")?.entries() ?? [])];
  expect(storedDocs.length).toBe(1);
  expect(storedDocs[0]?.[0].startsWith("auto-")).toBe(true);
  expect(storedDocs[0]?.[1]).toEqual({
    quote: "Stay hungry.",
    author: "Jobs",
    translation: "배고프게 살아라.",
  });
});

test("batch upload writes prefix docs into the fixed prefix subcollection", async () => {
  const { handler, state } = createFakeDependencies();
  const prefixPath = getCourseById("JLPT_PREFIX")?.path;
  expect(prefixPath).toBeTruthy();

  const response = await handler(
    createRequest({
      coursePath: prefixPath,
      storageMode: "singleList",
      days: [
        {
          dayName: "prefix",
          words: [
            {
              id: "JLPT_PREFIX_prefix_1",
              prefix: "再-",
              meaningEnglish: "again",
            },
          ],
        },
      ],
    }),
  );
  const payload = (await response.json()) as {
    results: Array<{ dayName: string; count: number; error?: string }>;
  };

  expect(response.status).toBe(200);
  expect(payload.results).toEqual([{ dayName: "prefix", count: 1 }]);
  expect(
    [...(state.dayDocs.get(`${prefixPath}::prefix`)?.keys() ?? [])],
  ).toEqual(["JLPT_PREFIX_prefix_1"]);
  expect(state.courseMeta.get(prefixPath ?? "")).toBeUndefined();
});

test("batch upload preserves an existing imageUrl on overwrite when the rewritten row keeps the same identity", async () => {
  const { handler, state } = createFakeDependencies();
  state.dayDocs.set(
    "courses/toeic::Day3",
    new Map([
      [
        "TOEIC_Day3_1",
        {
          word: "abandon",
          meaning: "leave",
          imageUrl: "https://example.com/abandon-old.png",
        },
      ],
    ]),
  );

  const response = await handler(
    createRequest({
      coursePath: "courses/toeic",
      storageMode: "day",
      preserveExistingImages: true,
      days: [
        {
          dayName: "Day3",
          words: [{ id: "TOEIC_Day3_1", word: "abandon", meaning: "leave" }],
        },
      ],
    }),
  );

  expect(response.status).toBe(200);
  expect(state.dayDocs.get("courses/toeic::Day3")?.get("TOEIC_Day3_1")).toEqual({
    word: "abandon",
    meaning: "leave",
    imageUrl: "https://example.com/abandon-old.png",
  });
});

test("batch upload keeps a newly provided imageUrl instead of preserving the old one", async () => {
  const { handler, state } = createFakeDependencies();
  state.dayDocs.set(
    "courses/toeic::Day3",
    new Map([
      [
        "TOEIC_Day3_1",
        {
          word: "abandon",
          meaning: "leave",
          imageUrl: "https://example.com/abandon-old.png",
        },
      ],
    ]),
  );

  const response = await handler(
    createRequest({
      coursePath: "courses/toeic",
      storageMode: "day",
      preserveExistingImages: true,
      days: [
        {
          dayName: "Day3",
          words: [
            {
              id: "TOEIC_Day3_1",
              word: "abandon",
              meaning: "leave",
              imageUrl: "https://example.com/abandon-new.png",
            },
          ],
        },
      ],
    }),
  );

  expect(response.status).toBe(200);
  expect(state.dayDocs.get("courses/toeic::Day3")?.get("TOEIC_Day3_1")).toEqual({
    word: "abandon",
    meaning: "leave",
    imageUrl: "https://example.com/abandon-new.png",
  });
});

test("batch upload does not copy an old imageUrl onto a different word after row order changes", async () => {
  const { handler, state } = createFakeDependencies();
  state.dayDocs.set(
    "courses/toeic::Day3",
    new Map([
      [
        "TOEIC_Day3_1",
        {
          word: "abandon",
          meaning: "leave",
          imageUrl: "https://example.com/abandon-old.png",
        },
      ],
    ]),
  );

  const response = await handler(
    createRequest({
      coursePath: "courses/toeic",
      storageMode: "day",
      preserveExistingImages: true,
      days: [
        {
          dayName: "Day3",
          words: [{ id: "TOEIC_Day3_1", word: "brief", meaning: "short" }],
        },
      ],
    }),
  );

  expect(response.status).toBe(200);
  expect(state.dayDocs.get("courses/toeic::Day3")?.get("TOEIC_Day3_1")).toEqual({
    word: "brief",
    meaning: "short",
  });
});
