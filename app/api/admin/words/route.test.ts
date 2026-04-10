import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionUser = vi.fn();
const getMock = vi.fn();
const collectionGetMock = vi.fn();

vi.mock("@/types/course", () => ({
  COURSES: [
    {
      id: "EXTREMELY_ADVANCED",
      label: "Extremely Advanced",
      path: "courses/EXTREMELY_ADVANCED",
      schema: "extremelyAdvanced",
      storageMode: "day",
    },
  ],
  JLPT_COUNTER_OPTIONS: [
    {
      id: "counter_hon",
      label: "counter_hon",
      path: "JLPT_Counters/GWhncSjjmcrL0X47yU9j/counter_hon",
    },
  ],
  JLPT_LEVEL_COURSES: [
    {
      id: "JLPT_COUNTER",
      label: "Counters",
      path: "JLPT_Counters/GWhncSjjmcrL0X47yU9j",
      schema: "jlpt",
      storageMode: "collection",
    },
  ],
}));

vi.mock("@/lib/courseStorage", () => ({
  requireSingleListSubcollectionByCourseId: vi.fn(() => "counters"),
}));

vi.mock("@/lib/server/sessionUser", () => ({
  verifySessionUser,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      get: collectionGetMock,
    })),
    doc: vi.fn(() => ({
      get: getMock,
      collection: vi.fn(() => ({
        get: getMock,
      })),
    })),
  },
}));

describe("GET /api/admin/words", () => {
  beforeEach(() => {
    vi.resetModules();
    verifySessionUser.mockReset();
    getMock.mockReset();
    collectionGetMock.mockReset();
  });

  it("returns JLPT counter collection rows through the JLPT result shape", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    collectionGetMock.mockResolvedValue({
      docs: [
        {
          id: "counter-1",
          data: () => ({
            word: "本",
            meaningEnglish: "counter for long objects",
            meaningKorean: "긴 물건을 세는 단위",
            pronunciation: "ほん",
            pronunciationRoman: "hon",
            example: "ペンを三本買った。",
            exampleRoman: "pen o san-bon katta.",
            translationEnglish: "I bought three pens.",
            translationKorean: "펜을 세 자루 샀다.",
            imageUrl: "https://example.com/counter.png",
          }),
        },
      ],
    });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/words?courseId=JLPT_COUNTER&type=all&missingField=all",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      total: 1,
      limited: false,
      results: [
        {
          id: "counter-1",
          courseId: "JLPT_COUNTER",
          courseLabel: "Counters",
          schemaVariant: "jlpt",
          dayId: null,
          coursePath: "JLPT_Counters/GWhncSjjmcrL0X47yU9j/counter_hon",
          sourceHref: "/courses/JLPT_COUNTER#counter_hon-counter-1",
          primaryText: "本",
          meaningEnglish: "counter for long objects",
          pronunciation: "ほん",
          imageUrl: "https://example.com/counter.png",
        },
      ],
    });
  });

  it("returns Extremely Advanced rows without pronunciation metadata", async () => {
    verifySessionUser.mockResolvedValue({ role: "admin" });
    getMock
      .mockResolvedValueOnce({
        data: () => ({ totalDays: 1 }),
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: "advanced-1",
            data: () => ({
              word: "fuddle",
              meaning: "to confuse",
              example: "I fuddled away with old friends.",
              translation: "나는 친구들과 시간을 보냈다.",
              imageUrl: "https://example.com/fuddle.png",
            }),
          },
        ],
      });

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/words?courseId=EXTREMELY_ADVANCED&type=all&missingField=all",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      total: 1,
      limited: false,
      results: [
        {
          id: "advanced-1",
          courseId: "EXTREMELY_ADVANCED",
          courseLabel: "Extremely Advanced",
          schemaVariant: "extremelyAdvanced",
          type: "standard",
          dayId: "Day1",
          sourceHref: "/courses/EXTREMELY_ADVANCED/Day1#advanced-1",
          primaryText: "fuddle",
          meaning: "to confuse",
          pronunciation: null,
          derivative: null,
          imageUrl: "https://example.com/fuddle.png",
        },
      ],
    });
  });
});
