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
  async retrieveContextForQuery(bookId: string, query: string, maxTokensApprox = 3000): Promise<string> {
    const chapters = await prisma.chapter.findMany({
      where: { bookId },
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
      // Chunk each chapter
      const chunks = documentService.chunkText(chapter.content, 500, 100);

      chunks.forEach((chunk) => {
        const lowerChunk = chunk.toLowerCase();
        let matchScore = 0;

        queryTokens.forEach((token) => {
          // Count occurrences
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

    // Fallback if no specific keywords matched: provide book overview & first chapter
    if (selectedSnippets.length === 0) {
      const firstCh = chapters[0];
      return `[Source: Chapter ${firstCh.chapterNumber}: ${firstCh.title}]\n${firstCh.content.slice(0, 3000)}`;
    }

    return selectedSnippets.join('\n\n---\n\n');
  }

  /**
   * Retrieve structured chapter context
   */
  async getChapterContext(chapterId: string): Promise<string> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { book: true }
    });

    if (!chapter) return '';

    return `Book: ${chapter.book.title} by ${chapter.book.author}\nChapter ${chapter.chapterNumber}: ${chapter.title}\n\n${chapter.content}`;
  }
}

export const retrievalService = new RetrievalService();
