import { config } from '../config/env.js';
import { requestAdminApproval } from '../services/accessService.js';
import { verifyInitData } from '../services/telegramAuth.js';
import { USER_STATUS, getUserStatus, normalizeSource, upsertTelegramUser } from '../services/userService.js';
import { forbidden, unauthorized } from '../utils/httpError.js';

/**
 * 1-qadam: Telegram Web App `initData` imzosini tekshiradi va foydalanuvchini aniqlaydi.
 * initData so‘rov tanasida (`body.initData`) keladi.
 *
 * - initData yo‘q / imzo noto‘g‘ri / eskirgan → 401
 * - to‘g‘ri bo‘lsa → foydalanuvchi bazada yaratiladi/yangilanadi (yangi bo‘lsa `pending`)
 *   va `req.accessUser` ga yoziladi.
 */
export async function resolveTelegramUser(req, _res, next) {
  try {
    const initData = req.body?.initData;
    if (typeof initData !== 'string' || !initData) {
      return next(unauthorized('Kalkulyator faqat Telegram bot orqali ochiladi', { status: 'unauthenticated' }));
    }

    const verified = verifyInitData(initData, config.botToken, { maxAgeSeconds: config.initDataMaxAgeSeconds });
    if (!verified.ok) {
      return next(unauthorized(`Telegram ma’lumotlari tasdiqlanmadi: ${verified.reason}`, { status: 'unauthenticated' }));
    }

    const { user, isNew } = await upsertTelegramUser(
      { id: verified.user.telegramId, username: verified.user.username, first_name: verified.user.firstName, last_name: verified.user.lastName },
      { source: normalizeSource(verified.startParam, 'webapp') },
    );

    // Botga /start bosmasdan Web App orqali kelgan bo‘lsa ham — adminlarga so‘rov (faqat bir marta)
    if (getUserStatus(user) === USER_STATUS.PENDING) requestAdminApproval(user);

    req.accessUser = user;
    req.accessUserIsNew = isNew;
    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * 2-qadam: faqat `approved` foydalanuvchilarni o‘tkazadi.
 * - pending  → 403
 * - rejected → 403
 */
export function requireApprovedUser(req, _res, next) {
  const status = getUserStatus(req.accessUser);
  if (status === USER_STATUS.APPROVED) return next();
  if (status === USER_STATUS.REJECTED) {
    return next(forbidden('Sizga kalkulyatordan foydalanishga ruxsat berilmagan', { status }));
  }
  return next(forbidden('Admin ruxsatini kuting. Ruxsat berilgach, kalkulyator ochiladi.', { status: USER_STATUS.PENDING }));
}

/** Ikkalasi birga: imzo + status tekshiruvi. */
export const requireTelegramAccess = [resolveTelegramUser, requireApprovedUser];
