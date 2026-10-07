import { config } from '../config/env.js';
import { requestAdminApproval } from '../services/accessService.js';
import { db } from '../services/db.js';
import { verifyInitData } from '../services/telegramAuth.js';
import {
  USER_STATUS,
  findUserById,
  getUserStatus,
  listUsers,
  normalizeSource,
  toPublicUser,
  upsertTelegramUser,
} from '../services/userService.js';
import { badRequest, notFound, unauthorized } from '../utils/httpError.js';
import { parseId, parsePagination, parseSearch } from '../utils/validators.js';

/**
 * POST /api/users — Telegram Web App ochilganda foydalanuvchini ro‘yxatga oladi.
 * Faqat Telegram imzosi to‘g‘ri bo‘lsa qabul qilinadi (soxta foydalanuvchi yaratib bo‘lmaydi).
 * Yangi foydalanuvchi `pending` bo‘ladi va adminlarga (bir marta) so‘rov yuboriladi.
 */
export async function registerUser(req, res) {
  const { initData } = req.body ?? {};
  if (typeof initData !== 'string' || !initData) throw badRequest('initData talab qilinadi');

  const verified = verifyInitData(initData, config.botToken, { maxAgeSeconds: config.initDataMaxAgeSeconds });
  if (!verified.ok) throw unauthorized(`Telegram ma’lumotlari tasdiqlanmadi: ${verified.reason}`);

  const { user, isNew } = await upsertTelegramUser(
    { id: verified.user.telegramId, username: verified.user.username, first_name: verified.user.firstName, last_name: verified.user.lastName },
    { source: normalizeSource(verified.startParam, 'webapp') },
  );
  const status = getUserStatus(user);
  if (status === USER_STATUS.PENDING) requestAdminApproval(user);

  res.status(isNew ? 201 : 200).json({ user: { id: user.id, firstName: user.firstName, status }, isNew });
}

export async function getUsers(req, res) {
  const { page, limit } = parsePagination(req.query);
  const search = parseSearch(req.query.search);
  res.json(await listUsers({ search, page, limit }));
}

export async function getUser(req, res) {
  const id = parseId(req.params.id, 'Foydalanuvchi ID');
  const user = await findUserById(id);
  if (!user) throw notFound('Foydalanuvchi topilmadi');

  const calculations = (await db.read('calculations')).filter((c) => c.userId === id);
  const last = calculations.reduce((max, c) => (c.createdAt > max ? c.createdAt : max), '');

  res.json({
    user: toPublicUser(user),
    stats: { calculationsCount: calculations.length, lastCalculationAt: last || null },
  });
}
