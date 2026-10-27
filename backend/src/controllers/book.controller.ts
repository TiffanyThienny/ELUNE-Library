import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { storageService } from '../services/storage.service';
import { documentService, describeTextlessPdf } from '../services/document.service';
import { EPUB_UNSUPPORTED_MESSAGE } from '../middleware/upload.middleware';
import { sendSuccess, sendError } from '../utils/response.util';
import { Visibility, BookStatus, BlockType, ProcessingStatus } from '@prisma/client';
import { canUserAccessBook, resolveBookUploadStatus } from '../utils/permission.util';
import { presentCoverUrl } from '../utils/coverUrl.util';
import { uploadIdempotency, isValidClientUploadId } from '../services/uploadIdempotency.service';
import { ocrService, isOcrSupported } from '../services/ocr.service';

export const formatBookForResponse = (book: any, progress?: any) => {
  let parsedSummary = {
    quickOverview: book.description || '',
    mainIdeas: [],
    keyTakeaways: [],
    importantConcepts: []
  };

  if (book.summaries && book.summaries.length > 0) {
    const bookSummary = book.summaries.find((s: any) => s.summaryType === 'book') || book.summaries[0];
    if (bookSummary && bookSummary.content) {
      try {
        parsedSummary = JSON.parse(bookSummary.content);
      } catch {
        parsedSummary.quickOverview = bookSummary.content;
      }
    }
  }

  const defaultProgress = progress || (book.readingProgress && book.readingProgress[0]) || {
    currentPage: 1,
    currentChapterId: null,
    currentContentBlockId: null,
    progressPercentage: 0,
    lastReadAt: new Date().toISOString()
  };

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category
      ? { id: book.category.id, name: book.category.name, slug: book.category.slug }
      : { id: book.categoryId || '', name: 'General', slug: 'general' },
    categoryId: book.categoryId,
    coverBg: book.coverBg || 'linear-gradient(135deg, #8C7355 0%, #4A3E3D 100%)',
    coverTextColor: book.coverTextColor || '#FAF0E6',
    coverUrl: presentCoverUrl(book),
    fileUrl: book.fileUrl,
    fileType: book.fileType,
    totalPages: book.totalPages || 100,
    description: book.description,
    language: book.language || 'en',
    visibility: book.visibility,
    status: book.status,
    rejectionReason: book.rejectionReason,
    processingStatus: book.processingStatus || 'READY',
    processingError: book.processingError || null,
    isScanned: Boolean(book.isScanned),
    isUploaded: Boolean(book.uploadedBy),
    uploadedBy: book.uploadedBy,
    uploaderName: book.uploader ? book.uploader.name : undefined,
    createdAt: book.createdAt,
    chapters: (book.chapters || []).map((ch: any) => ({
      id: ch.id,
      number: ch.chapterNumber,
      title: ch.title,
      contentBlocksCount: ch._count?.contentBlocks || ch.contentBlocks?.length || 0,
      contentBlocks: ch.contentBlocks || []
    })),
    summary: parsedSummary,
    progress: {
      chapterId: defaultProgress.currentChapterId,
      contentBlockId: defaultProgress.currentContentBlockId,
      pageNumber: defaultProgress.currentPage || 1,
      percent: Math.round(defaultProgress.progressPercentage || 0),
      lastRead: defaultProgress.lastReadAt ? new Date(defaultProgress.lastReadAt).toLocaleDateString() : 'Just now'
    }
  };
};

/**
 * Explore / Public Books Catalog (Strictly PUBLIC + APPROVED)
 */
export const getBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string)?.trim();
    const categoryQuery = ((req.query.categoryId || req.query.category) as string)?.trim();
    const author = (req.query.author as string)?.trim();
    const sort = (req.query.sort as string) || 'latest';

    const skip = (page - 1) * limit;

    // RULE: Public library strictly shows PUBLIC + APPROVED
    const where: any = {
      visibility: Visibility.PUBLIC,
      status: BookStatus.APPROVED
    };

    const conditions: any[] = [];

    if (search) {
      conditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { author: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { category: { name: { contains: search, mode: 'insensitive' } } }
        ]
      });
    }

    if (author) {
      conditions.push({ author: { contains: author, mode: 'insensitive' } });
    }

    if (categoryQuery && categoryQuery !== 'all') {
      conditions.push({
        OR: [
          { categoryId: categoryQuery },
          { category: { slug: { equals: categoryQuery.toLowerCase() } } },
          { category: { name: { contains: categoryQuery, mode: 'insensitive' } } }
        ]
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'title') orderBy = { title: 'asc' };
    if (sort === 'author') orderBy = { author: 'asc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: true,
          uploader: { select: { id: true, name: true } },
          chapters: {
            select: { id: true, chapterNumber: true, title: true, _count: { select: { contentBlocks: true } } },
            orderBy: { chapterNumber: 'asc' }
          },
          summaries: {
            where: { summaryType: 'book' },
            take: 1
          },
          readingProgress: req.user
            ? {
                where: { userId: req.user.id },
                take: 1
              }
            : false
        }
      })
    ]);

    const formattedBooks = books.map((b) => formatBookForResponse(b));

    sendSuccess(
      res,
      {
        books: formattedBooks,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      },
      'Public books fetched successfully'
    );
  } catch (error: any) {
    console.error('getBooks error:', error);
    sendError(res, 'Failed to retrieve books', error.message, 500);
  }
};

/**
 * Get Book by ID with strict Private Book permission check
 */
export const getBookById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        category: true,
        uploader: { select: { id: true, name: true, email: true } },
        chapters: {
          include: {
            _count: { select: { contentBlocks: true } }
          },
          orderBy: { chapterNumber: 'asc' }
        },
        summaries: true,
        readingProgress: req.user
          ? {
              where: { userId: req.user.id },
              take: 1
            }
          : false
      }
    });

    if (!book) {
      sendError(res, `Book not found with ID ${id}`, 'NOT_FOUND', 404);
      return;
    }

    // STRICT MASTER ACCESS CONTROL
    if (!canUserAccessBook(book, req.user)) {
      sendError(
        res,
        'Access denied. You do not have permission to access this volume.',
        'FORBIDDEN',
        403
      );
      return;
    }

    sendSuccess(res, formatBookForResponse(book), 'Book details retrieved');
  } catch (error: any) {
    console.error('getBookById error:', error);
    sendError(res, 'Failed to fetch book details', error.message, 500);
  }
};

/**
 * Protected Book File Download / Stream (Strict Permission Check)
 */
export const getBookFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        fileUrl: true,
        visibility: true,
        status: true,
        uploadedBy: true
      }
    });

    if (!book || !book.fileUrl) {
      sendError(res, `File not found for book ID ${id}`, 'NOT_FOUND', 404);
      return;
    }

    if (!canUserAccessBook(book, req.user)) {
      sendError(res, 'Access denied. You do not have permission to access this file.', 'FORBIDDEN', 403);
      return;
    }

    // Resolve file from upload directory
    const filename = path.basename(book.fileUrl);
    const filePath = path.join(ENV.UPLOAD_DIR, filename);

    if (!fs.existsSync(filePath)) {
      sendError(res, 'Physical file not found on storage server', 'NOT_FOUND', 404);
      return;
    }

    // Authorized content must not be stored by shared caches. sendFile handles
    // HTTP Range (206) for pdf.js incremental loading.
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(path.resolve(filePath), {
      headers: path.extname(filename).toLowerCase() === '.pdf' ? { 'Content-Type': 'application/pdf' } : undefined
    });
  } catch (error: any) {
    console.error('getBookFile error:', error);
    sendError(res, 'Failed to serve book file', error.message, 500);
  }
};

/**
 * Get User's Uploaded Books (Private + Public with PENDING / APPROVED / REJECTED status)
 */
export const getMyUploads = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const books = await prisma.book.findMany({
      where: { uploadedBy: req.user.id },
      include: {
        category: true,
        _count: { select: { chapters: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = books.map((b) => ({
      id: b.id,
      title: b.title,
      author: b.author,
      description: b.description,
      category: b.category
        ? { id: b.category.id, name: b.category.name, slug: (b.category as any).slug }
        : { id: b.categoryId || '', name: 'General', slug: 'general' },
      categoryId: b.categoryId,
      coverBg: b.coverBg,
      coverTextColor: b.coverTextColor,
      coverUrl: presentCoverUrl(b),
      fileUrl: b.fileUrl,
      fileType: b.fileType,
      totalPages: b.totalPages,
      language: b.language || 'en',
      visibility: b.visibility,
      status: b.status,
      rejectionReason: b.rejectionReason,
      uploadedBy: b.uploadedBy,
      chaptersCount: b._count.chapters,
      createdAt: b.createdAt
    }));

    sendSuccess(res, { books: formatted }, 'My uploaded books retrieved');
  } catch (error: any) {
    console.error('getMyUploads error:', error);
    sendError(res, 'Failed to retrieve uploads', error.message, 500);
  }
};

/**
 * Upload Book (Handles file, text extraction, paragraph/content blocks, and PRIVATE/PUBLIC status)
 */
/**
 * Remove a locally stored upload referenced by a "/uploads/<name>" URL.
 * Only multer-generated names ("book-...") inside UPLOAD_DIR are touched, so
 * seed/external URLs and path-traversal values are ignored.
 */
const removeStoredUpload = async (url?: string | null): Promise<void> => {
  if (!url || !url.startsWith('/uploads/')) return;
  const filename = path.basename(url);
  if (!filename.startsWith('book-')) return;
  try {
    // Never delete a file another record still references.
    const stillReferenced = await prisma.book.count({
      where: { OR: [{ fileUrl: url }, { coverUrl: url }] }
    });
    if (stillReferenced > 0) {
      console.warn(`Kept ${filename}: still referenced by ${stillReferenced} other book(s).`);
      return;
    }
    await storageService.deleteFile(filename);
  } catch (err) {
    console.warn(`Failed to remove stored upload ${filename}:`, err);
  }
};

/** Only absolute https cover URLs supplied by the client are kept; everything else is dropped. */
const sanitizeClientCoverUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
};

/** Check real image magic bytes (PNG, JPEG, GIF, WEBP); the extension alone is not trusted. */
const hasImageSignature = async (filePath: string): Promise<boolean> => {
  let handle: fs.promises.FileHandle | null = null;
  try {
    handle = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buf, 0, 12, 0);
    if (bytesRead < 4) return false;
    const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const head6 = buf.subarray(0, 6).toString('latin1');
    const isGif = head6 === 'GIF87a' || head6 === 'GIF89a';
    const isWebp = buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
    return isPng || isJpeg || isGif || isWebp;
  } catch {
    return false;
  } finally {
    await handle?.close().catch(() => {});
  }
};

const requestUploadPaths = (req: Request): string[] => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[] | undefined;
  return [
    ...(req.file ? [req.file] : []),
    ...(Array.isArray(files) ? files : Object.values(files || {}).flat())
  ]
    .map((f) => f?.path)
    .filter((p): p is string => Boolean(p));
};

/** Synchronous variant used right before an error response is sent (at most 3 small unlinks). */
const discardRequestUploadsSync = (req: Request): void => {
  for (const p of requestUploadPaths(req)) {
    try {
      fs.rmSync(p, { force: true });
    } catch (err) {
      console.warn(`Failed to discard rejected upload ${p}:`, err);
    }
  }
};

/** Delete every file multer wrote for this request (used when an upload is rejected). */
const discardRequestUploads = async (req: Request): Promise<void> => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[] | undefined;
  const list: Express.Multer.File[] = [
    ...(req.file ? [req.file] : []),
    ...(Array.isArray(files) ? files : Object.values(files || {}).flat())
  ];
  for (const f of list) {
    if (!f?.path) continue;
    try {
      await fs.promises.unlink(f.path);
    } catch (err: any) {
      if (err?.code !== 'ENOENT') console.warn(`Failed to discard rejected upload ${f.path}:`, err);
    }
  }
};

export const uploadBook = async (req: Request, res: Response): Promise<void> => {
  // Set once the Book row referencing the uploaded files is persisted; until
  // then any exit path (validation error, parse failure, exception) discards them.
  let bookPersisted = false;
  let persistedBookId: string | null = null;
  let idempotencyKey: string | null = null;
  // Remove rejected uploads BEFORE the response is flushed, so no client ever
  // observes an orphan file (the async cleanup in `finally` stays as a backstop).
  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    if (!bookPersisted) discardRequestUploadsSync(req);
    return originalJson(body);
  }) as typeof res.json;
  try {
    if (!req.user) {
      sendError(res, 'Authentication required to upload books', 'UNAUTHORIZED', 401);
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const file = req.file || files?.['file']?.[0];
    if (!file) {
      sendError(res, 'No book file uploaded. Please upload a PDF, TXT, or MD file.', 'FILE_REQUIRED', 400);
      return;
    }

    // Idempotent retries: the same clientUploadId never creates a second book.
    if (isValidClientUploadId(req.body.clientUploadId)) {
      const attempt = uploadIdempotency.begin(req.user.id, req.body.clientUploadId);
      if (attempt.state === 'processing') {
        sendError(
          res,
          'This upload is still being processed. Check your library in a moment instead of uploading again.',
          'UPLOAD_IN_PROGRESS',
          409
        );
        return;
      }
      if (attempt.state === 'completed') {
        const existingBook = await prisma.book.findUnique({
          where: { id: attempt.bookId },
          include: { category: true, chapters: { include: { contentBlocks: { orderBy: { blockIndex: 'asc' } } } } }
        });
        if (existingBook && existingBook.uploadedBy === req.user.id) {
          const formattedExisting = formatBookForResponse(existingBook);
          sendSuccess(res, { book: formattedExisting, ...formattedExisting, deduplicated: true }, 'This upload was already completed.', 200);
          return;
        }
        // The earlier book was deleted: start a fresh attempt.
        uploadIdempotency.reset(req.user.id, req.body.clientUploadId);
        uploadIdempotency.begin(req.user.id, req.body.clientUploadId);
      }
      idempotencyKey = req.body.clientUploadId;
    }

    // Handle uploaded cover image if provided
    const coverFile = files?.['cover']?.[0] || files?.['coverImage']?.[0];
    // A client-supplied coverUrl is accepted only as an absolute https URL. Local
    // "/uploads/..." paths are never trusted: they could point at another user's
    // private cover (bypassing the cover policy) or make a later delete unlink it.
    let coverUrl: string | null = sanitizeClientCoverUrl(req.body.coverUrl);
    if (coverFile && !(await hasImageSignature(coverFile.path))) {
      sendError(res, 'The cover file is not a valid JPG, PNG, WEBP, or GIF image.', 'INVALID_COVER', 400);
      return;
    }
    if (coverFile) {
      try {
        const uploadedCover = await storageService.uploadFile(coverFile);
        coverUrl = uploadedCover.fileUrl;
      } catch (covErr) {
        console.warn('Cover upload failed, continuing with existing coverUrl:', covErr);
      }
    }

    // Validate file extension (defence in depth; the multer filter already enforces this)
    const ext = file.originalname.split('.').pop()?.toUpperCase() || '';
    if (ext === 'EPUB') {
      sendError(res, EPUB_UNSUPPORTED_MESSAGE, 'UNSUPPORTED_FORMAT', 415);
      return;
    }
    if (!['PDF', 'TXT', 'MD'].includes(ext)) {
      sendError(res, 'Unsupported file type. Please upload a PDF, TXT, or MD document.', 'UNSUPPORTED_TYPE', 400);
      return;
    }

    // Validate file size (defence in depth; multer enforces the same configured limit)
    if (file.size > ENV.MAX_FILE_SIZE_MB * 1024 * 1024) {
      sendError(res, `File size exceeds maximum allowable limit of ${ENV.MAX_FILE_SIZE_MB}MB.`, 'FILE_TOO_LARGE', 400);
      return;
    }

    let extracted: any;
    try {
      if (ext === 'PDF') {
        extracted = await documentService.parsePdf(file.path, file.originalname);
      } else {
        extracted = await documentService.parsePlainText(file.path, file.originalname);
      }
    } catch (parseError: any) {
      console.error('Server document parsing failed, checking client extracted chapters:', parseError);
      if (req.body.extractedChapters) {
        try {
          const clientChapters = typeof req.body.extractedChapters === 'string'
            ? JSON.parse(req.body.extractedChapters)
            : req.body.extractedChapters;
          if (Array.isArray(clientChapters) && clientChapters.length > 0) {
            extracted = {
              title: req.body.title || file.originalname.replace(/\.[^/.]+$/, ''),
              totalPages: Number(req.body.totalPages) || 1,
              fullText: '',
              isScannedOrEmpty: false,
              totalTextChars: 1000,
              chapters: clientChapters.map((ch: any, idx: number) => ({
                chapterNumber: ch.chapterNumber || (idx + 1),
                title: ch.title || `Chapter ${idx + 1}`,
                contentBlocks: (ch.contentBlocks || []).map((b: any, bIdx: number) => ({
                  blockIndex: b.blockIndex ?? bIdx,
                  type: BlockType.PARAGRAPH,
                  text: b.text || '',
                  pageNumber: b.pageNumber || 1,
                  startOffset: 0,
                  endOffset: (b.text || '').length,
                })),
              })),
            };
          }
        } catch (clientErr) {
          console.warn('Client extractedChapters fallback failed:', clientErr);
        }
      }

      if (!extracted) {
        sendError(res, 'Unable to read this PDF file.', 'INVALID_PDF', 400);
        return;
      }
    }

    // If server parsing gave 0 chapters or marked scanned, check if client supplied extracted chapters
    if ((!extracted.chapters || extracted.chapters.length === 0) && req.body.extractedChapters) {
      try {
        const clientChapters = typeof req.body.extractedChapters === 'string'
          ? JSON.parse(req.body.extractedChapters)
          : req.body.extractedChapters;
        if (Array.isArray(clientChapters) && clientChapters.length > 0) {
          extracted.isScannedOrEmpty = false;
          extracted.chapters = clientChapters.map((ch: any, idx: number) => ({
            chapterNumber: ch.chapterNumber || (idx + 1),
            title: ch.title || `Chapter ${idx + 1}`,
            contentBlocks: (ch.contentBlocks || []).map((b: any, bIdx: number) => ({
              blockIndex: b.blockIndex ?? bIdx,
              type: BlockType.PARAGRAPH,
              text: b.text || '',
              pageNumber: b.pageNumber || 1,
              startOffset: 0,
              endOffset: (b.text || '').length,
            })),
          }));
        }
      } catch (parseFallbackErr) {
        console.warn('Client chapters fallback parse failed:', parseFallbackErr);
      }
    }

    const { fileUrl } = await storageService.uploadFile(file);

    const title = req.body.title || extracted.title;
    const author = req.body.author || req.user.name;
    const description = req.body.description || `Uploaded volume "${title}" prepared for peaceful reading and AI contemplation in Elunè.`;
    const categoryId = req.body.categoryId || null;
    const requestedVisibility = (req.body.visibility || 'PRIVATE').toUpperCase();

    // STRICT MASTER RESOLUTION
    const { visibility, status } = resolveBookUploadStatus(req.user, requestedVisibility);

    const isScanned = Boolean(extracted.isScannedOrEmpty);
    const processingStatus = isScanned ? ProcessingStatus.FAILED : ProcessingStatus.READY;
    const processingError = isScanned ? describeTextlessPdf(extracted.noTextReason) : null;

    // Save Book along with structured Chapters and ContentBlocks
    const book = await prisma.book.create({
      data: {
        title,
        author,
        description,
        categoryId,
        coverUrl,
        coverBg: req.body.coverBg || 'linear-gradient(135deg, #8C7355 0%, #4A3E3D 100%)',
        coverTextColor: '#FAF0E6',
        fileUrl,
        fileType: ext,
        totalPages: extracted.totalPages,
        language: req.body.language || 'en',
        uploadedBy: req.user.id,
        visibility,
        status,
        rejectionReason: null,
        processingStatus,
        processingError,
        isScanned,
        chapters: isScanned
          ? undefined
          : {
              create: extracted.chapters.map((ch: any) => ({
                chapterNumber: ch.chapterNumber,
                title: ch.title,
                contentBlocks: {
                  create: ch.contentBlocks.map((block: any) => ({
                    blockIndex: block.blockIndex,
                    type: BlockType.PARAGRAPH,
                    text: block.text,
                    pageNumber: block.pageNumber,
                    startOffset: block.startOffset || 0,
                    endOffset: block.endOffset || block.text.length,
                  })),
                },
              })),
            },
      },
      include: {
        category: true,
        chapters: {
          include: {
            contentBlocks: {
              orderBy: { blockIndex: 'asc' },
            },
          },
        },
      },
    });
    bookPersisted = true;
    persistedBookId = book.id;
    if (idempotencyKey) uploadIdempotency.complete(req.user.id, idempotencyKey, book.id);

    // Create synchronized AudioTracks and AudioSegments only if book has valid extracted content
    if (!isScanned && book.chapters.length > 0) {
      try {
        console.log(`[TTS REQUEST] Initializing synchronized audio segment records for book ${book.id}...`);
        for (const chapter of book.chapters) {
          let cumulativeSeconds = 0.0;
          const segmentData: { contentBlockId: string; startTime: number; endTime: number }[] = [];

          for (const block of chapter.contentBlocks) {
            const words = block.text.split(/\s+/).length;
            const duration = Math.max(2.0, parseFloat((words / 2.5).toFixed(1)));
            const startTime = cumulativeSeconds;
            const endTime = parseFloat((cumulativeSeconds + duration).toFixed(1));
            cumulativeSeconds = endTime;

            segmentData.push({
              contentBlockId: block.id,
              startTime,
              endTime,
            });
          }

          if (segmentData.length > 0) {
            await prisma.audioTrack.create({
              data: {
                bookId: book.id,
                chapterId: chapter.id,
                audioUrl: `/audio/stream/${book.id}/${chapter.id}.mp3`,
                duration: cumulativeSeconds,
                segments: {
                  create: segmentData,
                },
              },
            });
          }
        }
        console.log(`[AUDIO SEGMENTS CREATED] Audio tracks and segments synchronized with ContentBlocks.`);
      } catch (audioInitErr) {
        console.warn('Audio segment initialization skipped:', audioInitErr);
      }
    }

    // Auto-add to user's library. The book and its file are already persisted, so a
    // failure here must NOT turn the upload into an error (the client would retry and
    // the user would think the book was lost). GET /api/library re-links every book
    // the user uploaded, so a missed link self-heals on the next library load.
    let libraryLinked = true;
    try {
      await prisma.userBook.upsert({
        where: {
          userId_bookId: {
            userId: req.user.id,
            bookId: book.id,
          },
        },
        update: {},
        create: {
          userId: req.user.id,
          bookId: book.id,
        },
      });
    } catch (linkErr) {
      libraryLinked = false;
      console.error(`[UPLOAD] Book ${book.id} saved, but adding it to the user's library failed:`, linkErr);
    }

    console.log(`[BOOK READY] Volume "${book.title}" [ID: ${book.id}] status=${processingStatus}, isScanned=${isScanned}`);

    const message = isScanned
      ? 'Upload complete. This volume appears to be a scanned photocopy without digital text.'
      : visibility === 'PUBLIC'
        ? 'Upload successful. Your book is published and available for all readers.'
        : 'Upload successful. Your private volume is ready in your personal sanctuary.';

    const formattedBook = formatBookForResponse(book);
    sendSuccess(
      res,
      { book: formattedBook, ...formattedBook, libraryLinked },
      libraryLinked ? message : `${message} It will appear in your library shortly.`,
      201
    );
  } catch (error: any) {
    // Full details stay in the server log; the client never sees internal messages,
    // file paths or stack traces.
    console.error('uploadBook error:', error);
    if (bookPersisted && persistedBookId) {
      // The book and file exist: report that truthfully instead of "upload failed".
      sendSuccess(
        res,
        { book: { id: persistedBookId }, partial: true },
        'Your book was saved, but the server could not finish preparing it. Open it from your library.',
        201
      );
    } else {
      sendError(res, 'The upload could not be saved. Please try again.', 'UPLOAD_FAILED', 500);
    }
  } finally {
    if (!bookPersisted) {
      if (idempotencyKey && req.user) uploadIdempotency.fail(req.user.id, idempotencyKey);
      await discardRequestUploads(req);
    }
  }
};

/**
 * Start (or resume) OCR for a scanned book. Owner or admin only, because it
 * writes the recognized text to the book's chapters.
 */
export const startBookOcr = async (req: Request, res: Response): Promise<void> => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      select: { id: true, fileUrl: true, totalPages: true, uploadedBy: true, visibility: true, status: true, isScanned: true }
    });
    if (!book) { sendError(res, 'Book not found', 'NOT_FOUND', 404); return; }
    if (!req.user || (book.uploadedBy !== req.user.id && req.user.role !== 'ADMIN')) {
      sendError(res, 'Only the owner of this book can run OCR on it.', 'FORBIDDEN', 403);
      return;
    }
    if (!book.isScanned) {
      sendError(res, 'This PDF already has a text layer; OCR is not needed.', 'OCR_NOT_NEEDED', 400);
      return;
    }
    const job = await ocrService.start(book);
    sendSuccess(res, { ocr: job }, 'OCR started', 202);
  } catch (error: any) {
    if (error?.statusCode && error.statusCode < 600) {
      sendError(res, error.message, error.code || 'OCR_ERROR', error.statusCode);
      return;
    }
    console.error('startBookOcr error:', error);
    sendError(res, 'OCR could not be started.', 'OCR_ERROR', 500);
  }
};

/** OCR progress for a book (anyone who may read the book). */
export const getBookOcrStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: req.params.id },
      select: { id: true, visibility: true, status: true, uploadedBy: true, isScanned: true, processingStatus: true, processingError: true, totalPages: true, _count: { select: { chapters: true } } }
    });
    if (!book) { sendError(res, 'Book not found', 'NOT_FOUND', 404); return; }
    if (!canUserAccessBook(book, req.user)) { sendError(res, 'Access denied', 'FORBIDDEN', 403); return; }
    const job = ocrService.status(book.id);
    sendSuccess(res, {
      supported: isOcrSupported(),
      isScanned: book.isScanned,
      processingStatus: book.processingStatus,
      processingError: book.processingError,
      hasText: book._count.chapters > 0 && book.processingStatus === 'READY',
      totalPages: book.totalPages,
      job
    });
  } catch (error: any) {
    console.error('getBookOcrStatus error:', error);
    sendError(res, 'Failed to read OCR status', 'OCR_ERROR', 500);
  }
};

/**
 * Status of an upload attempt identified by its clientUploadId. Lets the client
 * reconcile after a client-side timeout instead of re-uploading (which could
 * create a duplicate book).
 */
export const getUploadStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }
    const { clientUploadId } = req.params;
    if (!isValidClientUploadId(clientUploadId)) {
      sendError(res, 'Invalid upload id', 'VALIDATION_ERROR', 400);
      return;
    }
    const entry = uploadIdempotency.get(req.user.id, clientUploadId);
    if (!entry) {
      sendSuccess(res, { status: 'unknown' }, 'No record of this upload attempt');
      return;
    }
    if (entry.status === 'completed' && entry.bookId) {
      const book = await prisma.book.findUnique({ where: { id: entry.bookId }, include: { category: true } });
      if (book && book.uploadedBy === req.user.id) {
        sendSuccess(res, { status: 'completed', book: formatBookForResponse(book) }, 'Upload completed');
        return;
      }
      sendSuccess(res, { status: 'unknown' }, 'The uploaded book no longer exists');
      return;
    }
    sendSuccess(res, { status: entry.status }, `Upload ${entry.status}`);
  } catch (error: any) {
    console.error('getUploadStatus error:', error);
    sendError(res, 'Failed to fetch upload status', error.message, 500);
  }
};

/**
 * Get Book Processing Status
 */
export const getProcessingStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const book = await prisma.book.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        totalPages: true,
        processingStatus: true,
        processingError: true,
        isScanned: true,
        visibility: true,
        status: true,
        uploadedBy: true,
        _count: { select: { chapters: true } },
      },
    });

    if (!book) {
      sendError(res, 'Book not found', 'NOT_FOUND', 404);
      return;
    }

    if (!canUserAccessBook(book, req.user)) {
      sendError(res, 'Access denied', 'FORBIDDEN', 403);
      return;
    }

    sendSuccess(
      res,
      {
        bookId: book.id,
        title: book.title,
        totalPages: book.totalPages,
        processingStatus: book.processingStatus,
        processingError: book.processingError,
        isScanned: book.isScanned,
        chaptersCount: book._count.chapters,
      },
      'Processing status retrieved'
    );
  } catch (error: any) {
    console.error('getProcessingStatus error:', error);
    sendError(res, 'Failed to fetch processing status', error.message, 500);
  }
};

/**
 * Get Book Content (Canonical chapters, content blocks, pages)
 */
export const getBookContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        category: true,
        uploader: { select: { id: true, name: true } },
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          include: {
            contentBlocks: {
              orderBy: { blockIndex: 'asc' },
            },
            audioTracks: {
              include: {
                segments: {
                  orderBy: { startTime: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!book) {
      sendError(res, 'Book not found', 'NOT_FOUND', 404);
      return;
    }

    if (!canUserAccessBook(book, req.user)) {
      sendError(res, 'Access denied to this book content', 'FORBIDDEN', 403);
      return;
    }

    const chapters = book.chapters.map((ch) => ({
      id: ch.id,
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      contentBlocks: ch.contentBlocks.map((b) => ({
        id: b.id,
        blockIndex: b.blockIndex,
        type: b.type,
        text: b.text,
        pageNumber: b.pageNumber,
        startOffset: b.startOffset,
        endOffset: b.endOffset,
      })),
      audioTrack: ch.audioTracks[0] || null,
    }));

    const totalBlocks = chapters.reduce((acc, ch) => acc + ch.contentBlocks.length, 0);

    sendSuccess(
      res,
      {
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description,
          category: book.category ? book.category.name : 'General',
          totalPages: book.totalPages,
          fileUrl: book.fileUrl,
          fileType: book.fileType,
          visibility: book.visibility,
          status: book.status,
          processingStatus: book.processingStatus,
          processingError: book.processingError,
          isScanned: book.isScanned,
          chapters,
        },
        chapters,
        pages: book.totalPages,
        totalBlocks,
        processingStatus: book.processingStatus,
        processingError: book.processingError,
        isScanned: book.isScanned,
      },
      'Book content retrieved successfully'
    );
  } catch (error: any) {
    console.error('getBookContent error:', error);
    sendError(res, 'Failed to fetch book content', error.message, 500);
  }
};

/**
 * Get Book Reading Progress
 */
export const getBookProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const progress = await prisma.readingProgress.findUnique({
      where: { userId_bookId: { userId: req.user.id, bookId: id } },
    });

    sendSuccess(res, { progress }, 'Reading progress retrieved');
  } catch (error: any) {
    console.error('getBookProgress error:', error);
    sendError(res, 'Failed to get progress', error.message, 500);
  }
};

/**
 * Save / Update Book Reading Progress
 */
export const saveBookProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const { currentChapterId, currentContentBlockId, currentPage, progressPercentage } = req.body;

    const progress = await prisma.readingProgress.upsert({
      where: { userId_bookId: { userId: req.user.id, bookId: id } },
      update: {
        currentChapterId,
        currentContentBlockId,
        currentPage: currentPage || 1,
        progressPercentage: progressPercentage || 0,
        lastReadAt: new Date(),
      },
      create: {
        userId: req.user.id,
        bookId: id,
        currentChapterId,
        currentContentBlockId,
        currentPage: currentPage || 1,
        progressPercentage: progressPercentage || 0,
      },
    });

    sendSuccess(res, { progress }, 'Progress saved successfully');
  } catch (error: any) {
    console.error('saveBookProgress error:', error);
    sendError(res, 'Failed to save progress', error.message, 500);
  }
};

/**
 * Get Audio Tracks & Segments for Book
 */
export const getBookAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      sendError(res, 'Book not found', 'NOT_FOUND', 404);
      return;
    }

    if (!canUserAccessBook(book, req.user)) {
      sendError(res, 'Access denied', 'FORBIDDEN', 403);
      return;
    }

    const tracks = await prisma.audioTrack.findMany({
      where: { bookId: id },
      include: {
        segments: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    sendSuccess(res, { tracks }, 'Book audio tracks retrieved');
  } catch (error: any) {
    console.error('getBookAudio error:', error);
    sendError(res, 'Failed to get audio tracks', error.message, 500);
  }
};

/**
 * Generate Audio Synchronized Segments for Book
 */
export const generateBookAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          include: {
            contentBlocks: { orderBy: { blockIndex: 'asc' } },
          },
        },
      },
    });

    if (!book) {
      sendError(res, 'Book not found', 'NOT_FOUND', 404);
      return;
    }

    if (!canUserAccessBook(book, req.user)) {
      sendError(res, 'Access denied', 'FORBIDDEN', 403);
      return;
    }

    const createdTracks = [];

    for (const chapter of book.chapters) {
      let cumulativeTime = 0.0;
      const segmentData: { contentBlockId: string; startTime: number; endTime: number }[] = [];

      for (const block of chapter.contentBlocks) {
        const words = block.text.split(/\s+/).length;
        const duration = Math.max(2.0, parseFloat((words / 2.5).toFixed(1)));
        const startTime = cumulativeTime;
        const endTime = parseFloat((cumulativeTime + duration).toFixed(1));
        cumulativeTime = endTime;

        segmentData.push({
          contentBlockId: block.id,
          startTime,
          endTime,
        });
      }

      // Remove previous tracks for chapter
      await prisma.audioTrack.deleteMany({ where: { chapterId: chapter.id } });

      const track = await prisma.audioTrack.create({
        data: {
          bookId: book.id,
          chapterId: chapter.id,
          audioUrl: `/audio/stream/${book.id}/${chapter.id}.mp3`,
          duration: cumulativeTime,
          segments: {
            create: segmentData,
          },
        },
        include: { segments: true },
      });

      createdTracks.push(track);
    }

    sendSuccess(res, { tracks: createdTracks }, 'Audio synchronization generated successfully');
  } catch (error: any) {
    console.error('generateBookAudio error:', error);
    sendError(res, 'Failed to generate audio track', error.message, 500);
  }
};

export const deleteBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.book.findUnique({ where: { id } });

    if (!existing) {
      sendError(res, 'Book not found', 'NOT_FOUND', 404);
      return;
    }

    if (existing.uploadedBy !== req.user?.id && req.user?.role !== 'ADMIN') {
      sendError(res, 'You do not have permission to delete this book', 'FORBIDDEN', 403);
      return;
    }

    await prisma.book.delete({ where: { id } });

    // Remove the stored document and uploaded cover only after the DB row is gone.
    await removeStoredUpload(existing.fileUrl);
    await removeStoredUpload(existing.coverUrl);

    sendSuccess(res, { id }, 'Book deleted successfully');
  } catch (error: any) {
    console.error('deleteBook error:', error);
    sendError(res, 'Failed to delete book', error.message, 500);
  }
};
