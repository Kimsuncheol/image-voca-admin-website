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

type MatchingRawItem = {
  id?: string;
  word?: string;
  text?: MatchingChoiceText;
  meaningEnglish?: string;
  meaningKorean?: string;
};

type MatchingRawChoice = {
  id?: string;
  word?: string;
  text?: MatchingChoiceText;
  meaningEnglish?: string;
  meaningKorean?: string;
};

type MatchingQuizResponse = {
  quiz_type?: string;
  language?: string;
  items?: MatchingRawItem[];
  choices?: MatchingRawChoice[];
  answer_key?: Array<{
    item_id?: string;
    choice_id?: string;
  }>;
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getTextMeaning(text: MatchingChoiceText | undefined): {
  meaningEnglish?: string;
  meaningKorean?: string;
  fallback?: string;
} {
  if (typeof text === "string") return { fallback: text.trim() };

  return {
    meaningEnglish: hasText(text?.meaningEnglish)
      ? text.meaningEnglish.trim()
      : undefined,
    meaningKorean: hasText(text?.meaningKorean)
      ? text.meaningKorean.trim()
      : undefined,
  };
}

function getRawWord(entry: MatchingRawItem | MatchingRawChoice | undefined): string {
  if (hasText(entry?.word)) return entry.word.trim();
  if (typeof entry?.text === "string" && hasText(entry.text)) {
    return entry.text.trim();
  }

  return "";
}

function getChoiceWord(
  choice: MatchingRawChoice,
  item: MatchingRawItem | undefined,
): string {
  if (hasText(choice.word)) return choice.word.trim();
  return getRawWord(item);
}

function getRawMeanings(entry: MatchingRawItem | MatchingRawChoice | undefined): {
  meaningEnglish?: string;
  meaningKorean?: string;
  fallback?: string;
} {
  const textMeaning = getTextMeaning(entry?.text);

  return {
    meaningEnglish: hasText(entry?.meaningEnglish)
      ? entry.meaningEnglish.trim()
      : textMeaning.meaningEnglish,
    meaningKorean: hasText(entry?.meaningKorean)
      ? entry.meaningKorean.trim()
      : textMeaning.meaningKorean,
    fallback: textMeaning.fallback,
  };
}

function normalizeMatchingQuiz(
  data: unknown,
  requestBody: QuizGenerateBody,
): unknown {
  if (
    !data ||
    typeof data !== "object" ||
    requestBody.quiz_type !== "matching"
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
    items: quiz.items.map((item) => {
      const meanings = getRawMeanings(item);
      const fallback = meanings.fallback;

      return {
        id: item.id,
        word: getRawWord(item),
        meaningEnglish: meanings.meaningEnglish ?? fallback,
        meaningKorean: meanings.meaningKorean ?? fallback,
      };
    }),
    choices: quiz.choices.map((choice) => {
      const item = itemsById.get(itemIdByChoiceId.get(choice.id));
      const meanings = getRawMeanings(choice);
      const itemMeanings = getRawMeanings(item);
      const fallback = meanings.fallback ?? itemMeanings.fallback;

      return {
        id: choice.id,
        word: getChoiceWord(choice, item),
        meaningEnglish: meanings.meaningEnglish ?? itemMeanings.meaningEnglish ?? fallback,
        meaningKorean: meanings.meaningKorean ?? itemMeanings.meaningKorean ?? fallback,
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
  const normalizedData = normalizeMatchingQuiz(data, upstreamBody);

  return NextResponse.json({
    ...(normalizedData && typeof normalizedData === "object" ? normalizedData : { data: normalizedData }),
    max_days: maxDays,
    max_count: dayWordCount,
    requested_count: requestedCount,
  }, {
    status: upstream.status,
  });
}
