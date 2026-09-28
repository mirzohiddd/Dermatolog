import { Router } from 'express';
import { getUser, getUsers, registerUser } from '../controllers/usersController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.post('/', registerUser); // Telegram Web App (imzo bilan)
router.get('/', requireAdmin, getUsers); // faqat admin
router.get('/:id', requireAdmin, getUser); // faqat admin
export default router;
