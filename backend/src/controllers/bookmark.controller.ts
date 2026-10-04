import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

export const getBookBookmarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId, bookId },
      include: {
        chapter: { select: { id: true, chapterNumber: true, title: true } },
        contentBlock: { select: { id: true, blockIndex: true, text: true, pageNumber: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, { bookmarks }, 'Bookmarks retrieved');
  } catch (error: any) {
    console.error('getBookBookmarks error:', error);
    sendError(res, 'Failed to retrieve bookmarks', error.message, 500);
  }
};

export const getAllUserBookmarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        book: { select: { id: true, title: true, author: true, coverBg: true } },
        chapter: { select: { id: true, chapterNumber: true, title: true } },
        contentBlock: {
          select: {
            id: true,
            blockIndex: true,
            text: true,
            pageNumber: true,
            audioSegments: { select: { startTime: true, endTime: true }, take: 1 }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = bookmarks.map((b) => ({
      id: b.id,
      bookId: b.bookId,
      bookTitle: b.book.title,
      author: b.book.author,
      coverBg: b.book.coverBg,
      chapterId: b.chapterId,
      chapterTitle: b.chapter.title,
      chapterNumber: b.chapter.chapterNumber,
      contentBlockId: b.contentBlockId,
      pageNumber: b.pageNumber,
      paragraphPreview: b.contentBlock ? b.contentBlock.text.slice(0, 160) + '...' : '',
      startTime: b.contentBlock?.audioSegments[0]?.startTime || 0,
      note: b.note,
      createdAt: b.createdAt
    }));

    sendSuccess(res, { bookmarks: formatted }, 'All user bookmarks retrieved');
  } catch (error: any) {
    console.error('getAllUserBookmarks error:', error);
    sendError(res, 'Failed to fetch bookmarks', error.message, 500);
  }
};

export const createBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;
    const { chapterId, contentBlockId, pageNumber, note } = req.body;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    if (!contentBlockId || !chapterId) {
      sendError(res, 'contentBlockId and chapterId are required for canonical paragraph bookmark', 'VALIDATION_ERROR', 400);
      return;
    }

    const bookmark = await prisma.bookmark.upsert({
      where: {
        userId_contentBlockId: {
          userId,
          contentBlockId
        }
      },
      update: {
        note: note || undefined
      },
      create: {
        userId,
        bookId,
        chapterId,
        contentBlockId,
        pageNumber: pageNumber ? Number(pageNumber) : 1,
        note: note || null
      }
    });

    sendSuccess(res, bookmark, 'Bookmark saved per paragraph', 201);
  } catch (error: any) {
    console.error('createBookmark error:', error);
    sendError(res, 'Failed to create bookmark', error.message, 500);
  }
};

export const deleteBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookmarkId } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const existing = await prisma.bookmark.findUnique({
      where: { id: bookmarkId }
    });

    if (!existing) {
      sendError(res, 'Bookmark not found', 'NOT_FOUND', 404);
      return;
    }

    if (existing.userId !== userId) {
      sendError(res, 'Unauthorized access to this bookmark', 'FORBIDDEN', 403);
      return;
    }

    await prisma.bookmark.delete({
      where: { id: bookmarkId }
    });

    sendSuccess(res, { id: bookmarkId }, 'Bookmark deleted');
  } catch (error: any) {
    console.error('deleteBookmark error:', error);
    sendError(res, 'Failed to delete bookmark', error.message, 500);
  }
};
