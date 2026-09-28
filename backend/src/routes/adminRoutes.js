import { Router } from 'express';
import { getStats } from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.get('/stats', requireAdmin, getStats);
export default router;
