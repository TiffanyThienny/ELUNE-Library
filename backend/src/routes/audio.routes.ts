import { Router } from 'express';
import { getChapterAudio } from '../controllers/audio.controller';
import { generateBookAudio } from '../controllers/book.controller';
import { optionalAuth, authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.get('/:bookId/:chapterId', optionalAuth, getChapterAudio);
router.post('/books/:bookId/generate', authenticateJwt, generateBookAudio);

export default router;
