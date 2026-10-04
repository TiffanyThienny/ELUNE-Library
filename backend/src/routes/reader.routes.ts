import { Router } from 'express';
import { getReaderData, saveReadingProgress } from '../controllers/reader.controller';
import { optionalAuth, authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.get('/:bookId', optionalAuth, getReaderData);
router.post('/:bookId/progress', authenticateJwt, saveReadingProgress);

export default router;
