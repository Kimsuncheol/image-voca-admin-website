import type { WordFinderResult } from "../../types/wordFinder.ts";

import { buildPrimaryTextExactMatchIndex } from "./wordFinderSearch.ts";

export interface CachedCourseResults {
  results: WordFinderResult[];
  exactPrimaryTextIndex: ReadonlyMap<string, WordFinderResult[]>;
}

interface CacheEntry extends CachedCourseResults {
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const courseCache = new Map<string, CacheEntry>();

export function getCachedCourseResults(
  courseId: string,
): CachedCourseResults | null {
  const entry = courseCache.get(courseId);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    courseCache.delete(courseId);
    return null;
  }
  return {
    results: entry.results,
    exactPrimaryTextIndex: entry.exactPrimaryTextIndex,
  };
}

export function setCachedCourseResults(
  courseId: string,
  results: WordFinderResult[],
): CachedCourseResults {
  const cachedResults: CachedCourseResults = {
    results,
    exactPrimaryTextIndex: buildPrimaryTextExactMatchIndex(results),
  };

  courseCache.set(courseId, {
    ...cachedResults,
    fetchedAt: Date.now(),
  });

  return cachedResults;
}

export function invalidateCourseCache(courseId?: string): void {
  if (courseId) {
    courseCache.delete(courseId);
  } else {
    courseCache.clear();
  }
}
