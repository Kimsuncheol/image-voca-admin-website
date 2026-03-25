export function normalizeCoursePath(path: string | null | undefined): string {
  if (!path) return "";
  return path.trim().replace(/^\/+/, "");
}
