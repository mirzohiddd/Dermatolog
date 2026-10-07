import { Markup } from 'telegraf';
import { APPROVE_BUTTON_TEXT, BUTTON_TEXT, REJECT_BUTTON_TEXT } from './messages.js';

/**
 * HTTPS manzil bo‘lsa — Telegram Web App tugmasi (sayt Telegram ichida ochiladi).
 * Aks holda (masalan, lokal test) — oddiy havola tugmasi.
 */
export function calculatorKeyboard(url) {
  if (url.startsWith('https://')) return Markup.inlineKeyboard([Markup.button.webApp(BUTTON_TEXT, url)]);
  return Markup.inlineKeyboard([Markup.button.url(BUTTON_TEXT, url)]);
}

/** Callback ma’lumoti: "access:approve:123456789" yoki "access:reject:123456789". */
export const ACCESS_CALLBACK_RE = /^access:(approve|reject):(\d{1,15})$/;

/**
 * Admin xabari ostidagi tugmalar.
 *  - pending  → ✅ RUXSAT BERISH + ❌ RAD ETISH
 *  - approved → ❌ RAD ETISH (qarorni o‘zgartirish uchun)
 *  - rejected → ✅ RUXSAT BERISH (qarorni o‘zgartirish uchun)
 */
export function adminDecisionKeyboard(telegramId, status = 'pending') {
  const approve = Markup.button.callback(APPROVE_BUTTON_TEXT, `access:approve:${telegramId}`);
  const reject = Markup.button.callback(REJECT_BUTTON_TEXT, `access:reject:${telegramId}`);
  if (status === 'approved') return Markup.inlineKeyboard([reject]);
  if (status === 'rejected') return Markup.inlineKeyboard([approve]);
  return Markup.inlineKeyboard([approve, reject]);
}
