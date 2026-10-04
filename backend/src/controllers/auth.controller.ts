import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { ENV } from '../config/env';
import { sendSuccess, sendError } from '../utils/response.util';
import { Role } from '@prisma/client';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      sendError(res, 'Name, email, and password are required', 'VALIDATION_ERROR', 400);
      return;
    }

    if (password.length < 6) {
      sendError(res, 'Password must be at least 6 characters long', 'VALIDATION_ERROR', 400);
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existing) {
      sendError(res, 'A user with this email already exists', 'EMAIL_ALREADY_EXISTS', 409);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: Role.USER,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true
      }
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, ENV.JWT_SECRET, {
      expiresIn: (ENV.JWT_EXPIRES_IN || '7d') as any
    });

    sendSuccess(
      res,
      { user, token },
      'User registered successfully',
      201
    );
  } catch (error: any) {
    console.error('Register error:', error);
    sendError(res, 'Failed to register user', error.message, 500);
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      sendError(res, 'Email and password are required', 'VALIDATION_ERROR', 400);
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      sendError(res, 'Invalid email or password credentials', 'INVALID_CREDENTIALS', 401);
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      sendError(res, 'Invalid email or password credentials', 'INVALID_CREDENTIALS', 401);
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, ENV.JWT_SECRET, {
      expiresIn: (ENV.JWT_EXPIRES_IN || '7d') as any
    });

    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt
    };

    sendSuccess(
      res,
      { user: userProfile, token },
      'Logged in successfully',
      200
    );
  } catch (error: any) {
    console.error('Login error:', error);
    sendError(res, 'Failed to log in', error.message, 500);
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 'UNAUTHORIZED', 401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            userBooks: true,
            readingProgress: true,
            notes: true,
            bookmarks: true,
            uploadedBooks: true
          }
        }
      }
    });

    if (!user) {
      sendError(res, 'User not found', 'NOT_FOUND', 404);
      return;
    }

    sendSuccess(res, { user }, 'User profile retrieved successfully');
  } catch (error: any) {
    console.error('GetMe error:', error);
    sendError(res, 'Failed to fetch user profile', error.message, 500);
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, {}, 'Logged out successfully');
};
