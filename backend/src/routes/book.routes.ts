import { Router } from 'express';
import {
  getBooks,
  getBookById,
  createBook,
  uploadBook,
  updateBook,
  deleteBook
} from '../controllers/book.controller';
import { authenticateJwt, optionalAuth } from '../middleware/auth.middleware';
import { uploadBookFile } from '../middleware/upload.middleware';

const router = Router();

router.get('/', optionalAuth, getBooks);
router.get('/:id', optionalAuth, getBookById);
router.post('/', authenticateJwt, createBook);
router.post('/upload', optionalAuth, uploadBookFile.single('file'), uploadBook);
router.put('/:id', authenticateJwt, updateBook);
router.delete('/:id', authenticateJwt, deleteBook);

export default router;
