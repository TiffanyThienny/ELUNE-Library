import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response.util';
import { BookStatus, Visibility, Role, ReviewAction } from '@prisma/client';

export const getStatistics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalBooks,
      publicBooks,
      privateBooks,
      pendingUploads,
      approvedBooks,
      rejectedBooks,
      totalAiChats,
      totalSummaries,
      activeReaders
    ] = await Promise.all([
      prisma.user.count(),
      prisma.book.count(),
      prisma.book.count({ where: { visibility: Visibility.PUBLIC } }),
      prisma.book.count({ where: { visibility: Visibility.PRIVATE } }),
      prisma.book.count({ where: { status: BookStatus.PENDING } }),
      prisma.book.count({ where: { status: BookStatus.APPROVED } }),
      prisma.book.count({ where: { status: BookStatus.REJECTED } }),
      prisma.aIChat.count(),
      prisma.summary.count(),
      prisma.readingProgress.count({
        where: {
          lastReadAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    sendSuccess(
      res,
      {
        totalUsers,
        totalBooks,
        publicBooks,
        privateBooks,
        pendingUploads,
        approvedBooks,
        rejectedBooks,
        totalAiRequests: totalAiChats + totalSummaries,
        activeReaders
      },
      'Admin statistics retrieved'
    );
  } catch (error: any) {
    console.error('getStatistics error:', error);
    sendError(res, 'Failed to fetch admin statistics', error.message, 500);
  }
};

export const getPendingBooks = async (_req: Request, res: Response): Promise<void> => {
  try {
    const pending = await prisma.book.findMany({
      where: { status: BookStatus.PENDING },
      include: {
        category: true,
        uploader: { select: { id: true, name: true, email: true } },
        _count: { select: { chapters: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, { books: pending }, 'Pending uploads retrieved');
  } catch (error: any) {
    console.error('getPendingBooks error:', error);
    sendError(res, 'Failed to fetch pending books', error.message, 500);
  }
};

export const reviewBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    const reviewerId = req.user?.id;

    if (!reviewerId) {
      sendError(res, 'Admin authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    const rawAction = String(action || '').toUpperCase();
    const isApproved = rawAction === 'APPROVE' || rawAction === 'APPROVED';
    const isRejected = rawAction === 'REJECT' || rawAction === 'REJECTED';

    if (!isApproved && !isRejected) {
      sendError(res, 'Action must be APPROVE or REJECT', 'VALIDATION_ERROR', 400);
      return;
    }

    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Book not found', 'NOT_FOUND', 404);
      return;
    }

    const [updatedBook, reviewRecord] = await prisma.$transaction([
      prisma.book.update({
        where: { id },
        data: {
          status: isApproved ? BookStatus.APPROVED : BookStatus.REJECTED,
          visibility: isApproved ? Visibility.PUBLIC : existing.visibility,
          rejectionReason: isApproved ? null : (notes || 'Submission does not meet catalog guidelines.')
        }
      }),
      prisma.bookUploadReview.create({
        data: {
          bookId: id,
          reviewerId,
          action: isApproved ? ReviewAction.APPROVED : ReviewAction.REJECTED,
          notes: notes || null
        }
      })
    ]);

    sendSuccess(
      res,
      { book: updatedBook, review: reviewRecord },
      `Book has been ${isApproved ? 'approved' : 'rejected'} successfully`
    );
  } catch (error: any) {
    console.error('reviewBook error:', error);
    sendError(res, 'Failed to review book', error.message, 500);
  }
};

export const toggleBookVisibility = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.book.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Book not found', 'NOT_FOUND', 404);
      return;
    }

    const newVisibility = existing.visibility === Visibility.PUBLIC ? Visibility.PRIVATE : Visibility.PUBLIC;
    const newStatus = newVisibility === Visibility.PUBLIC ? BookStatus.APPROVED : existing.status;

    const updated = await prisma.book.update({
      where: { id },
      data: {
        visibility: newVisibility,
        status: newStatus
      }
    });

    sendSuccess(res, { book: updated }, `Book visibility updated to ${newVisibility}`);
  } catch (error: any) {
    console.error('toggleBookVisibility error:', error);
    sendError(res, 'Failed to update visibility', error.message, 500);
  }
};

export const getAllBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as BookStatus | undefined;
    const visibility = req.query.visibility as Visibility | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (visibility) where.visibility = visibility;

    const books = await prisma.book.findMany({
      where,
      include: {
        category: true,
        uploader: { select: { id: true, name: true, email: true } },
        _count: { select: { chapters: true, userBooks: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, { books }, 'All books retrieved');
  } catch (error: any) {
    console.error('getAllBooks error:', error);
    sendError(res, 'Failed to fetch books', error.message, 500);
  }
};

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            uploadedBooks: true,
            bookmarks: true,
            notes: true,
            userBooks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    sendSuccess(res, { users }, 'Users list retrieved');
  } catch (error: any) {
    console.error('getUsers error:', error);
    sendError(res, 'Failed to retrieve users', error.message, 500);
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || ![Role.USER, Role.ADMIN].includes(role)) {
      sendError(res, 'Role must be USER or ADMIN', 'VALIDATION_ERROR', 400);
      return;
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    sendSuccess(res, { user: updated }, `User role updated to ${role}`);
  } catch (error: any) {
    console.error('updateUserRole error:', error);
    sendError(res, 'Failed to update user role', error.message, 500);
  }
};
