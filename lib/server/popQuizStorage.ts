import "server-only";

export type PopQuizLanguage = "english" | "japanese";
type PopQuizStorageData = Record<string, unknown> | undefined;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? value as Record<string, unknown> : undefined;
}

export function getPopQuizCollectionPath(language: unknown): string | null {
  if (language === "english") return process.env.NEXT_PUBLIC_POP_QUIZ_ENGLISH ?? null;
  if (language === "japanese") return process.env.NEXT_PUBLIC_POP_QUIZ_JAPANESE ?? null;
  return null;
}

export function getPopQuizDayFieldPath({
  language,
  course,
  level,
  day,
}: {
  language: string | null;
  course: string | null;
  level: string | null;
  day: number;
}): string | null {
  if (language === "english" && course && course !== "JLPT") {
    return `courses.${course}.days.${day}`;
  }

  if (language === "japanese" && level) {
    return `levels.${level}.days.${day}`;
  }

  return null;
}

export function buildPopQuizDayMergePayload(
  fieldPath: string,
  quiz: Record<string, unknown>,
): Record<string, unknown> {
  return fieldPath
    .split(".")
    .reverse()
    .reduce<Record<string, unknown>>(
      (value, key) => ({ [key]: value }),
      quiz,
    );
}

export function getPopQuizSavedDays(
  data: PopQuizStorageData,
  language: string | null,
  course: string | null,
  level: string | null,
): number[] {
  const root = asRecord(data);
  const parent = language === "japanese"
    ? asRecord(asRecord(root?.levels)?.[level ?? ""])
    : asRecord(asRecord(root?.courses)?.[course ?? ""]);
  const days = asRecord(parent?.days);

  if (!days) return [];

  return Object.keys(days)
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day > 0)
    .sort((a, b) => a - b);
}

export function getPopQuizDayData(
  data: PopQuizStorageData,
  language: string | null,
  course: string | null,
  level: string | null,
  day: number,
): Record<string, unknown> | null {
  const root = asRecord(data);
  const parent = language === "japanese"
    ? asRecord(asRecord(root?.levels)?.[level ?? ""])
    : asRecord(asRecord(root?.courses)?.[course ?? ""]);
  const quiz = asRecord(asRecord(parent?.days)?.[String(day)]);

  return quiz ?? null;
}
