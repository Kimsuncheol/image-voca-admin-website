import { NextRequest, NextResponse } from "next/server";
import { buildVocabApiUrl } from "@/lib/server/textApi";

type QuizGenerateBody = {
  quiz_type?: string;
  language?: string;
  meaning_language?: string;
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
    text?: string;
    meaningEnglish?: string;
    meaningKorean?: string;
  }>;
  answer_key?: Array<{
    item_id?: string;
    choice_id?: string;
  }>;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function formatJapaneseMatchingChoiceText(
  item: NonNullable<MatchingQuizResponse["items"]>[number] | undefined,
  fallback: string | undefined,
): string | undefined {
  return hasText(item?.text) ? item.text.trim() : fallback;
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
        ...choice,
        text: formatJapaneseMatchingChoiceText(item, choice.text),
        meaningEnglish: hasText(item?.meaningEnglish)
          ? item.meaningEnglish.trim()
          : choice.meaningEnglish,
        meaningKorean: hasText(item?.meaningKorean)
          ? item.meaningKorean.trim()
          : choice.meaningKorean,
      };
    }),
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as QuizGenerateBody;

  const upstream = await fetch(buildVocabApiUrl("/v1/quizzes/generate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await upstream.json()) as unknown;
  return NextResponse.json(normalizeMatchingChoiceText(data, body), {
    status: upstream.status,
  });
}
