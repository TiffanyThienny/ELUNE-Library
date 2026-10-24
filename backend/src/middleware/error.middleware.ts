import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';
import { ENV } from '../config/env';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error('[API Error]:', err);

  // Multer upload errors should surface as clear 400s, not opaque 500s.
  if (err && err.name === 'MulterError') {
    const multerMessages: Record<string, string> = {
      LIMIT_FILE_SIZE: `File is too large. The maximum allowed size is ${ENV.MAX_FILE_SIZE_MB}MB.`,
      LIMIT_FIELD_VALUE: 'A form field (such as the cover image) is too large to process.',
      LIMIT_FILE_COUNT: 'Too many files were uploaded.',
      LIMIT_UNEXPECTED_FILE: 'An unexpected file field was received.'
    };
    const msg = multerMessages[err.code] || `Upload error: ${err.message}`;
    sendError(res, msg, err.code || 'UPLOAD_ERROR', 400);
    return;
  }

  const statusCode = err.statusCode || 500;

  // Client errors raised on purpose (e.g. upload filter): clear message + stable code, never a stack.
  if (statusCode >= 400 && statusCode < 500) {
    sendError(res, err.message || 'Bad request', typeof err.code === 'string' ? err.code : 'BAD_REQUEST', statusCode);
    return;
  }

  const message = err.message || 'Internal server error';
  const errorDetails = process.env.NODE_ENV === 'development' ? err.stack : undefined;

  sendError(res, message, errorDetails || message, statusCode);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND', 404);
};
