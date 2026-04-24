/**
 * Inserts a line break before each numbered list item (` 2.`, ` 3.`, etc.)
 * so that `1. foo 2. bar` renders as two separate lines.
 * The leading `1.` at the start of the string is unaffected.
 */
export function insertNumberedBreaks(text: string): string {
  return (text ?? "").replace(/ (\d+\.)/g, "\n$1");
}

export function capitalizeFirstCharacter(value?: string | null): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}
