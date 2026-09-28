import { config } from '../config/env.js';
import { createCalculation, listCalculations } from '../services/calculationService.js';
import { notifyNewCalculation, notifyNewUser } from '../services/notificationService.js';
import { verifyInitData } from '../services/telegramAuth.js';
import { findUserById } from '../services/userService.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { parseId, parsePagination } from '../utils/validators.js';

/** POST /api/calculations — hisoblaydi, saqlaydi, adminlarga xabar yuboradi. */
export async function postCalculation(req, res) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest('So‘rov tanasi bo‘sh');

  let tgUser = null;
  if (body.initData) {
    const verified = verifyInitData(body.initData, config.botToken, { maxAgeSeconds: config.initDataMaxAgeSeconds });
    if (verified.ok) tgUser = verified.user;
    else console.warn(`[calc] initData qabul qilinmadi (${verified.reason}) — hisob mehmon sifatida saqlanadi`);
  }

  const { calculation, result, user, userIsNew } = await createCalculation(body, tgUser);

  if (userIsNew) notifyNewUser(user);
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
