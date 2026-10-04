import { Router } from 'express';
import {
  getBookNotes,
  getAllUserNotes,
  createNote,
  updateNote,
  deleteNote
} from '../controllers/note.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.get('/notes', authenticateJwt, getAllUserNotes);
router.get('/books/:bookId/notes', authenticateJwt, getBookNotes);
router.post('/books/:bookId/notes', authenticateJwt, createNote);
router.put('/notes/:id', authenticateJwt, updateNote);
router.delete('/notes/:id', authenticateJwt, deleteNote);

export default router;
