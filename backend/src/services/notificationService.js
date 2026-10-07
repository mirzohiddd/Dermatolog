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

export function getTelegramClient() {
  return telegram;
}

const STATUS_LINES = {
  pending: '⏳ Status: Pending',
  approved: '✅ Status: Approved',
  rejected: '❌ Status: Rejected',
};

/**
 * Admin uchun "Yangi foydalanuvchi" xabari.
 * Status o‘zgarganda ham shu matn qayta chiziladi (xabar tahrirlanadi).
 */
export function newUserMessage(user, { decidedBy = null } = {}) {
  const status = STATUS_LINES[user.status] ? user.status : 'pending';
  const name = escapeHtml(fullName(user) || 'Noma’lum');
  const username = user.username ? `@${escapeHtml(user.username)}` : '—';
  const lines = [
    '🆕 <b>Yangi foydalanuvchi</b>',
    '',
    `👤 Ism: ${name}`,
    `🔗 Username: ${username}`,
    `🆔 Telegram ID: <code>${escapeHtml(user.telegramId)}</code>`,
    `📍 Source: ${escapeHtml(formatSource(user.source))}`,
    `📅 Sana: ${formatDateTime(user.startedAt)}`,
    '',
    STATUS_LINES[status],
  ];
  if (status !== 'pending' && user.statusUpdatedAt) {
    const who = decidedBy ? escapeHtml(decidedBy) : null;
    lines.push(`🕒 ${formatDateTime(user.statusUpdatedAt)}${who ? ` — ${who}` : ''}`);
  }
  lines.push('', `#${user.id}`);
  return lines.join('\n');
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
 * `extra` — qo‘shimcha parametrlar (masalan, inline tugmalar: reply_markup).
 * @returns {Promise<{ sent: number, failed: number, messages: Array<{ chatId: string, messageId: number }> }>}
 */
export async function notifyAdmins(text, extra = {}) {
  if (!telegram || config.adminIds.length === 0) return { sent: 0, failed: 0, messages: [] };

  const results = await Promise.allSettled(
    config.adminIds.map((chatId) =>
      telegram.sendMessage(chatId, text, { parse_mode: 'HTML', link_preview_options: { is_disabled: true }, ...extra }),
    ),
  );

  let sent = 0;
  let failed = 0;
  const messages = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      sent += 1;
      if (r.value && r.value.message_id) messages.push({ chatId: String(config.adminIds[i]), messageId: r.value.message_id });
    } else {
      failed += 1;
      console.error(
        `[notify] Admin ${config.adminIds[i]} ga yuborilmadi: ${r.reason?.description || r.reason?.message}. ` +
          'Admin botga /start bosganiga ishonch hosil qiling.',
      );
    }
  });
  return { sent, failed, messages };
}

/** Bitta foydalanuvchiga xabar yuboradi. Xato bo‘lsa — false (foydalanuvchi botni bloklagan bo‘lishi mumkin). */
export async function sendToUser(chatId, text, extra = {}) {
  if (!telegram) return false;
  try {
    await telegram.sendMessage(chatId, text, extra);
    return true;
  } catch (error) {
    console.error(`[notify] Foydalanuvchi ${chatId} ga yuborilmadi: ${error.description || error.message}`);
    return false;
  }
}

/** Admin xabarini tahrirlaydi. "message is not modified" kabi xatolar e’tiborsiz qoldiriladi. */
export async function editAdminMessage(chatId, messageId, text, extra = {}) {
  if (!telegram) return false;
  try {
    await telegram.editMessageText(chatId, messageId, undefined, text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...extra,
    });
    return true;
  } catch (error) {
    const reason = error.description || error.message || '';
    if (!/message is not modified/i.test(reason)) {
      console.warn(`[notify] Admin xabari (${chatId}/${messageId}) tahrirlanmadi: ${reason}`);
    }
    return false;
  }
}

export function notifyNewCalculation(calculation, user) {
  if (!config.notifyOnCalculation) return Promise.resolve();
  return notifyAdmins(calculationMessage(calculation, user)).catch((e) => console.error('[notify]', e.message));
}
