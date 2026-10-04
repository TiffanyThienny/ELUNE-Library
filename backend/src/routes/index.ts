import { Router } from 'express';
import authRoutes from './auth.routes';
import bookRoutes from './book.routes';
import libraryRoutes from './library.routes';
import progressRoutes from './progress.routes';
import bookmarkRoutes from './bookmark.routes';
import highlightRoutes from './highlight.routes';
import aiRoutes from './ai.routes';
import ttsRoutes from './tts.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Elunè Peaceful Reading Companion API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/library', libraryRoutes);
router.use('/books', progressRoutes);
router.use('/', bookmarkRoutes);
router.use('/highlights', highlightRoutes);
router.use('/ai', aiRoutes);
router.use('/tts', ttsRoutes);

export default router;
