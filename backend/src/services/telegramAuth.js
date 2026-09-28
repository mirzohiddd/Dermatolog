import crypto from 'node:crypto';

const TELEGRAM_ID_RE = /^\d{1,15}$/;

export function isValidTelegramId(value) {
  return TELEGRAM_ID_RE.test(String(value ?? ''));
}

function cleanText(value, max = 64) {
  if (typeof value !== 'string') return null;
  // Boshqaruv belgilarini olib tashlaymiz, uzunlikni cheklaymiz
  const text = value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
  return text || null;
}

/**
 * Telegram foydalanuvchi obyektini bazaga mos ko‘rinishga keltiradi.
 * ID noto‘g‘ri bo‘lsa — null.
 */
export function normalizeTelegramUser(raw) {
  if (!raw || !isValidTelegramId(raw.id)) return null;
  return {
    telegramId: String(raw.id),
    username: cleanText(raw.username, 32),
    firstName: cleanText(raw.first_name ?? raw.firstName) || 'Foydalanuvchi',
    lastName: cleanText(raw.last_name ?? raw.lastName),
  };
}

/**
 * Telegram Web App `initData` satrini tekshiradi.
 * Rasmiy algoritm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @returns {{ ok: true, user: object, startParam: string|null } | { ok: false, reason: string }}
 */
export function verifyInitData(initData, botToken, { maxAgeSeconds = 86400, now = Date.now() } = {}) {
  if (!botToken) return { ok: false, reason: 'BOT_TOKEN sozlanmagan' };
  if (typeof initData !== 'string' || initData.length === 0 || initData.length > 4096) {
    return { ok: false, reason: 'initData yo‘q yoki juda uzun' };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) return { ok: false, reason: 'hash yo‘q' };
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(hash, 'hex'))) {
    return { ok: false, reason: 'imzo noto‘g‘ri' };
  }

  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || now / 1000 - authDate > maxAgeSeconds) {
    return { ok: false, reason: 'initData eskirgan' };
  }

  let rawUser;
  try {
    rawUser = JSON.parse(params.get('user') || 'null');
  } catch {
    return { ok: false, reason: 'user JSON noto‘g‘ri' };
  }
  const user = normalizeTelegramUser(rawUser);
  if (!user) return { ok: false, reason: 'Telegram ID noto‘g‘ri' };

  return { ok: true, user, startParam: params.get('start_param') };
}

/** Testlar uchun: to‘g‘ri imzolangan initData yaratadi. */
export function signInitData(fields, botToken) {
  const params = new URLSearchParams(fields);
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}
