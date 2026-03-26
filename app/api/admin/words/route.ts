import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase/admin";
import { requireSingleListSubcollectionByCourseId } from "@/lib/courseStorage";
import {
  getCachedCourseResults,
  setCachedCourseResults,
} from "@/lib/server/wordCache";
import {
  compareWordFinderResults,
  matchesMissingField,
  matchesType,
  normalizeNullableWordFinderText,
  normalizeWordFinderSearchKey,
  normalizeWordFinderText,
} from "@/lib/server/wordFinderSearch";
import { verifySessionUser } from "@/lib/server/sessionUser";
import { COURSES, JLPT_LEVEL_COURSES, type Course } from "@/types/course";
import type {
  WordFinderMissingField,
  WordFinderResponse,
  WordFinderResult,
} from "@/types/wordFinder";

const MAX_RESULTS = 200;
const SEARCHABLE_COURSES = [...COURSES, ...JLPT_LEVEL_COURSES];

// ---------------------------------------------------------------------------
// Type-aware course selection
// ---------------------------------------------------------------------------

function filterCoursesByType(courses: Course[], type: string): Course[] {
  if (type === "all") return courses;
  if (type === "famousQuote") return courses.filter((c) => c.storageMode === "flat");
  if (type === "collocation")
    return courses.filter((c) => c.id === "COLLOCATIONS");
  // "standard" — everything except flat courses and COLLOCATIONS
  return courses.filter((c) => c.storageMode !== "flat" && c.id !== "COLLOCATIONS");
}

// ---------------------------------------------------------------------------
// Result builders
// ---------------------------------------------------------------------------

function buildCourseSourceHref(
  courseId: Course["id"],
  id: string,
  dayId?: string | null,
): string {
  return dayId ? `/courses/${courseId}/${dayId}#${id}` : `/courses/${courseId}#${id}`;
}

function createStandardResult(
  course: Course,
  dayId: string,
  id: string,
  data: Record<string, unknown>,
): WordFinderResult | null {
  const word = normalizeWordFinderText(data.word);
  const meaning = normalizeNullableWordFinderText(data.meaning);
  if (!word) return null;

  return {
    id,
    courseId: course.id,
    courseLabel: course.label,
    coursePath: course.path,
    schemaVariant: "standard",
    dayId,
    sourceHref: buildCourseSourceHref(course.id, id, dayId),
    type: "standard",
    primaryText: word,
    secondaryText: meaning,
    meaning,
    translation: normalizeNullableWordFinderText(data.translation),
    example: normalizeNullableWordFinderText(data.example),
    pronunciation: normalizeNullableWordFinderText(data.pronunciation),
    imageUrl: normalizeNullableWordFinderText(data.imageUrl),
    derivative: normalizeDerivativeEntries(data.derivative),
  };
}

function normalizeDerivativeEntries(
  value: unknown,
): Array<{ word: string; meaning: string }> | null {
  if (!Array.isArray(value)) return null;

  const derivatives = value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const word = normalizeWordFinderText(item.word);
    if (!word) return [];

    return [
      {
        word,
        meaning: normalizeWordFinderText(item.meaning),
      },
    ];
  });

  return derivatives;
}

function createJlptResult(
  course: Course,
  dayId: string,
  id: string,
  data: Record<string, unknown>,
): WordFinderResult | null {
  const word = normalizeWordFinderText(data.word);
  if (!word) return null;

  const meaningEnglish = normalizeNullableWordFinderText(data.meaningEnglish);
  const meaningKorean = normalizeNullableWordFinderText(data.meaningKorean);
  const translationEnglish = normalizeNullableWordFinderText(data.translationEnglish);
  const translationKorean = normalizeNullableWordFinderText(data.translationKorean);

  return {
    id,
    courseId: course.id,
    courseLabel: course.label,
    coursePath: course.path,
    schemaVariant: "jlpt",
    dayId,
    sourceHref: buildCourseSourceHref(course.id, id, dayId),
    type: "standard",
    primaryText: word,
    secondaryText: [meaningEnglish, meaningKorean].filter(Boolean).join(" / ") || null,
    meaning: [meaningEnglish, meaningKorean].filter(Boolean).join(" / ") || null,
    meaningEnglish,
    meaningKorean,
    translation: [translationEnglish, translationKorean].filter(Boolean).join(" / ") || null,
    translationEnglish,
    translationKorean,
    example: normalizeNullableWordFinderText(data.example),
    pronunciation: normalizeNullableWordFinderText(data.pronunciation),
    pronunciationRoman: normalizeNullableWordFinderText(data.pronunciationRoman),
    exampleRoman: normalizeNullableWordFinderText(data.exampleRoman),
    imageUrl: normalizeNullableWordFinderText(data.imageUrl),
  };
}

function createCollocationResult(
  course: Course,
  dayId: string,
  id: string,
  data: Record<string, unknown>,
): WordFinderResult | null {
  const collocation = normalizeWordFinderText(data.collocation);
  if (!collocation) return null;

  return {
    id,
    courseId: course.id,
    courseLabel: course.label,
    coursePath: course.path,
    schemaVariant: "collocation",
    dayId,
    sourceHref: buildCourseSourceHref(course.id, id, dayId),
    type: "collocation",
    primaryText: collocation,
    secondaryText: normalizeNullableWordFinderText(data.explanation),
    meaning: normalizeNullableWordFinderText(data.meaning),
    translation: normalizeNullableWordFinderText(data.translation),
    example: normalizeNullableWordFinderText(data.example),
    pronunciation: null,
    imageUrl: normalizeNullableWordFinderText(data.imageUrl),
  };
}


function createFamousQuoteResult(
  course: Course,
  id: string,
  data: Record<string, unknown>,
): WordFinderResult | null {
  const quote = normalizeWordFinderText(data.quote);
  if (!quote) return null;

  return {
    id,
    courseId: course.id,
    courseLabel: course.label,
    coursePath: course.path,
    schemaVariant: "famousQuote",
    dayId: null,
    sourceHref: buildCourseSourceHref(course.id, id),
    type: "famousQuote",
    primaryText: quote,
    secondaryText: normalizeNullableWordFinderText(data.author),
    meaning: null,
    translation: normalizeNullableWordFinderText(data.translation),
    example: null,
    pronunciation: null,
    imageUrl: null,
  };
}

function createPrefixResult(
  course: Course,
  id: string,
  data: Record<string, unknown>,
): WordFinderResult | null {
  const prefix = normalizeWordFinderText(data.prefix);
  if (!prefix) return null;

  const meaningEnglish = normalizeNullableWordFinderText(data.meaningEnglish);
  const meaningKorean = normalizeNullableWordFinderText(data.meaningKorean);
  const translationEnglish = normalizeNullableWordFinderText(data.translationEnglish);
  const translationKorean = normalizeNullableWordFinderText(data.translationKorean);

  return {
    id,
    courseId: course.id,
    courseLabel: course.label,
    coursePath: course.path,
    schemaVariant: "prefix",
    dayId: null,
    sourceHref: buildCourseSourceHref(course.id, id),
    type: "standard",
    primaryText: prefix,
    secondaryText: [meaningEnglish, meaningKorean].filter(Boolean).join(" / ") || null,
    meaning: [meaningEnglish, meaningKorean].filter(Boolean).join(" / ") || null,
    meaningEnglish,
    meaningKorean,
    translation: [translationEnglish, translationKorean].filter(Boolean).join(" / ") || null,
    translationEnglish,
    translationKorean,
    example: normalizeNullableWordFinderText(data.example),
    exampleRoman: normalizeNullableWordFinderText(data.exampleRoman),
    pronunciation: normalizeNullableWordFinderText(data.pronunciation),
    pronunciationRoman: normalizeNullableWordFinderText(data.pronunciationRoman),
    imageUrl: null,
    prefix,
  };
}

function createPostfixResult(
  course: Course,
  id: string,
  data: Record<string, unknown>,
): WordFinderResult | null {
  const postfix = normalizeWordFinderText(data.postfix);
  if (!postfix) return null;

  const meaningEnglish = normalizeNullableWordFinderText(data.meaningEnglish);
  const meaningKorean = normalizeNullableWordFinderText(data.meaningKorean);
  const translationEnglish = normalizeNullableWordFinderText(data.translationEnglish);
  const translationKorean = normalizeNullableWordFinderText(data.translationKorean);

  return {
    id,
    courseId: course.id,
    courseLabel: course.label,
    coursePath: course.path,
    schemaVariant: "postfix",
    dayId: null,
    sourceHref: buildCourseSourceHref(course.id, id),
    type: "standard",
    primaryText: postfix,
    secondaryText: [meaningEnglish, meaningKorean].filter(Boolean).join(" / ") || null,
    meaning: [meaningEnglish, meaningKorean].filter(Boolean).join(" / ") || null,
    meaningEnglish,
    meaningKorean,
    translation: [translationEnglish, translationKorean].filter(Boolean).join(" / ") || null,
    translationEnglish,
    translationKorean,
    example: normalizeNullableWordFinderText(data.example),
    exampleRoman: normalizeNullableWordFinderText(data.exampleRoman),
    pronunciation: normalizeNullableWordFinderText(data.pronunciation),
    pronunciationRoman: normalizeNullableWordFinderText(data.pronunciationRoman),
    imageUrl: null,
    postfix,
  };
}

// ---------------------------------------------------------------------------
// Firestore fetching (parallel day reads)
// ---------------------------------------------------------------------------

async function getCourseResults(course: Course): Promise<WordFinderResult[]> {
  if (!course.path) return [];

  if (course.storageMode === "flat") {
    const snapshot = await adminDb.collection(course.path).get();
    return snapshot.docs
      .map((doc) =>
        createFamousQuoteResult(
          course,
          doc.id,
          doc.data() as Record<string, unknown>,
        ),
      )
      .filter((result): result is WordFinderResult => Boolean(result));
  }

  if (course.storageMode === "singleList") {
    const subcollectionName = requireSingleListSubcollectionByCourseId(course.id);
    const snapshot = await adminDb
      .doc(course.path)
      .collection(subcollectionName)
      .get();

    return snapshot.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        if (course.schema === "prefix") {
          return createPrefixResult(course, doc.id, data);
        }
        if (course.schema === "postfix") {
          return createPostfixResult(course, doc.id, data);
        }
        return null;
      })
      .filter((result): result is WordFinderResult => Boolean(result));
  }

  const courseDoc = await adminDb.doc(course.path).get();
  const totalDays = Number(courseDoc.data()?.totalDays ?? 0);
  if (!Number.isFinite(totalDays) || totalDays <= 0) {
    return [];
  }

  // Fetch all days in parallel instead of sequentially
  const dayPromises = Array.from({ length: totalDays }, (_, i) => {
    const dayId = `Day${i + 1}`;
    return adminDb
      .doc(course.path)
      .collection(dayId)
      .get()
      .then((snapshot) => {
        const dayResults: WordFinderResult[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as Record<string, unknown>;
          const result =
            course.schema === "collocation"
              ? createCollocationResult(course, dayId, doc.id, data)
              : course.schema === "jlpt"
                ? createJlptResult(course, dayId, doc.id, data)
              : createStandardResult(course, dayId, doc.id, data);
          if (result) dayResults.push(result);
        });
        return dayResults;
      });
  });

  const allDayResults = await Promise.all(dayPromises);
  return allDayResults.flat();
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const caller = await verifySessionUser(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (caller.role !== "admin" && caller.role !== "super-admin") {
    return NextResponse.json(
      { error: "Insufficient permissions" },
      { status: 403 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const query = normalizeWordFinderSearchKey(searchParams.get("q"));
  const courseId = normalizeWordFinderText(searchParams.get("courseId")) || "all";
  const type = normalizeWordFinderText(searchParams.get("type")) || "all";
  const missingField =
    (normalizeWordFinderText(
      searchParams.get("missingField"),
    ) as WordFinderMissingField) || "all";

  try {
    // Select courses based on courseId param, then narrow by type
    let selectedCourses =
      courseId === "all"
        ? SEARCHABLE_COURSES.filter((course) => Boolean(course.path))
        : SEARCHABLE_COURSES.filter(
            (course) => course.id === courseId && Boolean(course.path),
          );

    selectedCourses = filterCoursesByType(selectedCourses, type);

    // Fetch with caching
    const courseResults = await Promise.all(
      selectedCourses.map(async (course) => {
        const cached = getCachedCourseResults(course.id);
        if (cached) return cached;
        const results = await getCourseResults(course);
        return setCachedCourseResults(course.id, results);
      }),
    );

    const filteredResults = courseResults
      .flatMap((courseResult) =>
        query
          ? courseResult.exactPrimaryTextIndex.get(query) ?? []
          : courseResult.results,
      )
      .filter((result) => matchesType(result, type))
      .filter((result) => matchesMissingField(result, missingField))
      .sort(compareWordFinderResults);

    const response: WordFinderResponse = {
      ok: true,
      results: filteredResults.slice(0, MAX_RESULTS),
      total: filteredResults.length,
      limited: filteredResults.length > MAX_RESULTS,
    };

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      { error: "Failed to search words" },
      { status: 500 },
    );
  }
}
