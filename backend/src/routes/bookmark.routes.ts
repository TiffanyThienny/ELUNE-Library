import { Router } from 'express';
import {
  getBookmarks,
  createBookmark,
  deleteBookmark
} from '../controllers/bookmark.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/books/:bookId/bookmarks', getBookmarks);
router.post('/books/:bookId/bookmarks', createBookmark);
router.delete('/bookmarks/:bookmarkId', deleteBookmark);

export default router;
