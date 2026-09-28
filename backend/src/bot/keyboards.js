import { Markup } from 'telegraf';
import { BUTTON_TEXT } from './messages.js';

/**
 * HTTPS manzil bo‘lsa — Telegram Web App tugmasi (sayt Telegram ichida ochiladi).
 * Aks holda (masalan, lokal test) — oddiy havola tugmasi.
 */
export function calculatorKeyboard(url) {
  if (url.startsWith('https://')) return Markup.inlineKeyboard([Markup.button.webApp(BUTTON_TEXT, url)]);
  return Markup.inlineKeyboard([Markup.button.url(BUTTON_TEXT, url)]);
}
