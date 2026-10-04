import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { Visibility, BookStatus } from '@prisma/client';

export const getDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const [
      user,
      libraryCount,
      bookmarksCount,
      notesCount,
      summariesCount,
      quizzesCount,
      recentProgress,
      recommendedBooks
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, avatar: true, role: true }
      }),
      prisma.userBook.count({ where: { userId } }),
      prisma.bookmark.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
      prisma.summary.count({ where: { userId } }),
      prisma.quiz.count({ where: { userId } }),
      prisma.readingProgress.findMany({
        where: { userId },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverBg: true,
              coverTextColor: true,
              totalPages: true
            }
          }
        },
        orderBy: { lastReadAt: 'desc' },
        take: 3
      }),
      prisma.book.findMany({
        where: {
          visibility: Visibility.PUBLIC,
          status: BookStatus.APPROVED
        },
        include: {
          category: true,
          _count: { select: { chapters: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 6
      })
    ]);

    // Format continue reading items
    const continueReading = await Promise.all(
      recentProgress.map(async (item) => {
        let chapterTitle = 'Chapter 1';
        if (item.currentChapterId) {
          const ch = await prisma.chapter.findUnique({ where: { id: item.currentChapterId } });
          if (ch) chapterTitle = `Chapter ${ch.chapterNumber}: ${ch.title}`;
        }
        return {
          id: item.id,
          bookId: item.bookId,
          title: item.book.title,
          author: item.book.author,
          coverBg: item.book.coverBg,
          chapterTitle,
          pageNumber: item.currentPage,
          percent: Math.round(item.progressPercentage),
          lastRead: item.lastReadAt
        };
      })
    );

    sendSuccess(
      res,
      {
        user,
        statistics: {
          booksRead: continueReading.filter((c) => c.percent >= 90).length,
          booksInProgress: continueReading.filter((c) => c.percent < 90).length,
          booksSaved: libraryCount,
          bookmarksCount,
          notesCount,
          summariesCount,
          quizzesCount
        },
        continueReading,
        recommendedBooks: recommendedBooks.map((b) => ({
          id: b.id,
          title: b.title,
          author: b.author,
          category: b.category?.name || 'General',
          coverBg: b.coverBg,
          coverTextColor: b.coverTextColor,
          description: b.description,
          totalPages: b.totalPages
        }))
      },
      'User dashboard data retrieved'
    );
  } catch (error: any) {
    console.error('getDashboardData error:', error);
    sendError(res, 'Failed to fetch dashboard data', error.message, 500);
  }
};
