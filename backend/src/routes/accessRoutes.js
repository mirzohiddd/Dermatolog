import { Router } from 'express';
import { checkAccess } from '../controllers/accessController.js';
import { requireTelegramAccess } from '../middleware/telegramAccess.js';

const router = Router();
// Telegram Web App ochilganda: approved → 200, pending/rejected → 403, imzosiz → 401
router.post('/', requireTelegramAccess, checkAccess);
export default router;
