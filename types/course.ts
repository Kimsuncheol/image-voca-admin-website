export type CourseId = 'CSAT' | 'IELTS' | 'TOEFL' | 'TOEIC' | 'COLLOCATIONS';

export interface Course {
  id: CourseId;
  label: string;
  path: string;
}

export interface Day {
  id: string;
  name: string;
  wordCount?: number;
}

export const COURSES: Course[] = [
  { id: 'CSAT', label: 'CSAT', path: process.env.NEXT_PUBLIC_COURSE_PATH_CSAT || '' },
  { id: 'IELTS', label: 'IELTS', path: process.env.NEXT_PUBLIC_COURSE_PATH_IELTS || '' },
  { id: 'TOEFL', label: 'TOEFL', path: process.env.NEXT_PUBLIC_COURSE_PATH_TOEFL || '' },
  { id: 'TOEIC', label: 'TOEIC', path: process.env.NEXT_PUBLIC_COURSE_PATH_TOEIC || '' },
  { id: 'COLLOCATIONS', label: 'Collocations', path: process.env.NEXT_PUBLIC_COURSE_PATH_COLLOCATION || '' },
];

export function getCourseById(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}
