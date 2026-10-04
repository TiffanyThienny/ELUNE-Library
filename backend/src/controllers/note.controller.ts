import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

export const getBookNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const notes = await prisma.note.findMany({
      where: { userId, bookId },
      include: {
        contentBlock: { select: { id: true, blockIndex: true, text: true, pageNumber: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });

    sendSuccess(res, { notes }, 'Book notes retrieved');
  } catch (error: any) {
    console.error('getBookNotes error:', error);
    sendError(res, 'Failed to retrieve notes', error.message, 500);
  }
};

export const getAllUserNotes = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const notes = await prisma.note.findMany({
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
            audioSegments: { select: { startTime: true }, take: 1 }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const formatted = notes.map((n) => ({
      id: n.id,
      bookId: n.bookId,
      bookTitle: n.book.title,
      author: n.book.author,
      coverBg: n.book.coverBg,
      chapterId: n.chapterId,
      chapterTitle: n.chapter.title,
      chapterNumber: n.chapter.chapterNumber,
      contentBlockId: n.contentBlockId,
      pageNumber: n.pageNumber,
      paragraphPreview: n.contentBlock ? n.contentBlock.text.slice(0, 160) + '...' : '',
      startTime: n.contentBlock?.audioSegments[0]?.startTime || 0,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt
    }));

    sendSuccess(res, { notes: formatted }, 'All user notes retrieved');
  } catch (error: any) {
    console.error('getAllUserNotes error:', error);
    sendError(res, 'Failed to fetch notes', error.message, 500);
  }
};

export const createNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;
    const { chapterId, contentBlockId, pageNumber, content } = req.body;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    if (!contentBlockId || !chapterId || !content) {
      sendError(res, 'contentBlockId, chapterId, and content are required', 'VALIDATION_ERROR', 400);
      return;
    }

    const note = await prisma.note.create({
      data: {
        userId,
        bookId,
        chapterId,
        contentBlockId,
        pageNumber: pageNumber ? Number(pageNumber) : 1,
        content
      }
    });

    sendSuccess(res, note, 'Note created for paragraph', 201);
  } catch (error: any) {
    console.error('createNote error:', error);
    sendError(res, 'Failed to create note', error.message, 500);
  }
};

export const updateNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { content } = req.body;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Note not found', 'NOT_FOUND', 404);
      return;
    }

    if (existing.userId !== userId) {
      sendError(res, 'Unauthorized to edit this note', 'FORBIDDEN', 403);
      return;
    }

    const updated = await prisma.note.update({
      where: { id },
      data: { content }
    });

    sendSuccess(res, updated, 'Note updated');
  } catch (error: any) {
    console.error('updateNote error:', error);
    sendError(res, 'Failed to update note', error.message, 500);
  }
};

export const deleteNote = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const existing = await prisma.note.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Note not found', 'NOT_FOUND', 404);
      return;
    }

    if (existing.userId !== userId) {
      sendError(res, 'Unauthorized to delete this note', 'FORBIDDEN', 403);
      return;
    }

    await prisma.note.delete({ where: { id } });
    sendSuccess(res, { id }, 'Note deleted');
  } catch (error: any) {
    console.error('deleteNote error:', error);
    sendError(res, 'Failed to delete note', error.message, 500);
  }
};
