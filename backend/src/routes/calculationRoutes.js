import { Router } from 'express';
import { getCalculations, getUserCalculations, postCalculation } from '../controllers/calculationsController.js';
import { requireAdmin } from '../middleware/auth.js';
import { calculationLimiter } from '../middleware/rateLimit.js';

const router = Router();
router.post('/', calculationLimiter, postCalculation); // ochiq
router.get('/', requireAdmin, getCalculations); // faqat admin
router.get('/:userId', requireAdmin, getUserCalculations); // faqat admin
export default router;
