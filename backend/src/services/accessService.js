import { config } from '../config/env.js';
import { adminDecisionKeyboard, calculatorKeyboard } from '../bot/keyboards.js';
import { APPROVED_NOTICE_TEXT, REJECTED_NOTICE_TEXT } from '../bot/messages.js';
import { editAdminMessage, notifyAdmins, newUserMessage, sendToUser } from './notificationService.js';
import {
  USER_STATUS,
  claimAdminNotification,
  getUserStatus,
  releaseAdminNotification,
  saveAdminMessages,
  setUserStatus,
} from './userService.js';

/**
 * Kalkulyatorga kirish ruxsati (admin tasdig‘i) bilan bog‘liq mantiq.
 *
 * Oqim:
 *  1. Foydalanuvchi /start bosadi → `pending` bo‘lib saqlanadi.
 *  2. `requestAdminApproval()` adminlarga BIR MARTA tugmali xabar yuboradi.
 *  3. Admin tugmani bosadi → `decideAccess()` statusni o‘zgartiradi,
 *     foydalanuvchiga xabar yuboradi va ikkala admindagi xabarni yangilaydi.
 */

/**
 * Adminlarga "Yangi foydalanuvchi" xabarini yuboradi.
 * Dublikat bo‘lmaydi: `adminNotifiedAt` atomik tarzda belgilanadi.
 * @returns {Promise<boolean>} xabar shu chaqiruvda yuborilgan bo‘lsa — true
 */
export async function requestAdminApproval(user) {
  if (!user || getUserStatus(user) !== USER_STATUS.PENDING) return false;
  try {
    const claimed = await claimAdminNotification(user.telegramId);
    if (!claimed) return false;

    const fresh = { ...user, status: USER_STATUS.PENDING };
    const { sent, messages } = await notifyAdmins(newUserMessage(fresh), adminDecisionKeyboard(user.telegramId, USER_STATUS.PENDING));

    if (sent === 0) {
      // Hech bir adminga yetmadi — keyingi urinishda qayta yuborish uchun belgini olib tashlaymiz
      await releaseAdminNotification(user.telegramId);
      return false;
    }
    await saveAdminMessages(user.telegramId, messages);
    return true;
  } catch (error) {
    console.error('[access] Adminga so‘rov yuborishda xato:', error.message);
    return false;
  }
}

/** Foydalanuvchiga qaror haqida Telegram xabari. */
async function notifyUserAboutDecision(user, status, webAppUrl) {
  if (status === USER_STATUS.APPROVED) {
    const ok = await sendToUser(user.telegramId, APPROVED_NOTICE_TEXT, calculatorKeyboard(webAppUrl));
    // Telegram tugmani rad etsa (masalan, http://localhost) — havolani matn sifatida yuboramiz
    if (!ok) return sendToUser(user.telegramId, `${APPROVED_NOTICE_TEXT}\n\n🧮 Kalkulyator: ${webAppUrl}`);
    return ok;
  }
  if (status === USER_STATUS.REJECTED) {
    return sendToUser(user.telegramId, REJECTED_NOTICE_TEXT);
  }
  return false;
}

/**
 * Admin qarori: approve / reject.
 *
 * @param {object} params
 * @param {string} params.telegramId    — foydalanuvchi Telegram ID si
 * @param {'approved'|'rejected'} params.status
 * @param {string} params.adminId       — tugmani bosgan admin Telegram ID si
 * @param {string} [params.adminName]   — admin ismi (xabarda ko‘rsatish uchun)
 * @param {{chatId: string, messageId: number}} [params.sourceMessage] — tugma bosilgan xabar
 * @returns {Promise<{ ok: boolean, reason?: string, changed?: boolean, user?: object }>}
 */
export async function decideAccess({ telegramId, status, adminId, adminName = null, sourceMessage = null, webAppUrl = config.webAppUrl }) {
  if (!config.adminIds.includes(String(adminId))) return { ok: false, reason: 'not_admin' };
  if (status !== USER_STATUS.APPROVED && status !== USER_STATUS.REJECTED) return { ok: false, reason: 'bad_status' };

  const result = await setUserStatus(telegramId, status, { by: String(adminId), byName: adminName });
  if (!result.found) return { ok: false, reason: 'not_found' };

  const { user, changed } = result;

  if (changed) await notifyUserAboutDecision(user, status, webAppUrl);

  // Ikkala admindagi xabarni yangilaymiz (eski tugmalar qolmasligi uchun)
  const targets = new Map();
  for (const m of user.adminMessages || []) targets.set(`${m.chatId}:${m.messageId}`, m);
  if (sourceMessage?.chatId && sourceMessage?.messageId) {
    targets.set(`${sourceMessage.chatId}:${sourceMessage.messageId}`, sourceMessage);
  }

  const decidedBy = user.statusUpdatedByName || (user.statusUpdatedBy ? `ID ${user.statusUpdatedBy}` : null);
  const text = newUserMessage(user, { decidedBy });
  const keyboard = adminDecisionKeyboard(user.telegramId, getUserStatus(user));
  await Promise.all([...targets.values()].map((m) => editAdminMessage(m.chatId, m.messageId, text, keyboard)));

  return { ok: true, changed, user };
}
