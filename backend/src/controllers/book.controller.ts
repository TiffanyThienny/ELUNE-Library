import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { storageService } from '../services/storage.service';
import { documentService } from '../services/document.service';
import { sendSuccess, sendError } from '../utils/response.util';
import { Visibility, BookStatus, BlockType, ProcessingStatus } from '@prisma/client';
import { canUserAccessBook, resolveBookUploadStatus } from '../utils/permission.util';

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
    category: book.category ? book.category.name : 'General',
    categoryId: book.categoryId,
    coverBg: book.coverBg || 'linear-gradient(135deg, #8C7355 0%, #4A3E3D 100%)',
    coverTextColor: book.coverTextColor || '#FAF0E6',
    coverUrl: book.coverUrl,
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

    res.sendFile(path.resolve(filePath));
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
      category: b.category ? b.category.name : 'General',
      coverBg: b.coverBg,
      coverTextColor: b.coverTextColor,
      visibility: b.visibility,
      status: b.status,
      rejectionReason: b.rejectionReason,
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
export const uploadBook = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required to upload books', 'UNAUTHORIZED', 401);
      return;
    }

    const file = req.file;
    if (!file) {
      sendError(res, 'No book file uploaded. Please upload a PDF or EPUB.', 'FILE_REQUIRED', 400);
      return;
    }

    // Validate file extension
    const ext = file.originalname.split('.').pop()?.toUpperCase() || '';
    if (!['PDF', 'EPUB', 'TXT', 'MD'].includes(ext)) {
      sendError(res, 'Unsupported file type. Please upload a valid PDF, EPUB, or TXT document.', 'UNSUPPORTED_TYPE', 400);
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      sendError(res, 'File size exceeds maximum allowable limit of 50MB.', 'FILE_TOO_LARGE', 400);
      return;
    }

    let extracted;
    try {
      if (ext === 'PDF') {
        extracted = await documentService.parsePdf(file.path, file.originalname);
      } else if (ext === 'TXT' || ext === 'MD') {
        extracted = await documentService.parsePlainText(file.path, file.originalname);
      } else {
        extracted = await documentService.parseEpub(file.path, file.originalname);
      }
    } catch (parseError: any) {
      console.error('Document parsing failed:', parseError);
      sendError(res, 'Unable to read this PDF file.', 'INVALID_PDF', 400);
      return;
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
    const processingError = isScanned
      ? 'This PDF contains scanned pages and does not have selectable text.'
      : null;

    // Save Book along with structured Chapters and ContentBlocks
    const book = await prisma.book.create({
      data: {
        title,
        author,
        description,
        categoryId,
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
              create: extracted.chapters.map((ch) => ({
                chapterNumber: ch.chapterNumber,
                title: ch.title,
                contentBlocks: {
                  create: ch.contentBlocks.map((block) => ({
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

    // Auto-add to user's library
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

    console.log(`[BOOK READY] Volume "${book.title}" [ID: ${book.id}] status=${processingStatus}, isScanned=${isScanned}`);

    const message = isScanned
      ? 'Upload complete. This volume appears to be a scanned photocopy without digital text.'
      : visibility === 'PUBLIC'
        ? 'Upload successful. Your book is published and available for all readers.'
        : 'Upload successful. Your private volume is ready in your personal sanctuary.';

    sendSuccess(res, formatBookForResponse(book), message, 201);
  } catch (error: any) {
    console.error('uploadBook error:', error);
    sendError(res, 'Failed to process and upload book', error.message, 500);
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
    sendSuccess(res, { id }, 'Book deleted successfully');
  } catch (error: any) {
    console.error('deleteBook error:', error);
    sendError(res, 'Failed to delete book', error.message, 500);
  }
};
