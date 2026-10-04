import { Router } from 'express';
import {
  getHighlights,
  createHighlight,
  deleteHighlight
} from '../controllers/highlight.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', getHighlights);
router.post('/', createHighlight);
router.delete('/:id', deleteHighlight);

export default router;
