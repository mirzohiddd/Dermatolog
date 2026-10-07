import { Router } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import { getDashboardStats } from '../services/statsService.js';

const router = Router();

/** GET /api/admin/stats — dashboard raqamlari (faqat admin, JWT talab qilinadi). */
router.get('/stats', requireAdmin, async (_req, res) => {
  res.json(await getDashboardStats());
});

export default router;