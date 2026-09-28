import { config } from '../config/env.js';
import { escapeHtml, formatDateTime, formatNumber, formatSource, fullName } from '../utils/format.js';

/**
 * Adminlarga Telegram orqali xabar yuborish.
 * Bot ishga tushganda `setTelegramClient(bot.telegram)` chaqiriladi.
 * Bot yo‘q bo‘lsa (BOT_TOKEN bo‘sh) — xabarlar jimgina o‘tkazib yuboriladi.
 */
let telegram = null;

export function setTelegramClient(client) {
  telegram = client;
}

export function newUserMessage(user) {
  const name = escapeHtml(fullName(user) || 'Noma’lum');
  const username = user.username ? `@${escapeHtml(user.username)}` : '—';
  return [
    '🆕 <b>YANGI MIJOZ</b>',
    '',
    `👤 Ism: ${name}`,
    `🔹 Username: ${username}`,
    `🆔 Telegram ID: <code>${escapeHtml(user.telegramId)}</code>`,
    `📍 Source: ${escapeHtml(formatSource(user.source))}`,
    `📅 Sana: ${formatDateTime(user.startedAt)}`,
    '',
    'User ID:',
    '',
    `#${user.id}`,
  ].join('\n');
}

export function calculationMessage(calculation, user) {
  const who = user
    ? [`👤 ${escapeHtml(fullName(user) || 'Noma’lum')}`, `🆔 Telegram ID: <code>${escapeHtml(user.telegramId)}</code>`]
    : ['👤 Sayt mehmoni (Telegramsiz)'];
  return [
    '🧮 <b>YANGI HISOBLASH</b>',
    '',
    ...who,
    '',
    `⚖️ Vazn: ${calculation.weight} kg`,
    `📏 Bo‘y: ${calculation.height} cm`,
    `🎂 Yosh: ${calculation.age}`,
    '',
    `🔥 Calories: ${formatNumber(calculation.targetCalories)} kcal`,
    `📊 BMI: ${calculation.bmi}`,
    '',
    `📅 ${formatDateTime(calculation.createdAt)}`,
    ...(user ? ['', `#${user.id}`] : []),
  ].join('\n');
}

/**
 * Barcha adminlarga (ADMIN_ID_1, ADMIN_ID_2) yuboradi.
 * Bir admin xato bersa ham, ikkinchisiga yuborilaveradi.
 * @returns {Promise<{ sent: number, failed: number }>}
 */
export async function notifyAdmins(text) {
  if (!telegram || config.adminIds.length === 0) return { sent: 0, failed: 0 };

  const results = await Promise.allSettled(
    config.adminIds.map((chatId) =>
      telegram.sendMessage(chatId, text, { parse_mode: 'HTML', link_preview_options: { is_disabled: true } }),
    ),
  );

  let sent = 0;
  let failed = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') sent += 1;
    else {
      failed += 1;
      console.error(
        `[notify] Admin ${config.adminIds[i]} ga yuborilmadi: ${r.reason?.description || r.reason?.message}. ` +
          'Admin botga /start bosganiga ishonch hosil qiling.',
      );
    }
  });
  return { sent, failed };
}

export function notifyNewUser(user) {
  return notifyAdmins(newUserMessage(user)).catch((e) => console.error('[notify]', e.message));
}

export function notifyNewCalculation(calculation, user) {
  if (!config.notifyOnCalculation) return Promise.resolve();
  return notifyAdmins(calculationMessage(calculation, user)).catch((e) => console.error('[notify]', e.message));
}
