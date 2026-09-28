import { db } from './db.js';
import { JsonDatabase } from './jsonDatabase.js';
import { normalizeTelegramUser } from './telegramAuth.js';
import { fullName } from '../utils/format.js';

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
    startedAt: user.startedAt,
    lastActiveAt: user.lastActiveAt,
  };
}

/**
 * Foydalanuvchini yaratadi yoki (oldin bo‘lsa) yangilaydi.
 * Dublikat yaratilmaydi: telegramId bo‘yicha qidiriladi.
 * Manba (source) faqat birinchi marta yoziladi — mijoz qayerdan kelganini yo‘qotmaslik uchun.
 *
 * @returns {Promise<{ user: object, isNew: boolean }>}
 */
export async function upsertTelegramUser(rawUser, { source = 'direct' } = {}) {
  const tgUser = normalizeTelegramUser(rawUser);
  if (!tgUser) throw new Error('Telegram foydalanuvchi ma’lumoti noto‘g‘ri');
  const now = new Date().toISOString();
  const safeSource = normalizeSource(source);

  return db.update('users', (users) => {
    const existing = users.find((u) => u.telegramId === tgUser.telegramId);
    if (existing) {
      existing.username = tgUser.username;
      existing.firstName = tgUser.firstName;
      existing.lastName = tgUser.lastName;
      existing.lastActiveAt = now;
      return { user: existing, isNew: false };
    }
    const user = {
      id: JsonDatabase.nextId(users),
      ...tgUser,
      source: safeSource,
      startedAt: now,
      lastActiveAt: now,
    };
    users.push(user);
    return { user, isNew: true };
  });
}

export async function findUserById(id) {
  const users = await db.read('users');
  return users.find((u) => u.id === id) || null;
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
