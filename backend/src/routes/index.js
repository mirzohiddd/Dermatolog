import { Router } from 'express';
import accessRoutes from './accessRoutes.js';
import adminRoutes from './adminRoutes.js';
import authRoutes from './authRoutes.js';
import calculationRoutes from './calculationRoutes.js';
import userRoutes from './userRoutes.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
router.use('/auth', authRoutes);
router.use('/access', accessRoutes);
router.use('/users', userRoutes);
router.use('/calculations', calculationRoutes);
router.use('/admin', adminRoutes);

export default router;
