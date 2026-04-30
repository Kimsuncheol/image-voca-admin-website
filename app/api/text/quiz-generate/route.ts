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
  meaning?: string;
  meaningEnglish?: string;
  meaningKorean?: string;
};

type MatchingRawChoice = {
  id?: string;
  word?: string;
  text?: MatchingChoiceText;
  meaning?: string;
  meaningEnglish?: string;
  meaningKorean?: string;
};

type MatchingQuizResponse = {
  quiz_type?: string;
  pop_quiz_type?: string;
  language?: string;
  course?: string;
  level?: string | null;
  day?: number;
  items?: MatchingRawItem[];
  choices?: MatchingRawChoice[];
  answer_key?: Array<{
    item_id?: string;
    choice_id?: string;
  }>;
};

type UpstreamQuizRequest = Record<string, unknown>;

const MATCHING_GAME_MAX_COUNT = 20;

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
  if (typeof choice.text === "string" && hasText(choice.text)) {
    return choice.text.trim();
  }
  return getRawWord(item);
}

function getRawMeanings(entry: MatchingRawItem | MatchingRawChoice | undefined): {
  meaning?: string;
  meaningEnglish?: string;
  meaningKorean?: string;
  fallback?: string;
} {
  const textMeaning = getTextMeaning(entry?.text);

  return {
    meaning: hasText(entry?.meaning) ? entry.meaning.trim() : undefined,
    meaningEnglish: hasText(entry?.meaningEnglish)
      ? entry.meaningEnglish.trim()
      : textMeaning.meaningEnglish,
    meaningKorean: hasText(entry?.meaningKorean)
      ? entry.meaningKorean.trim()
      : textMeaning.meaningKorean,
    fallback: textMeaning.fallback,
  };
}

function buildMatchingRequest(
  body: QuizGenerateBody,
  count: number,
): UpstreamQuizRequest {
  return {
    pop_quiz_type: "matching_game",
    language: body.language,
    course: body.course,
    level: body.language === "japanese" ? body.level : null,
    day: body.day,
    count,
  };
}

function buildLegacyQuizRequest(
  body: QuizGenerateBody,
  count: number,
): UpstreamQuizRequest {
  return {
    ...body,
    count,
  };
}

function validateMatchingRequest(body: QuizGenerateBody): string | null {
  if (body.language === "japanese") {
    if (body.course !== "JLPT") return "Japanese matching games require JLPT.";
    if (!hasText(body.level)) return "Japanese matching games require a JLPT level.";
    return null;
  }

  if (body.language === "english") {
    if (body.course === "JLPT") return "English matching games cannot use JLPT.";
    return null;
  }

  return "Invalid matching game language.";
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
    quiz_type: "matching",
    pop_quiz_type: undefined,
    items: quiz.items.map((item) => {
      const meanings = getRawMeanings(item);
      const fallback = meanings.meaning ?? meanings.fallback;

      return {
        id: item.id,
        word: getRawWord(item),
        ...(fallback ? { meaning: fallback } : {}),
        ...(meanings.meaningEnglish || fallback
          ? { meaningEnglish: meanings.meaningEnglish ?? fallback }
          : {}),
        ...(meanings.meaningKorean || fallback
          ? { meaningKorean: meanings.meaningKorean ?? fallback }
          : {}),
      };
    }),
    choices: quiz.choices.map((choice) => {
      const item = itemsById.get(itemIdByChoiceId.get(choice.id));
      const meanings = getRawMeanings(choice);
      const itemMeanings = getRawMeanings(item);
      const fallback =
        meanings.meaning ??
        meanings.fallback ??
        itemMeanings.meaning ??
        itemMeanings.fallback;

      return {
        id: choice.id,
        word: getChoiceWord(choice, item),
        ...(fallback ? { meaning: fallback } : {}),
        ...(meanings.meaningEnglish || itemMeanings.meaningEnglish || fallback
          ? { meaningEnglish: meanings.meaningEnglish ?? itemMeanings.meaningEnglish ?? fallback }
          : {}),
        ...(meanings.meaningKorean || itemMeanings.meaningKorean || fallback
          ? { meaningKorean: meanings.meaningKorean ?? itemMeanings.meaningKorean ?? fallback }
          : {}),
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

  if (body.quiz_type === "matching") {
    const validationError = validateMatchingRequest(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
  }

  const clampedCount = body.quiz_type === "matching"
    ? Math.min(clampQuizCount(requestedCount, dayWordCount), MATCHING_GAME_MAX_COUNT)
    : clampQuizCount(requestedCount, dayWordCount);
  const upstreamBody = body.quiz_type === "matching"
    ? buildMatchingRequest(body, clampedCount)
    : buildLegacyQuizRequest(body, clampedCount);
  const upstreamPath = body.quiz_type === "matching"
    ? "/v1/pop-quizzes/generate"
    : "/v1/quizzes/generate";

  const upstream = await fetch(buildVocabApiUrl(upstreamPath), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(upstreamBody),
  });

  const data = (await upstream.json()) as unknown;
  const normalizedData = normalizeMatchingQuiz(data, body);

  return NextResponse.json({
    ...(normalizedData && typeof normalizedData === "object" ? normalizedData : { data: normalizedData }),
    max_days: maxDays,
    max_count: dayWordCount,
    requested_count: requestedCount,
  }, {
    status: upstream.status,
  });
}
