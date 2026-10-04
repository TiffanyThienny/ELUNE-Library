import { Router } from 'express';
import authRoutes from './auth.routes';
import bookRoutes from './book.routes';
import readerRoutes from './reader.routes';
import libraryRoutes from './library.routes';
import bookmarkRoutes from './bookmark.routes';
import noteRoutes from './note.routes';
import categoryRoutes from './category.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import audioRoutes from './audio.routes';
import aiRoutes from './ai.routes';
import ttsRoutes from './tts.routes';

const router = Router();

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'Elunè Digital Library & Peaceful Reading Companion API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/reader', readerRoutes);
router.use('/library', libraryRoutes);
router.use('/', bookmarkRoutes);
router.use('/', noteRoutes);
router.use('/categories', categoryRoutes);
router.use('/user', userRoutes);
router.use('/admin', adminRoutes);
router.use('/audio', audioRoutes);
router.use('/ai', aiRoutes);
router.use('/tts', ttsRoutes);

export default router;
