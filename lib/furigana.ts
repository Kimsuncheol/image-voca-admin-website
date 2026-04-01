export function hasParentheticalFurigana(
  value: string | null | undefined,
): boolean {
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (!trimmed) return false;

  return trimmed.includes("(") && trimmed.includes(")");
}

export function hasKanji(
  value: string | null | undefined,
): boolean {
  if (typeof value !== "string") return false;

  return /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF々〆]/.test(value);
}
