/**
 * Returns the first `maxChars` characters of `text` with a trailing ellipsis
 * when the text is truncated, or the full text when it fits.
 */
export function snippet(text: string, maxChars: number): string {
  if (!text || maxChars <= 0) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}
