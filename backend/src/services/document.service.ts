import fs from 'fs';
import pdfParse from 'pdf-parse';

export interface ExtractedChapter {
  title: string;
  chapterNumber: number;
  content: string;
  readingTime?: string;
  summary?: string;
}

export interface ExtractedDocument {
  title: string;
  totalPages: number;
  fullText: string;
  chapters: ExtractedChapter[];
}

export class DocumentService {
  /**
   * Parse PDF file and extract text and approximate chapters
   */
  async parsePdf(filePath: string, originalName: string): Promise<ExtractedDocument> {
    const dataBuffer = await fs.promises.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);

    const totalPages = pdfData.numpages || 1;
    const fullText = pdfData.text || '';
    const cleanTitle = originalName.replace(/\.(pdf|epub)$/i, '').replace(/_/g, ' ');

    const chapters = this.splitIntoChapters(fullText, cleanTitle);

    return {
      title: cleanTitle,
      totalPages,
      fullText,
      chapters
    };
  }

  /**
   * Parse EPUB or generic document
   */
  async parseEpub(filePath: string, originalName: string): Promise<ExtractedDocument> {
    const cleanTitle = originalName.replace(/\.(pdf|epub)$/i, '').replace(/_/g, ' ');
    // Read raw buffer or text
    let fullText = '';
    try {
      fullText = await fs.promises.readFile(filePath, 'utf-8');
    } catch {
      fullText = `Uploaded EPUB content for ${cleanTitle}`;
    }

    const chapters = this.splitIntoChapters(fullText, cleanTitle);

    return {
      title: cleanTitle,
      totalPages: Math.max(20, Math.ceil(fullText.split(/\s+/).length / 250)),
      fullText,
      chapters
    };
  }

  /**
   * Split book text into logical chapters by headings or size
   */
  splitIntoChapters(text: string, defaultTitle: string): ExtractedChapter[] {
    if (!text || text.trim().length === 0) {
      return [
        {
          chapterNumber: 1,
          title: 'Introduction & Core Themes',
          content: `Welcome to "${defaultTitle}". This document was uploaded for peaceful reading and AI analysis in Elunè.`,
          readingTime: '10 mins',
          summary: 'Overview and opening concepts.'
        }
      ];
    }

    // Try splitting by Chapter regex
    const chapterRegex = /(?:^|\n)(?:Chapter\s+(\d+|[IVXLCDM]+)|CHAPTER\s+(\d+|[IVXLCDM]+)|Bab\s+(\d+))[:\s.-]*(.*?)(?=\n|$)/gi;
    const matches: { index: number; title: string; number: number }[] = [];

    let match;
    let autoNum = 1;
    while ((match = chapterRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        title: (match[4] && match[4].trim()) ? match[4].trim() : `Chapter ${autoNum}`,
        number: autoNum++
      });
      if (matches.length > 50) break; // guard
    }

    if (matches.length >= 2) {
      const chapters: ExtractedChapter[] = [];
      for (let i = 0; i < matches.length; i++) {
        const start = matches[i].index;
        const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
        const chapterContent = text.substring(start, end).trim();
        const wordCount = chapterContent.split(/\s+/).length;
        const readingMins = Math.max(5, Math.ceil(wordCount / 200));

        chapters.push({
          chapterNumber: matches[i].number,
          title: matches[i].title,
          content: chapterContent.slice(0, 15000), // safe limit per chapter
          readingTime: `${readingMins} mins`,
          summary: chapterContent.slice(0, 200) + '...'
        });
      }
      return chapters;
    }

    // If no chapter headers found, partition text into digestible 1500-word chapters
    const words = text.split(/\s+/);
    const wordsPerChapter = 1200;
    const totalChapters = Math.min(10, Math.max(1, Math.ceil(words.length / wordsPerChapter)));

    const chapters: ExtractedChapter[] = [];
    for (let c = 0; c < totalChapters; c++) {
      const start = c * wordsPerChapter;
      const end = Math.min(words.length, (c + 1) * wordsPerChapter);
      const chapterContent = words.slice(start, end).join(' ');
      const readingMins = Math.max(5, Math.ceil((end - start) / 200));

      chapters.push({
        chapterNumber: c + 1,
        title: c === 0 ? 'Introduction and Key Themes' : `Section ${c + 1}: Continuing Insights`,
        content: chapterContent,
        readingTime: `${readingMins} mins`,
        summary: chapterContent.slice(0, 220) + '...'
      });
    }

    return chapters;
  }

  /**
   * Split content into overlapping chunks for semantic retrieval / RAG
   */
  chunkText(text: string, chunkSize = 800, overlap = 150): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    if (words.length <= chunkSize) {
      return [text];
    }

    let i = 0;
    while (i < words.length) {
      const chunkWords = words.slice(i, i + chunkSize);
      chunks.push(chunkWords.join(' '));
      i += chunkSize - overlap;
      if (chunks.length > 100) break; // safety limit
    }

    return chunks;
  }
}

export const documentService = new DocumentService();
