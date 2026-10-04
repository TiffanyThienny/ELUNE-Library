import { Router } from 'express';
import { getChapterAudio } from '../controllers/audio.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.get('/:bookId/:chapterId', optionalAuth, getChapterAudio);

export default router;
