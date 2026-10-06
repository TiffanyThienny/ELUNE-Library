import fs from 'fs';
import pdfParse from 'pdf-parse';

export interface ExtractedBlock {
  blockIndex: number;
  type: 'PARAGRAPH' | 'HEADING';
  text: string;
  pageNumber: number;
  startOffset: number;
  endOffset: number;
}

export interface ExtractedChapter {
  title: string;
  chapterNumber: number;
  contentBlocks: ExtractedBlock[];
  readingTime?: string;
  summary?: string;
}

export interface ExtractedDocument {
  title: string;
  totalPages: number;
  fullText: string;
  isScannedOrEmpty: boolean;
  chapters: ExtractedChapter[];
}

export class DocumentService {
  /**
   * Parse PDF file with precise per-page text extraction and canonical content blocks
   */
  async parsePdf(filePath: string, originalName: string): Promise<ExtractedDocument> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file does not exist at ${filePath}`);
    }

    const dataBuffer = await fs.promises.readFile(filePath);

    // Validate PDF magic bytes (%PDF-)
    const header = dataBuffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF')) {
      throw new Error('Unable to read this PDF file. Invalid file header or corrupted document.');
    }

    const pageTexts: { pageNumber: number; text: string }[] = [];
    let pageCounter = 0;

    // Custom pagerender to capture text page-by-page
    const renderPage = (pageData: any) => {
      pageCounter++;
      const curPageNum = pageCounter;

      return pageData.getTextContent({ normalizeWhitespace: true }).then((textContent: any) => {
        const textItems: string[] = [];
        let lastY: number | null = null;

        for (const item of textContent.items) {
          if (item && item.str) {
            const trimmed = item.str.trim();
            if (trimmed.length > 0) {
              if (lastY === null || Math.abs(lastY - (item.transform?.[5] || 0)) < 4) {
                textItems.push(item.str);
              } else {
                textItems.push('\n' + item.str);
              }
              lastY = item.transform?.[5] || 0;
            }
          }
        }

        const combinedText = textItems.join(' ').replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();
        pageTexts.push({ pageNumber: curPageNum, text: combinedText });
        return combinedText;
      });
    };

    let pdfData: any;
    try {
      pdfData = await pdfParse(dataBuffer, { pagerender: renderPage });
    } catch (parseErr: any) {
      throw new Error(`Unable to read this PDF file: ${parseErr.message || 'Corrupted or password-protected PDF'}`);
    }

    const totalPages = Math.max(pdfData.numpages || 1, pageTexts.length);
    const fullText = (pdfData.text || pageTexts.map((p) => p.text).join('\n\n')).trim();
    const cleanTitle = originalName.replace(/\.(pdf|epub|txt)$/i, '').replace(/[_-]/g, ' ');

    // Check if PDF is image-only or scanned
    if (fullText.length === 0 || pageTexts.every((p) => p.text.length === 0)) {
      return {
        title: cleanTitle,
        totalPages,
        fullText: '',
        isScannedOrEmpty: true,
        chapters: [
          {
            chapterNumber: 1,
            title: 'Unreadable Document',
            contentBlocks: [
              {
                blockIndex: 1,
                type: 'PARAGRAPH',
                pageNumber: 1,
                startOffset: 0,
                endOffset: 120,
                text: 'This PDF could not be converted into readable text. This may happen with scanned/image-only PDFs.',
              },
            ],
            readingTime: '1 min',
            summary: 'Text extraction unavailable for this PDF.',
          },
        ],
      };
    }

    // Sort page texts by page number
    pageTexts.sort((a, b) => a.pageNumber - b.pageNumber);

    // Group text into canonical chapters and content blocks with page mapping
    const chapters = this.buildChaptersFromPages(pageTexts, cleanTitle);

    return {
      title: cleanTitle,
      totalPages,
      fullText,
      isScannedOrEmpty: false,
      chapters,
    };
  }

  /**
   * Parse plain text or Markdown document
   */
  async parsePlainText(filePath: string, originalName: string): Promise<ExtractedDocument> {
    const rawText = await fs.promises.readFile(filePath, 'utf-8');
    const cleanTitle = originalName.replace(/\.(txt|md)$/i, '').replace(/[_-]/g, ' ');
    const paragraphs = rawText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const blocks: ExtractedBlock[] = paragraphs.map((text, idx) => ({
      blockIndex: idx + 1,
      type: 'PARAGRAPH',
      text,
      pageNumber: Math.max(1, Math.ceil((idx + 1) / 3)),
      startOffset: 0,
      endOffset: text.length,
    }));

    return {
      title: cleanTitle,
      totalPages: Math.max(1, Math.ceil(blocks.length / 3)),
      fullText: rawText,
      isScannedOrEmpty: rawText.trim().length === 0,
      chapters: [
        {
          chapterNumber: 1,
          title: 'Full Treatise',
          contentBlocks: blocks,
          readingTime: `${Math.max(1, Math.ceil(rawText.split(/\s+/).length / 200))} mins`,
        },
      ],
    };
  }

  /**
   * Parse EPUB or generic document
   */
  async parseEpub(filePath: string, originalName: string): Promise<ExtractedDocument> {
    const cleanTitle = originalName.replace(/\.(pdf|epub)$/i, '').replace(/[_-]/g, ' ');
    let fullText = '';
    try {
      fullText = await fs.promises.readFile(filePath, 'utf-8');
    } catch {
      fullText = `Uploaded EPUB content for ${cleanTitle}`;
    }

    const paragraphs = fullText
      .replace(/<[^>]*>/g, ' ')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const blocks: ExtractedBlock[] = paragraphs.map((text, idx) => ({
      blockIndex: idx + 1,
      type: 'PARAGRAPH',
      text,
      pageNumber: Math.max(1, Math.ceil((idx + 1) / 3)),
      startOffset: 0,
      endOffset: text.length,
    }));

    return {
      title: cleanTitle,
      totalPages: Math.max(1, Math.ceil(blocks.length / 3)),
      fullText,
      isScannedOrEmpty: fullText.trim().length === 0,
      chapters: [
        {
          chapterNumber: 1,
          title: 'Introduction & Core Themes',
          contentBlocks: blocks,
          readingTime: `${Math.max(5, Math.ceil(fullText.split(/\s+/).length / 200))} mins`,
        },
      ],
    };
  }

  /**
   * Split page texts into structured chapters and canonical content blocks
   */
  private buildChaptersFromPages(
    pages: { pageNumber: number; text: string }[],
    defaultTitle: string
  ): ExtractedChapter[] {
    const chapterRegex = /(?:^|\n)(?:Chapter\s+(\d+|[IVXLCDM]+)|CHAPTER\s+(\d+|[IVXLCDM]+)|Bab\s+(\d+))[:\s.-]*(.*?)(?=\n|$)/i;

    const chapters: ExtractedChapter[] = [];
    let currentChapterNumber = 1;
    let currentChapterTitle = 'Chapter 1: Opening Passages';
    let currentBlocks: ExtractedBlock[] = [];
    let globalBlockIndex = 1;
    let globalOffset = 0;

    for (const page of pages) {
      if (!page.text || page.text.trim().length === 0) continue;

      // Split page text into distinct paragraphs
      const rawParas = page.text
        .split(/(?:\r?\n\s*\r?\n)|(?<=[.!?])\s{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 10);

      for (const para of rawParas) {
        // Check if paragraph is a chapter heading
        const match = para.match(chapterRegex);
        if (match && currentBlocks.length > 2) {
          // Finish previous chapter
          chapters.push({
            chapterNumber: currentChapterNumber,
            title: currentChapterTitle,
            contentBlocks: currentBlocks,
            readingTime: `${Math.max(3, Math.ceil(currentBlocks.reduce((acc, b) => acc + b.text.split(/\s+/).length, 0) / 200))} mins`,
          });

          currentChapterNumber++;
          currentChapterTitle = match[0].trim().replace(/\n/g, ' ') || `Chapter ${currentChapterNumber}`;
          currentBlocks = [];
        }

        const startOffset = globalOffset;
        const endOffset = globalOffset + para.length;
        globalOffset = endOffset + 1;

        currentBlocks.push({
          blockIndex: globalBlockIndex++,
          type: 'PARAGRAPH',
          text: para,
          pageNumber: page.pageNumber,
          startOffset,
          endOffset,
        });
      }
    }

    // Save final chapter
    if (currentBlocks.length > 0) {
      chapters.push({
        chapterNumber: currentChapterNumber,
        title: currentChapterTitle,
        contentBlocks: currentBlocks,
        readingTime: `${Math.max(3, Math.ceil(currentBlocks.reduce((acc, b) => acc + b.text.split(/\s+/).length, 0) / 200))} mins`,
      });
    }

    // If no chapter headers were matched and there's a lot of blocks, partition into 12-page chapters
    if (chapters.length === 1 && currentBlocks.length > 30) {
      const allBlocks = chapters[0].contentBlocks;
      const blocksPerChapter = 25;
      const totalPartitions = Math.ceil(allBlocks.length / blocksPerChapter);

      const partitioned: ExtractedChapter[] = [];
      for (let c = 0; c < totalPartitions; c++) {
        const slice = allBlocks.slice(c * blocksPerChapter, (c + 1) * blocksPerChapter);
        partitioned.push({
          chapterNumber: c + 1,
          title: c === 0 ? 'Chapter 1: Opening Treatise' : `Chapter ${c + 1}: Continuing Exposition`,
          contentBlocks: slice,
          readingTime: `${Math.max(3, Math.ceil(slice.reduce((acc, b) => acc + b.text.split(/\s+/).length, 0) / 200))} mins`,
        });
      }
      return partitioned;
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
      if (chunks.length > 100) break;
    }

    return chunks;
  }
}

export const documentService = new DocumentService();
