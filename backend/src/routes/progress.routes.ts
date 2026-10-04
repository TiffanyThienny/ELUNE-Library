import { Router } from 'express';
import {
  getProgress,
  updateProgress,
  getReadingHistory
} from '../controllers/progress.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/history', getReadingHistory);
router.get('/:bookId/progress', getProgress);
router.put('/:bookId/progress', updateProgress);

export default router;
