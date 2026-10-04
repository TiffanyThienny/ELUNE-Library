import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

export const getHighlights = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const highlights = await prisma.highlight.findMany({
      where: { userId },
      include: {
        book: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = highlights.map((h) => ({
      id: h.id,
      bookId: h.bookId,
      bookTitle: h.book.title,
      chapterId: h.chapterId || '',
      chapterTitle: h.chapterTitle || 'Chapter',
      text: h.text,
      color: h.color as any,
      note: h.note || undefined,
      createdAt: new Date(h.createdAt).toLocaleDateString()
    }));

    sendSuccess(res, { highlights: formatted }, 'Highlights retrieved');
  } catch (error: any) {
    console.error('getHighlights error:', error);
    sendError(res, 'Failed to fetch highlights', error.message, 500);
  }
};

export const createHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId, chapterId, chapterTitle, text, color, note } = req.body;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    if (!bookId || !text) {
      sendError(res, 'bookId and text are required', 'VALIDATION_ERROR', 400);
      return;
    }

    const hl = await prisma.highlight.create({
      data: {
        userId,
        bookId,
        chapterId: chapterId || null,
        chapterTitle: chapterTitle || null,
        text,
        color: color || 'yellow',
        note: note || null
      },
      include: {
        book: { select: { title: true } }
      }
    });

    sendSuccess(
      res,
      {
        id: hl.id,
        bookId: hl.bookId,
        bookTitle: hl.book.title,
        chapterId: hl.chapterId || '',
        chapterTitle: hl.chapterTitle || '',
        text: hl.text,
        color: hl.color,
        note: hl.note || undefined,
        createdAt: 'Just now'
      },
      'Highlight created',
      201
    );
  } catch (error: any) {
    console.error('createHighlight error:', error);
    sendError(res, 'Failed to create highlight', error.message, 500);
  }
};

export const deleteHighlight = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const existing = await prisma.highlight.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Highlight not found', 'NOT_FOUND', 404);
      return;
    }

    if (existing.userId !== userId) {
      sendError(res, 'Unauthorized to delete this highlight', 'FORBIDDEN', 403);
      return;
    }

    await prisma.highlight.delete({ where: { id } });
    sendSuccess(res, { id }, 'Highlight deleted');
  } catch (error: any) {
    console.error('deleteHighlight error:', error);
    sendError(res, 'Failed to delete highlight', error.message, 500);
  }
};
