import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(),
  },
}));

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser: vi.fn(),
}));

import { createFamousQuotesHandler } from "./route";

function createRequest(search = "") {
  return new NextRequest(
    `http://localhost/api/admin/famous-quotes${search}`,
    {
      method: "GET",
      headers: {
        Cookie: "__session=test-session",
      },
    },
  );
}

function createFakeDependencies() {
  const flatDocs = new Map<
    string,
    Array<{ id: string; data: Record<string, unknown> }>
  >();

  const dependencies = {
    adminDb: {
      collection(coursePath: string) {
        const docs = flatDocs.get(coursePath) ?? [];

        return {
          orderBy() {
            return createQuery(docs);
          },
        };
      },
    },
    verifySessionUser: async () => ({
      uid: "admin-user",
      email: "admin@example.com",
      displayName: "Admin",
      role: "admin" as const,
      createdAt: new Date(),
    }),
  };

  function seed(
    coursePath: string,
    docs: Array<{ id: string; data: Record<string, unknown> }>,
  ) {
    flatDocs.set(coursePath, docs);
  }

  return {
    handler: createFamousQuotesHandler(dependencies),
    seed,
  };
}

function createQuery(
  docs: Array<{ id: string; data: Record<string, unknown> }>,
) {
  let batchSize = docs.length || 1;
  let cursorId: string | null = null;

  const query = {
    limit(nextBatchSize: number) {
      batchSize = nextBatchSize;
      return query;
    },
    startAfter(cursor: { id: string }) {
      cursorId = cursor.id;
      return query;
    },
    async get() {
      const startIndex = cursorId
        ? docs.findIndex((doc) => doc.id === cursorId) + 1
        : 0;
      const slice = docs.slice(startIndex, startIndex + batchSize);

      return {
        empty: slice.length === 0,
        size: slice.length,
        docs: slice.map((doc) => ({
          id: doc.id,
          data: () => doc.data,
        })),
      };
    },
  };

  return query;
}

describe("GET /api/admin/famous-quotes", () => {
  it("returns every row for the All filter", async () => {
    const { handler, seed } = createFakeDependencies();
    seed("quotes", [
      {
        id: "quote-1",
        data: {
          quote: "Stay hungry, stay foolish.",
          author: "Steve Jobs",
          translation: "항상 갈망하고 우직하게 나아가라.",
          language: "English",
        },
      },
      {
        id: "quote-2",
        data: {
          quote: "千里の道も一歩から",
          author: "Laozi",
          translation: "천 리 길도 한 걸음부터.",
          language: "Japanese",
        },
      },
    ]);

    const response = await handler(
      createRequest("?coursePath=quotes&language=All"),
    );
    const payload = (await response.json()) as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(payload).toHaveLength(2);
    expect(payload.map((quote) => quote.id)).toEqual(["quote-1", "quote-2"]);
  });

  it("filters English rows by stored language first", async () => {
    const { handler, seed } = createFakeDependencies();
    seed("quotes", [
      {
        id: "quote-1",
        data: {
          quote: "Stay hungry, stay foolish.",
          author: "Steve Jobs",
          translation: "항상 갈망하고 우직하게 나아가라.",
          language: "English",
        },
      },
      {
        id: "quote-2",
        data: {
          quote: "日本語の名言",
          author: "Author",
          translation: "일본어 명언",
          language: "English",
        },
      },
      {
        id: "quote-3",
        data: {
          quote: "道は開ける",
          author: "Author",
          translation: "길은 열린다",
        },
      },
    ]);

    const response = await handler(
      createRequest("?coursePath=quotes&language=English"),
    );
    const payload = (await response.json()) as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(payload.map((quote) => quote.id)).toEqual(["quote-1", "quote-2"]);
  });

  it("filters Japanese rows using regex fallback", async () => {
    const { handler, seed } = createFakeDependencies();
    seed("quotes", [
      {
        id: "quote-1",
        data: {
          quote: "Stay hungry, stay foolish.",
          author: "Steve Jobs",
          translation: "항상 갈망하고 우직하게 나아가라.",
        },
      },
      {
        id: "quote-2",
        data: {
          quote: "七転び八起き",
          author: "Japanese Proverb",
          translation: "일곱 번 넘어져도 여덟 번 일어난다.",
        },
      },
      {
        id: "quote-3",
        data: {
          quote: "Hello こんにちは",
          author: "Mixed",
          translation: "혼합",
        },
      },
    ]);

    const response = await handler(
      createRequest("?coursePath=quotes&language=Japanese"),
    );
    const payload = (await response.json()) as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(payload.map((quote) => quote.id)).toEqual(["quote-2"]);
  });

  it("ignores author and translation in filtering", async () => {
    const { handler, seed } = createFakeDependencies();
    seed("quotes", [
      {
        id: "quote-1",
        data: {
          quote: "Focus on the step in front of you.",
          author: "山田",
          translation: "集中해라",
          language: "English",
        },
      },
      {
        id: "quote-2",
        data: {
          quote: "前に進む",
          author: "English Name",
          translation: "Move forward",
          language: "Japanese",
        },
      },
    ]);

    const response = await handler(
      createRequest("?coursePath=quotes&language=English"),
    );
    const payload = (await response.json()) as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(payload.map((quote) => quote.id)).toEqual(["quote-1"]);
  });

  it("reads across internal batches", async () => {
    const { handler, seed } = createFakeDependencies();
    seed(
      "quotes",
      Array.from({ length: 205 }, (_, index) => ({
        id: `quote-${String(index + 1).padStart(3, "0")}`,
        data: {
          quote: `English quote ${index + 1}`,
          author: `Author ${index + 1}`,
          translation: `번역 ${index + 1}`,
          language: "English",
        },
      })),
    );

    const response = await handler(
      createRequest("?coursePath=quotes&language=English"),
    );
    const payload = (await response.json()) as Array<Record<string, unknown>>;

    expect(response.status).toBe(200);
    expect(payload).toHaveLength(205);
    expect(payload[0]?.id).toBe("quote-001");
    expect(payload[204]?.id).toBe("quote-205");
  });

  it("rejects unauthorized callers", async () => {
    const handler = createFamousQuotesHandler({
      adminDb: {
        collection(_coursePath: string) {
          return {
            orderBy() {
              return createQuery([]);
            },
          };
        },
      },
      verifySessionUser: async () => null,
    });

    const response = await handler(
      createRequest("?coursePath=quotes&language=All"),
    );
    const payload = (await response.json()) as { error: string };

    expect(response.status).toBe(401);
    expect(payload.error).toBe("Unauthorized");
  });
});
