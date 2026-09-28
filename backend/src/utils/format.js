import { config } from '../config/env.js';

/** Telegram HTML xabarlari uchun matnni xavfsiz qiladi. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** 28.09.2026 21:45 ko‘rinishida (Toshkent vaqti bo‘yicha). */
export function formatDateTime(iso, timeZone = config.timezone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute}`;
}

/** 2026-09-28 — "bugun"ni hisoblash uchun (mahalliy vaqt zonasida). */
export function localDateKey(iso, timeZone = config.timezone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso),
  );
}

export function fullName(user) {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}

export function formatSource(source) {
  if (!source) return 'Noma’lum';
  const known = { instagram: 'Instagram', direct: 'To‘g‘ridan-to‘g‘ri', webapp: 'Web App', telegram: 'Telegram' };
  return known[source] || source.charAt(0).toUpperCase() + source.slice(1);
}

export function formatNumber(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
