/**
 * Normalize AI endpoint payloads. The real backend and the demo mock return
 * different shapes; consumers must handle both instead of silently rendering
 * nothing. Pure functions (unit-tested in Node).
 *
 * Real backend:
 *   POST /api/ai/summarize/book/:id     -> data = { quickOverview, mainIdeas[], keyTakeaways[], importantConcepts[] }
 *   POST /api/ai/summarize/chapter/:id  -> data = { summary: string, keyPoints[] }
 *   POST /api/ai/ask/:id                -> data = { question, answer }
 * Demo mock:
 *   summaries -> data = { summary: { content } }, ask -> data = { chat: { answer } }
 */

const bullets = (items: unknown, label: string): string => {
  if (!Array.isArray(items)) return '';
  const lines = items
    .map((i: any) => (typeof i === 'string' ? i : i?.title ? `${i.title}: ${i.explanation ?? ''}` : ''))
    .map((s) => s.trim())
    .filter(Boolean);
  return lines.length ? `\n\n${label}\n${lines.map((l) => `• ${l}`).join('\n')}` : '';
};

/** Displayable summary text, or null when the payload contains no summary. */
export function summaryTextFromResponse(data: any): string | null {
  if (!data) return null;
  if (typeof data.summary?.content === 'string' && data.summary.content.trim()) return data.summary.content;
  if (typeof data.summary === 'string' && data.summary.trim()) {
    return `${data.summary.trim()}${bullets(data.keyPoints, 'Key points')}`;
  }
  const book = data.summary && typeof data.summary === 'object' ? data.summary : data;
  if (typeof book.quickOverview === 'string' && book.quickOverview.trim()) {
    return (
      book.quickOverview.trim() +
      bullets(book.mainIdeas, 'Main ideas') +
      bullets(book.keyTakeaways, 'Key takeaways') +
      bullets(book.importantConcepts, 'Important concepts')
    );
  }
  return null;
}

/** Answer text from an ask response, or null. */
export function answerFromResponse(data: any): string | null {
  const answer = data?.chat?.answer ?? data?.answer;
  return typeof answer === 'string' && answer.trim() ? answer : null;
}
