import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

// Configure pdfjs worker to use local bundled worker (avoids CORS & CDN issues)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface ExtractedParagraphBlock {
  blockIndex: number;
  type: 'PARAGRAPH';
  pageNumber: number;
  text: string;
}

export interface ExtractedChapterData {
  chapterNumber: number;
  title: string;
  contentBlocks: ExtractedParagraphBlock[];
}

export interface ExtractedBookData {
  title: string;
  totalPages: number;
  chapters: ExtractedChapterData[];
  isScanned?: boolean;
  totalTextChars?: number;
}

/**
 * Extract text from PDF file and group into real chapters and paragraphs
 */
export async function parsePdfFile(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedBookData> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useSystemFonts: true,
    isEvalSupported: false,
  });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages || 1;

  const pageTexts: { page: number; text: string }[] = [];
  let totalExtractedChars = 0;

  // Process pages in small concurrent batches for speed
  const BATCH_SIZE = 5;
  for (let i = 1; i <= numPages; i += BATCH_SIZE) {
    const batch = [];
    for (let j = i; j < Math.min(i + BATCH_SIZE, numPages + 1); j++) {
      batch.push(
        (async (pNum: number) => {
          try {
            const page = await pdfDoc.getPage(pNum);
            const textContent = await page.getTextContent();
            let pageStr = '';
            let lastY: number | null = null;

            for (const item of textContent.items as any[]) {
              if (!item.str) continue;
              // Detect line break from Y coordinate shift
              if (lastY !== null && Math.abs(item.transform[5] - lastY) > 8) {
                pageStr += '\n';
              } else if (pageStr.length > 0 && !pageStr.endsWith(' ') && !pageStr.endsWith('\n')) {
                pageStr += ' ';
              }
              pageStr += item.str;
              lastY = item.transform ? item.transform[5] : null;
            }

            const cleanStr = pageStr.trim();
            return { page: pNum, text: cleanStr };
          } catch (err) {
            console.warn(`Could not extract page ${pNum}`, err);
            return { page: pNum, text: '' };
          }
        })(j)
      );
    }

    const batchResults = await Promise.all(batch);
    for (const r of batchResults) {
      if (r.text.length > 0) {
        pageTexts.push(r);
        totalExtractedChars += r.text.length;
      }
    }

    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE - 1, numPages), numPages);
    }
  }

  pageTexts.sort((a, b) => a.page - b.page);
  const cleanTitle = file.name.replace(/\.(pdf|epub|txt)$/i, '').replace(/[_-]/g, ' ');

  // SCANNED / IMAGE-ONLY PDF DETECTION:
  // If fewer than 50 characters were extracted across the entire document,
  // it is an image-only / scanned PDF. DO NOT generate fake dummy text!
  if (totalExtractedChars < 50 || pageTexts.length === 0) {
    return {
      title: cleanTitle,
      totalPages: numPages,
      chapters: [], // Strict: No fake text!
      isScanned: true,
      totalTextChars: totalExtractedChars,
    };
  }

  // GROUP EXTRACTED TEXT INTO CHAPTERS & PARAGRAPHS
  const chapters: ExtractedChapterData[] = [];
  const chapterRegex = /(?:^|\n)\s*(?:(?:BAB|Bab|CHAPTER|Chapter|Bagian|BAGIAN|Part|PART|Book|BOOK)\s+([0-9IVXLCDM]+)|(?:\b(?:PENDAHULUAN|PENGANTAR|PRAKATA|PROLOGUE|EPILOGUE|KESIMPULAN|KATA PENGANTAR)\b))[:\s.-]*(.*?)(?=\n|$)/i;

  let currentChapterNumber = 1;
  let currentChapterTitle = 'Chapter 1: Opening';
  let currentBlocks: ExtractedParagraphBlock[] = [];
  let blockCounter = 1;

  for (const { page, text } of pageTexts) {
    // Split into distinct paragraphs (by double newlines or single newline if line ends with punctuation)
    const rawParagraphs = text
      .split(/\n{2,}|\r\n\r\n/)
      .map((p) => p.replace(/\s+/g, ' ').trim())
      .filter((p) => p.length > 0);

    for (const para of rawParagraphs) {
      // Check for chapter boundary
      const match = para.match(chapterRegex);
      if (match && currentBlocks.length >= 2) {
        chapters.push({
          chapterNumber: currentChapterNumber,
          title: currentChapterTitle,
          contentBlocks: [...currentBlocks],
        });
        currentChapterNumber++;
        currentChapterTitle = match[0].trim() || `Chapter ${currentChapterNumber}`;
        currentBlocks = [];
        blockCounter = 1;
      }

      currentBlocks.push({
        blockIndex: blockCounter++,
        type: 'PARAGRAPH',
        pageNumber: page,
        text: para,
      });
    }
  }

  if (currentBlocks.length > 0) {
    chapters.push({
      chapterNumber: currentChapterNumber,
      title: currentChapterTitle,
      contentBlocks: currentBlocks,
    });
  }

  // If no chapter headings were found in a long document, segment into readable sections:
  if (chapters.length === 1 && chapters[0].contentBlocks.length > 30) {
    const allBlocks = chapters[0].contentBlocks;
    const splitChapters: ExtractedChapterData[] = [];
    const BLOCKS_PER_SECTION = 25;
    let secIdx = 1;

    for (let k = 0; k < allBlocks.length; k += BLOCKS_PER_SECTION) {
      const chunk = allBlocks.slice(k, k + BLOCKS_PER_SECTION);
      const startPage = chunk[0].pageNumber;
      const endPage = chunk[chunk.length - 1].pageNumber;
      splitChapters.push({
        chapterNumber: secIdx,
        title: `Section ${secIdx} (Pages ${startPage}–${endPage})`,
        contentBlocks: chunk.map((b, bI) => ({ ...b, blockIndex: bI + 1 })),
      });
      secIdx++;
    }

    return {
      title: cleanTitle,
      totalPages: numPages,
      chapters: splitChapters,
      isScanned: false,
      totalTextChars: totalExtractedChars,
    };
  }

  return {
    title: cleanTitle,
    totalPages: numPages,
    chapters,
    isScanned: false,
    totalTextChars: totalExtractedChars,
  };
}

/**
 * Extract text from plain text or Markdown files
 */
export async function parseTextFile(file: File): Promise<ExtractedBookData> {
  const text = await file.text();
  const cleanTitle = file.name.replace(/\.(txt|md)$/i, '').replace(/[_-]/g, ' ');
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const blocks: ExtractedParagraphBlock[] = paragraphs.map((p, idx) => ({
    blockIndex: idx + 1,
    type: 'PARAGRAPH',
    pageNumber: Math.max(1, Math.ceil((idx + 1) / 3)),
    text: p,
  }));

  return {
    title: cleanTitle,
    totalPages: Math.max(1, Math.ceil(blocks.length / 3)),
    chapters: [
      {
        chapterNumber: 1,
        title: 'Chapter 1: Full Treatise',
        contentBlocks: blocks,
      },
    ],
    isScanned: false,
    totalTextChars: text.length,
  };
}
