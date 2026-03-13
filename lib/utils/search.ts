/**
 * Shared search utilities for multi-token matching.
 * Used by both server (API routes) and client (components).
 */

/**
 * Tokenizes a search query by whitespace.
 * Returns lowercase tokens with empty strings filtered out.
 */
export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Returns true if ALL tokens appear somewhere in the text (AND semantics).
 * Handles single-token case identically to `.includes()` behavior.
 */
export function matchesAllTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const lower = text.toLowerCase();
  return tokens.every((token) => lower.includes(token));
}
