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
  | "COLLOCATIONS"
  | "FAMOUS_QUOTE";

export type CourseSchema = "standard" | "jlpt" | "collocation" | "famousQuote" | "prefix" | "postfix";

export interface Course {
  id: CourseId;
  label: string;
  path: string;
  schema: CourseSchema;
  /**
   * When true the course has no DayN subcollections.
   * Words / quotes live directly inside the collection root.
   */
  flat?: true;
}

export interface Day {
  id: string;
  name: string;
  wordCount?: number;
}

export const JLPT_LEVEL_COURSES: Course[] = [
  {
    id: "JLPT_N1",
    label: "N1",
    path: "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N1/xRl65Wx4UdpGJ8ZgHk4L",
    schema: "jlpt",
  },
  {
    id: "JLPT_N2",
    label: "N2",
    path: "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N2/ik93XYkp9DsdJ4t5T8sG",
    schema: "jlpt",
  },
  {
    id: "JLPT_N3",
    label: "N3",
    path: "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N3/8SMrbBhBe6QY6i12GI9Y",
    schema: "jlpt",
  },
  {
    id: "JLPT_N4",
    label: "N4",
    path: "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N4/LTlcb3WaGyMByGCesZDu",
    schema: "jlpt",
  },
  {
    id: "JLPT_N5",
    label: "N5",
    path: "voca/pdw9crwerFb2qGFltJJY/course/BKQz1pqPyizbHzi1RxKK/JLPT/xOVnfByLiMVAv40e29db/N5/doFKMQQhpwGETmpeQY7Z",
    schema: "jlpt",
  },
  {
    id: "JLPT_PREFIX",
    label: "Prefix",
    path: process.env.NEXT_PUBLIC_COURSE_PATH_JLPT_PREFIX || "",
    schema: "prefix",
  },
  {
    id: "JLPT_POSTFIX",
    label: "Postfix",
    path: process.env.NEXT_PUBLIC_COURSE_PATH_JLPT_POSTFIX || "",
    schema: "postfix",
  },
];

export const COURSES: Course[] = [
  {
    id: "CSAT",
    label: "CSAT",
    path: process.env.NEXT_PUBLIC_COURSE_PATH_CSAT || "",
    schema: "standard",
  },
  {
    id: "TOEFL_IELTS",
    label: "TOEFL / IELTS",
    path: process.env.NEXT_PUBLIC_COURSE_PATH_TOEFL_IELTS || "",
    schema: "standard",
  },
  {
    id: "TOEIC",
    label: "TOEIC",
    path: process.env.NEXT_PUBLIC_COURSE_PATH_TOEIC || "",
    schema: "standard",
  },
  {
    id: "JLPT",
    label: "JLPT",
    path: process.env.NEXT_PUBLIC_COURSE_PATH_JLPT || "",
    schema: "jlpt",
  },
  {
    id: "COLLOCATIONS",
    label: "Collocations",
    path: process.env.NEXT_PUBLIC_COURSE_PATH_COLLOCATION || "",
    schema: "collocation",
  },
  {
    id: "FAMOUS_QUOTE",
    label: "Famous Quote",
    path: process.env.NEXT_PUBLIC_COURSE_PATH_FAMOUS_QUOTE || "",
    schema: "famousQuote",
    flat: true,
  },
];

export function getCourseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id) ?? JLPT_LEVEL_COURSES.find((c) => c.id === id);
}

export function isCollocationCourse(id: string): boolean {
  return getCourseById(id)?.schema === "collocation";
}

export function isFamousQuoteCourse(id: string): boolean {
  return getCourseById(id)?.schema === "famousQuote";
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
