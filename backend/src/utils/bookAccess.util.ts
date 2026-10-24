import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendError } from './response.util';
import { canUserAccessBook } from './permission.util';

/**
 * Enforce the master book access rules (see permission.util.ts) for endpoints
 * that expose book-derived content (AI summaries, flashcards, quizzes, mind
 * maps, audio segments). Sends 404/403 and returns false when access is denied.
 */
export const ensureBookAccess = async (req: Request, res: Response, bookId: string): Promise<boolean> => {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: { id: true, visibility: true, status: true, uploadedBy: true }
  });
  if (!book) {
    sendError(res, 'Book not found', 'NOT_FOUND', 404);
    return false;
  }
  if (!canUserAccessBook(book, req.user)) {
    sendError(res, 'Access denied. You do not have permission to access this volume.', 'FORBIDDEN', 403);
    return false;
  }
  return true;
};

/**
 * Verify that a paragraph anchor (bookmark / note) is consistent and readable:
 * the content block must belong to the given chapter, the chapter to the given
 * book, and the user must be allowed to access that book. Without this, a user
 * could anchor a bookmark to another user's private paragraph and read its text
 * back through the bookmark/note list endpoints.
 */
export const ensureParagraphAnchorAccess = async (
  req: Request,
  res: Response,
  bookId: string,
  chapterId: string,
  contentBlockId: string
): Promise<boolean> => {
  const block = await prisma.contentBlock.findUnique({
    where: { id: contentBlockId },
    select: { id: true, chapterId: true, chapter: { select: { bookId: true } } }
  });
  if (!block || block.chapterId !== chapterId || block.chapter?.bookId !== bookId) {
    sendError(res, 'Paragraph not found in this book chapter', 'NOT_FOUND', 404);
    return false;
  }
  return ensureBookAccess(req, res, bookId);
};
