import { Router } from 'express';
import {
  summarizeBook,
  summarizeChapter,
  askBookQuestion,
  getBookChatHistory,
  generateFlashcards,
  getFlashcards,
  generateQuiz,
  getQuiz,
  generateMindMap
} from '../controllers/ai.controller';
import { authenticateJwt, optionalAuth } from '../middleware/auth.middleware';
import { aiRateLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Apply AI rate limiter to all AI endpoints
router.use(aiRateLimiter);

router.post('/summarize/book/:bookId', optionalAuth, summarizeBook);
router.post('/summarize/chapter/:chapterId', optionalAuth, summarizeChapter);
router.post('/ask/:bookId', authenticateJwt, askBookQuestion);
router.get('/chat/:bookId', authenticateJwt, getBookChatHistory);
router.post('/flashcards/:bookId', optionalAuth, generateFlashcards);
router.get('/flashcards/:bookId', optionalAuth, getFlashcards);
router.post('/quiz/:bookId', optionalAuth, generateQuiz);
router.get('/quiz/:bookId', optionalAuth, getQuiz);
router.post('/mindmap/:bookId', optionalAuth, generateMindMap);

export default router;
