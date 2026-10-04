import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../config/prisma';
import { sendError } from '../utils/response.util';
import { Role } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticateJwt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'Authentication required. Missing or malformed token.', 'UNAUTHORIZED', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'Access token is required', 'UNAUTHORIZED', 401);
      return;
    }

    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: string; role?: Role };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!user) {
      sendError(res, 'User associated with token no longer exists', 'UNAUTHORIZED', 401);
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'Token has expired', 'TOKEN_EXPIRED', 401);
      return;
    }
    sendError(res, 'Invalid authentication token', 'INVALID_TOKEN', 401);
  }
};

export const authorizeRole = (allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(res, 'Access denied. You do not have permission to access this resource.', 'FORBIDDEN', 403);
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as { userId: string; role?: Role };
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, email: true, role: true }
      });
      if (user) {
        req.user = user;
      }
    }
  } catch {
    // Ignore invalid token in optional mode
  }
  next();
};
