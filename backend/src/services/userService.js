import { config } from '../config/env.js';
import { db } from './db.js';
import { JsonDatabase } from './jsonDatabase.js';
import { normalizeTelegramUser } from './telegramAuth.js';
import { fullName } from '../utils/format.js';

/** Foydalanuvchining kalkulyatorga kirish holati. */
export const USER_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

const VALID_STATUSES = new Set(Object.values(USER_STATUS));

/**
 * Foydalanuvchi holatini qaytaradi.
 * Eski yozuvlarda `status` bo‘lmasa yoki noto‘g‘ri bo‘lsa — xavfsizlik uchun `pending`.
 */
export function getUserStatus(user) {
  if (!user) return USER_STATUS.PENDING;
  return VALID_STATUSES.has(user.status) ? user.status : USER_STATUS.PENDING;
}

export function isValidStatus(status) {
  return VALID_STATUSES.has(status);
}

/** `.env` dagi ADMIN_ID_1 / ADMIN_ID_2 bilan solishtiradi. */
export function isAdminTelegramId(telegramId, adminIds = config.adminIds) {
  if (telegramId === undefined || telegramId === null) return false;
  return adminIds.includes(String(telegramId));
}

/** /start dan keladigan manba (masalan "instagram"). Faqat xavfsiz belgilar. */
export function normalizeSource(value, fallback = 'direct') {
  const text = String(value ?? '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,64}$/.test(text) ? text : fallback;
}

/** Frontendga yuboriladigan ochiq maydonlar. */
export function toPublicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    source: user.source,
    status: getUserStatus(user),
    startedAt: user.startedAt,
    lastActiveAt: user.lastActiveAt,
  };
}

/**
 * Foydalanuvchini yaratadi yoki (oldin bo‘lsa) yangilaydi.
 * Dublikat yaratilmaydi: telegramId bo‘yicha qidiriladi.
 * Manba (source) faqat birinchi marta yoziladi — mijoz qayerdan kelganini yo‘qotmaslik uchun.
 *
 * Status qoidalari:
 *  - yangi foydalanuvchi → `pending` (admin ruxsatini kutadi);
 *  - eski yozuvda status yo‘q → `pending` deb yoziladi;
 *  - mavjud `approved` / `rejected` holati o‘zgartirilmaydi;
 *  - `.env` dagi adminlar har doim `approved`.
 *
 * @returns {Promise<{ user: object, isNew: boolean }>}
 */
export async function upsertTelegramUser(rawUser, { source = 'direct' } = {}) {
  const tgUser = normalizeTelegramUser(rawUser);
  if (!tgUser) throw new Error('Telegram foydalanuvchi ma’lumoti noto‘g‘ri');
  const now = new Date().toISOString();
  const safeSource = normalizeSource(source);
  const isAdmin = isAdminTelegramId(tgUser.telegramId);

  return db.update('users', (users) => {
    const existing = users.find((u) => u.telegramId === tgUser.telegramId);
    if (existing) {
      existing.username = tgUser.username;
      existing.firstName = tgUser.firstName;
      existing.lastName = tgUser.lastName;
      existing.lastActiveAt = now;
      if (isAdmin) {
        if (existing.status !== USER_STATUS.APPROVED) {
          existing.status = USER_STATUS.APPROVED;
          existing.statusUpdatedAt = now;
          existing.statusUpdatedBy = 'env-admin';
        }
      } else if (!isValidStatus(existing.status)) {
        existing.status = USER_STATUS.PENDING;
      }
      return { user: existing, isNew: false };
    }
    const user = {
      id: JsonDatabase.nextId(users),
      ...tgUser,
      source: safeSource,
      status: isAdmin ? USER_STATUS.APPROVED : USER_STATUS.PENDING,
      startedAt: now,
      lastActiveAt: now,
    };
    if (isAdmin) {
      user.statusUpdatedAt = now;
      user.statusUpdatedBy = 'env-admin';
    }
    users.push(user);
    return { user, isNew: true };
  });
}

export async function findUserById(id) {
  const users = await db.read('users');
  return users.find((u) => u.id === id) || null;
}

export async function findUserByTelegramId(telegramId) {
  const id = String(telegramId ?? '');
  const users = await db.read('users');
  return users.find((u) => u.telegramId === id) || null;
}

/**
 * Admin xabarnomasini "band qiladi" (atomik). Faqat bir marta `true` qaytaradi —
 * shu bilan adminlarga takroriy xabar yuborilmaydi.
 * Foydalanuvchi `pending` bo‘lmasa yoki xabar avval yuborilgan bo‘lsa — `false`.
 */
export async function claimAdminNotification(telegramId) {
  const id = String(telegramId);
  const now = new Date().toISOString();
  return db.update('users', (users) => {
    const user = users.find((u) => u.telegramId === id);
    if (!user) return false;
    if (getUserStatus(user) !== USER_STATUS.PENDING) return false;
    if (user.adminNotifiedAt) return false;
    user.adminNotifiedAt = now;
    return true;
  });
}

/** Adminlarga yuborilgan xabar ID larini saqlaydi (keyin tahrirlash uchun). */
export async function saveAdminMessages(telegramId, messages) {
  const id = String(telegramId);
  return db.update('users', (users) => {
    const user = users.find((u) => u.telegramId === id);
    if (!user) return false;
    user.adminMessages = messages;
    return true;
  });
}

/** Xabar hech bir adminga yetib bormasa — keyingi /start da qayta urinish uchun. */
export async function releaseAdminNotification(telegramId) {
  const id = String(telegramId);
  return db.update('users', (users) => {
    const user = users.find((u) => u.telegramId === id);
    if (!user) return false;
    delete user.adminNotifiedAt;
    return true;
  });
}

/**
 * Statusni o‘zgartiradi (faqat admin amali uchun).
 * @returns {Promise<{ found: boolean, changed?: boolean, previousStatus?: string, user?: object }>}
 */
export async function setUserStatus(telegramId, status, { by = null, byName = null } = {}) {
  if (!isValidStatus(status)) throw new Error(`Noto‘g‘ri status: ${status}`);
  const id = String(telegramId);
  const now = new Date().toISOString();
  return db.update('users', (users) => {
    const user = users.find((u) => u.telegramId === id);
    if (!user) return { found: false };
    const previousStatus = getUserStatus(user);
    if (previousStatus === status) {
      user.status = status;
      return { found: true, changed: false, previousStatus, user };
    }
    user.status = status;
    user.statusUpdatedAt = now;
    user.statusUpdatedBy = by;
    user.statusUpdatedByName = byName;
    return { found: true, changed: true, previousStatus, user };
  });
}

/**
 * Qidiruv + sahifalash. `search` — ism, familiya, username yoki Telegram ID bo‘yicha.
 */
export async function listUsers({ search = '', page = 1, limit = 20 } = {}) {
  const [users, calculations] = await Promise.all([db.read('users'), db.read('calculations')]);

  const counts = new Map();
  for (const c of calculations) {
    if (c.userId) counts.set(c.userId, (counts.get(c.userId) || 0) + 1);
  }

  const q = search.trim().toLowerCase().replace(/^@/, '');
  const filtered = q
    ? users.filter((u) => {
        const haystack = [fullName(u), u.username, u.telegramId].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      })
    : users;

  const sorted = [...filtered].sort((a, b) => b.id - a.id);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const items = sorted
    .slice((safePage - 1) * limit, safePage * limit)
    .map((u) => ({ ...toPublicUser(u), calculationsCount: counts.get(u.id) || 0 }));

  return { items, total, page: safePage, limit, totalPages };
}
