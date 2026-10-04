import { Router } from 'express';
import {
  getBooks,
  getBookById,
  uploadBook,
  getMyUploads,
  deleteBook
} from '../controllers/book.controller';
import { authenticateJwt, optionalAuth } from '../middleware/auth.middleware';
import { uploadBookFile } from '../middleware/upload.middleware';

const router = Router();

router.get('/', optionalAuth, getBooks);
router.get('/my-uploads', authenticateJwt, getMyUploads);
router.get('/:id', optionalAuth, getBookById);
router.post('/upload', authenticateJwt, uploadBookFile.single('file'), uploadBook);
router.delete('/:id', authenticateJwt, deleteBook);

export default router;
