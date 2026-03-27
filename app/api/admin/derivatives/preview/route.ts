import { NextRequest, NextResponse } from "next/server";

import { supportsDerivativeCourse } from "@/constants/supportedDerivativeCourses";
import { adminAuth } from "@/lib/firebase/admin";
import { getServerAISettings } from "@/lib/server/aiSettings";
import { getAdjectiveDerivativesPreview } from "@/lib/word-derivation/getAdjectiveDerivatives";
import type { StandardWordInput } from "@/lib/schemas/vocaSchemas";
import type { CourseId } from "@/types/course";
import type {
  DerivativePreviewRequestItem,
  DerivativePreviewResponse,
} from "@/types/vocabulary";

interface PreviewRequestBody {
  courseId: CourseId;
  items: DerivativePreviewRequestItem[];
}

function isStandardWordInput(value: unknown): value is StandardWordInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.word === "string" && typeof item.meaning === "string";
}

function isDerivativePreviewRequestItem(
  value: unknown,
): value is DerivativePreviewRequestItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;

  return (
    typeof item.itemId === "string" &&
    typeof item.dayName === "string" &&
    Array.isArray(item.words) &&
    item.words.every(isStandardWordInput)
  );
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("__session")?.value;
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PreviewRequestBody;
  try {
    body = (await request.json()) as PreviewRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (
    !body ||
    typeof body.courseId !== "string" ||
    !Array.isArray(body.items) ||
    !body.items.every(isDerivativePreviewRequestItem)
  ) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  if (!supportsDerivativeCourse(body.courseId)) {
    const emptyResponse: DerivativePreviewResponse = {
      items: body.items.map((item) => ({
        itemId: item.itemId,
        dayName: item.dayName,
        words: item.words.map((word) => ({
          baseWord: word.word,
          baseMeaning: word.meaning,
          candidates: [],
        })),
      })),
    };
    return NextResponse.json(emptyResponse);
  }

  const settings = await getServerAISettings();
  const startedAt = Date.now();
  let previewMetrics = {
    uniqueBaseWordCount: 0,
    uniqueCandidateCount: 0,
    discoveryBatchCount: 0,
    definitionBatchCount: 0,
  };
  const items = await getAdjectiveDerivativesPreview(
    body.items,
    settings.adjectiveDerivativeApi,
    {
      onMetrics: (metrics) => {
        previewMetrics = metrics;
      },
    },
  );
  console.log("[derivatives] Preview generated", {
    provider: settings.adjectiveDerivativeApi,
    itemCount: body.items.length,
    uniqueBaseWordCount: previewMetrics.uniqueBaseWordCount,
    uniqueCandidateCount: previewMetrics.uniqueCandidateCount,
    discoveryBatchCount: previewMetrics.discoveryBatchCount,
    definitionBatchCount: previewMetrics.definitionBatchCount,
    durationMs: Date.now() - startedAt,
  });
  return NextResponse.json({ items } satisfies DerivativePreviewResponse);
}
