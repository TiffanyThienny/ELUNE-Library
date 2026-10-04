import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { storageService } from '../services/storage.service';
import { documentService } from '../services/document.service';
import { sendSuccess, sendError } from '../utils/response.util';

// Format database book entity into full frontend Book model
export const formatBookForResponse = (book: any, progress?: any) => {
  let parsedSummary = {
    quickOverview: book.description || '',
    mainIdeas: [],
    keyTakeaways: [],
    importantConcepts: []
  };

  // Find book-level summary if included
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
    currentChapter: 0,
    progressPercentage: 0,
    lastReadAt: new Date().toISOString()
  };

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    coverBg: book.coverBg || 'linear-gradient(135deg, #8C7355 0%, #4A3E3D 100%)',
    coverTextColor: book.coverTextColor || '#FAF0E6',
    readingTime: book.readingTime || '3 hrs',
    totalPages: book.totalPages || 100,
    description: book.description,
    publicationYear: book.publicationYear || '2026',
    isUploaded: Boolean(book.uploadedBy),
    uploadedAt: book.uploadedBy ? new Date(book.createdAt).toLocaleDateString() : undefined,
    isAudioAvailable: book.isAudioAvailable,
    audioDuration: book.audioDuration,
    audioUrl: book.audioUrl,
    fileUrl: book.fileUrl,
    fileType: book.fileType,
    chapters: (book.chapters || []).map((ch: any) => ({
      id: ch.id,
      number: ch.chapterNumber,
      title: ch.title,
      readingTime: ch.readingTime || '15 mins',
      summary: ch.summary || '',
      keyPoints: ch.keyPoints || [],
      content: ch.content
    })),
    summary: parsedSummary,
    presetQAs: [
      {
        question: `What is the main topic of "${book.title}"?`,
        answer: `${book.title} by ${book.author} delves into ${book.category.toLowerCase()} and cultivating disciplined insight.`
      },
      {
        question: `How can I apply lessons from this book?`,
        answer: `Reflect on the chapter summaries and implement deliberate contemplation daily.`
      }
    ],
    progress: {
      chapterIndex: defaultProgress.currentChapter || 0,
      pageNumber: defaultProgress.currentPage || 1,
      percent: Math.round(defaultProgress.progressPercentage || 0),
      lastRead: defaultProgress.lastReadAt ? new Date(defaultProgress.lastReadAt).toLocaleDateString() : 'Just now'
    }
  };
};

export const getBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const search = (req.query.search as string)?.trim();
    const category = (req.query.category as string)?.trim();
    const sort = (req.query.sort as string) || 'latest';

    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category && category !== 'All') {
      where.category = { equals: category, mode: 'insensitive' };
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
          chapters: {
            select: { id: true, chapterNumber: true, title: true, readingTime: true, summary: true, content: true },
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
      'Books fetched successfully'
    );
  } catch (error: any) {
    console.error('getBooks error:', error);
    sendError(res, 'Failed to retrieve books', error.message, 500);
  }
};

export const getBookById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        chapters: {
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

    sendSuccess(res, formatBookForResponse(book), 'Book details retrieved');
  } catch (error: any) {
    console.error('getBookById error:', error);
    sendError(res, 'Failed to fetch book details', error.message, 500);
  }
};

export const createBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      author,
      description,
      category,
      coverBg,
      coverTextColor,
      readingTime,
      totalPages,
      publicationYear,
      chapters
    } = req.body;

    if (!title || !author) {
      sendError(res, 'Title and Author are required', 'VALIDATION_ERROR', 400);
      return;
    }

    const created = await prisma.book.create({
      data: {
        title,
        author,
        description: description || `A thoughtful exploration of ${title}`,
        category: category || 'Self Development',
        coverBg: coverBg || 'linear-gradient(135deg, #8C7355 0%, #4A3E3D 100%)',
        coverTextColor: coverTextColor || '#FAF0E6',
        readingTime: readingTime || '3 hrs',
        totalPages: totalPages || 150,
        publicationYear: publicationYear || '2026',
        uploadedBy: req.user?.id || null,
        chapters: chapters
          ? {
              create: chapters.map((ch: any, idx: number) => ({
                chapterNumber: ch.number || idx + 1,
                title: ch.title || `Chapter ${idx + 1}`,
                readingTime: ch.readingTime || '15 mins',
                summary: ch.summary || '',
                content: ch.content || ''
              }))
            }
          : undefined
      },
      include: {
        chapters: true,
        summaries: true
      }
    });

    sendSuccess(res, formatBookForResponse(created), 'Book created successfully', 201);
  } catch (error: any) {
    console.error('createBook error:', error);
    sendError(res, 'Failed to create book', error.message, 500);
  }
};

export const uploadBook = async (req: Request, res: Response): Promise<void> => {
  try {
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
    const author = req.body.author || 'Uploaded Author';
    const category = req.body.category || 'Self Development';

    const book = await prisma.book.create({
      data: {
        title,
        author,
        description:
          req.body.description ||
          `Your uploaded book "${title}" is ready for distraction-free reading and AI summaries in Elunè.`,
        category,
        coverBg: req.body.coverBg || 'linear-gradient(135deg, #8C7355 0%, #4A3E3D 100%)',
        coverTextColor: '#FAF0E6',
        fileUrl,
        fileType: ext,
        totalPages: extracted.totalPages,
        readingTime: `${Math.max(1, Math.ceil(extracted.totalPages / 35))} hrs`,
        publicationYear: new Date().getFullYear().toString(),
        uploadedBy: req.user?.id || null,
        chapters: {
          create: extracted.chapters.map((ch) => ({
            chapterNumber: ch.chapterNumber,
            title: ch.title,
            readingTime: ch.readingTime || '15 mins',
            summary: ch.summary || '',
            content: ch.content
          }))
        }
      },
      include: {
        chapters: true,
        summaries: true
      }
    });

    // Also add to user's library if authenticated
    if (req.user) {
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
    }

    sendSuccess(res, formatBookForResponse(book), 'Book uploaded and processed successfully', 201);
  } catch (error: any) {
    console.error('uploadBook error:', error);
    sendError(res, 'Failed to process and upload book', error.message, 500);
  }
};

export const updateBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, author, description, category, coverBg } = req.body;

    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Book not found', 'NOT_FOUND', 404);
      return;
    }

    // Only allow update if uploader or admin
    if (existing.uploadedBy && req.user && existing.uploadedBy !== req.user.id) {
      sendError(res, 'You do not have permission to edit this book', 'FORBIDDEN', 403);
      return;
    }

    const updated = await prisma.book.update({
      where: { id },
      data: {
        title: title || undefined,
        author: author || undefined,
        description: description || undefined,
        category: category || undefined,
        coverBg: coverBg || undefined
      },
      include: {
        chapters: true,
        summaries: true
      }
    });

    sendSuccess(res, formatBookForResponse(updated), 'Book updated successfully');
  } catch (error: any) {
    console.error('updateBook error:', error);
    sendError(res, 'Failed to update book', error.message, 500);
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

    await prisma.book.delete({ where: { id } });
    sendSuccess(res, { id }, 'Book deleted successfully');
  } catch (error: any) {
    console.error('deleteBook error:', error);
    sendError(res, 'Failed to delete book', error.message, 500);
  }
};
