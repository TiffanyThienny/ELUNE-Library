import { Router } from 'express';
import {
  getStatistics,
  getPendingBooks,
  approveBook,
  rejectBook,
  reviewBook,
  toggleBookVisibility,
  getAllBooks,
  getUsers,
  updateUserRole
} from '../controllers/admin.controller';
import { authenticateJwt, authorizeRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Restrict entire admin router to ADMIN role
router.use(authenticateJwt);
router.use(authorizeRole([Role.ADMIN]));

router.get('/statistics', getStatistics);
router.get('/books/pending', getPendingBooks);
router.put('/books/:id/approve', approveBook);
router.put('/books/:id/reject', rejectBook);
router.post('/books/:id/review', reviewBook);
router.post('/books/:id/toggle-visibility', toggleBookVisibility);
router.get('/books', getAllBooks);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);

export default router;
