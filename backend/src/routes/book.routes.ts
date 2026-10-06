import { Router } from 'express';
import {
  getBooks,
  getBookById,
  getBookFile,
  getBookContent,
  getBookProgress,
  saveBookProgress,
  getBookAudio,
  generateBookAudio,
  uploadBook,
  getMyUploads,
  deleteBook,
} from '../controllers/book.controller';
import { authenticateJwt, optionalAuth } from '../middleware/auth.middleware';
import { uploadBookFile } from '../middleware/upload.middleware';

const router = Router();

router.get('/', optionalAuth, getBooks);
router.get('/public', optionalAuth, getBooks);
router.get('/my-uploads', authenticateJwt, getMyUploads);
router.get('/:id', optionalAuth, getBookById);
router.get('/:id/content', optionalAuth, getBookContent);
router.get('/:id/progress', authenticateJwt, getBookProgress);
router.put('/:id/progress', authenticateJwt, saveBookProgress);
router.get('/:id/audio', optionalAuth, getBookAudio);
router.post('/:id/audio/generate', authenticateJwt, generateBookAudio);
router.get('/:id/file', optionalAuth, getBookFile);
router.post('/upload', authenticateJwt, uploadBookFile.single('file'), uploadBook);
router.delete('/:id', authenticateJwt, deleteBook);

export default router;
