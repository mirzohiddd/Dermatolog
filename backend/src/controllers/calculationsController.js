import { createCalculation, listCalculations } from '../services/calculationService.js';
import { notifyNewCalculation } from '../services/notificationService.js';
import { findUserById } from '../services/userService.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { parseId, parsePagination } from '../utils/validators.js';

/**
 * POST /api/calculations — hisoblaydi, saqlaydi, adminlarga xabar yuboradi.
 * Bu yerga faqat imzosi to‘g‘ri va statusi `approved` bo‘lgan Telegram foydalanuvchi yetib keladi
 * (`requireTelegramAccess` middleware).
 */
export async function postCalculation(req, res) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('So‘rov tanasi bo‘sh');

  const { calculation, result, user } = await createCalculation(body, req.accessUser);

  notifyNewCalculation(calculation, user);

  res.status(201).json({ id: calculation.id, createdAt: calculation.createdAt, linkedToTelegram: Boolean(user), result });
}

export async function getCalculations(req, res) {
  const { page, limit } = parsePagination(req.query);
  res.json(await listCalculations({ page, limit }));
}

export async function getUserCalculations(req, res) {
  const userId = parseId(req.params.userId, 'Foydalanuvchi ID');
  if (!(await findUserById(userId))) throw notFound('Foydalanuvchi topilmadi');
  const { page, limit } = parsePagination(req.query);
  res.json(await listCalculations({ page, limit, userId }));
}
