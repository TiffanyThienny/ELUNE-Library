import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { storageService } from '../services/storage.service';
import { documentService } from '../services/document.service';
import { sendSuccess, sendError } from '../utils/response.util';
import { Visibility, BookStatus, BlockType } from '@prisma/client';

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

    // CHECK PRIVATE BOOK ACCESS
    if (book.visibility === Visibility.PRIVATE) {
      const isOwner = req.user && req.user.id === book.uploadedBy;
      const isAdmin = req.user && req.user.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        sendError(res, 'Access denied. This is a private book accessible only to its owner.', 'FORBIDDEN', 403);
        return;
      }
    }

    // CHECK NON-APPROVED STATUS ACCESS
    if (book.status !== BookStatus.APPROVED) {
      const isOwner = req.user && req.user.id === book.uploadedBy;
      const isAdmin = req.user && req.user.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        sendError(res, 'This book is not publicly available.', 'FORBIDDEN', 403);
        return;
      }
    }

    sendSuccess(res, formatBookForResponse(book), 'Book details retrieved');
  } catch (error: any) {
    console.error('getBookById error:', error);
    sendError(res, 'Failed to fetch book details', error.message, 500);
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

    const { fileUrl } = await storageService.uploadFile(file);
    const ext = file.originalname.split('.').pop()?.toUpperCase() || 'EPUB';

    let extracted;
    if (ext === 'PDF') {
      extracted = await documentService.parsePdf(file.path, file.originalname);
    } else {
      extracted = await documentService.parseEpub(file.path, file.originalname);
    }

    const title = req.body.title || extracted.title;
    const author = req.body.author || req.user.name;
    const description = req.body.description || `Uploaded book "${title}" prepared for comfortable reading and AI learning in Elunè.`;
    const categoryId = req.body.categoryId || null;
    const requestedVisibility = (req.body.visibility || 'PRIVATE').toUpperCase();

    // RULE:
    // If PRIVATE -> status = APPROVED (owner only)
    // If PUBLIC -> status = PENDING (requires admin review)
    const visibility = requestedVisibility === 'PUBLIC' ? Visibility.PUBLIC : Visibility.PRIVATE;
    const status = visibility === 'PUBLIC' ? BookStatus.PENDING : BookStatus.APPROVED;

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
        chapters: {
          create: extracted.chapters.map((ch) => {
            const paragraphs = ch.content
              .split(/\n\s*\n/)
              .map((p) => p.trim())
              .filter((p) => p.length > 0);

            const contentBlocks = paragraphs.length > 0
              ? paragraphs.map((paraText, pIdx) => ({
                  blockIndex: pIdx + 1,
                  type: BlockType.PARAGRAPH,
                  text: paraText,
                  pageNumber: Math.max(1, Math.ceil((pIdx + 1) / 3))
                }))
              : [
                  {
                    blockIndex: 1,
                    type: BlockType.PARAGRAPH,
                    text: ch.content || 'Opening section',
                    pageNumber: 1
                  }
                ];

            return {
              chapterNumber: ch.chapterNumber,
              title: ch.title,
              contentBlocks: {
                create: contentBlocks
              }
            };
          })
        }
      },
      include: {
        category: true,
        chapters: {
          include: {
            contentBlocks: { take: 5 }
          }
        }
      }
    });

    // Auto-add to user's library
    await prisma.userBook.upsert({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId: book.id
        }
      },
      update: {},
      create: {
        userId: req.user.id,
        bookId: book.id
      }
    });

    const message =
      visibility === 'PUBLIC'
        ? 'Upload successful. Your book has been submitted for admin review.'
        : 'Upload successful. Your private book is ready in your personal sanctuary.';

    sendSuccess(res, formatBookForResponse(book), message, 201);
  } catch (error: any) {
    console.error('uploadBook error:', error);
    sendError(res, 'Failed to process and upload book', error.message, 500);
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
