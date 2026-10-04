import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { formatBookForResponse } from './book.controller';
import { sendSuccess, sendError } from '../utils/response.util';

export const getLibrary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Authentication required to access personal library', 'UNAUTHORIZED', 401);
      return;
    }

    const userBooks = await prisma.userBook.findMany({
      where: { userId },
      include: {
        book: {
          include: {
            chapters: {
              select: { id: true, chapterNumber: true, title: true, readingTime: true, summary: true, content: true },
              orderBy: { chapterNumber: 'asc' }
            },
            summaries: {
              where: { summaryType: 'book' },
              take: 1
            },
            readingProgress: {
              where: { userId },
              take: 1
            }
          }
        }
      },
      orderBy: { addedAt: 'desc' }
    });

    const libraryItems = userBooks.map((ub) => ({
      ...formatBookForResponse(ub.book, ub.book.readingProgress[0]),
      isFavorite: ub.isFavorite,
      addedAt: ub.addedAt
    }));

    sendSuccess(res, { books: libraryItems }, 'Personal library retrieved');
  } catch (error: any) {
    console.error('getLibrary error:', error);
    sendError(res, 'Failed to fetch personal library', error.message, 500);
  }
};

export const addToLibrary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const book = await prisma.book.findUnique({ where: { id: bookId } });
    if (!book) {
      sendError(res, `Book not found with ID ${bookId}`, 'NOT_FOUND', 404);
      return;
    }

    const userBook = await prisma.userBook.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      },
      update: {},
      create: {
        userId,
        bookId
      }
    });

    sendSuccess(res, userBook, 'Book added to personal library', 201);
  } catch (error: any) {
    console.error('addToLibrary error:', error);
    sendError(res, 'Failed to add book to library', error.message, 500);
  }
};

export const removeFromLibrary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    await prisma.userBook.deleteMany({
      where: {
        userId,
        bookId
      }
    });

    sendSuccess(res, { bookId }, 'Book removed from personal library');
  } catch (error: any) {
    console.error('removeFromLibrary error:', error);
    sendError(res, 'Failed to remove book from library', error.message, 500);
  }
};

export const toggleFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const userBook = await prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      }
    });

    let isFavorite = true;
    if (userBook) {
      isFavorite = !userBook.isFavorite;
      await prisma.userBook.update({
        where: { id: userBook.id },
        data: { isFavorite }
      });
    } else {
      await prisma.userBook.create({
        data: {
          userId,
          bookId,
          isFavorite: true
        }
      });
    }

    sendSuccess(res, { bookId, isFavorite }, `Book favorite status set to ${isFavorite}`);
  } catch (error: any) {
    console.error('toggleFavorite error:', error);
    sendError(res, 'Failed to toggle favorite status', error.message, 500);
  }
};
