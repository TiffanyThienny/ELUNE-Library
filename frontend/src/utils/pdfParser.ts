import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker to use CDN matching the installed version
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
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
}

/**
 * Extract text from PDF file and group into chapters and paragraphs
 */
export async function parsePdfFile(file: File): Promise<ExtractedBookData> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages || 1;

  const pageTexts: { page: number; text: string }[] = [];

  for (let i = 1; i <= numPages; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items
        .map((item: any) => item.str || '')
        .filter((str: string) => str.trim().length > 0);

      // Join items with appropriate spaces
      const pageFullText = strings.join(' ').replace(/\s+/g, ' ').trim();
      if (pageFullText.length > 0) {
        pageTexts.push({ page: i, text: pageFullText });
      }
    } catch (e) {
      console.warn(`Could not extract page ${i}`, e);
    }
  }

  const cleanTitle = file.name.replace(/\.(pdf|epub|txt)$/i, '').replace(/[_-]/g, ' ');

  // Group into chapters
  const chapters: ExtractedChapterData[] = [];
  const chapterRegex = /(?:^|\s)(?:Chapter\s+(\d+|[IVXLCDM]+)|CHAPTER\s+(\d+|[IVXLCDM]+)|Bab\s+(\d+))[:\s.-]*(.*?)(?=\s|$)/i;

  let currentChapterNumber = 1;
  let currentChapterTitle = 'Chapter 1: Opening';
  let currentBlocks: ExtractedParagraphBlock[] = [];
  let blockCounter = 1;

  for (const { page, text } of pageTexts) {
    // Split page text into sentences/paragraphs (every ~200-400 characters or double space)
    const rawParagraphs = text
      .split(/(?<=[.?!])\s{2,}|(?<=[.?!])\s+(?=[A-Z0-9"'])/)
      .map((p) => p.trim())
      .filter((p) => p.length > 15);

    for (const para of rawParagraphs) {
      // Check if paragraph starts a new chapter
      const match = para.match(chapterRegex);
      if (match && currentBlocks.length > 3) {
        // Save previous chapter
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

  // Push final chapter
  if (currentBlocks.length > 0) {
    chapters.push({
      chapterNumber: currentChapterNumber,
      title: currentChapterTitle,
      contentBlocks: currentBlocks,
    });
  }

  // Fallback if no readable blocks were extracted (e.g. scanned image PDF)
  if (chapters.length === 0 || chapters[0].contentBlocks.length === 0) {
    chapters.push({
      chapterNumber: 1,
      title: 'Chapter 1: Ingested Document',
      contentBlocks: [
        {
          blockIndex: 1,
          type: 'PARAGRAPH',
          pageNumber: 1,
          text: `Document "${cleanTitle}" was uploaded successfully. (Total scanned/detected pages: ${numPages}). The volume is ready for study and reflection.`,
        },
      ],
    });
  }

  return {
    title: cleanTitle,
    totalPages: numPages,
    chapters,
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
  };
}
