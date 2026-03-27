import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const verifySessionCookie = vi.fn();
const getServerAISettings = vi.fn();
const getAdjectiveDerivativesPreview = vi.fn();
const supportsDerivativeCourse = vi.fn();
const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

vi.mock("@/constants/supportedDerivativeCourses", () => ({
  supportsDerivativeCourse,
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: {
    verifySessionCookie,
  },
}));

vi.mock("@/lib/server/aiSettings", () => ({
  getServerAISettings,
}));

vi.mock("@/lib/word-derivation/getAdjectiveDerivatives", () => ({
  getAdjectiveDerivativesPreview,
}));

describe("POST /api/admin/derivatives/preview", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    logSpy.mockClear();
    supportsDerivativeCourse.mockReturnValue(true);
    verifySessionCookie.mockResolvedValue({});
    getServerAISettings.mockResolvedValue({
      adjectiveDerivativeApi: "word-sense",
    });
  });

  it("preserves response shape and logs batch metrics", async () => {
    getAdjectiveDerivativesPreview.mockImplementation(
      async (_items, _provider, dependencies) => {
        dependencies?.onMetrics?.({
          uniqueBaseWordCount: 2,
          uniqueCandidateCount: 3,
          discoveryBatchCount: 1,
          definitionBatchCount: 2,
        });

        return [
          {
            itemId: "item-1",
            dayName: "Day1",
            words: [
              {
                baseWord: "care",
                baseMeaning: "attention",
                candidates: [
                  {
                    word: "careful",
                    meaning: "showing care",
                    source: "word-sense",
                    selectedByDefault: true,
                  },
                ],
              },
            ],
          },
        ];
      },
    );

    const { POST } = await import("./route");
    const request = new NextRequest("http://localhost/api/admin/derivatives/preview", {
      method: "POST",
      headers: {
        cookie: "__session=test-session",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        courseId: "TOEIC",
        items: [
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
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          itemId: "item-1",
          dayName: "Day1",
          words: [
            {
              baseWord: "care",
              baseMeaning: "attention",
              candidates: [
                {
                  word: "careful",
                  meaning: "showing care",
                  source: "word-sense",
                  selectedByDefault: true,
                },
              ],
            },
          ],
        },
      ],
    });

    expect(getAdjectiveDerivativesPreview).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(
      "[derivatives] Preview generated",
      expect.objectContaining({
        provider: "word-sense",
        discoveryBatchCount: 1,
        definitionBatchCount: 2,
      }),
    );
  });
});
