import { Router } from 'express';
import {
  getBookBookmarks,
  getAllUserBookmarks,
  createBookmark,
  deleteBookmark
} from '../controllers/bookmark.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.get('/bookmarks', authenticateJwt, getAllUserBookmarks);
router.get('/books/:bookId/bookmarks', authenticateJwt, getBookBookmarks);
router.post('/books/:bookId/bookmarks', authenticateJwt, createBookmark);
router.delete('/bookmarks/:bookmarkId', authenticateJwt, deleteBookmark);

export default router;
