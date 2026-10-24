import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { ENV } from './config/env';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { sendError } from './utils/response.util';
import { prisma } from './config/prisma';
import { isPublicBook, verifyCoverSignature } from './utils/coverUrl.util';

export const createApp = (): Express => {
  const app = express();

  // 1. Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  // 2. Controlled CORS (Do not use '*')
  const allowedOrigins = [
    ENV.FRONTEND_URL,
    'https://elune-gis.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173'
  ];

  // Pre-flight Private Network Access support
  app.use((req, res, next) => {
    if (req.headers['access-control-request-private-network']) {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        return callback(new Error('Blocked by CORS policy for Elunè API'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      // Range: pdf.js requests byte ranges of /api/books/:id/file for large PDFs.
      allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Access-Control-Request-Private-Network'],
      // Without these, a cross-origin pdf.js cannot see range support and falls back to full download.
      exposedHeaders: ['Accept-Ranges', 'Content-Range', 'Content-Length', 'Content-Encoding']
    })
  );

  // 3. Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Rate Limiting
  app.use('/api', apiLimiter);

  // 5. Static uploads directory for public assets (cover images only).
  // Book documents must never be served statically: PRIVATE / PENDING / REJECTED
  // files would bypass access control. They are streamed through the
  // permission-checked endpoint GET /api/books/:id/file instead.
  // Allowlist (not blocklist) so Windows path quirks such as "book.pdf." or
  // "book.pdf::$DATA" cannot slip a document through.
  const PUBLIC_ASSET_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  app.use('/uploads', async (req, res, next) => {
    const notFound = () => {
      sendError(res, 'File not found', 'NOT_FOUND', 404);
    };
    let requested = req.path;
    try {
      requested = decodeURIComponent(req.path);
    } catch {
      notFound();
      return;
    }
    const ext = path.extname(requested).toLowerCase();
    const filename = requested.replace(/^\/+/, '');
    if (!PUBLIC_ASSET_EXTENSIONS.includes(ext) || !filename || filename !== path.basename(filename)) {
      notFound();
      return;
    }

    // Cover access policy: only covers referenced by a book are served; covers
    // of non-public books additionally require a valid signed URL.
    try {
      const book = await prisma.book.findFirst({
        where: { coverUrl: `/uploads/${filename}` },
        select: { visibility: true, status: true }
      });
      if (!book) {
        notFound();
        return;
      }
      if (isPublicBook(book)) {
        res.setHeader('Cache-Control', 'public, max-age=0'); // same as express.static default
        next();
        return;
      }
      if (!verifyCoverSignature(filename, req.query.exp, req.query.sig)) {
        notFound();
        return;
      }
      res.setHeader('Cache-Control', 'private, max-age=3600');
      next();
    } catch (err) {
      next(err);
    }
  });
  app.use('/uploads', express.static(path.resolve(ENV.UPLOAD_DIR), { cacheControl: false }));

  // 6. API Routes
  app.use('/api', apiRoutes);

  // 7. Root message
  app.get('/', (_req, res) => {
    res.json({
      name: 'Elunè Peaceful Reading Companion API',
      status: 'active',
      documentation: '/api/health'
    });
  });

  // 8. 404 Handler & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
