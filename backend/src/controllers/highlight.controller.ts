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

    const notes = await prisma.note.findMany({
      where: { userId },
      include: {
        book: { select: { title: true } },
        chapter: { select: { title: true } },
        contentBlock: { select: { text: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = notes.map((n) => ({
      id: n.id,
      bookId: n.bookId,
      bookTitle: n.book.title,
      chapterId: n.chapterId,
      chapterTitle: n.chapter.title,
      text: n.contentBlock ? n.contentBlock.text : n.content,
      color: 'yellow' as const,
      note: n.content,
      createdAt: new Date(n.createdAt).toLocaleDateString()
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
    const { bookId, chapterId, contentBlockId, text, note } = req.body;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    if (!bookId) {
      sendError(res, 'bookId is required', 'VALIDATION_ERROR', 400);
      return;
    }

    const firstChapter = await prisma.chapter.findFirst({ where: { bookId }, include: { contentBlocks: { take: 1 } } });
    const targetChapterId = chapterId || firstChapter?.id;
    const targetContentBlockId = contentBlockId || firstChapter?.contentBlocks[0]?.id;

    if (!targetChapterId || !targetContentBlockId) {
      sendError(res, 'No chapter or content block found for this book', 'NOT_FOUND', 404);
      return;
    }

    const createdNote = await prisma.note.create({
      data: {
        userId,
        bookId,
        chapterId: targetChapterId,
        contentBlockId: targetContentBlockId,
        content: note || text || 'Highlighted note'
      },
      include: {
        book: { select: { title: true } }
      }
    });

    sendSuccess(
      res,
      {
        id: createdNote.id,
        bookId: createdNote.bookId,
        bookTitle: createdNote.book.title,
        text: text || createdNote.content,
        color: 'yellow',
        note: createdNote.content,
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

    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Highlight not found', 'NOT_FOUND', 404);
      return;
    }

    if (existing.userId !== userId) {
      sendError(res, 'Unauthorized to delete this note', 'FORBIDDEN', 403);
      return;
    }

    await prisma.note.delete({ where: { id } });
    sendSuccess(res, { id }, 'Highlight deleted');
  } catch (error: any) {
    console.error('deleteHighlight error:', error);
    sendError(res, 'Failed to delete highlight', error.message, 500);
  }
};
