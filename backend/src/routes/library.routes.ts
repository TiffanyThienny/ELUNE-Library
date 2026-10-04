import { Router } from 'express';
import {
  getLibrary,
  addToLibrary,
  removeFromLibrary,
  toggleFavorite
} from '../controllers/library.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', getLibrary);
router.post('/:bookId', addToLibrary);
router.delete('/:bookId', removeFromLibrary);
router.post('/favorite/:bookId', toggleFavorite);

export default router;
