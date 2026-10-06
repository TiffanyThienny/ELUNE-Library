import fs from 'fs';
import pdfParse from 'pdf-parse';

// Load modern pdfjs-dist legacy build for rock-solid server-side PDF extraction
// @ts-ignore
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

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
  totalTextChars: number;
  chapters: ExtractedChapter[];
}

export class DocumentService {
  /**
   * Parse PDF file with precise per-page text extraction and canonical content blocks
   */
  async parsePdf(filePath: string, originalName: string): Promise<ExtractedDocument> {
    console.log(`[PDF UPLOAD] Received file for processing: ${originalName}`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file does not exist at ${filePath}`);
    }

    const dataBuffer = await fs.promises.readFile(filePath);

    // Validate PDF magic bytes (%PDF-)
    const header = dataBuffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF')) {
      console.warn(`[PDF VALIDATION FAILED] File does not have valid %PDF header: ${header}`);
      throw new Error('Unable to read this PDF file. Invalid file header or corrupted document.');
    }
    console.log(`[PDF VALIDATION] Valid %PDF header detected. File size: ${(dataBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    const pageTexts: { pageNumber: number; text: string }[] = [];
    let totalExtractedChars = 0;
    let totalPages = 1;

    console.log(`[PDF EXTRACTION START] Extracting text page-by-page from ${originalName}...`);

    // Primary Parser: Modern pdfjs-dist
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(dataBuffer),
        useSystemFonts: true,
        isEvalSupported: false,
        disableFontFace: true,
      });
      const pdfDoc = await loadingTask.promise;
      totalPages = pdfDoc.numPages || 1;

      for (let pNum = 1; pNum <= totalPages; pNum++) {
        try {
          const page = await pdfDoc.getPage(pNum);
          const textContent = await page.getTextContent();
          let pageStr = '';
          let lastY: number | null = null;

          for (const item of textContent.items as any[]) {
            if (!item.str) continue;
            const str = item.str;
            if (lastY !== null && Math.abs((item.transform?.[5] || 0) - lastY) > 5) {
              pageStr += '\n';
            } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
              pageStr += ' ';
            }
            pageStr += str;
            lastY = item.transform ? item.transform[5] : null;
          }

          const dehyphenated = pageStr.replace(/(\w+)-\n(\w+)/g, '$1$2');
          const cleanStr = dehyphenated.replace(/[ \t]+/g, ' ').replace(/\n\s+/g, '\n').trim();

          if (cleanStr.length > 0) {
            pageTexts.push({ pageNumber: pNum, text: cleanStr });
            totalExtractedChars += cleanStr.length;
          }
        } catch (pageErr) {
          console.warn(`[PDF EXTRACTION] Warning on page ${pNum}:`, pageErr);
        }
      }
    } catch (pdfjsErr: any) {
      console.warn(`[PDF EXTRACTION] pdfjs-dist primary parser threw (${pdfjsErr.message}), trying pdf-parse fallback...`);
      try {
        const fallbackRes = await pdfParse(dataBuffer);
        totalPages = fallbackRes.numpages || 1;
        const rawText = (fallbackRes.text || '').trim();
        if (rawText.length > 0) {
          const approxPageSize = Math.max(1, Math.ceil(rawText.length / totalPages));
          for (let p = 1; p <= totalPages; p++) {
            const start = (p - 1) * approxPageSize;
            const slice = rawText.slice(start, start + approxPageSize).trim();
            if (slice.length > 0) {
              pageTexts.push({ pageNumber: p, text: slice });
              totalExtractedChars += slice.length;
            }
          }
        }
      } catch (pdfParseErr: any) {
        console.error(`[PDF EXTRACTION ERROR] All PDF parsers failed:`, pdfParseErr);
        throw new Error(`Unable to read this PDF file: ${pdfParseErr.message || 'Corrupted or password-protected PDF'}`);
      }
    }

    pageTexts.sort((a, b) => a.pageNumber - b.pageNumber);
    const cleanTitle = originalName.replace(/\.(pdf|epub|txt)$/i, '').replace(/[_-]/g, ' ');
    const fullText = pageTexts.map((p) => p.text).join('\n\n').trim();

    console.log(`[PDF EXTRACTION COMPLETE] Total detected pages: ${totalPages}, Pages with text: ${pageTexts.length}, Total characters: ${totalExtractedChars}`);

    // SCANNED / IMAGE-ONLY PDF DETECTION:
    // If fewer than 100 characters were extracted across the entire document,
    // or all pages had 0 text, it is genuinely a scanned / image-only PDF.
    // STRICT RULE: DO NOT generate fake content blocks!
    if (totalExtractedChars < 100 || pageTexts.length === 0) {
      console.log(`[PAGES DETECTED] Scanned / Image-only PDF identified. Extracted characters: ${totalExtractedChars}. No fake text generated.`);
      return {
        title: cleanTitle,
        totalPages,
        fullText: '',
        isScannedOrEmpty: true,
        totalTextChars: totalExtractedChars,
        chapters: [], // Strict: No fake chapters or fake paragraphs!
      };
    }

    console.log(`[PAGES DETECTED] ${pageTexts.length} pages containing valid readable text found.`);

    // Group text into canonical chapters and content blocks with page mapping
    const chapters = this.buildChaptersFromPages(pageTexts, cleanTitle);
    const totalBlocks = chapters.reduce((acc, c) => acc + c.contentBlocks.length, 0);

    console.log(`[CHAPTERS DETECTED] ${chapters.length} chapters identified.`);
    console.log(`[CONTENT BLOCKS CREATED] ${totalBlocks} canonical content blocks created.`);

    return {
      title: cleanTitle,
      totalPages,
      fullText,
      isScannedOrEmpty: false,
      totalTextChars: totalExtractedChars,
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
      totalTextChars: rawText.length,
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
   * Parse EPUB document
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
      totalTextChars: fullText.length,
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
    // Comprehensive chapter detection regex (Indonesian & English, roman & arabic numerals)
    const chapterRegex = /(?:^|\n)\s*(?:(?:BAB|Bab|CHAPTER|Chapter|Bagian|BAGIAN|Part|PART|Book|BOOK|Section|SECTION)\s+([0-9IVXLCDM]+|[A-Za-z]+)|(?:\b(?:PENDAHULUAN|PENGANTAR|PRAKATA|PROLOGUE|PROLOG|EPILOGUE|EPILOG|KESIMPULAN|KATA PENGANTAR|INTRODUCTION|PREFACE|FOREWORD)\b))[:\s.-]*(.*?)(?=\n|$)/i;

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
        .map((p) => p.replace(/\s+/g, ' ').trim())
        .filter((p) => p.length > 10);

      for (const para of rawParas) {
        // Check if paragraph is a chapter heading
        const match = para.match(chapterRegex);
        if (match && currentBlocks.length >= 2) {
          // Finish previous chapter
          chapters.push({
            chapterNumber: currentChapterNumber,
            title: currentChapterTitle,
            contentBlocks: currentBlocks,
            readingTime: `${Math.max(3, Math.ceil(currentBlocks.reduce((acc, b) => acc + b.text.split(/\s+/).length, 0) / 200))} mins`,
          });

          currentChapterNumber++;
          const detectedTitle = match[0].trim().replace(/\n/g, ' ');
          currentChapterTitle = detectedTitle || `Chapter ${currentChapterNumber}`;
          currentBlocks = [];
          globalBlockIndex = 1;
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

    // Fallback: If no explicit chapter headers were found in a long document,
    // segment into natural reading sections (e.g. 25 paragraphs per section)
    if (chapters.length === 1 && currentBlocks.length > 30) {
      const allBlocks = chapters[0].contentBlocks;
      const blocksPerChapter = 25;
      const totalPartitions = Math.ceil(allBlocks.length / blocksPerChapter);

      const partitioned: ExtractedChapter[] = [];
      for (let c = 0; c < totalPartitions; c++) {
        const slice = allBlocks.slice(c * blocksPerChapter, (c + 1) * blocksPerChapter);
        const startPage = slice[0]?.pageNumber || 1;
        const endPage = slice[slice.length - 1]?.pageNumber || startPage;

        partitioned.push({
          chapterNumber: c + 1,
          title: `Section ${c + 1} (Pages ${startPage}–${endPage})`,
          contentBlocks: slice.map((b, bIdx) => ({ ...b, blockIndex: bIdx + 1 })),
          readingTime: `${Math.max(3, Math.ceil(slice.reduce((acc, b) => acc + b.text.split(/\s+/).length, 0) / 200))} mins`,
        });
      }
      return partitioned;
    }

    // If single short chapter with no heading, give it a clean natural name
    if (chapters.length === 1) {
      chapters[0].title = 'Chapter 1: Book Content';
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
