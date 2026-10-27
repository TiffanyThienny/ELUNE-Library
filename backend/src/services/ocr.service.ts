import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { BlockType, ProcessingStatus } from '@prisma/client';

/**
 * OCR for scanned PDFs using the OCR engine built into Windows
 * (Windows.Data.Pdf renders pages, Windows.Media.Ocr reads them) via
 * scripts/ocr-windows.ps1. No npm dependency, no external service, no data
 * leaves the machine.
 *
 * Storage (existing schema, no migration): each batch of pages becomes one
 * Chapter ("Pages X–Y"), each page one ContentBlock with its real pageNumber.
 * Because results are written batch by batch, an interrupted job resumes from
 * the last stored page and finished pages are never re-processed.
 *
 * Limitations: Windows only; one job at a time; in-memory job status (lost on
 * restart — the stored pages are not); recognition language is the best
 * installed Windows OCR language (English here), which reads Latin-script
 * Indonesian with some errors.
 */

export const OCR_BATCH_PAGES = 20;
const SCRIPT = path.resolve(__dirname, '../../scripts/ocr-windows.ps1');
const MIN_PAGE_CHARS = 20;

export type OcrState = 'idle' | 'running' | 'completed' | 'failed';

export interface OcrJobStatus {
  state: OcrState;
  bookId: string;
  pagesDone: number;
  totalPages: number;
  pagesWithText: number;
  language?: string;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

const jobs = new Map<string, OcrJobStatus>();
let activeBookId: string | null = null;

export const isOcrSupported = (): boolean => process.platform === 'win32' && fs.existsSync(SCRIPT);

interface PageResult { page: number; text: string; error?: string }

/** Run the helper for a page range; resolves with per-page text. */
function runOcrBatch(pdfPath: string, from: number, to: number): Promise<{ pages: PageResult[]; total: number; language?: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT, '-Pdf', pdfPath, '-From', String(from), '-To', String(to)],
      { windowsHide: true }
    );
    let out = '';
    let errOut = '';
    const timer = setTimeout(() => child.kill(), 15 * 60 * 1000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (errOut += d));
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', () => {
      clearTimeout(timer);
      const pages: PageResult[] = [];
      let total = 0;
      let language: string | undefined;
      for (const line of out.split(/\r?\n/)) {
        const trimmed = line.trim().replace(/^\uFEFF/, '');
        if (!trimmed.startsWith('{')) continue;
        try {
          const j = JSON.parse(trimmed);
          if (j.error === 'NO_OCR_ENGINE') return reject(new Error('No Windows OCR language is installed.'));
          if (j.done) { total = j.pages; language = j.language; } else if (typeof j.page === 'number') pages.push({ page: j.page, text: String(j.text || ''), error: j.error });
        } catch { /* ignore non-JSON noise */ }
      }
      if (total === 0 && pages.length === 0) {
        return reject(new Error(`OCR helper produced no output${errOut ? `: ${errOut.trim().slice(0, 200)}` : ''}`));
      }
      resolve({ pages, total, language });
    });
  });
}

/** Clean OCR line breaks into a readable paragraph per page. */
function normalizePageText(text: string): string {
  return text
    .replace(/(\w)-\n(\w)/g, '$1$2') // join hyphenated line breaks
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function storedOcrProgress(bookId: string): Promise<{ lastPage: number; chapters: number; pagesWithText: number }> {
  const chapters = await prisma.chapter.findMany({
    where: { bookId },
    select: { chapterNumber: true, contentBlocks: { select: { pageNumber: true } } }
  });
  const pages = chapters.flatMap((c) => c.contentBlocks.map((b) => b.pageNumber));
  return {
    lastPage: pages.length ? Math.max(...pages) : 0,
    chapters: chapters.length ? Math.max(...chapters.map((c) => c.chapterNumber)) : 0,
    pagesWithText: pages.length
  };
}

async function processBook(bookId: string, pdfPath: string, totalPages: number): Promise<void> {
  const job = jobs.get(bookId)!;
  try {
    const stored = await storedOcrProgress(bookId);
    let nextPage = stored.lastPage + 1;
    let chapterNumber = stored.chapters;
    job.pagesDone = stored.lastPage;
    job.pagesWithText = stored.pagesWithText;

    while (nextPage <= totalPages) {
      const to = Math.min(totalPages, nextPage + OCR_BATCH_PAGES - 1);
      const batch = await runOcrBatch(pdfPath, nextPage, to);
      if (batch.language) job.language = batch.language;

      const readable = batch.pages
        .map((p) => ({ page: p.page, text: normalizePageText(p.text) }))
        .filter((p) => p.text.length >= MIN_PAGE_CHARS); // skip blank / illegible pages, never invent text

      chapterNumber += 1;
      await prisma.chapter.create({
        data: {
          bookId,
          chapterNumber,
          title: `Pages ${nextPage}–${to}`,
          contentBlocks: {
            create: readable.map((p, i) => ({
              blockIndex: i + 1,
              type: BlockType.PARAGRAPH,
              text: p.text,
              pageNumber: p.page,
              startOffset: 0,
              endOffset: p.text.length
            }))
          }
        }
      });

      job.pagesDone = to;
      job.pagesWithText += readable.length;
      nextPage = to + 1;
      await prisma.book.update({
        where: { id: bookId },
        data: { processingError: `OCR in progress: ${to} of ${totalPages} pages processed.` }
      });
    }

    const finalStored = await storedOcrProgress(bookId);
    const hasText = finalStored.pagesWithText > 0;
    await prisma.book.update({
      where: { id: bookId },
      data: {
        processingStatus: hasText ? ProcessingStatus.READY : ProcessingStatus.FAILED,
        processingError: hasText
          ? `Text recognized with OCR (${finalStored.pagesWithText} of ${totalPages} pages readable${job.language ? `, ${job.language} engine` : ''}). OCR text can contain recognition errors.`
          : 'OCR ran but found no readable text on any page.'
      }
    });
    job.state = hasText ? 'completed' : 'failed';
    if (!hasText) job.error = 'OCR found no readable text.';
  } catch (err: any) {
    console.error(`[OCR] Book ${bookId} failed:`, err?.message || err);
    job.state = 'failed';
    job.error = 'OCR stopped because of an internal error. Pages processed so far were kept; start OCR again to resume.';
    await prisma.book
      .update({ where: { id: bookId }, data: { processingStatus: ProcessingStatus.FAILED, processingError: job.error } })
      .catch(() => {});
  } finally {
    job.finishedAt = new Date().toISOString();
    activeBookId = null;
  }
}

export const ocrService = {
  status(bookId: string): OcrJobStatus | null {
    return jobs.get(bookId) || null;
  },

  /** Start (or resume) OCR for a book. Caller must have checked ownership. */
  async start(book: { id: string; fileUrl: string | null; totalPages: number }): Promise<OcrJobStatus> {
    if (!isOcrSupported()) {
      throw Object.assign(new Error('OCR is only available when the backend runs on Windows.'), { statusCode: 501, code: 'OCR_UNAVAILABLE' });
    }
    const existing = jobs.get(book.id);
    if (existing?.state === 'running') return existing;
    if (activeBookId && activeBookId !== book.id) {
      throw Object.assign(new Error('Another book is being processed with OCR. Try again when it finishes.'), { statusCode: 409, code: 'OCR_BUSY' });
    }
    const filename = book.fileUrl ? path.basename(book.fileUrl) : '';
    if (!filename.startsWith('book-') || path.extname(filename).toLowerCase() !== '.pdf') {
      throw Object.assign(new Error('This book has no stored PDF to process.'), { statusCode: 400, code: 'NO_PDF' });
    }
    const pdfPath = path.join(ENV.UPLOAD_DIR, filename);
    if (!fs.existsSync(pdfPath)) {
      throw Object.assign(new Error('The stored PDF file is missing.'), { statusCode: 404, code: 'NOT_FOUND' });
    }

    const stored = await storedOcrProgress(book.id);
    const job: OcrJobStatus = {
      state: 'running',
      bookId: book.id,
      pagesDone: stored.lastPage,
      totalPages: book.totalPages,
      pagesWithText: stored.pagesWithText,
      startedAt: new Date().toISOString()
    };
    jobs.set(book.id, job);
    activeBookId = book.id;
    await prisma.book.update({
      where: { id: book.id },
      data: { processingStatus: ProcessingStatus.PROCESSING, processingError: `OCR in progress: ${stored.lastPage} of ${book.totalPages} pages processed.` }
    });
    void processBook(book.id, pdfPath, book.totalPages);
    return job;
  }
};
