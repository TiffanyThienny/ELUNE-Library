import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { ENV } from './config/env';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';

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
      allowedHeaders: ['Content-Type', 'Authorization']
    })
  );

  // 3. Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 4. Rate Limiting
  app.use('/api', apiLimiter);

  // 5. Static uploads directory for reader assets/covers/files
  app.use('/uploads', express.static(path.resolve(ENV.UPLOAD_DIR)));

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
