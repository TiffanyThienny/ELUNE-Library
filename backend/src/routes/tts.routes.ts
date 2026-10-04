import { Router } from 'express';
import { synthesizeTTS } from '../controllers/tts.controller';
import { optionalAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/', optionalAuth, synthesizeTTS);

export default router;
