import { NextRequest, NextResponse } from "next/server";
import { buildVocabApiUrl } from "@/lib/server/textApi";
import {
  clampQuizCount,
  countQuizDayWords,
  normalizeRequestedQuizCount,
} from "@/lib/server/quizGeneration";

type QuizGenerateBody = {
  quiz_type?: string;
  language?: string;
  meaning_language?: string;
  course?: string;
  level?: string | null;
  day?: number;
  count?: number;
};

type MatchingChoiceText = string | {
  meaningEnglish: string;
  meaningKorean: string;
};

type MatchingQuizResponse = {
  quiz_type?: string;
  language?: string;
  items?: Array<{
    id?: string;
    text?: string;
    meaningEnglish?: string;
    meaningKorean?: string;
  }>;
  choices?: Array<{
    id?: string;
    text?: MatchingChoiceText;
  }>;
  answer_key?: Array<{
    item_id?: string;
    choice_id?: string;
  }>;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildJapaneseMeaningPairText(
  item: NonNullable<MatchingQuizResponse["items"]>[number] | undefined,
  fallback: MatchingChoiceText | undefined,
): MatchingChoiceText | undefined {
  const fallbackText = typeof fallback === "string" ? fallback : "";

  return {
    meaningEnglish: hasText(item?.meaningEnglish)
      ? item.meaningEnglish.trim()
      : fallbackText,
    meaningKorean: hasText(item?.meaningKorean)
      ? item.meaningKorean.trim()
      : fallbackText,
  };
}

function normalizeMatchingChoiceText(
  data: unknown,
  requestBody: QuizGenerateBody,
): unknown {
  if (
    !data ||
    typeof data !== "object" ||
    requestBody.quiz_type !== "matching" ||
    requestBody.language !== "japanese"
  ) {
    return data;
  }

  const quiz = data as MatchingQuizResponse;
  if (
    !Array.isArray(quiz.items) ||
    !Array.isArray(quiz.choices) ||
    !Array.isArray(quiz.answer_key)
  ) {
    return data;
  }

  const itemsById = new Map(quiz.items.map((item) => [item.id, item]));
  const itemIdByChoiceId = new Map(
    quiz.answer_key.map((entry) => [entry.choice_id, entry.item_id]),
  );

  return {
    ...quiz,
    choices: quiz.choices.map((choice) => {
      const item = itemsById.get(itemIdByChoiceId.get(choice.id));

      return {
        id: choice.id,
        text: buildJapaneseMeaningPairText(item, choice.text),
      };
    }),
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as QuizGenerateBody;
  const requestedCount = normalizeRequestedQuizCount(body.count);

  let dayWordCount: number;
  let maxDays: number;
  try {
    const countResult = await countQuizDayWords({
      course: body.course,
      level: body.level,
      day: body.day,
    });
    dayWordCount = countResult.count;
    maxDays = countResult.maxDays;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve quiz word count.",
      },
      { status: 400 },
    );
  }

  if (dayWordCount <= 0) {
    return NextResponse.json(
      {
        error: "The selected day has no words.",
        max_days: maxDays,
        max_count: dayWordCount,
        requested_count: requestedCount,
      },
      { status: 422 },
    );
  }

  const clampedCount = clampQuizCount(requestedCount, dayWordCount);
  const upstreamBody = {
    ...body,
    count: clampedCount,
  };

  const upstream = await fetch(buildVocabApiUrl("/v1/quizzes/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(upstreamBody),
  });

  const data = (await upstream.json()) as unknown;
  const normalizedData = normalizeMatchingChoiceText(data, upstreamBody);

  return NextResponse.json({
    ...(normalizedData && typeof normalizedData === "object" ? normalizedData : { data: normalizedData }),
    max_days: maxDays,
    max_count: dayWordCount,
    requested_count: requestedCount,
  }, {
    status: upstream.status,
  });
}
