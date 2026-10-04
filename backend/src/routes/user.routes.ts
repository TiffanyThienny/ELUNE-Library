import { Router } from 'express';
import { getDashboardData } from '../controllers/user.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/dashboard', getDashboardData);

export default router;
