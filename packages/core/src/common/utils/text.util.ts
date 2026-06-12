/**
 * Returns the first `maxChars` characters of `text` with a trailing ellipsis
 * when the text is truncated, or the full text when it fits.
 */
export function snippet(text: string, maxChars: number): string {
  if (!text || maxChars <= 0) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text;
}

const CONVERSATION_TITLE_MAX = 255;

/** Derives a short conversation label from the first user message. */
export function conversationTitleFromContent(content: string): string {
  const normalized = content.trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  return normalized.length > CONVERSATION_TITLE_MAX
    ? `${normalized.slice(0, CONVERSATION_TITLE_MAX - 1)}…`
    : normalized;
}
