import { prisma } from '../config/prisma';
import { documentService } from './document.service';

export interface RetrievedContext {
  chapterId?: string;
  chapterTitle?: string;
  relevantText: string;
  score: number;
}

export class RetrievalService {
  /**
   * Select relevant context from a book given a user question/query
   */
  /**
   * Page-referenced passages for Q&A. Uses only this book's content blocks
   * (extracted text or OCR). Returns [] when the book has no text — never the
   * title or description. Ranked by query-term overlap (works for any
   * Latin-script language), capped at ~`maxChars` characters.
   */
  async retrievePagePassages(bookId: string, query: string, maxChars = 9000): Promise<{ pageNumber: number; text: string }[]> {
    const blocks = await prisma.contentBlock.findMany({
      where: { chapter: { bookId } },
      select: { text: true, pageNumber: true },
      orderBy: [{ pageNumber: 'asc' }, { blockIndex: 'asc' }]
    });
    const usable = blocks.filter((b) => (b.text || '').trim().length > 0);
    if (usable.length === 0) return [];

    const tokens = Array.from(
      new Set(
        query
          .toLowerCase()
          .normalize('NFKD')
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter((t) => t.length > 2)
      )
    );

    const scored = usable.map((b, idx) => {
      const lower = b.text.toLowerCase();
      const score = tokens.reduce((s, t) => s + (lower.split(t).length - 1), 0);
      return { idx, score, pageNumber: b.pageNumber, text: b.text };
    });
    const ranked = scored.some((s) => s.score > 0)
      ? scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score)
      : scored; // no keyword match: give the model the opening pages instead of nothing

    const picked: typeof ranked = [];
    let used = 0;
    for (const s of ranked) {
      const text = s.text.length > 2500 ? s.text.slice(0, 2500) : s.text;
      if (used + text.length > maxChars && picked.length > 0) break;
      picked.push({ ...s, text });
      used += text.length;
    }
    return picked.sort((a, b) => a.pageNumber - b.pageNumber || a.idx - b.idx).map(({ pageNumber, text }) => ({ pageNumber, text }));
  }

  async retrieveContextForQuery(bookId: string, query: string, maxTokensApprox = 3000): Promise<string> {
    const chapters = await prisma.chapter.findMany({
      where: { bookId },
      include: {
        contentBlocks: {
          select: { text: true },
          orderBy: { blockIndex: 'asc' }
        }
      },
      orderBy: { chapterNumber: 'asc' }
    });

    if (chapters.length === 0) {
      const book = await prisma.book.findUnique({ where: { id: bookId } });
      return book ? `${book.title} by ${book.author}.\nDescription: ${book.description}` : '';
    }

    // Tokenize query words
    const queryTokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scoredSnippets: RetrievedContext[] = [];

    for (const chapter of chapters) {
      const chapterText = chapter.contentBlocks.map((b) => b.text).join('\n\n') || chapter.title;
      // Chunk each chapter
      const chunks = documentService.chunkText(chapterText, 500, 100);

      chunks.forEach((chunk) => {
        const lowerChunk = chunk.toLowerCase();
        let matchScore = 0;

        queryTokens.forEach((token) => {
          const occurrences = (lowerChunk.match(new RegExp(`\\b${token}\\b`, 'g')) || []).length;
          matchScore += occurrences * 2;
          if (lowerChunk.includes(token)) {
            matchScore += 1;
          }
        });

        // Boost score if chapter title matches query
        const titleTokens = chapter.title.toLowerCase().split(/\s+/);
        queryTokens.forEach((qt) => {
          if (titleTokens.includes(qt)) {
            matchScore += 5;
          }
        });

        scoredSnippets.push({
          chapterId: chapter.id,
          chapterTitle: `Chapter ${chapter.chapterNumber}: ${chapter.title}`,
          relevantText: chunk,
          score: matchScore
        });
      });
    }

    // Sort by highest relevance score
    scoredSnippets.sort((a, b) => b.score - a.score);

    // Pick top relevant snippets up to token/word budget
    let totalWords = 0;
    const maxWords = Math.floor(maxTokensApprox * 0.75); // ~2200 words
    const selectedSnippets: string[] = [];

    for (const item of scoredSnippets) {
      const wordsInItem = item.relevantText.split(/\s+/).length;
      if (totalWords + wordsInItem > maxWords && selectedSnippets.length > 0) {
        break;
      }
      selectedSnippets.push(`[Source: ${item.chapterTitle}]\n${item.relevantText}`);
      totalWords += wordsInItem;
    }

    // Fallback if no specific keywords matched: provide first chapter
    if (selectedSnippets.length === 0) {
      const firstCh = chapters[0];
      const firstText = firstCh.contentBlocks.map((b) => b.text).join('\n\n') || firstCh.title;
      return `[Source: Chapter ${firstCh.chapterNumber}: ${firstCh.title}]\n${firstText.slice(0, 3000)}`;
    }

    return selectedSnippets.join('\n\n---\n\n');
  }

  /**
   * Retrieve structured chapter context
   */
  async getChapterContext(chapterId: string): Promise<string> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        book: true,
        contentBlocks: {
          select: { text: true },
          orderBy: { blockIndex: 'asc' }
        }
      }
    });

    if (!chapter) return '';

    const text = chapter.contentBlocks.map((b) => b.text).join('\n\n');
    return `Book: ${chapter.book.title} by ${chapter.book.author}\nChapter ${chapter.chapterNumber}: ${chapter.title}\n\n${text}`;
  }
}

export const retrievalService = new RetrievalService();
