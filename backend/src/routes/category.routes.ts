import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/category.controller';
import { authenticateJwt, authorizeRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', getCategories);

// Admin-only category management
router.post('/', authenticateJwt, authorizeRole([Role.ADMIN]), createCategory);
router.put('/:id', authenticateJwt, authorizeRole([Role.ADMIN]), updateCategory);
router.delete('/:id', authenticateJwt, authorizeRole([Role.ADMIN]), deleteCategory);

export default router;
