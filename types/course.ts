import { normalizeCoursePath } from "@/lib/coursePath";

export type CourseId =
  | "CSAT"
  | "TOEFL_IELTS"
  | "TOEIC"
  | "JLPT"
  | "JLPT_N1"
  | "JLPT_N2"
  | "JLPT_N3"
  | "JLPT_N4"
  | "JLPT_N5"
  | "JLPT_PREFIX"
  | "JLPT_POSTFIX"
  | "JLPT_COUNTER"
  | "COLLOCATIONS"
  | "IDIOMS"
  | "FAMOUS_QUOTE";

export type CourseSchema = "standard" | "jlpt" | "collocation" | "idiom" | "famousQuote" | "prefix" | "postfix";
export type CourseStorageMode = "day" | "flat" | "singleList" | "collection";
export type SingleListSubcollectionName = "prefix" | "postfix";
export type JlptCounterOptionId =
  | "numbers"
  | "counter_tsuu"
  | "counter_ko"
  | "counter_kai_floor"
  | "counter_kai_times"
  | "counter_ban"
  | "counter_years"
  | "counter_months"
  | "counter_days"
  | "counter_hours"
  | "counter_minutes"
  | "counter_weekdays"
  | "counter_hai"
  | "counter_bai"
  | "counter_hon"
  | "counter_mai"
  | "counter_nin"
  | "counter_hiki"
  | "counter_ens";

export interface Course {
  id: CourseId;
  label: string;
  path: string;
  schema: CourseSchema;
  storageMode: CourseStorageMode;
  singleListSubcollection?: SingleListSubcollectionName;
}

export interface Day {
  id: string;
  name: string;
  wordCount?: number;
}

export interface JlptCounterOption {
  id: JlptCounterOptionId;
  label: string;
  path: string;
}

const JLPT_BASE_PATH =
  "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db";
const JLPT_PREFIX_PATH = `${JLPT_BASE_PATH}/prefix/XwuTuOsvngV6ZJ97RfP5`;
const JLPT_POSTFIX_PATH = `${JLPT_BASE_PATH}/postfix/nxvs4uhsrxb3myl4OwVi`;
const JLPT_COUNTER_PATH = normalizeCoursePath(
  process.env.NEXT_PUBLIC_JLPT_COUNTER_PATH,
);

export const JLPT_COUNTER_OPTIONS: JlptCounterOption[] = [
  {
    id: "numbers",
    label: "Numbers",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_NUMBERS_PATH),
  },
  {
    id: "counter_tsuu",
    label: "Counter Tsuu",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_TSUU_PATH),
  },
  {
    id: "counter_ko",
    label: "Counter Ko",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_KO_PATH),
  },
  {
    id: "counter_kai_floor",
    label: "Counter Kai Floor",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_KAI_FLOOR_PATH),
  },
  {
    id: "counter_kai_times",
    label: "Counter Kai Times",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_KAI_TIMES_PATH),
  },
  {
    id: "counter_ban",
    label: "Counter Ban",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_BAN_PATH),
  },
  {
    id: "counter_ens",
    label: "Counter ¥",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_ENS_PATH),
  },
  {
    id: "counter_years",
    label: "Counter Years",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_YEARS_PATH),
  },
  {
    id: "counter_months",
    label: "Counter Months",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_MONTHS_PATH),
  },
  {
    id: "counter_days",
    label: "Counter Days",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_DAYS_PATH),
  },
  {
    id: "counter_hours",
    label: "Counter Hours",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_HOURS_PATH),
  },
  {
    id: "counter_minutes",
    label: "Counter Minutes",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_MINUTES_PATH),
  },
  {
    id: "counter_weekdays",
    label: "Counter Weekdays",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_WEEKDAYS_PATH),
  },
  {
    id: "counter_hai",
    label: "Counter Hai",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_HAI_PATH),
  },
  {
    id: "counter_bai",
    label: "Counter Bai",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_BAI_PATH),
  },
  {
    id: "counter_hon",
    label: "Counter Hon",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_HON_PATH),
  },
  {
    id: "counter_mai",
    label: "Counter Mai",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_MAI_PATH),
  },
  {
    id: "counter_nin",
    label: "Counter Nin",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_NIN_PATH),
  },
  {
    id: "counter_hiki",
    label: "Counter Hiki",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_JLTP_COUNTER_COUNTER_HIKI_PATH),
  },
];

export const JLPT_LEVEL_COURSES: Course[] = [
  {
    id: "JLPT_N1",
    label: "N1",
    path: normalizeCoursePath(
      "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N1/xRl65Wx4UdpGJ8ZgHk4L",
    ),
    schema: "jlpt",
    storageMode: "day",
  },
  {
    id: "JLPT_N2",
    label: "N2",
    path: normalizeCoursePath(
      "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N2/ik93XYkp9DsdJ4t5T8sG",
    ),
    schema: "jlpt",
    storageMode: "day",
  },
  {
    id: "JLPT_N3",
    label: "N3",
    path: normalizeCoursePath(
      "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N3/8SMrbBhBe6QY6i12GI9Y",
    ),
    schema: "jlpt",
    storageMode: "day",
  },
  {
    id: "JLPT_N4",
    label: "N4",
    path: normalizeCoursePath(
      "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N4/LTlcb3WaGyMByGCesZDu",
    ),
    schema: "jlpt",
    storageMode: "day",
  },
  {
    id: "JLPT_N5",
    label: "N5",
    path: normalizeCoursePath(
      "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N5/doFKMQQhpwGETmpeQY7Z",
    ),
    schema: "jlpt",
    storageMode: "day",
  },
  {
    id: "JLPT_PREFIX",
    label: "Prefix",
    path: normalizeCoursePath(JLPT_PREFIX_PATH),
    schema: "prefix",
    storageMode: "singleList",
    singleListSubcollection: "prefix",
  },
  {
    id: "JLPT_POSTFIX",
    label: "Postfix",
    path: normalizeCoursePath(JLPT_POSTFIX_PATH),
    schema: "postfix",
    storageMode: "singleList",
    singleListSubcollection: "postfix",
  },
  {
    id: "JLPT_COUNTER",
    label: "Counters",
    path: JLPT_COUNTER_PATH,
    schema: "jlpt",
    storageMode: "collection",
  },
];

export const COURSES: Course[] = [
  {
    id: "CSAT",
    label: "CSAT",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_COURSE_PATH_CSAT),
    schema: "standard",
    storageMode: "day",
  },
  {
    id: "TOEFL_IELTS",
    label: "TOEFL / IELTS",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_COURSE_PATH_TOEFL_IELTS),
    schema: "standard",
    storageMode: "day",
  },
  {
    id: "TOEIC",
    label: "TOEIC",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_COURSE_PATH_TOEIC),
    schema: "standard",
    storageMode: "day",
  },
  {
    id: "JLPT",
    label: "JLPT",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_COURSE_PATH_JLPT),
    schema: "jlpt",
    storageMode: "day",
  },
  {
    id: "COLLOCATIONS",
    label: "Collocations",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_COURSE_PATH_COLLOCATION),
    schema: "collocation",
    storageMode: "day",
  },
  {
    id: "IDIOMS",
    label: "CSAT Idioms",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_COURSE_PATH_CSAT_IDIOMS),
    schema: "idiom",
    storageMode: "day",
  },
  {
    id: "FAMOUS_QUOTE",
    label: "Famous Quote",
    path: normalizeCoursePath(process.env.NEXT_PUBLIC_COURSE_PATH_FAMOUS_QUOTE),
    schema: "famousQuote",
    storageMode: "flat",
  },
];

export function getCourseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id) ?? JLPT_LEVEL_COURSES.find((c) => c.id === id);
}

export function isCollocationCourse(id: string): boolean {
  return getCourseById(id)?.schema === "collocation";
}

export function isIdiomCourse(id: string): boolean {
  return getCourseById(id)?.schema === "idiom";
}

export function isFamousQuoteCourse(id: string): boolean {
  return getCourseById(id)?.schema === "famousQuote";
}

export function isFlatCourse(id: string): boolean {
  return getCourseById(id)?.storageMode === "flat";
}

export function isSingleListCourse(id: string): boolean {
  return getCourseById(id)?.storageMode === "singleList";
}

export function isCollectionCourse(id: string): boolean {
  return getCourseById(id)?.storageMode === "collection";
}

export function getSingleListSubcollectionByCourseId(
  id: string,
): SingleListSubcollectionName | null {
  const course = getCourseById(id);
  if (course?.storageMode !== "singleList") return null;
  return course.singleListSubcollection ?? null;
}

export function getSingleListSubcollectionByCoursePath(
  coursePath: string,
): SingleListSubcollectionName | null {
  const normalizedPath = normalizeCoursePath(coursePath);
  if (!normalizedPath) return null;

  const course =
    COURSES.find((candidate) => candidate.path === normalizedPath) ??
    JLPT_LEVEL_COURSES.find((candidate) => candidate.path === normalizedPath);

  if (course?.storageMode !== "singleList") return null;
  return course.singleListSubcollection ?? null;
}

export function isJlptCourse(id: string): boolean {
  return getCourseById(id)?.schema === "jlpt";
}

export function isPrefixCourse(id: string): boolean {
  return getCourseById(id)?.schema === "prefix";
}

export function isPostfixCourse(id: string): boolean {
  return getCourseById(id)?.schema === "postfix";
}

export function getJlptCounterOptionById(
  id: JlptCounterOptionId,
): JlptCounterOption | undefined {
  return JLPT_COUNTER_OPTIONS.find((option) => option.id === id);
}

export function getJlptCounterOptionByPath(
  path: string,
): JlptCounterOption | undefined {
  const normalizedPath = normalizeCoursePath(path);
  return JLPT_COUNTER_OPTIONS.find((option) => option.path === normalizedPath);
}
