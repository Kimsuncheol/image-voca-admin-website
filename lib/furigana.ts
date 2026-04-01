export function hasParentheticalFurigana(
  value: string | null | undefined,
): boolean {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  return trimmed.includes("(") && trimmed.includes(")");
}
