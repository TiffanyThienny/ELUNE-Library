import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { canUserAccessBook } from '../utils/permission.util';
import { presentCoverUrl } from '../utils/coverUrl.util';
import { ensureBookAccess } from '../utils/bookAccess.util';

export const getReaderData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.id;

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        category: true,
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          include: {
            contentBlocks: {
              orderBy: { blockIndex: 'asc' }
            },
            audioTracks: {
              include: {
                segments: true
              }
            }
          }
        },
        audioTracks: {
          include: {
            segments: true
          }
        }
      }
    });

    if (!book) {
      sendError(res, 'Book not found', 'NOT_FOUND', 404);
      return;
    }

    // STRICT MASTER READER ACCESS CONTROL
    if (!canUserAccessBook(book, req.user)) {
      sendError(res, 'Access denied. You do not have permission to read this volume.', 'FORBIDDEN', 403);
      return;
    }

    // Fetch user bookmarks & notes & reading progress if authenticated
    let userBookmarks: any[] = [];
    let userNotes: any[] = [];
    let readingProgress: any = null;

    if (userId) {
      [userBookmarks, userNotes, readingProgress] = await Promise.all([
        prisma.bookmark.findMany({
          where: { userId, bookId },
          select: { id: true, chapterId: true, contentBlockId: true, pageNumber: true, note: true }
        }),
        prisma.note.findMany({
          where: { userId, bookId },
          select: { id: true, chapterId: true, contentBlockId: true, pageNumber: true, content: true, updatedAt: true }
        }),
        prisma.readingProgress.findUnique({
          where: { userId_bookId: { userId, bookId } }
        })
      ]);
    }

    const formattedChapters = book.chapters.map((ch) => ({
      id: ch.id,
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      contentBlocks: ch.contentBlocks.map((b) => ({
        id: b.id,
        blockIndex: b.blockIndex,
        type: b.type,
        text: b.text,
        pageNumber: b.pageNumber,
        startOffset: b.startOffset || 0,
        endOffset: b.endOffset || 0,
      })),
      audioTrack: ch.audioTracks[0] || null,
      audioSegments: ch.audioTracks[0]?.segments || [],
    }));

    sendSuccess(
      res,
      {
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          description: book.description,
          category: book.category ? book.category.name : 'General',
          coverBg: book.coverBg,
          coverTextColor: book.coverTextColor,
          coverUrl: presentCoverUrl(book),
          totalPages: book.totalPages,
          visibility: book.visibility,
          status: book.status,
          // Needed by the visual PDF reader. The file itself is only served by the
          // access-checked GET /api/books/:id/file (never statically).
          fileUrl: book.fileUrl,
          hasFile: Boolean(book.fileUrl),
          fileStreamUrl: book.fileUrl ? `/api/books/${book.id}/file` : null,
          fileType: book.fileType,
          isScanned: book.isScanned,
          processingStatus: book.processingStatus,
          processingError: book.processingError,
          uploadedBy: book.uploadedBy,
          chapters: formattedChapters,
        },
        chapters: formattedChapters,
        globalAudioTrack: book.audioTracks[0] || null,
        bookmarks: userBookmarks,
        notes: userNotes,
        userBookmarks,
        userNotes,
        readingProgress: readingProgress || {
          currentChapterId: book.chapters[0]?.id || null,
          currentContentBlockId: book.chapters[0]?.contentBlocks[0]?.id || null,
          currentPage: 1,
          progressPercentage: 0,
        },
      },
      'Reader session loaded successfully'
    );
  } catch (error: any) {
    console.error('getReaderData error:', error);
    sendError(res, 'Failed to load reader data', error.message, 500);
  }
};

export const saveReadingProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { bookId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      sendError(res, 'Authentication required to save progress', 'UNAUTHORIZED', 401);
      return;
    }

    if (!(await ensureBookAccess(req, res, bookId))) return;

    // Accept both naming conventions. The reader frontend sends chapterId /
    // contentBlockId / pageNumber; the book-progress endpoint uses the current* names.
    const currentChapterId = req.body.currentChapterId ?? req.body.chapterId;
    const currentContentBlockId = req.body.currentContentBlockId ?? req.body.contentBlockId;
    const currentPage = req.body.currentPage ?? req.body.pageNumber;
    const { progressPercentage } = req.body;

    const progress = await prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      },
      update: {
        currentChapterId: currentChapterId || undefined,
        currentContentBlockId: currentContentBlockId || undefined,
        currentPage: currentPage ? Number(currentPage) : undefined,
        progressPercentage: progressPercentage !== undefined ? Number(progressPercentage) : undefined,
        lastReadAt: new Date()
      },
      create: {
        userId,
        bookId,
        currentChapterId: currentChapterId || null,
        currentContentBlockId: currentContentBlockId || null,
        currentPage: currentPage ? Number(currentPage) : 1,
        progressPercentage: progressPercentage ? Number(progressPercentage) : 0,
        lastReadAt: new Date()
      }
    });

    sendSuccess(res, progress, 'Reading progress saved');
  } catch (error: any) {
    console.error('saveReadingProgress error:', error);
    sendError(res, 'Failed to save reading progress', error.message, 500);
  }
};
