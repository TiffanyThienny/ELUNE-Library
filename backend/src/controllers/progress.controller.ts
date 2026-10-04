import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';

export const getProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const progress = await prisma.readingProgress.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      }
    });

    if (!progress) {
      sendSuccess(
        res,
        {
          currentPage: 1,
          currentChapterId: null,
          currentContentBlockId: null,
          progressPercentage: 0,
          lastReadAt: new Date().toISOString()
        },
        'No prior progress recorded'
      );
      return;
    }

    sendSuccess(res, progress, 'Reading progress retrieved');
  } catch (error: any) {
    console.error('getProgress error:', error);
    sendError(res, 'Failed to fetch reading progress', error.message, 500);
  }
};

export const updateProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { bookId } = req.params;
    const { currentPage, currentChapterId, currentContentBlockId, progressPercentage } = req.body;

    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const progress = await prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId
        }
      },
      update: {
        currentPage: currentPage !== undefined ? Number(currentPage) : undefined,
        currentChapterId: currentChapterId !== undefined ? currentChapterId : undefined,
        currentContentBlockId: currentContentBlockId !== undefined ? currentContentBlockId : undefined,
        progressPercentage: progressPercentage !== undefined ? Number(progressPercentage) : undefined,
        lastReadAt: new Date()
      },
      create: {
        userId,
        bookId,
        currentPage: currentPage ? Number(currentPage) : 1,
        currentChapterId: currentChapterId || null,
        currentContentBlockId: currentContentBlockId || null,
        progressPercentage: progressPercentage ? Number(progressPercentage) : 0,
        lastReadAt: new Date()
      }
    });

    sendSuccess(res, progress, 'Reading progress updated successfully');
  } catch (error: any) {
    console.error('updateProgress error:', error);
    sendError(res, 'Failed to update reading progress', error.message, 500);
  }
};

export const getReadingHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const progressList = await prisma.readingProgress.findMany({
      where: { userId },
      include: {
        book: {
          include: {
            chapters: {
              select: { id: true, chapterNumber: true, title: true }
            }
          }
        }
      },
      orderBy: { lastReadAt: 'desc' }
    });

    const now = new Date().getTime();
    const historyItems = progressList.map((item) => {
      const diffMs = now - new Date(item.lastReadAt).getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      let timePeriod: 'Today' | 'Yesterday' | 'This Week' | 'Earlier' = 'Earlier';
      if (diffHours < 24) timePeriod = 'Today';
      else if (diffHours < 48) timePeriod = 'Yesterday';
      else if (diffHours < 168) timePeriod = 'This Week';

      const currentCh = item.book.chapters.find((c) => c.id === item.currentChapterId) || item.book.chapters[0];

      return {
        id: item.id,
        bookId: item.bookId,
        bookTitle: item.book.title,
        author: item.book.author,
        coverBg: item.book.coverBg,
        chapterTitle: currentCh ? currentCh.title : 'Introduction',
        percent: Math.round(item.progressPercentage),
        lastOpened: new Date(item.lastReadAt).toLocaleString(),
        timePeriod
      };
    });

    sendSuccess(res, { history: historyItems }, 'Reading history retrieved');
  } catch (error: any) {
    console.error('getReadingHistory error:', error);
    sendError(res, 'Failed to retrieve reading history', error.message, 500);
  }
};
