import { NextRequest, NextResponse } from "next/server";

import {
  countQuizDayWords,
  getQuizCourseTotalDays,
} from "@/lib/server/quizGeneration";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const course = searchParams.get("course");
  const level = searchParams.get("level");
  const day = searchParams.get("day");

  try {
    const result = await countQuizDayWords({
      course,
      level,
      day,
    });

    return NextResponse.json({
      course_id: result.course.id,
      day: result.day,
      max_days: result.maxDays,
      max_count: result.count,
    });
  } catch (error) {
    try {
      const result = await getQuizCourseTotalDays({ course, level });
      return NextResponse.json(
        {
          course_id: result.course.id,
          max_days: result.totalDays,
          max_count: 0,
          error:
            error instanceof Error
              ? error.message
              : "Failed to resolve quiz word count.",
        },
        { status: 400 },
      );
    } catch {
      // Fall through to the generic error response below.
    }

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
}
