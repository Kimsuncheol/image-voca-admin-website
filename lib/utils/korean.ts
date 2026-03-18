const KOREAN_REGEX = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/;

export function containsKorean(text: string | undefined | null): boolean {
  if (!text) return false;
  return KOREAN_REGEX.test(text);
}
