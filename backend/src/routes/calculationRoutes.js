import { Router } from 'express';
import { getCalculations, getUserCalculations, postCalculation } from '../controllers/calculationsController.js';
import { requireAdmin } from '../middleware/auth.js';
import { calculationLimiter } from '../middleware/rateLimit.js';
import { requireTelegramAccess } from '../middleware/telegramAccess.js';

const router = Router();
router.post('/', calculationLimiter, requireTelegramAccess, postCalculation); // faqat admin tasdiqlagan Telegram foydalanuvchi
router.get('/', requireAdmin, getCalculations); // faqat admin
router.get('/:userId', requireAdmin, getUserCalculations); // faqat admin
export default router;
