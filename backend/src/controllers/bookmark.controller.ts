import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

export const getBookmarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId,
        bookId
      },
      include: {
        chapter: {
          select: { id: true, chapterNumber: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, { bookmarks }, 'Bookmarks retrieved');
  } catch (error: any) {
    console.error('getBookmarks error:', error);
    sendError(res, 'Failed to retrieve bookmarks', error.message, 500);
  }
};

export const createBookmark = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;
    const { page, chapterId, note } = req.body;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const bookmark = await prisma.bookmark.create({
      data: {
        userId,
        bookId,
        page: page ? Number(page) : 1,
        chapterId: chapterId || null,
        note: note || null
      }
    });

    sendSuccess(res, bookmark, 'Bookmark created', 201);
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
